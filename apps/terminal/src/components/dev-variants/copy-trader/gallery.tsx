import type { ComponentType } from "react";
import { type Stage, snapshot, type VariantProps } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<VariantProps>; title: string }[] = [
	{ C: V1, title: "Inline trader list in the panel" },
	{ C: V2, title: "Trader directory modal with sort and filter" },
	{ C: V3, title: "Trader cards carousel" },
	{ C: V4, title: "Step flow: coin, trader, leverage, start" },
	{ C: V5, title: "Trader profile sheet with PNL path and copy button" },
];

const STAGES: { stage: Stage; label: string }[] = [
	{ stage: "pick", label: "Pick a trader" },
	{ stage: "running", label: "Running (whale echo replay, PNL example)" },
];

function Panel({ C, initial }: { C: ComponentType<VariantProps>; initial: Stage }) {
	return (
		<div className="relative w-[328px] overflow-hidden rounded-8 bg-surface">
			<div className="flex h-9 bg-background text-xs">
				<span className="flex flex-1 items-center justify-center text-fg-muted">Manual</span>
				<span className="flex flex-1 items-center justify-center rounded-t-8 bg-surface font-medium">Auto</span>
			</div>
			<C initial={initial} />
		</div>
	);
}

export function CopyTraderGallery() {
	const captured = new Date(snapshot.capturedAt).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
	});
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<header className="flex max-w-3xl flex-col gap-1 px-10 pt-10 text-xs text-fg-muted">
				<span>Traders, PNL, ROI, volume and account value: Hyperliquid leaderboard snapshot, {captured} UTC.</span>
				<span>
					Example values: followers, bullish or bearish lean, and coin lists (except the 5 mood ring traders and John
					Wick&apos;s short lean).
				</span>
				<span>
					Running state: Jack&apos;s whale echo replay ($100K, 6 days, 88 vs about 2,000 trades, fees $15 vs $177 a day,
					turnover 77% vs 369% a day). The dollar PNL is an example.
				</span>
				<span>Score: track record 50, windows in profit 30, returns 20. See data.ts for the formula.</span>
			</header>
			{variants.map(({ C, title }, i) => (
				<section key={title} className="flex flex-col gap-6 px-10 py-10">
					<div className="flex items-center gap-3 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span>{title}</span>
					</div>
					<div className="flex flex-wrap items-start gap-10">
						{STAGES.map(({ stage, label }) => (
							<div key={stage} className="flex flex-col gap-2">
								<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
								<Panel C={C} initial={stage} />
							</div>
						))}
					</div>
				</section>
			))}
		</main>
	);
}
