import { type ComponentType, useState } from "react";
import { leaderboard, type Open, pool, SCORE_NOTE, type Stage, type VariantProps } from "./data";
import { StageContext } from "./panel";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<VariantProps & { edited?: boolean }>; title: string }[] = [
	{ C: V1, title: "Table modal with column sort" },
	{ C: V2, title: "Card grid" },
	{ C: V3, title: "Two-pane modal with trader detail on the right" },
	{ C: V4, title: "Filter-chip list" },
	{ C: V5, title: "Compare mode" },
];

export interface FrameSearch {
	frame?: "desktop" | "mobile";
	v?: number;
	open?: Open;
	edited?: boolean;
}

function Tabs() {
	return (
		<div className="flex h-9 bg-background text-xs">
			<span className="flex flex-1 items-center justify-center text-fg-muted">Manual</span>
			<span className="flex flex-1 items-center justify-center rounded-t-8 bg-surface font-medium">Auto</span>
		</div>
	);
}

export function CopyTrader2Frame({ frame, v = 1, open, edited }: FrameSearch) {
	const { C } = variants[Math.min(Math.max(v, 1), 5) - 1];
	if (frame === "mobile")
		return (
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
		);
	return (
		<main
			className="dark relative h-[900px] w-[1512px] overflow-hidden bg-background text-fg"
			style={{ backgroundImage: "url(/dev-refs/mood-ring/terminal.png)", backgroundSize: "1512px 900px" }}
		>
			<div className="absolute top-[136px] left-[1163px] h-[736px] w-[345px] overflow-y-auto rounded-8 bg-surface">
				<Tabs />
				<C stage="pick" open={open} edited={edited} />
			</div>
		</main>
	);
}

function DesktopStage({
	C,
	open,
	edited,
	label,
	href,
}: {
	C: ComponentType<VariantProps & { edited?: boolean }>;
	open: Open;
	edited?: boolean;
	label: string;
	href: string;
}) {
	const [el, setEl] = useState<HTMLDivElement | null>(null);
	const scale = 0.75;
	return (
		<div className="flex flex-col gap-2">
			<StageLabel label={label} href={href} />
			<div className="overflow-hidden rounded-8" style={{ width: 1512 * scale, height: 900 * scale }}>
				<div
					ref={setEl}
					className="relative origin-top-left overflow-hidden"
					style={{
						width: 1512,
						height: 900,
						transform: `scale(${scale})`,
						backgroundImage: "url(/dev-refs/mood-ring/terminal.png)",
						backgroundSize: "1512px 900px",
					}}
				>
					<StageContext.Provider value={{ el, kind: "desktop" }}>
						<div className="absolute top-[136px] left-[1163px] h-[736px] w-[345px] overflow-y-auto rounded-8 bg-surface">
							<Tabs />
							<C stage="pick" open={open} edited={edited} />
						</div>
					</StageContext.Provider>
				</div>
			</div>
		</div>
	);
}

function MobileStage({
	C,
	open,
	edited,
	label,
	href,
}: {
	C: ComponentType<VariantProps & { edited?: boolean }>;
	open: Open;
	edited?: boolean;
	label: string;
	href: string;
}) {
	const [el, setEl] = useState<HTMLDivElement | null>(null);
	const scale = 0.8;
	return (
		<div className="flex flex-col gap-2">
			<StageLabel label={label} href={href} />
			<div className="overflow-hidden rounded-16" style={{ width: 390 * scale, height: 844 * scale }}>
				<div
					ref={setEl}
					className="relative flex origin-top-left flex-col overflow-hidden bg-background"
					style={{ width: 390, height: 844, transform: `scale(${scale})` }}
				>
					<StageContext.Provider value={{ el, kind: "mobile" }}>
						<div className="flex h-12 shrink-0 items-center justify-between bg-surface px-4">
							<span className="text-sm font-semibold tracking-wide">X1 TERMINAL</span>
							<span className="text-xs text-fg-secondary">BTC-USDC</span>
						</div>
						<div className="mt-1 flex-1 overflow-y-auto bg-surface">
							<Tabs />
							<C stage="pick" open={open} edited={edited} />
						</div>
					</StageContext.Provider>
				</div>
			</div>
		</div>
	);
}

function StageLabel({ label, href }: { label: string; href: string }) {
	return (
		<span className="flex items-center gap-3 text-2xs tracking-micro text-fg-muted uppercase">
			{label}
			<a href={href} target="_blank" rel="noreferrer" className="normal-case tracking-normal underline">
				Open full size
			</a>
		</span>
	);
}

function Inline({ C, stage, label }: { C: ComponentType<VariantProps>; stage: Stage; label: string }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			<div className="relative w-[328px] overflow-hidden rounded-8 bg-surface">
				<Tabs />
				<C stage={stage} />
			</div>
		</div>
	);
}

const fmt = (iso: string) =>
	new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
	});

export function CopyTrader2Gallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<header className="flex max-w-4xl flex-col gap-1 px-10 pt-10 text-xs text-fg-muted">
				<span>
					87 traders: 57 from the Hyperliquid leaderboard snapshot ({fmt(leaderboard.capturedAt)} UTC) and the 37 mood
					pool traders from Jack&apos;s server ({fmt(pool.capturedAt)} UTC), 7 in both.
				</span>
				<span>{SCORE_NOTE}</span>
				<span>
					Pool traders have no 7d PNL in the snapshot. Leaderboard traders have no fill counts or positions, so their
					degen score uses 2 of 5 inputs. Missing values show as n/a and sort last.
				</span>
				<span>
					Basket mood: HYPE, same math as the mood ring (0.6 x position score of the selected traders + 0.4 x pool order
					flow). Added traders count only when they hold HYPE in the snapshot.
				</span>
				<span>
					Running copy card: Jack&apos;s whale echo replay numbers (88 vs about 2,000 trades, fees $15 vs $177 a day),
					not the picked trader&apos;s. The dollar PNL is an example.
				</span>
				<span>
					Basket editor frames start with a demo edit: the 3 highest degen pool traders that hold HYPE off, the 2 most
					consistent named leaderboard traders added.
				</span>
			</header>
			{variants.map(({ C, title }, i) => {
				const base = `/dev/variants/copy-trader-2?v=${i + 1}`;
				return (
					<section key={title} className="flex flex-col gap-6 px-10 py-10">
						<div className="flex items-center gap-3 text-xs">
							<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
							<span>{title}</span>
						</div>
						<div className="flex flex-wrap items-start gap-8">
							<DesktopStage
								C={C}
								open="directory"
								label="Desktop: trader directory modal"
								href={`${base}&frame=desktop&open=directory`}
							/>
							<MobileStage
								C={C}
								open="directory"
								label="Mobile: directory sheet"
								href={`${base}&frame=mobile&open=directory`}
							/>
						</div>
						<div className="flex flex-wrap items-start gap-8">
							<DesktopStage
								C={C}
								open="basket"
								edited
								label="Desktop: basket editor"
								href={`${base}&frame=desktop&open=basket&edited=true`}
							/>
							<MobileStage
								C={C}
								open="add"
								edited
								label="Mobile: add traders to the basket"
								href={`${base}&frame=mobile&open=add&edited=true`}
							/>
						</div>
						<div className="flex flex-wrap items-start gap-8">
							<Inline C={C} stage="pick" label="Panel (live, click to try)" />
							<Inline C={C} stage="copy-picked" label="Trader chosen" />
							<Inline C={C} stage="copy-running" label="Running: copy a trader" />
							<Inline C={C} stage="basket-running" label="Running: basket" />
						</div>
					</section>
				);
			})}
		</main>
	);
}
