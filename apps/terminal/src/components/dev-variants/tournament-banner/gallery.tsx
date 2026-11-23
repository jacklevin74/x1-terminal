import { tiers } from "@/components/tournament/data";
import { Banner as V1 } from "./v1";
import { Banner as V2 } from "./v2";
import { Banner as V3 } from "./v3";
import { Banner as V4 } from "./v4";
import { Banner as V5 } from "./v5";
import { Banner as V6 } from "./v6";
import { Banner as V7 } from "./v7";
import { Banner as V8 } from "./v8";

const VARIANTS = [
	{ n: "#1", name: "Dot grid", C: V1 },
	{ n: "#2", name: "Diagonal hairlines", C: V2 },
	{ n: "#3", name: "Concentric rings from the right edge", C: V3 },
	{ n: "#4", name: "The three winners' marks, faded", C: V4 },
	{ n: "#5", name: "Halftone dots that grow to the right", C: V5 },
	{ n: "#6", name: "Wave lines", C: V6 },
	{ n: "#7", name: "Rising bars", C: V7 },
	{ n: "#8", name: "Fine grid", C: V8 },
];

export function TournamentBannerGallery() {
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[1440px] flex-col gap-10">
				{VARIANTS.map((v) => (
					<section key={v.n} className="flex flex-col gap-3">
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{v.n}</span>
							<span className="text-fg">{v.name}</span>
						</div>
						<v.C tier={tiers.high} />
					</section>
				))}
			</div>
		</div>
	);
}
