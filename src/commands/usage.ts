import * as fs from "fs";
import * as path from "path";
import pc from "picocolors";
import { detectEnvFiles } from "../core/detector";
import { parseEnv } from "../core/parser";
import { scanUsage, unusedKeys, usedNotInExample } from "../core/usage-scanner";
import {
  renderTable,
  renderHeader,
  renderSection,
  renderKeyValue,
  renderSuccess,
  renderWarn,
  renderInfo,
} from "../utils/table";
import { log } from "../utils/logger";

interface UsageOptions { root: string; json?: boolean; watch?: boolean; include?: string; exclude?: string; }

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "out", "coverage", ".turbo"]);

function matchesGlob(name: string, pattern: string): boolean {
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
  return regex.test(name);
}

function shouldInclude(filePath: string, include?: string, exclude?: string): boolean {
  const name = path.basename(filePath);
  if (include && !matchesGlob(name, include)) return false;
  if (exclude && matchesGlob(name, exclude)) return false;
  return true;
}

export function scanUsageDir(root: string, depth: number, include?: string, exclude?: string): { used: Map<string, string[]>; files: string[] } {
  const files: string[] = [];
  collectSourceFiles(root, depth, files, include, exclude);
  const ENV_RE = /(?:process\.env\.|import\.meta\.env\.)([A-Za-z_][A-Za-z0-9_]*)/g;
  const used = new Map<string, string[]>();
  for (const file of files) {
    let content: string;
    try { content = fs.readFileSync(file, "utf8"); } catch { continue; }
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      ENV_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = ENV_RE.exec(line)) !== null) {
        const key = match[1];
        if (key === undefined) continue;
        const arr = used.get(key);
        if (arr) arr.push(file + ":" + (i + 1)); else used.set(key, [file + ":" + (i + 1)]);
      }
    }
  }
  return { used, files };
}

function collectSourceFiles(dir: string, depth: number, out: string[], include?: string, exclude?: string): void {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (exclude && matchesGlob(entry.name, exclude)) continue;
      collectSourceFiles(full, depth - 1, out, include, exclude);
    } else if (/\.(js|ts|jsx|tsx|mjs|cjs)$/.test(entry.name)) {
      if (shouldInclude(full, include, exclude)) out.push(full);
    }
  }
}

export async function runUsage(opts: UsageOptions): Promise<{ ok: boolean }> {
  const root = path.resolve(opts.root);
  const detected = detectEnvFiles(root, ".env", ".env.example");
  const exampleVars = detected.exampleExists ? parseEnv(detected.examplePath).vars.map((v) => v.key) : [];
  const actualVars = detected.envExists ? parseEnv(detected.envPath).vars.map((v) => v.key) : [];
  const { used, files } = scanUsageDir(root, 10, opts.include, opts.exclude);
  const unUsed = unusedKeys(used, exampleVars);
  const usedNotExample = usedNotInExample(used, exampleVars);
  const usedKeys = new Set(used.keys());
  const actualUsed = actualVars.filter((k) => usedKeys.has(k));
  const actualUnused = actualVars.filter((k) => !usedKeys.has(k));

  if (opts.json) {
    const out = {
      root, files,
      used: Array.from(used.entries()).map(([key, refs]) => ({ key, count: refs.length, references: refs })),
      unused_from_example: unUsed,
      used_not_in_example: usedNotExample,
      actual_used: actualUsed,
      actual_unused: actualUnused,
    };
    console.log(JSON.stringify(out, null, 2));
    return { ok: true };
  }

  const printReport = () => {
    process.stdout.write("\x1b[2J\x1b[H");
    console.log("");
    console.log(renderHeader("environmentsentry usage", "Source-code env variable references"));
    console.log(pc.dim(`   Root: ${root}`));
    console.log(pc.dim(`   Files scanned: ${files.length}`));
    console.log("");

    if (used.size > 0) {
      console.log(renderSection("Variables used in source code"));
      const rows = Array.from(used.entries()).map(([key, refs]) => {
        const first = refs[0];
        if (first === undefined) {
          return { key: pc.bold(key), count: String(refs.length), first_file: "", first_line: "0" };
        }
        const parts = first.split(":");
        return {
          key: pc.bold(key),
          count: String(refs.length),
          first_file: path.relative(root, parts[0] ?? ""),
          first_line: parts[1] ?? "0",
        };
      });
      console.log(renderTable(
        [
          { key: "key", header: "Variable", width: 24, align: "left" },
          { key: "count", header: "Usages", width: 10, align: "right" },
          { key: "first_file", header: "First File", width: 32, align: "left" },
          { key: "first_line", header: "Line", width: 6, align: "right" },
        ],
        rows,
      ));
      console.log("");
    }

    if (unUsed.length > 0) {
      console.log(renderSection("Variables in .env.example but not used in source"));
      for (const key of unUsed) console.log(`  ${pc.red("UNUSED")}  ${pc.bold(key)}`);
      console.log("");
    }

    if (usedNotExample.length > 0) {
      console.log(renderSection("Variables used in source but missing from .env.example"));
      for (const key of usedNotExample) console.log(`  ${pc.red("MISSING")}  ${pc.bold(key)}`);
      console.log("");
    }

    if (actualUnused.length > 0) {
      console.log(renderSection("Variables in .env but not referenced in source"));
      for (const key of actualUnused) console.log(`  ${pc.dim("IDLE")}  ${pc.bold(key)}`);
      console.log("");
    }

    if (used.size === 0 && unUsed.length === 0 && usedNotExample.length === 0 && actualUnused.length === 0) {
      console.log(renderSuccess("No environment variable usage found."));
      console.log("");
    }
  };

  printReport();

  if (opts.watch) {
    console.log(renderInfo("Watching for changes… (press Ctrl+C to stop)"));
    let timer: NodeJS.Timeout | null = null;
    const rescan = () => {
      const { used: u2, files: f2 } = scanUsageDir(root, 10, opts.include, opts.exclude);
      const unUsed2 = unusedKeys(u2, exampleVars);
      const usedNotExample2 = usedNotInExample(u2, exampleVars);
      const usedKeys2 = new Set(u2.keys());
      const actualUnused2 = actualVars.filter((k) => !usedKeys2.has(k));
      process.stdout.write("\x1b[2J\x1b[H");
      console.log("");
      console.log(renderHeader("environmentsentry usage (watch mode)", "Source-code env variable references"));
      console.log(pc.dim(`   Root: ${root}`));
      console.log(pc.dim(`   Files scanned: ${f2.length}`));
      console.log("");
      if (u2.size > 0) {
        console.log(renderSection("Variables used in source code"));
        const rows = Array.from(u2.entries()).map(([key, refs]) => {
          const first = refs[0];
          if (first === undefined) {
            return { key: pc.bold(key), count: String(refs.length), first_file: "", first_line: "0" };
          }
          const parts = first.split(":");
          return {
            key: pc.bold(key),
            count: String(refs.length),
            first_file: path.relative(root, parts[0] ?? ""),
            first_line: parts[1] ?? "0",
          };
        });
        console.log(renderTable(
          [
            { key: "key", header: "Variable", width: 24, align: "left" },
            { key: "count", header: "Usages", width: 10, align: "right" },
            { key: "first_file", header: "First File", width: 32, align: "left" },
            { key: "first_line", header: "Line", width: 6, align: "right" },
          ],
          rows,
        ));
        console.log("");
      }
      if (unUsed2.length > 0) {
        console.log(renderSection("Variables in .env.example but not used in source"));
        for (const key of unUsed2) console.log(`  ${pc.red("UNUSED")}  ${pc.bold(key)}`);
        console.log("");
      }
      if (usedNotExample2.length > 0) {
        console.log(renderSection("Variables used in source but missing from .env.example"));
        for (const key of usedNotExample2) console.log(`  ${pc.red("MISSING")}  ${pc.bold(key)}`);
        console.log("");
      }
      if (actualUnused2.length > 0) {
        console.log(renderSection("Variables in .env but not referenced in source"));
        for (const key of actualUnused2) console.log(`  ${pc.dim("IDLE")}  ${pc.bold(key)}`);
        console.log("");
      }
    };
    timer = setInterval(rescan, 2000);
    process.on("SIGINT", () => { if (timer) clearInterval(timer); process.exit(0); });
  }
  return { ok: true };
}
