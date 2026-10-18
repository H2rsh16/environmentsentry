import { safeResolve } from "../utils/fs-safe";
export interface Detected { envPath: string; examplePath: string; envExists: boolean; exampleExists: boolean; }
export function detectEnvFiles(cwd: string, envFile: string, exampleFile: string): Detected {
  const envPath = safeResolve(cwd, envFile);
  const examplePath = safeResolve(cwd, exampleFile);
  const fs = require("fs");
  return { envPath, examplePath, envExists: fs.existsSync(envPath), exampleExists: fs.existsSync(examplePath) };
}
