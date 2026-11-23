export type Phase = "active" | "paused";

export interface StatusProps {
	phase: Phase;
	equity: string;
	dayPnl: string;
	dayUp: boolean;
	markets: number;
	next: string;
	progress: number;
	onToggle: () => void;
}
