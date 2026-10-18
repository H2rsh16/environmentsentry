import * as fs from "fs";
import * as path from "path";

const ENV_RE = /(?:process\.env\.|import\.meta\.env\.)([A-Za-z_][A-Za-z0-9_]*)/g;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "out", "coverage", ".turbo"]);

interface UsageRef { file: string; line: number; col: number; key: string; }
interface ScanResult { used: Map<string, UsageRef[]>; files: string[]; }

function collectSourceFiles(dir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectSourceFiles(full, out);
    } else if (/\.(js|ts|jsx|tsx|mjs|cjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

function scanFile(file: string): UsageRef[] {
  const refs: UsageRef[] = [];
  let content: string;
  try { content = fs.readFileSync(file, "utf8"); } catch { return refs; }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    let match: RegExpExecArray | null;
    ENV_RE.lastIndex = 0;
    while ((match = ENV_RE.exec(line)) !== null) {
      const key = match[1];
      if (key === undefined) continue;
      refs.push({ file, line: i + 1, col: (match.index ?? 0) + 1, key });
    }
  }
  return refs;
}

export function scanUsage(root: string): ScanResult {
  const files: string[] = [];
  collectSourceFiles(root, files);
  const used = new Map<string, UsageRef[]>();
  for (const file of files) {
    for (const ref of scanFile(file)) {
      const arr = used.get(ref.key);
      if (arr) arr.push(ref); else used.set(ref.key, [ref]);
    }
  }
  return { used, files };
}

export function unusedKeys(used: Map<string, any[]>, exampleVars: string[]): string[] {
  const usedKeys = new Set(used.keys());
  return exampleVars.filter((k) => !usedKeys.has(k));
}

export function usedNotInExample(used: Map<string, any[]>, exampleVars: string[]): string[] {
  const exampleKeys = new Set(exampleVars);
  return Array.from(used.keys()).filter((k) => !exampleKeys.has(k));
}
