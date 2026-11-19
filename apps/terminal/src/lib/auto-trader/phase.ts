import { allowedMarkets } from "./targets";
import type { AutoTraderSettings, AutoTraderStatus } from "./types";

export type AutoTraderPhase = "setup" | "paused" | "active" | "closing" | "stopped" | "waiting";

export function autoTraderPhase(status: AutoTraderStatus | undefined): AutoTraderPhase {
	if (!status?.registered || !status.hasKey) return "setup";
	if (status.state === "paused") return "paused";
	if (status.state === "flatten-requested") return "closing";
	if (status.plan?.killed) return "stopped";
	if (!status.lastCycle && !status.plan?.ts) return "waiting";
	return "active";
}

export const PHASE_LABEL: Record<AutoTraderPhase, string> = {
	setup: "Not set up",
	paused: "Paused",
	active: "Active",
	closing: "Closing positions",
	stopped: "Loss stop reached",
	waiting: "Waiting for first cycle",
};

export const PHASE_SHORT_LABEL: Record<AutoTraderPhase, string> = {
	setup: "Not set up",
	paused: "Paused",
	active: "Active",
	closing: "Closing",
	stopped: "Loss stop hit",
	waiting: "Starting",
};

export type PhaseTone = "on" | "off" | "alert";

export function phaseTone(phase: AutoTraderPhase): PhaseTone {
	if (phase === "active" || phase === "waiting" || phase === "closing") return "on";
	if (phase === "stopped") return "alert";
	return "off";
}

export function isTrading(phase: AutoTraderPhase) {
	return phase === "active" || phase === "waiting" || phase === "stopped" || phase === "closing";
}

export function sameMarket(a: string, b: string) {
	return a === b || a.split(":").at(-1) === b.split(":").at(-1);
}

export function managesMarket(settings: AutoTraderSettings | undefined, universe: readonly string[], coin: string) {
	if (!settings || !coin) return false;
	return allowedMarkets(settings, universe).some((market) => sameMarket(market, coin));
}

export function withoutMarket(
	settings: AutoTraderSettings,
	universe: readonly string[],
	coin: string,
): AutoTraderSettings {
	return {
		...settings,
		include: allowedMarkets(settings, universe).filter((market) => !sameMarket(market, coin)),
		exclude: [],
	};
}
