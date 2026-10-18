import type BetterSqlite3 from "better-sqlite3";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const DB_NAME = ".environmentsentry-vault.sqlite";
const KEY_FILE = ".environmentsentry-vault.key";

const VAULT_VERSION = 1;
const CIPHER_ALGORITHM = "aes-256-gcm";
const KEY_ITERATIONS = 210000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export const VAULT_SETUP_COMMANDS = [
  "npm install -g environmentsentry --allow-scripts=better-sqlite3",
  "npm config set allow-scripts=better-sqlite3 --location=user",
  'or add "allowScripts": { "better-sqlite3": true } to your project package.json',
];

export class VaultUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultUnavailableError";
  }
}

let cachedModule: typeof BetterSqlite3 | null = null;
let cachedFailure: string | null = null;

function loadSqlite(): typeof BetterSqlite3 {
  if (cachedModule) return cachedModule;
  if (cachedFailure !== null) throw new VaultUnavailableError(cachedFailure);
  try {
    const loaded = require("better-sqlite3") as typeof BetterSqlite3;
    const probe = new loaded(":memory:");
    probe.close();
    cachedModule = loaded;
    return loaded;
  } catch (e) {
    cachedFailure = "the better-sqlite3 native module is not built in this installation (" + (e as Error).message.split("\n")[0] + "). npm blocks dependency install scripts by default, so the native SQLite binary was never compiled.";
    throw new VaultUnavailableError(cachedFailure);
  }
}

export function isVaultAvailable(): boolean {
  try {
    loadSqlite();
    return true;
  } catch {
    return false;
  }
}

function vaultPath(root: string): string { return path.join(root, DB_NAME); }
function keyPath(root: string): string { return path.join(root, KEY_FILE); }

function deriveKey(pass: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(pass, salt, KEY_ITERATIONS, KEY_LENGTH, "sha256");
}

function encryptValue(value: string, pass: string): string {
  const versionBuf = Buffer.from([VAULT_VERSION]);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(pass, salt);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);
  cipher.setAAD(versionBuf);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const auth = cipher.getAuthTag();
  return Buffer.concat([versionBuf, salt, iv, auth, enc]).toString("base64");
}

function decryptValue(encoded: string, pass: string): string {
  const data = Buffer.from(encoded, "base64");
  const version = data.readUInt8(0);
  if (version !== VAULT_VERSION) throw new Error(`Unsupported vault version: ${version}`);
  const salt = data.subarray(1, 1 + SALT_LENGTH);
  const iv = data.subarray(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
  const auth = data.subarray(1 + SALT_LENGTH + IV_LENGTH, 1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const enc = data.subarray(1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const key = deriveKey(pass, salt);
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);
  decipher.setAuthTag(auth);
  decipher.setAAD(Buffer.from([VAULT_VERSION]));
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

function getPass(root: string): string {
  const envPass = process.env.ENV_DOCTOR_VAULT_PASS;
  if (envPass) return envPass;
  const kp = keyPath(root);
  if (fs.existsSync(kp)) return fs.readFileSync(kp, "utf8").trim();
  const pass = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(kp, pass, { mode: 0o600 });
  return pass;
}

export interface VaultEntry { key: string; updated_at: string; }

export class Vault {
  private db: BetterSqlite3.Database;
  private pass: string;
  constructor(root: string) {
    const Sqlite = loadSqlite();
    this.pass = getPass(root);
    this.db = new Sqlite(vaultPath(root));
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vault (
        key TEXT PRIMARY KEY,
        value_encoded TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }
  set(key: string, value: string): void {
    const encoded = encryptValue(value, this.pass);
    const now = new Date().toISOString();
    this.db.prepare("INSERT INTO vault(key, value_encoded, updated_at) VALUES(?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_encoded=excluded.value_encoded, updated_at=excluded.updated_at").run(key, encoded, now);
  }
  get(key: string): string | null {
    const row = this.db.prepare("SELECT value_encoded FROM vault WHERE key = ?").get(key) as { value_encoded: string } | undefined;
    if (!row) return null;
    return decryptValue(row.value_encoded, this.pass);
  }
  has(key: string): boolean {
    return this.db.prepare("SELECT 1 FROM vault WHERE key = ?").get(key) !== undefined;
  }
  list(): VaultEntry[] {
    return this.db.prepare("SELECT key, updated_at FROM vault ORDER BY key").all() as VaultEntry[];
  }
  remove(key: string): void {
    this.db.prepare("DELETE FROM vault WHERE key = ?").run(key);
  }
  close(): void { this.db.close(); }
}

export { CIPHER_ALGORITHM, VAULT_VERSION, KEY_ITERATIONS, KEY_LENGTH, SALT_LENGTH, IV_LENGTH, AUTH_TAG_LENGTH };
