import type { Tier } from "@/components/tournament/data";
import { Identicon } from "@/components/tournament/parts";
import { Shell } from "./shell";

export function Banner({ tier }: { tier: Tier }) {
	return (
		<Shell tier={tier}>
			<div className="absolute inset-y-0 right-0 flex items-center gap-4 pr-8 grayscale" style={{ opacity: 0.14 }}>
				{tier.traders.slice(0, 3).map((r) => (
					<Identicon key={r.address} id={r.address} className="size-[200px] rounded-none" />
				))}
			</div>
		</Shell>
	);
}
