import pc from "picocolors";
import { Vault, CIPHER_ALGORITHM, VAULT_VERSION, KEY_ITERATIONS, KEY_LENGTH, SALT_LENGTH, IV_LENGTH, AUTH_TAG_LENGTH, VaultUnavailableError, VAULT_SETUP_COMMANDS } from "../core/vault";
import { log } from "../utils/logger";
import * as crypto from "crypto";
import {
  renderHeader,
  renderSection,
  renderSuccess,
  renderError,
  renderWarn,
  renderInfo,
  renderKeyValue,
} from "../utils/table";

function reportUnavailable(err: unknown): { ok: boolean } {
  const message = err instanceof VaultUnavailableError ? err.message : (err as Error).message;
  console.log("");
  console.log(renderHeader("environmentsentry vault", "Storage unavailable"));
  console.log("");
  console.log(renderError("The encrypted vault cannot start in this installation."));
  console.log("");
  console.log("  " + pc.dim(message));
  console.log("");
  console.log(renderSection("Fix it with one of these"));
  VAULT_SETUP_COMMANDS.forEach((cmd, i) => console.log(`  ${i + 1}. ${pc.cyan(cmd)}`));
  console.log("");
  console.log(renderInfo("Every other command (check, fix, scan, usage, example, prod) works without this."));
  console.log("");
  return { ok: false };
}

export function runVaultInit(root: string): { ok: boolean } {
  let vault: Vault;
  try {
    vault = new Vault(root);
  } catch (e) {
    return reportUnavailable(e);
  }
  vault.close();
  console.log(renderHeader("environmentsentry vault init", "Encrypted vault database initialized"));
  console.log(renderSuccess(`Vault initialized at ${root}/.environmentsentry-vault.sqlite`));
  console.log("");
  console.log(renderSection("Encryption details"));
  console.log(renderKeyValue("Algorithm", CIPHER_ALGORITHM));
  console.log(renderKeyValue("Version", `v${VAULT_VERSION}`));
  console.log(renderKeyValue("Key derivation", "PBKDF2-HMAC-SHA256"));
  console.log(renderKeyValue("Iterations", String(KEY_ITERATIONS)));
  console.log(renderKeyValue("Key length", `${KEY_LENGTH} bytes (256-bit)`));
  console.log(renderKeyValue("Salt length", `${SALT_LENGTH} bytes`));
  console.log(renderKeyValue("IV length", `${IV_LENGTH} bytes`));
  console.log(renderKeyValue("Auth tag", `${AUTH_TAG_LENGTH} bytes (GCM)`));
  console.log(renderKeyValue("At-rest", "AES-256-GCM encrypted"));
  console.log(renderKeyValue("Console", "Values masked by default (**** + sha256 hash)"));
  console.log(renderKeyValue("Reveal", "--reveal flag required to show plaintext"));
  console.log("");
  return { ok: true };
}

export function runVaultSet(root: string, key: string, value: string): { ok: boolean } {
  let vault: Vault;
  try {
    vault = new Vault(root);
  } catch (e) {
    return reportUnavailable(e);
  }
  vault.set(key, value);
  vault.close();
  console.log(renderSuccess(`Stored ${pc.bold(key)} in vault (encoded at rest).`));
  console.log(renderInfo("Value is AES-256-GCM encrypted. Plaintext never written to disk."));
  return { ok: true };
}

export function runVaultGet(root: string, key: string, reveal: boolean): { ok: boolean } {
  let vault: Vault;
  try {
    vault = new Vault(root);
  } catch (e) {
    return reportUnavailable(e);
  }
  const value = vault.get(key);
  vault.close();
  if (value === null) {
    console.log(renderError(`${pc.bold(key)} not found in vault.`));
    return { ok: false };
  }
  console.log(renderHeader(`environmentsentry vault get ${key}`, "Vault value retrieval"));
  if (reveal) {
    console.log(renderKeyValue("Value", value));
    console.log(renderWarn("Plaintext displayed. Handle with care."));
  } else {
    const hash = crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
    console.log(renderKeyValue("Value", "****"));
    console.log(renderKeyValue("Hash", hash + "…"));
    console.log(renderInfo("Use --reveal to show plaintext value."));
  }
  return { ok: true };
}

export function runVaultList(root: string): { ok: boolean } {
  let vault: Vault;
  try {
    vault = new Vault(root);
  } catch (e) {
    return reportUnavailable(e);
  }
  const entries = vault.list();
  vault.close();
  console.log(renderHeader("environmentsentry vault list", "Stored vault keys"));
  if (entries.length === 0) {
    console.log(renderInfo("Vault is empty."));
    return { ok: true };
  }
  console.log("");
  for (const e of entries) {
    const hash = crypto.createHash("sha256").update(e.key + e.updated_at).digest("hex").slice(0, 12);
    console.log(`  ${pc.green("✓")}  ${pc.bold(e.key)}  ${pc.dim(e.updated_at)}  ${pc.dim("hash:" + hash)}`);
  }
  console.log("");
  return { ok: true };
}

export function runVaultInfo(root: string): { ok: boolean } {
  console.log(renderHeader("environmentsentry vault info", "Vault encryption algorithm details"));
  console.log("");
  console.log(renderSection("Algorithm specification"));
  console.log(renderKeyValue("Cipher", CIPHER_ALGORITHM));
  console.log(renderKeyValue("Version", `v${VAULT_VERSION}`));
  console.log(renderKeyValue("Key derivation", "PBKDF2-HMAC-SHA256"));
  console.log(renderKeyValue("Iterations", String(KEY_ITERATIONS)));
  console.log(renderKeyValue("Key length", `${KEY_LENGTH} bytes (256-bit)`));
  console.log(renderKeyValue("Salt length", `${SALT_LENGTH} bytes`));
  console.log(renderKeyValue("IV length", `${IV_LENGTH} bytes`));
  console.log(renderKeyValue("Auth tag", `${AUTH_TAG_LENGTH} bytes (GCM)`));
  console.log("");
  console.log(renderSection("Security properties"));
  console.log(`  ${pc.green("✓")}  Values encrypted at rest in SQLite`);
  console.log(`  ${pc.green("✓")}  Unique salt and IV per value`);
  console.log(`  ${pc.green("✓")}  GCM authentication tag prevents tampering`);
  console.log(`  ${pc.green("✓")}  Plaintext never written to console by default`);
  console.log(`  ${pc.green("✓")}  --reveal flag required to display plaintext`);
  console.log("");
  return { ok: true };
}

export function runVaultRemove(root: string, key: string): { ok: boolean } {
  let vault: Vault;
  try {
    vault = new Vault(root);
  } catch (e) {
    return reportUnavailable(e);
  }
  if (!vault.has(key)) {
    vault.close();
    console.log(renderError(`${pc.bold(key)} not found in vault.`));
    return { ok: false };
  }
  vault.remove(key);
  vault.close();
  console.log(renderSuccess(`Removed ${pc.bold(key)} from vault.`));
  return { ok: true };
}
