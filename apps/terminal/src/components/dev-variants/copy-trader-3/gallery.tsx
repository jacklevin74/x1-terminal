import type { ComponentType } from "react";
import type { Open, VariantProps } from "../copy-trader-2/data";
import { StartContext } from "./shared";
import V3 from "./v3";
import V5 from "./v5";
import V6 from "./v6";
import V7 from "./v7";
import V8 from "./v8";
import V9 from "./v9";
import V10 from "./v10";
import V11 from "./v11";
import V12 from "./v12";
import V13 from "./v13";
import V14 from "./v14";
import V15 from "./v15";

const variants: { C: ComponentType<VariantProps & { edited?: boolean }>; title: string }[] = [
	{ C: V10, title: "X1 monochrome: white line, dotted zero, blue end dot" },
	{ C: V11, title: "Gradient area with the high and low labelled on the line" },
	{ C: V12, title: "Month-segmented line: each month green or red by its own result" },
	{ C: V13, title: "High-water mark: running peak dotted, drawdowns shaded, worst one labelled" },
	{ C: V14, title: "Dots on every data point, end value in a chip" },
	{ C: V15, title: "Hero chart: net figure in the chart, faint gridlines, thicker line" },
	{
		C: V7,
		title:
			"Sparkline, Hyperdash style: smooth weekly line, green above zero and red below, soft area, dotted baseline, hover",
	},
	{ C: V8, title: "Sparkline, Binance style: thin plain line, no area, the net figure beside it, hover" },
	{ C: V9, title: "Chart, Hyperliquid style: gridlines with value ticks, month ticks, hover" },
	{ C: V5, title: "Monthly return table, years as rows" },
	{ C: V6, title: "Stats first: profitable months ring, drawdown, best and worst" },
	{ C: V3, title: "Calendar tiles, two rows" },
];

export interface FrameSearch {
	frame?: "desktop" | "mobile";
	v?: number;
	open?: Open;
	edited?: boolean;
	detail?: boolean;
}

function Tabs() {
	return (
		<div className="flex h-9 bg-background text-xs">
			<span className="flex flex-1 items-center justify-center text-fg-muted">Manual</span>
			<span className="flex flex-1 items-center justify-center rounded-t-8 bg-surface font-medium">Auto</span>
		</div>
	);
}

export function CopyTrader3Frame({ frame, v = 1, open, edited, detail }: FrameSearch) {
	const { C } = variants[Math.min(Math.max(v, 1), variants.length) - 1];
	const start = { detail: !!detail };
	if (frame === "mobile")
		return (
			<StartContext.Provider value={start}>
				<main className="dark flex min-h-dvh flex-col bg-background text-fg">
					<div className="flex h-12 items-center justify-between bg-surface px-4">
						<span className="text-sm font-semibold tracking-wide">X1 TERMINAL</span>
						<span className="text-xs text-fg-secondary">BTC-USDC</span>
					</div>
					<div className="mt-1 flex-1 bg-surface">
						<Tabs />
						<C stage="pick" open={open} edited={edited} />
					</div>
				</main>
			</StartContext.Provider>
		);
	return (
		<StartContext.Provider value={start}>
			<main
				className="dark relative h-[900px] w-[1512px] overflow-hidden bg-background text-fg"
				style={{ backgroundImage: "url(/dev-refs/mood-ring/terminal.png)", backgroundSize: "1512px 900px" }}
			>
				<div className="absolute top-[136px] left-[1163px] h-[736px] w-[345px] overflow-y-auto rounded-8 bg-surface">
					<Tabs />
					<C stage="pick" open={open} edited={edited} />
				</div>
			</main>
		</StartContext.Provider>
	);
}

interface StageProps {
	kind: "desktop" | "mobile";
	label: string;
	src: string;
}

function Stage({ kind, label, src }: StageProps) {
	const w = kind === "desktop" ? 1512 : 390;
	const h = kind === "desktop" ? 900 : 844;
	const scale = kind === "desktop" ? 0.7 : 0.8;
	return (
		<div className="flex flex-col gap-2">
			<span className="flex items-center gap-3 text-2xs tracking-micro text-fg-muted uppercase">
				{label}
				<a href={src} target="_blank" rel="noreferrer" className="normal-case tracking-normal underline">
					Open full size
				</a>
			</span>
			<div
				className={kind === "desktop" ? "overflow-hidden rounded-8" : "overflow-hidden rounded-16"}
				style={{ width: w * scale, height: h * scale }}
			>
				<iframe
					title={label}
					src={src}
					width={w}
					height={h}
					loading="lazy"
					className="origin-top-left bg-background"
					style={{ transform: `scale(${scale})` }}
				/>
			</div>
		</div>
	);
}

export function CopyTrader3Gallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<header className="flex max-w-4xl flex-col gap-1 px-10 pt-10 text-xs text-fg-muted">
				<span>
					Copy-trader-2 #3 with four changes: the PNL range sits in the list header, the basket editor uses the #1 table
					with row click opening the trader detail, preset baskets sit above the table, and each variant shows
					consistency in a different way.
				</span>
				<span>
					Pool traders show their last 4 months of PNL. Leaderboard-only traders have no monthly PNL, so they show the
					7d, 30d and all-time windows. Presets pick the best 6 of all 87 traders. Basket frames start with a demo edit,
					so Custom is active.
				</span>
			</header>
			{variants.map(({ title }, i) => {
				const base = `/dev/variants/copy-trader-3?v=${i + 1}`;
				return (
					<section key={title} className="flex flex-col gap-6 px-10 py-10">
						<div className="flex items-center gap-3 text-xs">
							<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
							<span>{title}</span>
						</div>
						<div className="flex flex-wrap items-start gap-8">
							<Stage kind="desktop" label="Desktop: trader directory" src={`${base}&frame=desktop&open=directory`} />
							<Stage kind="mobile" label="Mobile: directory" src={`${base}&frame=mobile&open=directory`} />
						</div>
						<div className="flex flex-wrap items-start gap-8">
							<Stage
								kind="desktop"
								label="Desktop: basket editor"
								src={`${base}&frame=desktop&open=basket&edited=true`}
							/>
							<Stage kind="mobile" label="Mobile: basket editor" src={`${base}&frame=mobile&open=basket&edited=true`} />
						</div>
						<div className="flex flex-wrap items-start gap-8">
							<Stage
								kind="mobile"
								label="Mobile: trader detail"
								src={`${base}&frame=mobile&open=directory&detail=true`}
							/>
							<Stage
								kind="mobile"
								label="Mobile: basket trader detail"
								src={`${base}&frame=mobile&open=basket&edited=true&detail=true`}
							/>
						</div>
					</section>
				);
			})}
		</main>
	);
}
