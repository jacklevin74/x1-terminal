// Round 2 of the auto guard. Example account and positions come from round 1 by import
// (../auto-guard/snapshot.json, real positions of pool trader 0x0ca4…0fa8, fetched once).
// Austin's spec: no keep/close prediction per position. Warn that open positions may be adjusted or
// closed, offer Continue or Create a sub-account. While live, close buttons show locked.
export { account, coinLabel, type Position, positions, signedUsd, sizeText, usd } from "../auto-guard/data";

export type Scene = "start" | "sub" | "close";

export interface Props {
	scene: Scene;
	mobile?: boolean;
}

export const WARNING = "These open positions may be adjusted or closed by Auto Trader.";
export const LOCK_TITLE = "Turn off Auto Trader first";
export const SUB_DEFAULT_NAME = "Auto Trader";

export function lockBody(coin: string | null) {
	const what = coin ? `${coin} by hand` : "positions by hand";
	return `Auto Trader is on. If you close ${what} now, it will likely reopen the position right after.`;
}
