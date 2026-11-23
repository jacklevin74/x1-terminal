import type { Tier } from "@/components/tournament/data";
import { INK, Shell } from "./shell";

export function Banner({ tier }: { tier: Tier }) {
	return (
		<Shell tier={tier}>
			<div
				className="size-full"
				style={{
					backgroundImage: `linear-gradient(${INK} 1px, transparent 1px), linear-gradient(90deg, ${INK} 1px, transparent 1px)`,
					backgroundSize: "24px 24px",
				}}
			/>
		</Shell>
	);
}
