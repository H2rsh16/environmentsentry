import pc from "picocolors";
export const log = { info: (m: string) => console.log(pc.cyan("ℹ ") + m), success: (m: string) => console.log(pc.green("✓ ") + m), warn: (m: string) => console.warn(pc.yellow("⚠ ") + m), error: (m: string) => console.error(pc.red("✗ ") + m) };
