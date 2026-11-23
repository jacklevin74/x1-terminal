import { RobotIcon, XIcon } from "@phosphor-icons/react";
import { type ReactNode, useId } from "react";
import { MoodHeroGauge } from "@/components/trade/mood/mood-hero-gauge";
import { MOOD_DEADBAND, moodColor, moodTile, signedScore, targetWeight } from "@/lib/mood/signal";
import { coin, MARKET, snapshot } from "./data";

interface Props {
	children: ReactNode;
	header?: ReactNode;
	footer?: ReactNode;
}

export function DrawerFrame({ children, header, footer }: Props) {
	return (
		<div
			className="relative h-[860px] w-[1180px] flex-none overflow-hidden rounded-8 font-sans text-fg"
			style={{
				backgroundImage: "url(/dev-refs/mood-ring/terminal.png)",
				backgroundSize: "1512px 900px",
				backgroundPosition: "left top",
			}}
		>
			<div className="absolute inset-0 bg-scrim" />
			<div className="absolute inset-y-0 right-0 flex w-[420px] flex-col bg-overlay shadow-menu">
				<div className="flex h-14 flex-none items-center gap-3 px-4">
					<div className="min-w-0 flex-1">{header ?? <DefaultTitle />}</div>
					{!header && <StaticTabs />}
					<span className="grid size-8 place-items-center rounded-8 text-fg-muted">
						<XIcon className="size-4" />
					</span>
				</div>
				<div className="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">{children}</div>
				{footer}
			</div>
		</div>
	);
}

function DefaultTitle() {
	const updated = new Date(snapshot.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	return (
		<div>
			<div className="text-sm font-medium">Mood Ring</div>
			<div className="text-2xs text-fg-muted">Updated {updated}</div>
		</div>
	);
}

function StaticTabs() {
	return (
		<div className="relative flex rounded-full bg-control p-0.5">
			<span className="relative h-7 rounded-full bg-control-hover px-3 text-xs leading-7 font-medium">{MARKET}</span>
			<span className="relative h-7 rounded-full px-3 text-xs leading-7 text-fg-muted">All markets</span>
		</div>
	);
}

export function HeroCard({ score, children }: { score: number; children?: ReactNode }) {
	const first = coin.history[0]?.[1] ?? coin.score;
	const delta = coin.score - first;
	return (
		<section className="relative overflow-hidden rounded-12 bg-surface px-5 pt-5 pb-4">
			<MoodHeroGauge score={score} name={MARKET} />
			<div className="relative mt-3 flex items-center justify-center gap-2 text-xs">
				{children ?? (
					<span className="tabular-nums" style={{ color: moodColor(delta * 3) }}>
						{signedScore(delta)} in 24h
					</span>
				)}
			</div>
			<History history={coin.history} />
		</section>
	);
}

function History({ history }: { history: [number, number][] }) {
	const id = useId();
	if (history.length < 2) return null;
	const W = 340;
	const H = 64;
	const y = (s: number) => (1 - (s + 100) / 200) * H;
	const pts = history.map(([, s], i) => `${((i / (history.length - 1)) * W).toFixed(1)},${y(s).toFixed(1)}`);
	const area = `M0,${H / 2} L${pts.join(" L")} L${W},${H / 2} Z`;
	return (
		<div className="relative mt-4">
			<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-16 w-full" aria-hidden="true">
				<defs>
					<clipPath id={`${id}-up`}>
						<rect x="0" y="0" width={W} height={H / 2} />
					</clipPath>
					<clipPath id={`${id}-down`}>
						<rect x="0" y={H / 2} width={W} height={H / 2} />
					</clipPath>
				</defs>
				<path d={area} fill={moodTile(80)} clipPath={`url(#${id}-up)`} />
				<path d={area} fill={moodTile(-80)} clipPath={`url(#${id}-down)`} />
				<line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--color-stroke-weak)" strokeDasharray="2 3" />
				<polyline
					points={pts.join(" ")}
					fill="none"
					stroke="var(--color-fg-secondary)"
					strokeWidth="1.25"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			<div className="mt-1 flex justify-between text-2xs text-fg-muted">
				<span>24h ago (pool)</span>
				<span>Now</span>
			</div>
		</div>
	);
}

export function AutoTargetCard({ score }: { score: number }) {
	const w = targetWeight(score);
	const pct = Math.abs(Math.round(w * 100));
	const half = Math.abs(w) * 50;
	return (
		<section className="rounded-12 bg-surface p-4">
			<div className="mb-3 flex items-baseline justify-between gap-2 text-xs">
				<span className="inline-flex items-center gap-1.5 font-medium">
					<RobotIcon className="size-3.5 text-fg-muted" />
					Auto Trader target
				</span>
				<span className="text-2xs text-fg-muted">Weight = score ÷ 100</span>
			</div>
			<div className="flex items-baseline gap-1.5">
				<span className="text-sm font-medium tabular-nums" style={{ color: w === 0 ? undefined : moodColor(score) }}>
					{w === 0 ? "Flat" : `${w > 0 ? "Long" : "Short"} ${pct}%`}
				</span>
				<span className="text-xs text-fg-muted">
					{w === 0
						? `Score is inside ±${MOOD_DEADBAND}, so no ${MARKET} position`
						: `of equity × leverage on ${MARKET}`}
				</span>
			</div>
			<div className="relative mt-3 h-2 rounded-full bg-control">
				<div
					className="absolute inset-y-0 rounded-full bg-control-hover"
					style={{ left: `${50 - MOOD_DEADBAND / 2}%`, width: `${MOOD_DEADBAND}%` }}
				/>
				{w !== 0 && (
					<div
						className="absolute inset-y-0 transition-[width,left] duration-500"
						style={{
							background: moodColor(score),
							width: `${half}%`,
							left: w > 0 ? "50%" : `${50 - half}%`,
							borderRadius: w > 0 ? "0 9999px 9999px 0" : "9999px 0 0 9999px",
						}}
					/>
				)}
				<div className="absolute inset-y-[-3px] left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-fg-muted" />
			</div>
		</section>
	);
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
	return (
		<div className="mb-3 flex items-baseline justify-between gap-2 text-xs">
			<span className="font-medium text-fg">{children}</span>
			{aside && <span className="text-2xs">{aside}</span>}
		</div>
	);
}
