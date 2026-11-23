export type Phase = "active" | "waiting" | "paused" | "closing" | "stopped";

export const PHASES: Phase[] = ["active", "waiting", "paused", "closing", "stopped"];

export const LABEL: Record<Phase, string> = {
	active: "Active",
	waiting: "Starting",
	paused: "Paused",
	closing: "Closing",
	stopped: "Loss stop hit",
};

export interface HeaderProps {
	phase: Phase;
	dayPnl: string;
	dayUp: boolean;
	markets: number;
	next: string;
	progress: number;
	onToggle: () => void;
}

export function isOn(phase: Phase) {
	return phase === "active" || phase === "waiting";
}
