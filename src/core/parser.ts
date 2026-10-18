import * as fs from "fs";
import { EnvFile, EnvVar } from "../types";
export function parseEnv(filePath: string): EnvFile { const raw = fs.readFileSync(filePath, "utf8"); return { path: filePath, raw, vars: parseEnvContent(raw) }; }
export function parseEnvContent(raw: string): EnvVar[] {
  const vars: EnvVar[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const cleaned = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const eq = cleaned.indexOf("="); if (eq === -1) continue;
    const key = cleaned.slice(0, eq).trim(); let value = cleaned.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    const hashIdx = value.indexOf(" #"); if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    vars.push({ key, value, required: false });
  }
  return vars;
}
