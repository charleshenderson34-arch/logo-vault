module logo_vault_addr::reserves {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;

    const E_NOT_AUTHORIZED: u64 = 1;
    const E_EMPTY_ASSETS: u64 = 2;
    const E_EMPTY_MERKLE_ROOT: u64 = 3;

    struct Attestation has key, store {
        admin: address,
        asset_count: u64,
        merkle_root: vector<u8>,
        sequence: u64,
        total_value_cents: u64,
        updated_at_secs: u64,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<Attestation>(admin_addr)) {
            move_to(admin, Attestation {
                admin: admin_addr,
                asset_count: 42,
                merkle_root: x"45917bf972b7036eb4c16787f6aab90f2ec4f6392dd95a051f4af650c8ab6b0b",
                sequence: 1,
                total_value_cents: 55656239,
                updated_at_secs: timestamp::now_seconds(),
            });
        }
    }

    public entry fun update_attestation(
        admin: &signer,
        asset_count: u64,
        merkle_root: vector<u8>,
        total_value_cents: u64
    ) acquires Attestation {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Attestation>(admin_addr), E_NOT_AUTHORIZED);
        assert!(asset_count > 0, E_EMPTY_ASSETS);
        assert!(vector::length(&merkle_root) > 0, E_EMPTY_MERKLE_ROOT);

        let att = borrow_global_mut<Attestation>(admin_addr);
        assert!(signer::address_of(admin) == att.admin, E_NOT_AUTHORIZED);

        att.asset_count = asset_count;
        att.merkle_root = merkle_root;
        att.sequence = att.sequence + 1;
        att.total_value_cents = total_value_cents;
        att.updated_at_secs = timestamp::now_seconds();
    }
}
