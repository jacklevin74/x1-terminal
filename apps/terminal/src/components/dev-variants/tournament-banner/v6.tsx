import type { Tier } from "@/components/tournament/data";
import { INK, Shell } from "./shell";

function wave(offset: number, amp: number) {
	let d = `M0,${80 + offset}`;
	for (let x = 0; x <= 800; x += 50) {
		const y = 80 + offset + Math.sin((x / 800) * Math.PI * 2 + offset / 10) * amp;
		d += ` L${x},${y.toFixed(1)}`;
	}
	return d;
}

const LINES = [-60, -45, -30, -15, 0, 15, 30, 45, 60];

export function Banner({ tier }: { tier: Tier }) {
	return (
		<Shell tier={tier}>
			<svg
				className="absolute inset-0 size-full"
				viewBox="0 0 800 160"
				preserveAspectRatio="xMaxYMid slice"
				aria-hidden="true"
			>
				{LINES.map((o) => (
					<path key={o} d={wave(o, 14)} fill="none" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
				))}
			</svg>
		</Shell>
	);
}
