import type { Tier } from "@/components/tournament/data";
import { INK_STRONG, Shell } from "./shell";

const HEIGHTS = Array.from({ length: 28 }, (_, i) => 12 + (i / 27) ** 2 * 150);

export function Banner({ tier }: { tier: Tier }) {
	return (
		<Shell tier={tier}>
			<div className="absolute inset-y-0 right-0 flex items-end gap-1.5 pr-8">
				{HEIGHTS.map((h) => (
					<span key={h} className="w-2.5 rounded-t-xs" style={{ height: h, backgroundColor: INK_STRONG }} />
				))}
			</div>
		</Shell>
	);
}
