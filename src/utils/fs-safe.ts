import * as fs from "fs";
import * as path from "path";
export function safeResolve(cwd: string, p: string): string {
  const resolved = path.resolve(cwd, p);
  const rel = path.relative(cwd, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(`Unsafe path (outside project dir): ${p}`);
  return resolved;
}
export function fileExists(p: string): boolean { try { return fs.statSync(p).isFile(); } catch { return false; } }
export function safeWriteFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, { mode: 0o600 });
}
