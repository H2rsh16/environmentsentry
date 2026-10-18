import { DiagnosisResult, EnvVar, VarStatus } from "../types";
const FORMAT_RULES: Array<{ test: (k: string) => boolean; check: (v: string) => string | null }> = [
  { test: (k) => /URL|URI|ENDPOINT/.test(k), check: (v) => /^https?:\/\/[^\s]+$/.test(v) ? null : "Value does not look like a valid URL" },
  { test: (k) => /PORT/.test(k), check: (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 && n < 65536 ? null : "Port must be an integer between 1 and 65535"; } },
  { test: (k) => /^(NODE_ENV|ENV|ENVIRONMENT)$/.test(k), check: (v) => ["development","production","test","staging"].includes(v) ? null : "Expected one of: development, production, test, staging" },
];
function validateValue(key: string, value: string | undefined, envName: string, exampleName: string): { status: VarStatus; reason?: string; suggestion?: string } {
  if (value === undefined) return { status: "missing", reason: `Variable is not defined in your ${envName} file.`, suggestion: `Add ${key}=<value> to your ${envName} (see ${exampleName}).` };
  if (value === "") return { status: "empty", reason: `Variable exists but has an empty value.`, suggestion: `Set a value for ${key} in your ${envName} file.` };
  for (const rule of FORMAT_RULES) if (rule.test(key)) { const err = rule.check(value); if (err) return { status: "invalid", reason: err, suggestion: `Update ${key} in ${envName}. ${err}.` }; }
  return { status: "ok" };
}
export function validate(file: string, expected: EnvVar[], actual: EnvVar[], exampleName = ".env.example"): DiagnosisResult {
  const envName = file.slice(file.lastIndexOf("/") + 1) || ".env";
  const actualMap = new Map(actual.map((v) => [v.key, v]));
  const expectedMap = new Map(expected.map((v) => [v.key, v]));
  const issues: EnvVar[] = []; let ok = 0;
  for (const exp of expected) { const act = actualMap.get(exp.key); const { status, reason, suggestion } = validateValue(exp.key, act?.value, envName, exampleName); if (status === "ok") ok++; else issues.push({ key: exp.key, required: true, status, reason, suggestion }); }
  for (const act of actual) if (!expectedMap.has(act.key)) issues.push({ key: act.key, required: false, status: "unused", reason: `Variable is defined in ${envName} but not listed in ${exampleName}.`, suggestion: `Add ${act.key}= to ${exampleName} for documentation, or remove it from ${envName} if unused.` });
  const summary = { total: expected.length + actual.filter((a) => !expectedMap.has(a.key)).length, ok, missing: issues.filter((i) => i.status === "missing").length, empty: issues.filter((i) => i.status === "empty").length, invalid: issues.filter((i) => i.status === "invalid").length, unused: issues.filter((i) => i.status === "unused").length };
  return { file, checkedAt: new Date().toISOString(), summary, issues, ok: summary.missing + summary.empty + summary.invalid === 0 };
}
