# Logo Vault (Aptos)

Stores the 111 files from your Sentio listing (~290 KB) **as bytes on Aptos**, one
digital-asset token object per file, all inside one vault object owned by your account.
No token points at a Sentio URL.

    your account  ->  Vault object  ->  111 Logo token objects (bytes on-chain)

## Access model

- Every write / move / withdraw checks that the caller owns the vault. Others abort.
- Plain `object::transfer` is disabled on the vault and every token; they move only
  through `withdraw`, `deposit`, `transfer_vault` (all owner-gated).
- Each file is sealed on-chain after its length and SHA-256 are verified, and a
  sealed file can't be changed.
- **Aptos state is public.** "Locked" means only you can control the assets, not that
  the bytes are hidden: anyone can read them with the `read_chunk` view function.
  Hiding content would need encryption, and then the logos wouldn't be viewable.
- Whoever holds your private key controls the vault and can upgrade the module. Use a
  hardware wallet or multisig for mainnet.

## Steps

Not yet compiled. Run the unit tests first (step 2) and fix anything the compiler flags.

1. Install the Aptos CLI, then `aptos init --network testnet` (testnet first; fund via faucet).
2. `aptos move test --named-addresses logo_vault=default`
3. `aptos move publish --named-addresses logo_vault=default`
4. `cd scripts && npm install`
5. `npm run check`   downloads each file and verifies it against the MD5 in your listing (no transactions)
6. `export APTOS_PRIVATE_KEY=<your hex key>` then `npm run upload`   (resumable; safe to re-run)
7. `npm run verify`   reads every file back from chain and compares

If `assets.sentio.xyz` is unreachable, download the files into a folder that mirrors
the paths (`logos/chains/aptos.svg`, ...) and set `LOGO_DIR=./logos`.

Check what one file costs on testnet before running mainnet: storage is billed per byte.

## Functions (`logo_vault::vault`)

| Function | Who | What |
|---|---|---|
| `init_vault` | you | creates vault object + "Chain Logos" collection |
| `begin_logo` / `append_chunk` / `finalize` | owner | mint token, upload bytes, verify + seal |
| `withdraw` / `deposit` | owner | take a logo out of / put it back into the vault |
| `transfer_vault` | owner | hand over the whole vault |
| `vault_address`, `logo_address`, `logo_info`, `read_chunk` | anyone (views) | locate and read data |
# logo-vault
# logo-vault
