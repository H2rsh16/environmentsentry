import * as fs from "fs";
import * as path from "path";
import pc from "picocolors";
import { detectEnvFiles } from "../core/detector";
import { parseEnv } from "../core/parser";
import { validate } from "../core/validator";
import {
  renderTable,
  renderHeader,
  renderSection,
  renderSummaryBox,
  renderSuccess,
  renderWarn,
  renderInfo,
} from "../utils/table";
import type { DiagnosisResult } from "../types";

interface ScanOptions { root: string; depth: number; json?: boolean; strict?: boolean; }

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "build", ".next", "out", "coverage", ".turbo"]);

function collectDirs(dir: string, depth: number, out: string[]): void {
  out.push(dir);
  if (depth <= 0) return;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    collectDirs(path.join(dir, entry.name), depth - 1, out);
  }
}

function isProjectDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, ".env.example")) || fs.existsSync(path.join(dir, "package.json"));
}

function checkProject(dir: string): DiagnosisResult | null {
  const detected = detectEnvFiles(dir, ".env", ".env.example");
  const expected = detected.exampleExists ? parseEnv(detected.examplePath).vars : [];
  const actual = detected.envExists ? parseEnv(detected.envPath).vars : [];
  return validate(detected.envPath, expected, actual);
}

function issueCount(r: { result: DiagnosisResult }): number {
  return r.result.summary.missing + r.result.summary.empty + r.result.summary.invalid;
}

function printScanReport(root: string, depth: number, reports: Array<{ dir: string; result: DiagnosisResult }>): void {
  console.log("");
  console.log(renderHeader("environmentsentry scan", "Multi-project environment diagnosis"));
  console.log(pc.dim(`   Root: ${root}`));
  console.log(pc.dim(`   Depth: ${depth}`));
  console.log(`   Found ${reports.length} project(s)`);
  console.log("");

  const withIssues = reports.filter((r) => !r.result.ok);
  const clean = reports.filter((r) => r.result.ok);

  if (withIssues.length > 0) {
    console.log(renderSection("Projects with remaining changes"));
    let n = 0;
    for (const report of withIssues) {
      n++;
      const { result } = report;
      console.log(renderSection(`  ${n}. ${report.dir}`));
      for (const issue of result.issues) {
        const tag = issue.status === "missing" ? pc.red("MISSING") : issue.status === "empty" ? pc.yellow("EMPTY  ") : issue.status === "invalid" ? pc.magenta("INVALID") : pc.dim("UNUSED ");
        console.log(`     [${tag}] ${pc.bold(issue.key)}`);
        if (issue.suggestion) console.log(`            ${pc.cyan("→ " + issue.suggestion)}`);
      }
      console.log("");
      console.log(renderSummaryBox(
        result.summary.ok + result.summary.missing + result.summary.empty + result.summary.invalid + result.summary.unused,
        result.summary.ok,
        result.summary.missing + result.summary.empty + result.summary.invalid + result.summary.unused,
        report.dir,
      ));
      console.log("");
    }
  }

  if (clean.length > 0) {
    console.log(renderSection("Projects with no remaining changes"));
    for (const report of clean) console.log(`  ${pc.green("✓")}  ${pc.bold(report.dir)}`);
    console.log("");
  }

  const totalIssues = withIssues.reduce((sum, r) => sum + r.result.summary.missing + r.result.summary.empty + r.result.summary.invalid, 0);
  const totalVars = reports.reduce((sum, r) => sum + r.result.summary.ok + r.result.summary.missing + r.result.summary.empty + r.result.summary.invalid + r.result.summary.unused, 0);
  const totalOk = reports.reduce((sum, r) => sum + r.result.summary.ok, 0);
  console.log(renderSection("Global Summary"));
  console.log(renderSummaryBox(totalVars, totalOk, totalIssues, "All projects"));
  console.log("");

  if (withIssues.length > 0) {
    console.log(renderWarn("Quick fix: run  environmentsentry fix   (inside each project) to patch missing keys"));
    console.log("");
  } else {
    console.log(renderSuccess("All environment variables across all projects look good!"));
    console.log("");
  }
}

export async function runScan(opts: ScanOptions): Promise<{ ok: boolean }> {
  const root = path.resolve(opts.root);
  const dirs: string[] = [];
  collectDirs(root, opts.depth, dirs);
  const projects = dirs.filter(isProjectDir);
  const reports: Array<{ dir: string; result: DiagnosisResult }> = [];
  for (const dir of projects) {
    const result = checkProject(dir);
    if (result) reports.push({ dir, result });
  }
  reports.sort((a, b) => issueCount(b) - issueCount(a) || a.dir.localeCompare(b.dir));

  if (opts.json) {
    console.log(JSON.stringify(reports.map((r) => ({ dir: r.dir, result: r.result })), null, 2));
  } else {
    printScanReport(root, opts.depth, reports);
  }

  const hasIssues = reports.some((r) => !r.result.ok);
  return { ok: !hasIssues };
}
