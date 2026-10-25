// Uploads every file in manifest.json into the on-chain logo vault.
//
//   npx tsx upload.ts --check       # download + sanity-check files, no transactions
//   npx tsx upload.ts               # create vault (if needed) and upload everything
//   npx tsx upload.ts --verify      # read everything back from chain, compare to a fresh download
//
// Env:
//   APTOS_PRIVATE_KEY   your account's ed25519 private key (hex). Never share it.
//   APTOS_NETWORK       mainnet (default) | mainnet | devnet
//   LOGO_DIR            optional folder with the files (e.g. ./logos/chains/aptos.svg)
//                       if set, files are read from disk instead of downloaded.
//
// The package must already be published to YOUR account; the account address is
// the module address.
//
// Note on the listing: manifest.json's size/MD5 come from a storage listing and may
// describe a compressed copy. A mismatch is reported as a note, not an error. What
// is checked hard is that each file really is an SVG / PNG / WebP (not an error page)
// and fits the on-chain size cap.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} from "@aptos-labs/ts-sdk";

type Entry = { key: string; size: number; md5: string; mime: string };
const manifest: { source: string; files: Entry[] } = JSON.parse(
  readFileSync(new URL("./manifest.json", import.meta.url), "utf8"),
);

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has("--check");
const VERIFY = args.has("--verify");
const UPLOAD_CHUNK = 16_000; // bytes per transaction (tx limit is 64 KB)
const READ_CHUNK = 4_000; // bytes per view call
const MAX_LOGO_BYTES = 262_144; // must match the Move module's cap

const md5 = (b: Uint8Array) => createHash("md5").update(b).digest("hex");
const sha256 = (b: Uint8Array) => new Uint8Array(createHash("sha256").update(b).digest());
const latin1 = (b: Uint8Array) => Buffer.from(b).toString("latin1");

function looksRight(key: string, b: Uint8Array): boolean {
  if (key.endsWith(".svg")) {
    const head = latin1(b.slice(0, 4000));
    return /<svg[\s>]/i.test(head) && !/<html/i.test(head);
  }
  if (key.endsWith(".png")) return b[0] === 0x89 && latin1(b.slice(1, 4)) === "PNG";
  if (key.endsWith(".webp")) return latin1(b.slice(0, 4)) === "RIFF" && latin1(b.slice(8, 12)) === "WEBP";
  return true;
}

let notes = 0;
async function getBytes(e: Entry): Promise<Uint8Array> {
  let bytes: Uint8Array;
  let encoding: string | null = null;
  const dir = process.env.LOGO_DIR;
  if (dir) {
    const p = join(dir, e.key);
    if (!existsSync(p)) throw new Error(`missing local file ${p}`);
    bytes = new Uint8Array(readFileSync(p));
  } else {
    const res = await fetch(new URL(e.key, manifest.source));
    if (!res.ok) throw new Error(`download ${e.key}: HTTP ${res.status}`);
    encoding = res.headers.get("content-encoding");
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  if (!looksRight(e.key, bytes)) {
    throw new Error(`${e.key}: does not look like a valid ${e.key.split(".").pop()} file (error page?)`);
  }
  if (bytes.length > MAX_LOGO_BYTES) {
    throw new Error(`${e.key}: ${bytes.length} bytes exceeds the ${MAX_LOGO_BYTES}-byte on-chain cap`);
  }
  if (bytes.length !== e.size || md5(bytes) !== e.md5) {
    notes++;
    if (notes <= 3) {
      console.log(
        `note ${e.key}: listing says ${e.size}B, got ${bytes.length}B` +
          (encoding ? ` (server sent content-encoding: ${encoding})` : "") +
          ". Using what was served.",
      );
    }
  }
  return bytes;
}

async function main() {
  if (CHECK_ONLY) {
    let total = 0;
    const report: { key: string; bytes: number; sha256: string }[] = [];
    for (const e of manifest.files) {
      const b = await getBytes(e);
      total += b.length;
      report.push({ key: e.key, bytes: b.length, sha256: Buffer.from(sha256(b)).toString("hex") });
      console.log("ok", e.key, `${b.length}B`);
    }
    writeFileSync("fetched.json", JSON.stringify(report, null, 1));
    console.log(`\nAll ${manifest.files.length} files look valid: ${total} bytes total (saved fetched.json).`);
    if (notes) console.log(`${notes} file(s) differ in size/MD5 from the listing (see notes above); the served bytes are what will be stored.`);
    return;
  }

  const keyHex = process.env.APTOS_PRIVATE_KEY;
  if (!keyHex) throw new Error("set APTOS_PRIVATE_KEY");
  const network = (process.env.APTOS_NETWORK ?? "mainnet") as Network;
  const aptos = new Aptos(new AptosConfig({ network }));
  const account = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(keyHex) });
  const me = account.accountAddress.toString();
  const MOD = `${me}::vault`;
  console.log(`network=${network} account=${me}`);

  const send = async (fn: string, functionArguments: any[]) => {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: { function: `${MOD}::${fn}`, functionArguments },
    });
    const pending = await aptos.signAndSubmitTransaction({ signer: account, transaction });
    const done = await aptos.waitForTransaction({ transactionHash: pending.hash });
    if (!done.success) throw new Error(`${fn} failed: ${done.vm_status}`);
  };
  const view = async (fn: string, functionArguments: any[]) =>
    aptos.view({ payload: { function: `${MOD}::${fn}` as `${string}::${string}::${string}`, functionArguments } });

  const [vaultAddr] = (await view("vault_address", [me])) as [string];
  console.log("vault object:", vaultAddr);

  // 1. vault
  const hasVault = await aptos
    .getAccountResource({ accountAddress: vaultAddr, resourceType: `${MOD}::Vault` })
    .then(() => true, () => false);
  if (!hasVault && !VERIFY) {
    console.log("creating vault + collection ...");
    await send("init_vault", []);
  }

  // 2. files
  for (const e of manifest.files) {
    const [logoAddr] = (await view("logo_address", [vaultAddr, e.key])) as [string];
    const info = await view("logo_info", [logoAddr]).then((r) => r, () => null);

    if (VERIFY) {
      if (!info || info[3] !== true) throw new Error(`${e.key}: not finalized on chain`);
      const out = new Uint8Array(Number(info[1]));
      for (let off = 0; off < out.length; off += READ_CHUNK) {
        const len = Math.min(READ_CHUNK, out.length - off);
        const [hex] = (await view("read_chunk", [logoAddr, off, len])) as [string];
        out.set(Buffer.from(hex.slice(2), "hex"), off);
      }
      const fresh = await getBytes(e);
      if (Buffer.compare(Buffer.from(out), Buffer.from(fresh)) !== 0) {
        throw new Error(`${e.key}: on-chain bytes differ from a fresh download`);
      }
      console.log("verified", e.key);
      continue;
    }

    if (info && info[3] === true) {
      console.log("skip (done)", e.key);
      continue;
    }
    const bytes = await getBytes(e);
    let offset = 0;
    if (!info) {
      await send("begin_logo", [vaultAddr, e.key, e.mime, bytes.length, sha256(bytes)]);
    } else {
      offset = Number(info[2]); // resume a partial upload
    }
    for (let o = offset; o < bytes.length; o += UPLOAD_CHUNK) {
      await send("append_chunk", [logoAddr, bytes.slice(o, o + UPLOAD_CHUNK)]);
    }
    await send("finalize", [logoAddr]);
    console.log("stored", e.key, `${bytes.length}B ->`, logoAddr);
  }
  console.log(VERIFY ? "\nAll files match on chain." : "\nDone. Run with --verify to read everything back.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
