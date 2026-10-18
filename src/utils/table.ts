import pc from "picocolors";

export interface TableColumn { key: string; header: string; width?: number; align?: "left" | "right"; color?: "ok" | "missing" | "empty" | "invalid" | "unused" | "default"; }

const STATUS_COLOR: Record<string, (s: string) => string> = {
  ok: pc.green,
  missing: pc.red,
  empty: pc.yellow,
  invalid: pc.magenta,
  unused: pc.dim,
  default: (s) => s,
};

const BOX = {
  tl: "┌", tr: "┐", bl: "└", br: "┘",
  h: "─", v: "│",
  cross: "┼", t: "┬", b: "┴", l: "├", r: "┤",
  sep: "─",
};

function measureWidth(text: string): number {
  return text.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function padText(text: string, width: number, align: "left" | "right"): string {
  const len = measureWidth(text);
  if (len >= width) return text.slice(0, width);
  const diff = width - len;
  return align === "right" ? " ".repeat(diff) + text : text + " ".repeat(diff);
}

export function renderTable(columns: TableColumn[], rows: Array<Record<string, string>>): string {
  const cols = columns.map((c) => ({
    ...c,
    width: c.width ?? Math.max(c.header.length, ...rows.map((r) => measureWidth(r[c.key] || ""))),
    align: c.align ?? "left",
  }));

  const hline = (fill: string): string => {
    const parts = cols.map((c) => fill.repeat(c.width + 2));
    return BOX.l + parts.join(BOX.cross) + BOX.r;
  };

  const top = BOX.tl + cols.map((c) => BOX.h.repeat(c.width + 2)).join(BOX.t) + BOX.tr;
  const mid = BOX.l + cols.map((c) => BOX.h.repeat(c.width + 2)).join(BOX.cross) + BOX.r;
  const bot = BOX.bl + cols.map((c) => BOX.h.repeat(c.width + 2)).join(BOX.b) + BOX.br;

  const headerCells = cols.map((c) => " " + pc.bold(pc.cyan(padText(c.header, c.width, "left"))) + " ").join(BOX.v);
  const headerLine = BOX.v + headerCells + BOX.v;

  const rowLines = rows.map((row) => {
    const cells = cols.map((c) => {
      let text = row[c.key] || "";
      if (c.color) text = STATUS_COLOR[c.color](text);
      return " " + padText(text, c.width, c.align) + " ";
    });
    return BOX.v + cells.join(BOX.v) + BOX.v;
  });

  return [top, headerLine, mid, ...rowLines, bot].join("\n");
}

export function renderStatusBadge(status: string): string {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.default;
  const label = status.toUpperCase().padEnd(8);
  return ` ${color(pc.bold(label))} `;
}

export function renderSummaryBox(total: number, ok: number, issues: number, project: string): string {
  const width = 60;
  const line = (text: string, color: (s: string) => string) => "  " + pc.bold(color(text)) + " ".repeat(width - 4 - measureWidth(text)) + "  ";
  const okLine = line(`✓ ${ok} ok`, pc.green);
  const issueLine = line(`✗ ${issues} issue(s)`, issues > 0 ? pc.red : pc.green);
  const totalLine = line(`📦 ${total} variable(s)`, pc.cyan);
  const projLine = line(`📁 ${project}`, pc.dim);

  return [
    pc.bold(pc.magenta("┌" + "─".repeat(width) + "┐")),
    pc.bold(pc.magenta("│")) + projLine + pc.bold(pc.magenta("│")),
    pc.bold(pc.magenta("│")) + okLine + pc.bold(pc.magenta("│")),
    pc.bold(pc.magenta("│")) + issueLine + pc.bold(pc.magenta("│")),
    pc.bold(pc.magenta("│")) + totalLine + pc.bold(pc.magenta("│")),
    pc.bold(pc.magenta("└" + "─".repeat(width) + "┘")),
  ].join("\n");
}

export function renderHeader(title: string, subtitle?: string): string {
  const width = 60;
  const pad = (t: string) => t + " ".repeat(Math.max(0, width - 2 - measureWidth(t)));
  const top = pc.bold(pc.cyan("╔" + "═".repeat(width) + "╗"));
  const titleLine = pc.bold(pc.cyan("║ ")) + pc.bold(pc.white(pad(title))) + pc.bold(pc.cyan(" ║"));
  const subLine = subtitle ? pc.bold(pc.cyan("║ ")) + pc.dim(pad(subtitle)) + pc.bold(pc.cyan(" ║")) : "";
  const bot = pc.bold(pc.cyan("╚" + "═".repeat(width) + "╝"));
  return [top, titleLine, subLine, bot].join("\n");
}

export function renderSection(title: string): string {
  return "\n" + pc.bold(pc.magenta("▸ " + title)) + "\n";
}

export function renderKeyValue(key: string, value: string, color: (s: string) => string = pc.cyan): string {
  return `  ${pc.bold(pc.dim(key + ":"))} ${color(value)}`;
}

export function renderSuccess(msg: string): string { return pc.green("✓ ") + msg; }
export function renderError(msg: string): string { return pc.red("✗ ") + msg; }
export function renderWarn(msg: string): string { return pc.yellow("⚠ ") + msg; }
export function renderInfo(msg: string): string { return pc.cyan("ℹ ") + msg; }
