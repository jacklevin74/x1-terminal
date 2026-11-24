import type { PoolPosition } from "./pool";

export const levOf = (p: PoolPosition) => Number.parseFloat(p.lev) || 1;
export const marginOf = (p: PoolPosition) => (Math.abs(p.szi) * p.entry) / levOf(p);
export const roeOf = (p: PoolPosition) => p.upnl / marginOf(p);
export const isLong = (p: PoolPosition) => p.szi > 0;
export const liqDistance = (p: PoolPosition) => (p.liq ? Math.abs(p.mark - p.liq) / p.mark : null);
export const moveOf = (p: PoolPosition) => (p.mark - p.entry) / p.entry;
export const pctText = (n: number, signed = true) =>
	`${signed && n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n * 100).toFixed(1)}%`;
export const marginMode = (p: PoolPosition) => (p.lev.includes("iso") ? "Isolated" : "Cross");
export function price(n: number) {
	if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
	if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
	return `$${n.toPrecision(4)}`;
}
export function size(n: number) {
	const a = Math.abs(n);
	if (a >= 1e6) return `${(a / 1e6).toFixed(2)}M`;
	if (a >= 1e3) return `${(a / 1e3).toFixed(1)}K`;
	return a.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
