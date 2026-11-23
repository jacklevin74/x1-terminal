import type { Tier } from "@/components/tournament/data";
import { INK, Shell } from "./shell";

export function Banner({ tier }: { tier: Tier }) {
	return (
		<Shell tier={tier}>
			<div
				className="size-full"
				style={{ backgroundImage: `repeating-linear-gradient(-45deg, ${INK} 0 1px, transparent 1px 12px)` }}
			/>
		</Shell>
	);
}
