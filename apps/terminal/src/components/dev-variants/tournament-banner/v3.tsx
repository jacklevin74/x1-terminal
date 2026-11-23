import type { Tier } from "@/components/tournament/data";
import { INK, Shell } from "./shell";

const RINGS = [60, 120, 180, 240, 300, 360, 420, 480];

export function Banner({ tier }: { tier: Tier }) {
	return (
		<Shell tier={tier}>
			<svg
				className="absolute inset-0 size-full"
				viewBox="0 0 800 160"
				preserveAspectRatio="xMaxYMid slice"
				aria-hidden="true"
			>
				{RINGS.map((r) => (
					<circle key={r} cx={800} cy={80} r={r} fill="none" stroke={INK} strokeWidth={1.5} />
				))}
			</svg>
		</Shell>
	);
}
