export type Act = "open-long" | "open-short" | "close-long" | "close-short" | "add" | "trim" | "hold" | "skip";

export interface Row {
	coin: string;
	score: number;
	current: number;
	target: number;
	act: Act;
	note?: string;
}

export const ROWS: Row[] = [
	{
		coin: "HYPE",
		score: 36,
		current: -439.55,
		target: 2.65,
		act: "close-short",
		note: "Then open long $2.66, under $10 minimum",
	},
	{ coin: "NEAR", score: -54, current: 0, target: -3.97, act: "skip", note: "Short $3.84 is under $10 minimum" },
	{ coin: "ETH", score: 52, current: 0, target: 3.82, act: "skip", note: "Long $3.83 is under $10 minimum" },
	{ coin: "SOL", score: -41, current: 0, target: -3.01, act: "skip", note: "Short $2.88 is under $10 minimum" },
	{ coin: "BTC", score: -12, current: 0, target: 0, act: "hold" },
	{ coin: "ZEC", score: -3, current: 0, target: 0, act: "hold" },
];

export const ACT_LABEL: Record<Act, string> = {
	"open-long": "Open long",
	"open-short": "Open short",
	"close-long": "Close long",
	"close-short": "Close short",
	add: "Add",
	trim: "Reduce",
	hold: "No change",
	skip: "Skipped",
};

export const CHECKS = [
	{ label: "Agent approval", ok: true },
	{ label: "Builder fee", ok: true },
	{ label: "Daily loss stop", ok: true },
	{ label: "Fresh signal", ok: true },
	{ label: "Minimum equity", ok: true },
];

export const STATUS = {
	phase: "Paused",
	on: false,
	lastCycle: "10:41 AM",
	nextCycle: "Paused",
	equity: "$44.30",
	dayPnl: "$0.00",
	stopUsed: 0,
	stopLimit: 4.43,
	key: "0x321b…5719",
	expires: "Feb 13",
	note: "No orders sent. Auto Trader is paused.",
};

export const ORDERS = [{ coin: "HYPE", tag: "Close short", buy: true, size: "6.51", px: "$67.47", result: "Planned" }];

export function usd(v: number) {
	if (v === 0) return "$0.00";
	return `${v > 0 ? "+" : "-"}$${Math.abs(v).toFixed(2)}`;
}

export function signed(v: number) {
	return `${v > 0 ? "+" : ""}${v}`;
}
