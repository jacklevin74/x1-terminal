import { TOKEN_ICON_BASE_URL } from "@/config/app";
import { formatDateTime, formatPercent, formatPrice, formatToken, formatUSD } from "@/lib/format";
import type { RangeId } from "./model";

export function usd(v: number | string) {
	return formatUSD(v, { compact: false });
}

export function usdCompact(v: number | string) {
	return formatUSD(v, { compact: true });
}

export function signedUsd(v: number, compact = false) {
	return formatUSD(v, { compact, signDisplay: "exceptZero" });
}

export function pct(v: number, decimals = 2) {
	return formatPercent(v, { decimals, signDisplay: "never" });
}

export function pnlClass(v: number) {
	if (v > 0) return "text-market-up";
	if (v < 0) return "text-market-down";
	return "text-fg";
}

export function axisUsd(v: number, step: number) {
	if (Math.abs(v) < 1000) return formatUSD(v, { compact: false, decimals: 0 });
	const decimals = step >= 1000 && step % 1000 === 0 ? 0 : 1;
	return formatUSD(v, { compact: true, decimals, minimumFractionDigits: 0 });
}

export function niceTicks(min: number, max: number, count = 4) {
	const span = max - min || 1;
	const rough = span / count;
	const mag = 10 ** Math.floor(Math.log10(rough));
	const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= rough) ?? mag * 10;
	const ticks: number[] = [];
	for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
	return { ticks, step };
}

export function timeLabel(ts: number, range: RangeId) {
	if (range === "day")
		return formatDateTime(ts, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
	if (range === "allTime") return formatDateTime(ts, { month: "short", year: "numeric", timeZone: "UTC" });
	return formatDateTime(ts, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function hoverLabel(ts: number) {
	return formatDateTime(ts, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: "UTC",
	});
}

export function rowTime(ts: number) {
	return formatDateTime(ts, {
		month: "2-digit",
		day: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

export function coinName(coin: string) {
	return coin.split(":").at(-1) ?? coin;
}

export function coinDex(coin: string) {
	return coin.includes(":") ? coin.split(":")[0] : null;
}

export function coinIcon(coin: string) {
	return `${TOKEN_ICON_BASE_URL}/${coin}.svg`;
}

function decimalsOf(v: string) {
	const i = v.indexOf(".");
	return i === -1 ? 0 : Math.min(v.length - i - 1, 6);
}

export function px(v: string | number) {
	return formatPrice(v, { style: "decimal", compact: false });
}

export function sizeOf(v: string, coin: string) {
	return formatToken(v, { decimals: decimalsOf(v), symbol: coinName(coin), compact: false });
}
