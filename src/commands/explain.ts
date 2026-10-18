import { explain } from "../core/explainer";
import { log } from "../utils/logger";
import {
  renderHeader,
  renderSection,
  renderError,
  renderInfo,
} from "../utils/table";

interface ExplainOptions { command?: string; exitCode?: number; stderr?: string; }

export async function runExplain(opts: ExplainOptions): Promise<void> {
  if (!opts.command && opts.exitCode === undefined && !opts.stderr) {
    console.log(renderError("Provide at least one of: --command, --exit-code, --stderr"));
    process.exit(2);
  }
  const result = explain({ command: opts.command, exitCode: opts.exitCode, stderr: opts.stderr });

  console.log(renderHeader("environmentsentry explain", "Error diagnosis"));
  console.log("");
  console.log(renderSection("What happened:"));
  console.log("   " + result.cause + "\n");
  if (result.file) {
    console.log(renderSection("Likely file:"));
    console.log("   " + result.file + "\n");
  }
  console.log(renderSection("Suggested fix:"));
  result.steps.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));
  console.log("");
}
