export type VarStatus = "ok" | "missing" | "empty" | "invalid" | "unused";
export interface EnvVar { key: string; value?: string; required: boolean; comment?: string; status?: VarStatus; reason?: string; suggestion?: string; }
export interface EnvFile { path: string; vars: EnvVar[]; raw: string; }
export interface DiagnosisResult { file: string; checkedAt: string; summary: { total: number; ok: number; missing: number; empty: number; invalid: number; unused: number; }; issues: EnvVar[]; ok: boolean; }
export interface ExplainInput { command?: string; exitCode?: number; stderr?: string; }
