/**
 * CSV with RFC 4180 quoting and spreadsheet formula-injection protection: guest-supplied text
 * starting with = + - @ (or tab/CR) is prefixed with an apostrophe so Excel/Sheets treat it as
 * text rather than executing it.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: { header: string; value: (row: T) => unknown }[]): string {
  const head = columns.map((c) => csvCell(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(","));
  // BOM so Excel opens UTF-8 (e.g. "BabyBjörn") correctly.
  return "﻿" + [head, ...body].join("\r\n") + "\r\n";
}
