module logo_vault::treasury {
    use std::signer;
    use std::vector;
    use aptos_framework::object::{Self, Object};
    use aptos_token_objects::token::{Token};

    /// --- Errors ---
    const ENOT_AUTHORIZED: u64 = 1;
    const EVAULT_ALREADY_EXISTS: u64 = 2;
    const EINVALID_BACKING_AMOUNT: u64 = 3;

    /// --- Resources ---

    /// The primary Vault holding the core reserve layer (the 111 assets)
    struct Vault has key {
        /// Vector storing the escrowed core token objects
        escrowed_assets: vector<Object<Token>>,
        /// Admin address authorized to manage vault parameters
        admin: address,
    }

    /// Registry tracking the backing relationship for the secondary 42 assets
    struct SecondaryBackingRegistry has key {
        /// Total core assets required or currently locked for backing
        required_reserve_count: u64,
        /// Status flag for the secondary tier (representing the 42 assets)
        is_backing_active: bool,
    }

    /// --- Initialization ---

    /// Initialize the vault and backing registry under the deployer's account
    public entry fun initialize_vault(admin: &signer, required_reserves: u64) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<Vault>(admin_addr), EVAULT_ALREADY_EXISTS);

        move_to(admin, Vault {
            escrowed_assets: vector::empty(),
            admin: admin_addr,
        });

        move_to(admin, SecondaryBackingRegistry {
            required_reserve_count: required_reserves, // e.g., set to 111 core assets
            is_backing_active: false,
        });
    }

    /// --- Core Escrow Operations ---

    /// Escrows / locks a core token object into the vault, establishing its backing weight
    public entry fun lock_core_asset(
        owner: &signer,
        vault_addr: address,
        asset_obj: Object<Token>
    ) acquires Vault {
        let vault = borrow_global_mut<Vault>(vault_addr);
        
        // Securely transfer ownership of the Token V2 object to the vault address
        object::transfer(owner, asset_obj, vault_addr);

        // Record the escrowed asset object reference in the vault's reserve layer
        vector::push_back(&mut vault.escrowed_assets, asset_obj);
    }

    /// Activate or deactivate the secondary 42 asset backing layer once reserves are met
    public entry fun set_backing_status(
        admin: &signer,
        vault_addr: address,
        active: bool
    ) acquires Vault, SecondaryBackingRegistry {
        let vault = borrow_global<Vault>(vault_addr);
        assert!(signer::address_of(admin) == vault.admin, ENOT_AUTHORIZED);

        let registry = borrow_global_mut<SecondaryBackingRegistry>(vault_addr);
        registry.is_backing_active = active;
    }

    /// --- View Functions ---

    #[view]
    /// Returns the total number of core assets currently locked in the vault
    public fun get_escrowed_count(vault_addr: address): u64 acquires Vault {
        let vault = borrow_global<Vault>(vault_addr);
        vector::length(&vault.escrowed_assets)
    }

    #[view]
    /// Verifies if the secondary 42 asset layer is fully backed and active
    public fun is_vault_solvent(vault_addr: address): bool acquires Vault, SecondaryBackingRegistry {
        let vault = borrow_global<Vault>(vault_addr);
        let registry = borrow_global<SecondaryBackingRegistry>(vault_addr);
        
        let current_reserves = vector::length(&vault.escrowed_assets);
        // Solvent if active and reserves meet or exceed the target requirement
        registry.is_backing_active && (current_reserves >= registry.required_reserve_count)
    }
}
