import { DiagnosisResult, ExplainInput } from "../types";
import pc from "picocolors";
export function printDiagnosis(r: DiagnosisResult): void {
  console.log(""); console.log(pc.bold("🩺  environmentsentry")); console.log(pc.dim(`   File: ${r.file}`)); console.log("");
  const { ok, missing, empty, invalid, unused } = r.summary;
  console.log(`   ${pc.green("✓ " + ok + " ok")}    ${pc.red("✗ " + missing + " missing")}    ${pc.yellow("⚠ " + empty + " empty")}    ${pc.magenta("⚡ " + invalid + " invalid")}    ${pc.dim("ℹ " + unused + " unused")}`);
  console.log("");
  if (r.issues.length === 0) { console.log(pc.green("   ✅ All environment variables look good!")); console.log(""); return; }
  for (const issue of r.issues) {
    const tag = issue.status === "missing" ? pc.red("MISSING") : issue.status === "empty" ? pc.yellow("EMPTY  ") : issue.status === "invalid" ? pc.magenta("INVALID") : pc.dim("UNUSED ");
    console.log(`   [${tag}] ${pc.bold(issue.key)}`);
    if (issue.reason) console.log(`            ${pc.dim(issue.reason)}`);
    if (issue.suggestion) console.log(`            ${pc.cyan("→ " + issue.suggestion)}`);
    console.log("");
  }
  if (!r.ok) { console.log(pc.yellow("   💡 Quick fix: run  environmentsentry fix")); console.log(""); }
}
export interface Explanation { cause: string; file?: string; steps: string[]; }
const PATTERNS: Array<{ match: (i: ExplainInput) => boolean; explain: (i: ExplainInput) => Explanation }> = [
  { match: (i) => /Cannot find module ['"](dotenv|@nestjs\/config|config)/.test(i.stderr || ""), explain: () => ({ cause: "Your app tried to load environment variables but the dotenv/config loader is not installed.", file: "package.json", steps: ["Run: npm install dotenv", "At the very top of your entry file, add: require('dotenv').config()", "Re-run: environmentsentry check"] }) },
  { match: (i) => /missing required env|not set|undefined.*env|process\.env\.\w+ is undefined/i.test(i.stderr || ""), explain: () => ({ cause: "One or more required environment variables are not set.", file: ".env", steps: ["Run: environmentsentry check", "Run: environmentsentry fix   (creates/patches .env from .env.example)", "Fill in the empty values, then re-run your build"] }) },
  { match: (i) => /EADDRINUSE/.test(i.stderr || ""), explain: () => ({ cause: "The port your app wants is already in use.", file: ".env", steps: ["Check the PORT variable in .env", "Run: lsof -i :<port>  (macOS/Linux) to find the process", "Or change PORT in .env to a free number"] }) },
  { match: (i) => /ECONNREFUSED|ETIMEDOUT/.test(i.stderr || ""), explain: () => ({ cause: "The app could not connect to a service (database, API, etc).", file: ".env", steps: ["Verify DATABASE_URL / API endpoints in .env", "Run: environmentsentry check   (validates URL formats)", "Ensure the target service is running locally"] }) },
  { match: (i) => /Invalid URL|ERR_INVALID_URL/.test(i.stderr || ""), explain: () => ({ cause: "An environment variable is expected to be a URL but is malformed.", file: ".env", steps: ["Run: environmentsentry check   (flags invalid URL-shaped vars)", "Fix the flagged variable in .env (must start with http:// or https://)"] }) },
  { match: (i) => i.exitCode === 130, explain: () => ({ cause: "The process was interrupted (Ctrl+C / SIGINT).", steps: ["Re-run the command."] }) },
  { match: (i) => /EACCES/.test(i.stderr || ""), explain: () => ({ cause: "Permission denied — a file or directory cannot be accessed.", file: ".env", steps: ["Check file permissions: ls -l .env", "Run: chmod 600 .env   (secrets should not be world-readable)"] }) },
];
export function explain(input: ExplainInput): Explanation {
  for (const p of PATTERNS) if (p.match(input)) return p.explain(input);
  return { cause: "environmentsentry could not match this error to a known pattern. The most common cause of build failures is a missing or invalid environment variable.", file: ".env", steps: ["Run: environmentsentry check", "If issues are reported, run: environmentsentry fix", "Fill in the flagged values, then re-run your command"] };
}
