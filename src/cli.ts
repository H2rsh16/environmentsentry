#!/usr/bin/env node
import { Command } from "commander";
import { runCheck } from "./commands/check";
import { runFix } from "./commands/fix";
import { runExplain } from "./commands/explain";
import { runInit } from "./commands/init";
import { runScan } from "./commands/scan";
import { runUsage } from "./commands/usage";
import { runExample } from "./commands/example";
import { runProd } from "./commands/prod";
import { runVaultInit, runVaultSet, runVaultGet, runVaultList, runVaultRemove, runVaultInfo } from "./commands/vault";
import { log } from "./utils/logger";
import {
  renderHeader,
  renderSection,
  renderInfo,
} from "./utils/table";

const program = new Command();
program.name("environmentsentry")
  .description("🩺 Deterministic, offline-first environment variable scanner.\nDiagnose missing/invalid env vars, explain errors in plain English, and fix them.")
  .version(require("../package.json").version, "-v, --version", "print version")
  .helpOption("-h, --help", "show help");

program.command("check").alias("doctor")
  .description("Check environment variables against .env.example and report problems (styled table view)")
  .option("-f, --file <path>", "path to .env file", ".env")
  .option("-e, --example <path>", "path to example file", ".env.example")
  .option("--json", "output machine-readable JSON", false)
  .option("--strict", "exit with code 1 on any issue", true)
  .option("--watch", "re-scan on changes (interactive terminal)", false)
  .option("--include <glob>", "only include files matching glob (e.g. *.ts)")
  .option("--exclude <glob>", "exclude files/folders matching glob (e.g. node_modules)")
  .action(async (opts) => { try { const r = await runCheck(opts); process.exit(r.ok || !opts.strict ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });

program.command("fix")
  .description("Auto-create missing env vars from .env.example (safe: never overwrites)")
  .option("-f, --file <path>", "path to .env file", ".env")
  .option("-e, --example <path>", "path to example file", ".env.example")
  .option("--dry-run", "show what would be written", false)
  .action(async (opts) => { try { const r = await runFix(opts); process.exit(r ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });

program.command("explain")
  .description("Explain a failed command / exit code / stack trace in plain English")
  .option("-c, --command <cmd>", "the command that failed")
  .option("-x, --exit-code <code>", "exit code", (v) => parseInt(v, 10))
  .option("-s, --stderr <text>", "captured stderr output")
  .action(async (opts) => { try { await runExplain(opts); process.exit(0); } catch (e) { log.error((e as Error).message); process.exit(2); } });

program.command("init")
  .description("Bootstrap a .env.example from your current .env (keys only, values masked)")
  .option("-f, --file <path>", "path to .env file", ".env")
  .option("-o, --out <path>", "output example file", ".env.example")
  .action(async (opts) => { try { const ok = await runInit(opts); process.exit(ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });

program.command("scan")
  .description("Scan all projects under a root and list remaining env changes")
  .option("-r, --root <path>", "root directory to scan", process.cwd())
  .option("-d, --depth <n>", "max directory depth", (v) => parseInt(v, 10), 3)
  .option("--json", "output machine-readable JSON", false)
  .option("--strict", "exit with code 1 if any project has issues", false)
  .option("--include <glob>", "only include folders matching glob")
  .option("--exclude <glob>", "exclude folders matching glob")
  .action(async (opts) => { try { const r = await runScan(opts); process.exit(r.ok || !opts.strict ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });

program.command("usage")
  .description("Scan source code for env var usage with file location and line number (styled table view)")
  .option("-r, --root <path>", "root directory to scan", process.cwd())
  .option("--json", "output machine-readable JSON", false)
  .option("--watch", "re-scan on changes (interactive terminal)", false)
  .option("--include <glob>", "only include files matching glob (e.g. *.ts)")
  .option("--exclude <glob>", "exclude files/folders matching glob (e.g. node_modules)")
  .action(async (opts) => { try { const r = await runUsage(opts); process.exit(r.ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });

program.command("example")
  .description("Generate .env.example from source-code env var usage")
  .option("-r, --root <path>", "root directory to scan", process.cwd())
  .option("-o, --out <path>", "output example file", ".env.example")
  .option("--include <glob>", "only include files matching glob (e.g. *.ts)")
  .option("--exclude <glob>", "exclude files/folders matching glob (e.g. node_modules)")
  .action(async (opts) => { try { const r = await runExample(opts); process.exit(r.ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });

program.command("prod")
  .description("Validate, create .env.production, and run tests")
  .option("-r, --root <path>", "root directory", process.cwd())
  .option("--force", "overwrite existing .env.production and proceed despite validation issues", false)
  .action(async (opts) => { try { const r = await runProd(opts); process.exit(r.ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });

const vault = program.command("vault").description("Encode and store env values in a local encrypted database (values never exposed in plaintext by default)");
vault.command("init").description("Initialize the vault database").action((opts) => { try { const r = runVaultInit(process.cwd()); process.exit(r.ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });
vault.command("info").description("Show vault encryption algorithm details").action(() => { try { const r = runVaultInfo(process.cwd()); process.exit(r.ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });
vault.command("set <key> <value>").description("Store an encoded value in the vault").action((key, value) => { try { const r = runVaultSet(process.cwd(), key, value); process.exit(r.ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });
vault.command("get <key>").description("Read a value from the vault (masked by default; use --reveal to show plaintext)").option("--reveal", "show plaintext value").action((key, opts) => { try { const r = runVaultGet(process.cwd(), key, !!opts.reveal); process.exit(r.ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });
vault.command("list").description("List vault keys without exposing values").action(() => { try { const r = runVaultList(process.cwd()); process.exit(r.ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });
vault.command("remove <key>").description("Remove a key from the vault").action((key) => { try { const r = runVaultRemove(process.cwd(), key); process.exit(r.ok ? 0 : 1); } catch (e) { log.error((e as Error).message); process.exit(2); } });

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(renderHeader("environmentsentry", "Deterministic, offline-first env scanner"));
  console.log("");
  console.log(renderSection("Available commands"));
  console.log("  check     Diagnose env vars against .env.example (styled table)");
  console.log("  fix       Auto-create missing env vars from .env.example");
  console.log("  init      Bootstrap .env.example from current .env");
  console.log("  explain   Explain a failed command in plain English");
  console.log("  scan      Scan all projects under a root");
  console.log("  usage     Scan source code for env var usage with file:line");
  console.log("  example   Generate .env.example from source-code usage");
  console.log("  prod      Validate, create .env.production, and run tests");
  console.log("  vault     Encrypted vault for env values (AES-256-GCM)");
  console.log("");
  console.log(renderInfo("Run: environmentsentry -h   for full help"));
  console.log("");
  process.exit(0);
} else {
  program.parseAsync(process.argv);
}
