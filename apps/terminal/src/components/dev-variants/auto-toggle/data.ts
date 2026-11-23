export type Mode = "manual" | "auto";
export type Phase = "active" | "paused";

export interface ToggleProps {
	mode: Mode;
	phase: Phase;
	onMode: (mode: Mode) => void;
}

export const PHASE_TEXT: Record<Phase, string> = { active: "Active", paused: "Paused" };
