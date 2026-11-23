// Round 2 of the mood basket picker. Data, pool and score math come from round 1 by import
// (../mood-traders/snapshot.json, real pool snapshot, fetched once).
// "Edited" state: the 8 traders with the lowest all-time PNL are removed. That moves HYPE from +20 to +4.
import { useEffect, useRef } from "react";
import { ALL, moodFor, type Trader, traders } from "../mood-traders/data";

export {
	ALL,
	coin,
	flat,
	holders,
	isLong,
	MARKET,
	moodFor,
	poolMood,
	sizeText,
	type Trader,
	traderLabel,
	traders,
} from "../mood-traders/data";

export const EDIT_ORDER = [...traders]
	.sort((a, b) => a.pnlAll - b.pnlAll)
	.slice(0, 8)
	.map((t) => t.usr);

export const byUsr = new Map(traders.map((t) => [t.usr, t]));

export interface Change {
	id: number;
	usr: string;
	added: boolean;
	before: number;
	after: number;
}

export interface BasketProps {
	selected: ReadonlySet<string>;
	changes: Change[];
	last: Change | null;
	toggle: (usr: string) => void;
	undo: () => void;
	reset: () => void;
	replace: (next: Set<string>) => void;
	edited: boolean;
}

export const scoreOf = (sel: ReadonlySet<string>) => moodFor(sel).score;

/** Score change if this trader is toggled from the current selection. */
export function impactOf(sel: ReadonlySet<string>, usr: string) {
	const next = new Set(sel);
	if (next.has(usr)) next.delete(usr);
	else next.add(usr);
	return scoreOf(next) - scoreOf(sel);
}

export function signedDelta(n: number) {
	if (n > 0) return `+${n}`;
	if (n < 0) return `−${-n}`;
	return "±0";
}

export function positionText(t: Trader) {
	if (!t.pos) return "No HYPE position";
	const side = t.pos.szi > 0 ? "Long" : "Short";
	const ntl = t.pos.ntl >= 1e6 ? `$${(t.pos.ntl / 1e6).toFixed(1)}M` : `$${Math.round(t.pos.ntl / 1e3)}K`;
	return `${side} ${ntl}`;
}

export const isAll = (sel: ReadonlySet<string>) => sel.size === ALL.length;

/** Plays a short rise-and-fade on the element each time `id` changes after mount. */
export function useFlash<T extends HTMLElement>(id: number | undefined) {
	const ref = useRef<T>(null);
	const seen = useRef(id);
	useEffect(() => {
		if (id === undefined || id === seen.current) return;
		seen.current = id;
		ref.current?.animate(
			[
				{ opacity: 0, transform: "translateY(6px) scale(0.97)" },
				{ opacity: 1, transform: "translateY(0) scale(1)", offset: 0.12 },
				{ opacity: 1, transform: "translateY(0) scale(1)", offset: 0.75 },
				{ opacity: 0, transform: "translateY(-8px) scale(1)" },
			],
			{ duration: 1600, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "both" },
		);
	}, [id]);
	return ref;
}

/** Plays a short scale-in each time `id` changes after mount (for values that stay on screen). */
export function usePop<T extends HTMLElement>(id: number | undefined) {
	const ref = useRef<T>(null);
	const seen = useRef(id);
	useEffect(() => {
		if (id === undefined || id === seen.current) return;
		seen.current = id;
		ref.current?.animate(
			[
				{ transform: "scale(0.97)", opacity: 0.4 },
				{ transform: "scale(1)", opacity: 1 },
			],
			{
				duration: 260,
				easing: "cubic-bezier(0.23, 1, 0.32, 1)",
			},
		);
	}, [id]);
	return ref;
}
