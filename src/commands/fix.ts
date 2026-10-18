import { detectEnvFiles } from "../core/detector";
import { parseEnv } from "../core/parser";
import { scaffoldEnv } from "../core/scaffold";
import { log } from "../utils/logger";
import { safeWriteFile, fileExists } from "../utils/fs-safe";
import * as fs from "fs";
import {
  renderHeader,
  renderSection,
  renderSuccess,
  renderWarn,
  renderInfo,
  renderError,
} from "../utils/table";

interface FixOptions { file: string; example: string; dryRun?: boolean; }

export async function runFix(opts: FixOptions): Promise<boolean> {
  const detected = detectEnvFiles(process.cwd(), opts.file, opts.example);
  if (!detected.exampleExists) {
    console.log(renderError(`Cannot fix: ${opts.example} not found.`));
    console.log(renderInfo("Create a .env.example listing the variables your app needs."));
    return false;
  }

  const expected = parseEnv(detected.examplePath).vars;
  if (!detected.envExists) {
    const content = scaffoldEnv(expected, opts.example);
    if (opts.dryRun) {
      console.log(renderHeader("environmentsentry fix (dry-run)", "Would create " + opts.file));
      console.log("");
      console.log(content);
      return true;
    }
    safeWriteFile(detected.envPath, content);
    console.log(renderSuccess(`Created ${opts.file} from ${opts.example}`));
    console.log(renderInfo("Now fill in your real values, then run: environmentsentry check"));
    return true;
  }

  const actual = parseEnv(detected.envPath);
  const presentKeys = new Set(actual.vars.map((v) => v.key));
  const missing = expected.filter((v) => v.required && !presentKeys.has(v.key));
  if (missing.length === 0) {
    console.log(renderSuccess(`${opts.file} already has all required keys. Nothing to do.`));
    return true;
  }

  const additions = "\n\n# Added by environmentsentry — fill these in:\n" + missing.map((v) => `${v.key}=`).join("\n") + "\n";
  if (opts.dryRun) {
    console.log(renderHeader("environmentsentry fix (dry-run)", "Would append " + missing.length + " keys to " + opts.file));
    console.log("");
    console.log(additions);
    return true;
  }

  const existing = fileExists(detected.envPath) ? fs.readFileSync(detected.envPath, "utf8") : "";
  safeWriteFile(detected.envPath, existing + additions);
  console.log(renderSuccess(`Appended ${missing.length} missing keys to ${opts.file}`));
  console.log(renderInfo("Fill in their values, then run: environmentsentry check"));
  return true;
}
