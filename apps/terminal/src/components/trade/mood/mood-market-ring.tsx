import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "@hypeterminal/ui";
import { CaretRightIcon, RobotIcon, XIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import {
	coinName,
	compactUsd,
	MOOD_DEADBAND,
	MOOD_POOL_SIZE,
	type MoodCoin,
	type MoodSignal,
	moodColor,
	moodLabel,
	moodTile,
	shortAddress,
	signedScore,
	targetWeight,
} from "@/lib/mood/signal";
import { MoodBackPill, MoodMarketStepper } from "./mood-back-nav";
import { MoodHeroGauge } from "./mood-hero-gauge";
import { ScoreArc } from "./mood-parts";

interface Props {
	signal: MoodSignal;
	coin: MoodCoin | undefined;
	marketName: string;
	score: number | null;
}

type Tab = "market" | "all";

export function MoodMarketRing({ signal, coin, marketName, score }: Props) {
	const [chosenTab, setTab] = useState<Tab | null>(null);
	const tab: Tab = chosenTab ?? (coin ? "market" : "all");
	const [focus, setFocus] = useState<string | null>(null);
	const s = score ?? 0;
	const shown = focus ? signal.coins.find((c) => c.coin === focus) : coin;
	const shownName = shown ? coinName(shown.coin) : coinName(marketName);
	const shownScore = focus ? (shown?.score ?? 0) : s;
	const updated = new Date(signal.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	const order = [...signal.coins].sort((a, b) => b.score - a.score);
	const index = order.findIndex((c) => c.coin === focus);
	function backToAll() {
		setFocus(null);
		setTab("all");
	}
	function step(dir: -1 | 1) {
		const next = order[index + dir];
		if (next) setFocus(next.coin);
	}
	const focused = focus !== null && tab === "market";
	return (
		<Drawer
			side="right"
			onOpenChange={(open) => {
				if (open) return;
				setFocus(null);
				setTab(null);
			}}
		>
			<DrawerTrigger className="flex shrink-0 items-center gap-2.5 rounded-8 px-2 py-1 transition-colors hover:bg-fill-hover">
				<ScoreArc value={s} size={26} stroke={3.5} />
				<span className="text-left">
					<span className="block text-2xs tracking-micro text-fg-muted uppercase">Mood</span>
					<span className="block text-xs tabular-nums" style={{ color: score === null ? undefined : moodColor(s) }}>
						{score === null ? "No pool data" : `${signedScore(s)} ${moodLabel(s)}`}
					</span>
				</span>
			</DrawerTrigger>
			<DrawerContent className="w-[420px]">
				<div className="flex h-14 flex-none items-center gap-3 px-4">
					<div className="min-w-0 flex-1">
						{focused ? (
							<MoodBackPill onBack={backToAll} />
						) : (
							<>
								<div className="text-sm font-medium">Mood Ring</div>
								<div className="text-2xs text-fg-muted">Updated {updated}</div>
							</>
						)}
					</div>
					{focused ? (
						<MoodMarketStepper index={index} total={order.length} onStep={step} />
					) : (
						<div className="flex rounded-full bg-control p-0.5">
							<SegButton active={tab === "market"} onClick={() => setTab("market")}>
								{coinName(marketName)}
							</SegButton>
							<SegButton active={tab === "all"} onClick={() => setTab("all")}>
								All markets
							</SegButton>
						</div>
					)}
					<DrawerClose
						className="grid size-8 place-items-center rounded-8 text-fg-muted transition-colors hover:bg-fill-hover hover:text-fg"
						aria-label="Close"
					>
						<XIcon className="size-4" />
					</DrawerClose>
				</div>
				<div className="flex-1 overflow-y-auto px-4 pb-4">
					{tab === "market" ? (
						<MarketTab coin={shown} name={shownName} score={shownScore} />
					) : (
						<AllTab
							signal={signal}
							current={coin?.coin}
							onPick={(c) => {
								setFocus(c === coin?.coin ? null : c);
								setTab("market");
							}}
						/>
					)}
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"h-7 rounded-full px-3 text-xs transition-colors",
				active ? "bg-control-hover font-medium text-fg" : "text-fg-muted hover:text-fg",
			)}
		>
			{children}
		</button>
	);
}

function MarketTab({ coin, name, score }: { coin: MoodCoin | undefined; name: string; score: number }) {
	if (!coin) {
		return (
			<div className="mt-2 rounded-12 bg-surface p-5 text-center">
				<div className="text-sm font-medium">No pool data for {name}</div>
				<p className="mt-1 text-xs text-fg-muted">
					The {MOOD_POOL_SIZE} traders do not hold or trade {name}. Open All markets to see the markets they trade.
				</p>
			</div>
		);
	}
	const first = coin.history[0]?.[1] ?? coin.score;
	const delta = coin.score - first;
	const holders = coin.tradersLong + coin.tradersShort;
	return (
		<div className="space-y-3">
			<section className="relative overflow-hidden rounded-12 bg-surface px-5 pt-5 pb-4">
				<MoodHeroGauge score={score} name={name} />
				<div className="relative mt-3 flex items-center justify-center gap-2 text-xs">
					<span className="tabular-nums" style={{ color: moodColor(delta * 3) }}>
						{signedScore(delta)} in 24h
					</span>
				</div>
				<History history={coin.history} />
			</section>

			<section className="rounded-12 bg-surface p-4">
				<SectionTitle>How the score is built</SectionTitle>
				<Driver
					label="Positions"
					weight={0.6}
					value={coin.posScore}
					detail={<NotionalSplit long={coin.long} short={coin.short} />}
				/>
				<div className="my-3 h-px bg-stroke-faint" />
				<Driver
					label="Order flow 24h"
					weight={0.4}
					value={coin.flowScore}
					detail={
						<div className="text-2xs text-fg-muted">
							Net {coin.flow24h < 0 ? "sold" : "bought"}{" "}
							<span className="text-fg-secondary tabular-nums">{compactUsd(Math.abs(coin.flow24h))}</span> in 24h,{" "}
							<span className="text-fg-secondary tabular-nums">{compactUsd(Math.abs(coin.flow1h))}</span> in the last
							hour
						</div>
					}
				/>
				<div className="mt-4 flex items-center justify-between rounded-8 bg-control px-3 py-2 text-xs">
					<span className="text-fg-muted tabular-nums">
						{signedScore(coin.posScore)} × 0.6 + {signedScore(coin.flowScore)} × 0.4
					</span>
					<span className="font-semibold tabular-nums" style={{ color: moodColor(coin.score) }}>
						= {signedScore(coin.score)}
					</span>
				</div>
			</section>

			<section className="rounded-12 bg-surface p-4">
				<SectionTitle
					aside={
						<span className="tabular-nums">
							<span className="text-market-up">{coin.tradersLong} long</span>
							<span className="text-fg-muted"> · </span>
							<span className="text-market-down">{coin.tradersShort} short</span>
							<span className="text-fg-muted"> · {MOOD_POOL_SIZE - holders} flat</span>
						</span>
					}
				>
					The {MOOD_POOL_SIZE} traders
				</SectionTitle>
				<TraderPips long={coin.tradersLong} short={coin.tradersShort} />
				{coin.dominant && coin.dominant.share >= 0.4 && (
					<div className="mt-3 flex items-center justify-between text-2xs text-fg-muted">
						<span>Largest trader</span>
						<span className="tabular-nums">
							<span className="text-fg-secondary">{shortAddress(coin.dominant.usr)}</span> ·{" "}
							{Math.round(coin.dominant.share * 100)}% of exposure
						</span>
					</div>
				)}
			</section>

			<AutoTraderCard score={coin.score} name={name} />
		</div>
	);
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
	return (
		<div className="mb-3 flex items-baseline justify-between gap-2 text-xs">
			<span className="font-medium text-fg">{children}</span>
			{aside && <span className="text-2xs">{aside}</span>}
		</div>
	);
}

function Driver({
	label,
	weight,
	value,
	detail,
}: {
	label: string;
	weight: number;
	value: number;
	detail: React.ReactNode;
}) {
	const w = Math.abs(value) / 2;
	return (
		<div>
			<div className="flex items-baseline justify-between text-xs">
				<span>
					<span className="text-fg-secondary">{label}</span>
					<span className="ml-1.5 text-2xs text-fg-muted">{Math.round(weight * 100)}% weight</span>
				</span>
				<span className="text-sm font-semibold tabular-nums" style={{ color: moodColor(value) }}>
					{signedScore(value)}
				</span>
			</div>
			<div className="relative mt-2 h-2 rounded-full bg-control">
				<div className="absolute inset-y-[-3px] left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-fg-muted" />
				<div
					className="absolute inset-y-0 transition-[width,left] duration-500"
					style={{
						background: moodColor(value),
						width: `${w}%`,
						left: value >= 0 ? "50%" : `${50 - w}%`,
						borderRadius: value >= 0 ? "0 9999px 9999px 0" : "9999px 0 0 9999px",
					}}
				/>
			</div>
			<div className="mt-2">{detail}</div>
		</div>
	);
}

function NotionalSplit({ long, short }: { long: number; short: number }) {
	const total = long + short || 1;
	const pl = (long / total) * 100;
	return (
		<div>
			<div className="flex h-1 gap-0.5 overflow-hidden rounded-full">
				<div className="rounded-full bg-market-up" style={{ width: `${pl}%` }} />
				<div className="flex-1 rounded-full bg-market-down" />
			</div>
			<div className="mt-1.5 flex justify-between text-2xs tabular-nums">
				<span className="text-fg-muted">
					<span className="text-market-up">{compactUsd(long)}</span> long · {Math.round(pl)}%
				</span>
				<span className="text-fg-muted">
					{Math.round(100 - pl)}% · <span className="text-market-down">{compactUsd(short)}</span> short
				</span>
			</div>
		</div>
	);
}

function TraderPips({ long, short }: { long: number; short: number }) {
	return (
		<div className="grid grid-cols-[repeat(19,minmax(0,1fr))] gap-1">
			{Array.from({ length: MOOD_POOL_SIZE }, (_, i) => {
				const cls = i < long ? "bg-market-up" : i < long + short ? "bg-market-down" : "bg-control";
				// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative grid
				return <span key={i} className={cn("aspect-square rounded-full", cls)} />;
			})}
		</div>
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
				<span>24h ago</span>
				<span>Now</span>
			</div>
		</div>
	);
}

function AutoTraderCard({ score, name }: { score: number; name: string }) {
	const w = targetWeight(score);
	const pct = Math.abs(Math.round(w * 100));
	const half = Math.abs(w) * 50;
	return (
		<section className="rounded-12 bg-surface p-4">
			<SectionTitle aside={<span className="text-fg-muted">Weight = score ÷ 100</span>}>
				<span className="inline-flex items-center gap-1.5">
					<RobotIcon className="size-3.5 text-fg-muted" />
					Auto Trader target
				</span>
			</SectionTitle>
			<div className="flex items-baseline gap-2">
				<span className="text-xl font-semibold tabular-nums" style={{ color: w === 0 ? undefined : moodColor(score) }}>
					{w === 0 ? "Flat" : `${w > 0 ? "Long" : "Short"} ${pct}%`}
				</span>
				<span className="text-xs text-fg-muted">
					{w === 0 ? `Score is inside ±${MOOD_DEADBAND}, so no ${name} position` : `of equity × leverage on ${name}`}
				</span>
			</div>
			<div className="relative mt-3 h-2 rounded-full bg-control">
				<div
					className="absolute inset-y-0 rounded-full bg-control-hover"
					style={{ left: `${50 - MOOD_DEADBAND / 2}%`, width: `${MOOD_DEADBAND}%` }}
				/>
				{w !== 0 && (
					<div
						className="absolute inset-y-0"
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
			<div className="mt-1.5 flex justify-between text-2xs tabular-nums text-fg-muted">
				<span>Short 100%</span>
				<span>Flat band ±{MOOD_DEADBAND}</span>
				<span>Long 100%</span>
			</div>
		</section>
	);
}

function AllTab({
	signal,
	current,
	onPick,
}: {
	signal: MoodSignal;
	current: string | undefined;
	onPick: (coin: string) => void;
}) {
	const { overall } = signal;
	const sorted = [...signal.coins].sort((a, b) => b.score - a.score);
	return (
		<div className="space-y-3">
			<section className="relative overflow-hidden rounded-12 bg-surface p-4">
				<div className="relative flex items-center gap-4">
					<div className="relative">
						<ScoreArc value={overall.score} size={64} stroke={6} />
						<span
							className="absolute inset-0 grid place-items-center text-base font-semibold tabular-nums"
							style={{ color: moodColor(overall.score) }}
						>
							{signedScore(overall.score)}
						</span>
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-xs text-fg-muted">All markets</div>
						<div className="text-base font-medium">{moodLabel(overall.score)}</div>
						<div className="text-2xs text-fg-muted">Mean of {signal.coins.length} markets, weighted by 24h volume</div>
					</div>
				</div>
				<div className="relative mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
					<div className="rounded-full bg-market-up" style={{ flex: overall.bullish }} />
					<div className="rounded-full bg-control-hover" style={{ flex: overall.neutral }} />
					<div className="rounded-full bg-market-down" style={{ flex: overall.bearish }} />
				</div>
				<div className="relative mt-1.5 flex justify-between text-2xs tabular-nums text-fg-muted">
					<span>
						<span className="text-market-up">{overall.bullish}</span> bullish
					</span>
					<span>{overall.neutral} neutral</span>
					<span>
						<span className="text-market-down">{overall.bearish}</span> bearish
					</span>
				</div>
			</section>

			<section className="rounded-12 bg-surface p-1.5">
				{sorted.map((c) => {
					const w = Math.abs(c.score) / 2;
					return (
						<button
							key={c.coin}
							type="button"
							onClick={() => onPick(c.coin)}
							className={cn(
								"group grid w-full grid-cols-[76px_1fr_36px_12px] items-center gap-3 rounded-8 px-2.5 py-2 text-left transition-colors hover:bg-fill-hover",
								c.coin === current && "bg-control",
							)}
						>
							<span className="flex items-center gap-1.5 truncate text-xs font-medium">
								{coinName(c.coin)}
								{c.coin === current && <span className="size-1 flex-none rounded-full bg-fg" />}
							</span>
							<span className="relative h-1.5 rounded-full bg-control">
								<span className="absolute inset-y-[-2px] left-1/2 w-px bg-fg-muted" />
								<span
									className="absolute inset-y-0"
									style={{
										background: moodColor(c.score),
										width: `${w}%`,
										left: c.score >= 0 ? "50%" : `${50 - w}%`,
										borderRadius: c.score >= 0 ? "0 9999px 9999px 0" : "9999px 0 0 9999px",
									}}
								/>
							</span>
							<span className="text-right text-xs font-medium tabular-nums" style={{ color: moodColor(c.score) }}>
								{signedScore(c.score)}
							</span>
							<CaretRightIcon className="size-3 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />
						</button>
					);
				})}
			</section>
		</div>
	);
}
