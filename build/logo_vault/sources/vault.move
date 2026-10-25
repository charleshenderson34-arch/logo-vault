/// Stores small files (logos) fully on-chain as Aptos digital-asset token objects,
/// all held inside a single vault object that only the vault owner can operate.
///
/// Ownership chain:  your account  ->  Vault object  ->  Logo token objects
///
/// * Every mutating function checks that the caller owns the vault (directly, or
///   via the token -> vault -> account chain). Nobody else can write, move or
///   withdraw anything.
/// * Ungated (plain `object::transfer`) is disabled on the vault and on every
///   token, so they can only move through the functions in this module.
/// * NOTE: Aptos state is public. This module restricts who can CONTROL the
///   data, not who can READ it. Anyone can read the bytes with a view call.
module logo_vault::vault {
    use std::hash;
    use std::option;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::object::{Self, Object, ExtendRef, TransferRef};
    use aptos_token_objects::collection;
    use aptos_token_objects::token;

    const VAULT_SEED: vector<u8> = b"LOGO_VAULT";
    const COLLECTION_NAME: vector<u8> = b"Chain Logos";
    /// Hard cap per file; the largest source file is ~55 KB.
    const MAX_LOGO_BYTES: u64 = 262144;

    const E_NOT_OWNER: u64 = 1;
    const E_ALREADY_FINALIZED: u64 = 2;
    const E_NOT_FINALIZED: u64 = 3;
    const E_TOO_LARGE: u64 = 4;
    const E_LENGTH_MISMATCH: u64 = 5;
    const E_HASH_MISMATCH: u64 = 6;
    const E_OUT_OF_RANGE: u64 = 7;
    const E_BAD_HASH_LEN: u64 = 8;

    /// Lives on the vault object.
    struct Vault has key {
        extend_ref: ExtendRef,
        transfer_ref: TransferRef,
    }

    /// Lives on each token object. `bytes` is the file content itself.
    struct Logo has key {
        mime: String,
        bytes: vector<u8>,
        total_len: u64,
        sha256: vector<u8>,
        finalized: bool,
        transfer_ref: TransferRef,
    }

    // ---------------------------------------------------------------- setup

    /// Creates the vault object (owned by `owner`) and the logo collection inside it.
    /// Callable once per account.
    public entry fun init_vault(owner: &signer) {
        let ctor = object::create_named_object(owner, VAULT_SEED);
        let vault_signer = object::generate_signer(&ctor);
        let extend_ref = object::generate_extend_ref(&ctor);
        let transfer_ref = object::generate_transfer_ref(&ctor);
        object::disable_ungated_transfer(&transfer_ref);
        move_to(&vault_signer, Vault { extend_ref, transfer_ref });

        collection::create_unlimited_collection(
            &vault_signer,
            string::utf8(b"Chain logo files stored fully on-chain"),
            string::utf8(COLLECTION_NAME),
            option::none(),
            string::utf8(b""),
        );
    }

    // --------------------------------------------------------------- upload

    /// Step 1: mint the token object for one file. Content is uploaded next.
    public entry fun begin_logo(
        owner: &signer,
        vault: Object<Vault>,
        name: String,
        mime: String,
        total_len: u64,
        sha256: vector<u8>,
    ) acquires Vault {
        assert!(object::is_owner(vault, signer::address_of(owner)), E_NOT_OWNER);
        assert!(total_len <= MAX_LOGO_BYTES, E_TOO_LARGE);
        assert!(vector::length(&sha256) == 32, E_BAD_HASH_LEN);

        let v = borrow_global<Vault>(object::object_address(&vault));
        let vault_signer = object::generate_signer_for_extending(&v.extend_ref);

        // Token objects are created with the vault object as creator, so the
        // vault object is their initial owner.
        let ctor = token::create_named_token(
            &vault_signer,
            string::utf8(COLLECTION_NAME),
            string::utf8(b"Logo file stored on-chain"),
            name,
            option::none(),
            string::utf8(b""), // no external URI: the data is on-chain
        );
        let token_signer = object::generate_signer(&ctor);
        let transfer_ref = object::generate_transfer_ref(&ctor);
        object::disable_ungated_transfer(&transfer_ref);

        move_to(&token_signer, Logo {
            mime,
            bytes: vector::empty(),
            total_len,
            sha256,
            finalized: false,
            transfer_ref,
        });
    }

    /// Step 2 (repeat): append the next chunk of the file.
    public entry fun append_chunk(
        owner: &signer,
        logo: Object<Logo>,
        chunk: vector<u8>,
    ) acquires Logo {
        assert!(object::owns(logo, signer::address_of(owner)), E_NOT_OWNER);
        let l = borrow_global_mut<Logo>(object::object_address(&logo));
        assert!(!l.finalized, E_ALREADY_FINALIZED);
        assert!(vector::length(&l.bytes) + vector::length(&chunk) <= l.total_len, E_TOO_LARGE);
        vector::append(&mut l.bytes, chunk);
    }

    /// Step 3: verify length and SHA-256 on-chain, then seal the file.
    public entry fun finalize(owner: &signer, logo: Object<Logo>) acquires Logo {
        assert!(object::owns(logo, signer::address_of(owner)), E_NOT_OWNER);
        let l = borrow_global_mut<Logo>(object::object_address(&logo));
        assert!(!l.finalized, E_ALREADY_FINALIZED);
        assert!(vector::length(&l.bytes) == l.total_len, E_LENGTH_MISMATCH);
        assert!(hash::sha2_256(*&l.bytes) == l.sha256, E_HASH_MISMATCH);
        l.finalized = true;
    }

    // --------------------------------------------------------------- access

    /// Move a logo token out of the vault (or on from wherever it now is).
    public entry fun withdraw(
        owner: &signer,
        logo: Object<Logo>,
        to: address,
    ) acquires Logo {
        assert!(object::owns(logo, signer::address_of(owner)), E_NOT_OWNER);
        let l = borrow_global<Logo>(object::object_address(&logo));
        let lt = object::generate_linear_transfer_ref(&l.transfer_ref);
        object::transfer_with_ref(lt, to);
    }

    /// Put a logo token back into a vault you own.
    public entry fun deposit(
        owner: &signer,
        logo: Object<Logo>,
        vault: Object<Vault>,
    ) acquires Logo {
        let addr = signer::address_of(owner);
        assert!(object::is_owner(vault, addr), E_NOT_OWNER);
        assert!(object::owns(logo, addr), E_NOT_OWNER);
        let l = borrow_global<Logo>(object::object_address(&logo));
        let lt = object::generate_linear_transfer_ref(&l.transfer_ref);
        object::transfer_with_ref(lt, object::object_address(&vault));
    }

    /// Hand the whole vault (and everything in it) to another account.
    public entry fun transfer_vault(
        owner: &signer,
        vault: Object<Vault>,
        to: address,
    ) acquires Vault {
        assert!(object::is_owner(vault, signer::address_of(owner)), E_NOT_OWNER);
        let v = borrow_global<Vault>(object::object_address(&vault));
        let lt = object::generate_linear_transfer_ref(&v.transfer_ref);
        object::transfer_with_ref(lt, to);
    }

    // ---------------------------------------------------------------- views

    #[view]
    /// Address of the vault object created by `owner` with `init_vault`.
    public fun vault_address(owner: address): address {
        object::create_object_address(&owner, VAULT_SEED)
    }

    #[view]
    /// Address of the token object for file `name` in the vault at `vault_addr`.
    public fun logo_address(vault_addr: address, name: String): address {
        token::create_token_address(&vault_addr, &string::utf8(COLLECTION_NAME), &name)
    }

    #[view]
    /// (mime, expected length, uploaded length, finalized)
    public fun logo_info(logo: Object<Logo>): (String, u64, u64, bool) acquires Logo {
        let l = borrow_global<Logo>(object::object_address(&logo));
        (l.mime, l.total_len, vector::length(&l.bytes), l.finalized)
    }

    #[view]
    /// Read `len` bytes starting at `offset` from a sealed logo.
    public fun read_chunk(logo: Object<Logo>, offset: u64, len: u64): vector<u8> acquires Logo {
        let l = borrow_global<Logo>(object::object_address(&logo));
        assert!(l.finalized, E_NOT_FINALIZED);
        let total = vector::length(&l.bytes);
        assert!(offset <= total && len <= total - offset, E_OUT_OF_RANGE);
        let out = vector::empty<u8>();
        let i = offset;
        while (i < offset + len) {
            vector::push_back(&mut out, *vector::borrow(&l.bytes, i));
            i = i + 1;
        };
        out
    }

    // ---------------------------------------------------------------- tests

    #[test_only]
    fun setup(owner: &signer, name: String, data: vector<u8>): (Object<Vault>, Object<Logo>) {
        let owner_addr = signer::address_of(owner);
        init_vault(owner);
        let vault = object::address_to_object<Vault>(vault_address(owner_addr));
        begin_logo(
            owner, vault, name, string::utf8(b"image/svg+xml"),
            vector::length(&data), hash::sha2_256(data),
        );
        let logo = object::address_to_object<Logo>(logo_address(vault_address(owner_addr), name));
        (vault, logo)
    }

    #[test(owner = @0xA)]
    fun test_upload_read_withdraw_deposit(owner: &signer) {
        let name = string::utf8(b"chains/test.svg");
        let data = b"<svg>hello</svg>";
        let (vault, logo) = setup(owner, name, data);

        // chunked upload (two chunks)
        append_chunk(owner, logo, b"<svg>he");
        append_chunk(owner, logo, b"llo</svg>");
        finalize(owner, logo);

        let (_, total, uploaded, done) = logo_info(logo);
        assert!(total == 16 && uploaded == 16 && done, 100);
        assert!(read_chunk(logo, 0, 16) == data, 101);
        assert!(read_chunk(logo, 5, 5) == b"hello", 102);

        // starts inside the vault, owned (through it) by the owner
        assert!(object::owner(logo) == object::object_address(&vault), 103);
        assert!(object::owns(logo, signer::address_of(owner)), 104);

        // plain object::transfer is blocked, but withdraw/deposit work
        assert!(!object::ungated_transfer_allowed(logo), 105);
        withdraw(owner, logo, signer::address_of(owner));
        assert!(object::owner(logo) == signer::address_of(owner), 106);
        deposit(owner, logo, vault);
        assert!(object::owner(logo) == object::object_address(&vault), 107);
    }

    #[test(owner = @0xA, other = @0xB)]
    #[expected_failure(abort_code = E_NOT_OWNER)]
    fun test_stranger_cannot_append(owner: &signer, other: &signer) {
        let (_, logo) = setup(owner, string::utf8(b"a.svg"), b"abc");
        append_chunk(other, logo, b"abc");
    }

    #[test(owner = @0xA, other = @0xB)]
    #[expected_failure(abort_code = E_NOT_OWNER)]
    fun test_stranger_cannot_withdraw(owner: &signer, other: &signer) {
        let (_, logo) = setup(owner, string::utf8(b"a.svg"), b"abc");
        append_chunk(owner, logo, b"abc");
        finalize(owner, logo);
        withdraw(other, logo, @0xB);
    }

    #[test(owner = @0xA, other = @0xB)]
    #[expected_failure(abort_code = E_NOT_OWNER)]
    fun test_stranger_cannot_mint_into_vault(owner: &signer, other: &signer) {
        let (vault, _) = setup(owner, string::utf8(b"a.svg"), b"abc");
        begin_logo(other, vault, string::utf8(b"b.svg"), string::utf8(b"image/svg+xml"), 3, hash::sha2_256(b"abc"));
    }

    #[test(owner = @0xA)]
    #[expected_failure(abort_code = E_HASH_MISMATCH)]
    fun test_wrong_content_rejected(owner: &signer) {
        let (_, logo) = setup(owner, string::utf8(b"a.svg"), b"abc");
        append_chunk(owner, logo, b"xyz");
        finalize(owner, logo);
    }

    #[test(owner = @0xA)]
    #[expected_failure(abort_code = E_LENGTH_MISMATCH)]
    fun test_incomplete_upload_rejected(owner: &signer) {
        let (_, logo) = setup(owner, string::utf8(b"a.svg"), b"abc");
        append_chunk(owner, logo, b"ab");
        finalize(owner, logo);
    }

    #[test(owner = @0xA)]
    #[expected_failure(abort_code = E_ALREADY_FINALIZED)]
    fun test_sealed_logo_is_immutable(owner: &signer) {
        let (_, logo) = setup(owner, string::utf8(b"a.svg"), b"abc");
        append_chunk(owner, logo, b"abc");
        finalize(owner, logo);
        append_chunk(owner, logo, b"");
    }
}
