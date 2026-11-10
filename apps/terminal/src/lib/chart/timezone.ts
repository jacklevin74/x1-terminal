/** Display timezone only. Exchange timestamps and candle sessions remain UTC. */
export function browserChartTimezone(): string {
 try {
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone && zone!=="UTC" ? zone : "Etc/UTC";
 } catch { return "Etc/UTC"; }
}
