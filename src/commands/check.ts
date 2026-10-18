import * as fs from "fs";
import * as path from "path";
import pc from "picocolors";
import { detectEnvFiles } from "../core/detector";
import { parseEnv } from "../core/parser";
import { validate } from "../core/validator";
import {
  renderTable,
  renderStatusBadge,
  renderSummaryBox,
  renderHeader,
  renderSection,
  renderKeyValue,
  renderSuccess,
  renderError,
  renderWarn,
  renderInfo,
} from "../utils/table";
import type { DiagnosisResult } from "../types";
import { log } from "../utils/logger";

interface CheckOptions { file: string; example: string; json?: boolean; strict?: boolean; watch?: boolean; include?: string; exclude?: string; }

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "out", "coverage", ".turbo"]);

function matchesGlob(name: string, pattern: string): boolean {
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
  return regex.test(name);
}

function shouldInclude(dirPath: string, include?: string, exclude?: string): boolean {
  const name = path.basename(dirPath);
  if (include && !matchesGlob(name, include)) return false;
  if (exclude && matchesGlob(name, exclude)) return false;
  return true;
}

function collectProjectDirs(dir: string, depth: number, out: string[]): void {
  out.push(dir);
  if (depth <= 0) return;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    collectProjectDirs(path.join(dir, entry.name), depth - 1, out);
  }
}

function isProjectDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, ".env.example")) || fs.existsSync(path.join(dir, "package.json"));
}

function checkProject(dir: string, file: string, example: string): DiagnosisResult | null {
  const detected = detectEnvFiles(dir, file, example);
  const expected = detected.exampleExists ? parseEnv(detected.examplePath).vars : [];
  const actual = detected.envExists ? parseEnv(detected.envPath).vars : [];
  return validate(detected.envPath, expected, actual);
}

function maskValue(): string { return "****"; }

function hashValue(value?: string): string {
  if (!value) return "—";
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12) + "…";
}

function statusColor(status: string): (s: string) => string {
  switch (status) {
    case "ok": return pc.green;
    case "missing": return pc.red;
    case "empty": return pc.yellow;
    case "invalid": return pc.magenta;
    case "unused": return pc.dim;
    default: return (s) => s;
  }
}

function printCheckTable(root: string, reports: Array<{ dir: string; result: DiagnosisResult }>): void {
  console.log("");
  console.log(renderHeader("environmentsentry check", "Environment variable diagnosis"));
  console.log(pc.dim(`   Root: ${root}`));
  console.log("");

  let totalOk = 0;
  let totalIssues = 0;
  let totalVars = 0;

  for (const report of reports) {
    const { result } = report;
    const project = path.relative(root, report.dir) || ".";
    totalOk += result.summary.ok;
    totalIssues += result.summary.missing + result.summary.empty + result.summary.invalid + result.summary.unused;
    totalVars += result.summary.ok + result.summary.missing + result.summary.empty + result.summary.invalid + result.summary.unused;

    const rows = result.issues.map((issue) => ({
      project,
      key: pc.bold(issue.key),
      status: renderStatusBadge(issue.status ?? "ok"),
      value: maskValue(),
      hash: hashValue(issue.value),
      suggestion: issue.suggestion ?? "—",
    }));

    console.log(renderSection(`Project: ${project}`));
    if (rows.length === 0) {
      console.log(renderSuccess("All environment variables look good!"));
      console.log("");
      continue;
    }
    console.log(renderTable(
      [
        { key: "project", header: "Project", width: 20, align: "left", color: "default" },
        { key: "key", header: "Variable", width: 24, align: "left", color: "default" },
        { key: "status", header: "Status", width: 10, align: "left", color: "default" },
        { key: "value", header: "Value", width: 10, align: "left", color: "default" },
        { key: "hash", header: "Hash", width: 14, align: "left", color: "default" },
        { key: "suggestion", header: "Suggestion", width: 42, align: "left", color: "default" },
      ],
      rows,
    ));
    console.log("");
    console.log(renderSummaryBox(
      result.summary.ok + result.summary.missing + result.summary.empty + result.summary.invalid + result.summary.unused,
      result.summary.ok,
      result.summary.missing + result.summary.empty + result.summary.invalid + result.summary.unused,
      project,
    ));
    console.log("");
  }

  console.log(renderSection("Global Summary"));
  console.log(renderSummaryBox(totalVars, totalOk, totalIssues, "All projects"));
  console.log("");
  if (totalIssues > 0) {
    console.log(renderWarn("Quick fix: run  environmentsentry fix   (inside each project) to patch missing keys"));
    console.log("");
  } else {
    console.log(renderSuccess("All environment variables across all projects look good!"));
    console.log("");
  }
}

export async function runCheck(opts: CheckOptions): Promise<{ ok: boolean }> {
  const root = path.resolve(process.cwd());
  const dirs: string[] = [];
  collectProjectDirs(root, 3, dirs);
  const projects = dirs.filter(isProjectDir).filter((d) => shouldInclude(d, opts.include, opts.exclude));
  const reports: Array<{ dir: string; result: DiagnosisResult }> = [];
  for (const dir of projects) {
    const result = checkProject(dir, opts.file, opts.example);
    if (result) reports.push({ dir, result });
  }
  reports.sort((a, b) => a.dir.localeCompare(b.dir));

  if (opts.json) {
    console.log(JSON.stringify(reports.map((r) => ({ dir: r.dir, result: r.result })), null, 2));
  } else {
    printCheckTable(root, reports);
  }

  const hasIssues = reports.some((r) => !r.result.ok);
  if (opts.watch) {
    console.log(renderInfo("Watching for changes… (press Ctrl+C to stop)"));
    let timer: NodeJS.Timeout | null = null;
    const rescan = () => {
      const reports2: Array<{ dir: string; result: DiagnosisResult }> = [];
      for (const dir of projects) {
        const result = checkProject(dir, opts.file, opts.example);
        if (result) reports2.push({ dir, result });
      }
      reports2.sort((a, b) => a.dir.localeCompare(b.dir));
      process.stdout.write("\x1b[2J\x1b[H");
      printCheckTable(root, reports2);
    };
    timer = setInterval(rescan, 2000);
    process.on("SIGINT", () => { if (timer) clearInterval(timer); process.exit(0); });
    return { ok: !hasIssues };
  }
  return { ok: !hasIssues };
}
