import { useState } from "react";
import { coins, overall, signed } from "./data";
import { Frame } from "./frame";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";
import V6 from "./v6";

const btc = coins.find((c) => c.coin === "BTC")!.score;

const variants = [
	{ C: V1, title: "Header ring + dropdown", base: overall.score },
	{ C: V2, title: "Market-header ring + side drawer (per market)", base: btc },
	{ C: V3, title: "Footer mood stone + bottom sheet heatmap", base: overall.score },
	{ C: V4, title: "Nav segmented ring + polar modal", base: overall.score },
	{ C: V5, title: "Floating orb + 24h movement panel", base: overall.score },
	{ C: V6, title: "Order-form ring + score explainer (per market)", base: btc },
];

export function MoodRingGallery() {
	const [preview, setPreview] = useState<number | null>(null);
	return (
		<main className="dark bg-background text-fg">
			{variants.map(({ C, title, base }, i) => (
				<section key={title} className="relative h-screen border-b border-stroke-weak">
					<div className="absolute inset-x-0 top-0 z-50 flex h-10 items-center gap-3 bg-surface px-4 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span className="text-fg">{title}</span>
						<span className="ml-auto text-fg-muted">Simulate score</span>
						<input
							type="range"
							min={-100}
							max={100}
							value={preview ?? base}
							onChange={(e) => setPreview(Number(e.target.value))}
							className="w-40"
						/>
						<span className="w-8 tabular-nums">{signed(preview ?? base)}</span>
						<button type="button" onClick={() => setPreview(null)} className="text-fg-muted hover:text-fg">
							Live
						</button>
					</div>
					<Frame>
						<C score={preview ?? base} />
					</Frame>
				</section>
			))}
		</main>
	);
}
