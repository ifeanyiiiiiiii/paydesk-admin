/**
 * Builds RFC 4180 CSV text.
 *
 * Values are quoted when they contain a comma, quote or line break. Values
 * starting with = + - @ (or a tab/carriage return) are prefixed with ' so a
 * spreadsheet shows them as text instead of running them as a formula. This
 * blocks "CSV injection", where a customer name like =HYPERLINK(...) would
 * become a live formula on an admin's machine. Pass numbers as numbers: they
 * are written as-is, so negative amounts stay numeric.
 */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number)[])[],
): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  // CRLF line endings, as the spec and Excel expect
  return lines.join("\r\n") + "\r\n";
}

function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  // A plain number like "-50.05" can't be a formula, so leave it numeric
  const isPlainNumber = /^-?\d+(\.\d+)?$/.test(value);
  const safe =
    !isPlainNumber && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
