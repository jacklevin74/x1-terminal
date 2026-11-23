import type { Tier } from "@/components/tournament/data";
import { INK_STRONG, Shell } from "./shell";

export function Banner({ tier }: { tier: Tier }) {
	return (
		<Shell tier={tier}>
			<div
				className="size-full"
				style={{
					backgroundImage: `radial-gradient(circle, ${INK_STRONG} 1.5px, transparent 1.5px)`,
					backgroundSize: "18px 18px",
				}}
			/>
		</Shell>
	);
}
