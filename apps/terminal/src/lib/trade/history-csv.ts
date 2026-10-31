export function historyCsv(rows: readonly (readonly (string | number)[])[]): string {
 return rows.map(row => row.map(value => {
  let text = String(value);
  // Keep numeric negatives while preventing spreadsheet formulas in text fields.
  if (/^[=+@\t\r]/.test(text) || (/^-/.test(text) && !/^-\d+(\.\d+)?$/.test(text))) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
 }).join(",")).join("\r\n");
}
export function downloadHistoryCsv(rows: readonly (readonly (string | number)[])[], filename: string) {
 const url = URL.createObjectURL(new Blob([historyCsv(rows)], { type: "text/csv;charset=utf-8" }));
 const link = document.createElement("a"); link.href = url; link.download = filename;
 document.body.append(link); link.click(); link.remove();
 window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
