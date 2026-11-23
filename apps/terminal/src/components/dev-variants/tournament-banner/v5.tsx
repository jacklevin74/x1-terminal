import type { Tier } from "@/components/tournament/data";
import { INK_STRONG, Shell } from "./shell";

const COLS = 40;
const ROWS = 9;

export function Banner({ tier }: { tier: Tier }) {
	const dots = [];
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			const t = x / (COLS - 1);
			dots.push(<circle key={`${x}-${y}`} cx={x * 20 + 10} cy={y * 20 + 10} r={0.6 + t * 5} fill={INK_STRONG} />);
		}
	}
	return (
		<Shell tier={tier}>
			<svg
				className="absolute inset-0 size-full"
				viewBox="0 0 800 180"
				preserveAspectRatio="xMaxYMid slice"
				aria-hidden="true"
			>
				{dots}
			</svg>
		</Shell>
	);
}
