import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "@hypeterminal/ui";
import { XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	coinName,
	compactUsd,
	MOOD_POOL_SIZE,
	type MoodCoin,
	type MoodSignal,
	moodColor,
	moodLabel,
	shortAddress,
	signedScore,
	targetWeight,
} from "@/lib/mood/signal";
import { DivergingBar, ScoreArc, ScoreNumber, Spark } from "./mood-parts";

interface Props {
	signal: MoodSignal;
	coin: MoodCoin | undefined;
	marketName: string;
	score: number | null;
}

export function MoodMarketRing({ signal, coin, marketName, score }: Props) {
	const [tab, setTab] = useState<"market" | "all">(coin ? "market" : "all");
	const s = score ?? 0;
	return (
		<Drawer side="right">
			<DrawerTrigger className="flex shrink-0 items-center gap-2.5 rounded-8 px-2 py-1 transition-colors hover:bg-fill-hover">
				<ScoreArc value={s} size={26} stroke={3.5} />
				<span className="text-left">
					<span className="block text-2xs tracking-micro text-fg-muted uppercase">Mood</span>
					<span className="block text-xs tabular-nums" style={{ color: score === null ? undefined : moodColor(s) }}>
						{score === null ? "No pool data" : `${signedScore(s)} ${moodLabel(s)}`}
					</span>
				</span>
			</DrawerTrigger>
			<DrawerContent className="w-[400px]">
				<div className="flex items-center gap-1 border-b border-stroke-weak px-3 pt-2">
					<TabButton active={tab === "market"} onClick={() => setTab("market")}>
						{coinName(marketName)}
					</TabButton>
					<TabButton active={tab === "all"} onClick={() => setTab("all")}>
						All markets
					</TabButton>
					<DrawerClose
						className="ml-auto grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-fill-hover hover:text-fg"
						aria-label="Close"
					>
						<XIcon className="size-4" />
					</DrawerClose>
				</div>
				{tab === "market" ? (
					<MarketTab coin={coin} marketName={marketName} score={s} />
				) : (
					<AllTab signal={signal} marketName={marketName} />
				)}
			</DrawerContent>
		</Drawer>
	);
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative h-10 px-2 text-sm",
				active
					? "font-medium text-fg after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-fg"
					: "text-fg-muted hover:text-fg",
			)}
		>
			{children}
		</button>
	);
}

function MarketTab({ coin, marketName, score }: { coin: MoodCoin | undefined; marketName: string; score: number }) {
	if (!coin) {
		return (
			<p className="p-4 text-sm text-fg-muted">
				The pool of {MOOD_POOL_SIZE} traders does not trade {coinName(marketName)}. Open All markets to see the markets
				it tracks.
			</p>
		);
	}
	const w = targetWeight(coin.score);
	const first = coin.history[0]?.[1] ?? coin.score;
	return (
		<div className="flex-1 space-y-5 overflow-y-auto p-4">
			<div className="flex items-center gap-4">
				<div className="relative">
					<ScoreArc value={score} size={112} stroke={8} />
					<span className="absolute inset-0 grid place-items-center">
						<ScoreNumber score={score} className="text-[28px]" />
					</span>
				</div>
				<div>
					<div className="text-base font-medium">{moodLabel(score)}</div>
					<div className="mt-1 text-xs text-fg-muted">
						{coin.tradersLong + coin.tradersShort} of {MOOD_POOL_SIZE} pool traders hold {coinName(coin.coin)}
					</div>
				</div>
			</div>
			<div>
				<div className="mb-1.5 flex justify-between text-xs text-fg-muted">
					<span>Last 24h</span>
					<span className="tabular-nums">
						{signedScore(first)} → {signedScore(coin.score)}
					</span>
				</div>
				<div className="rounded-8 bg-surface p-2">
					<Spark history={coin.history} width={352} height={56} color={moodColor(coin.score)} />
				</div>
			</div>
			<SplitRow
				label="Positions (60%)"
				value={coin.posScore}
				note={`${compactUsd(coin.long)} long, ${compactUsd(coin.short)} short`}
			/>
			<SplitRow
				label="Order flow 24h (40%)"
				value={coin.flowScore}
				note={`Net ${compactUsd(coin.flow24h)} bought in 24h`}
			/>
			<div className="grid grid-cols-2 gap-2">
				<div className="rounded-8 bg-control p-2.5">
					<div className="text-xs text-fg-muted">Traders long</div>
					<div className="mt-0.5 text-base tabular-nums text-market-up">{coin.tradersLong}</div>
				</div>
				<div className="rounded-8 bg-control p-2.5">
					<div className="text-xs text-fg-muted">Traders short</div>
					<div className="mt-0.5 text-base tabular-nums text-market-down">{coin.tradersShort}</div>
				</div>
			</div>
			{coin.dominant && coin.dominant.share >= 0.4 && (
				<div className="rounded-8 bg-warning-soft p-3 text-xs text-fg-secondary">
					<span className="text-warning">Dominant trader.</span> {shortAddress(coin.dominant.usr)} holds{" "}
					{Math.round(coin.dominant.share * 100)}% of gross {coinName(coin.coin)} exposure. The score caps each trader
					at 40%.
				</div>
			)}
			<div className="rounded-8 bg-control p-3">
				<div className="text-xs text-fg-muted">Auto Trader target</div>
				<div className="mt-0.5 text-sm">
					{w === 0
						? "No position. The score is inside the ±15 flat band."
						: `${w > 0 ? "Long" : "Short"} ${Math.abs(Math.round(w * 100))}% of equity × leverage`}
				</div>
			</div>
		</div>
	);
}

function SplitRow({ label, value, note }: { label: string; value: number; note: string }) {
	return (
		<div>
			<div className="flex justify-between text-xs">
				<span className="text-fg-muted">{label}</span>
				<ScoreNumber score={value} className="font-normal" />
			</div>
			<DivergingBar value={value} className="mt-1.5" />
			<div className="mt-1 text-2xs text-fg-muted">{note}</div>
		</div>
	);
}

function AllTab({ signal, marketName }: { signal: MoodSignal; marketName: string }) {
	const sorted = [...signal.coins].sort((a, b) => b.score - a.score);
	return (
		<div className="flex-1 overflow-y-auto p-4">
			<div className="mb-3 flex items-baseline justify-between">
				<span className="text-xs text-fg-muted">Pool mood, all markets</span>
				<span className="text-base font-medium tabular-nums" style={{ color: moodColor(signal.overall.score) }}>
					{signedScore(signal.overall.score)} {moodLabel(signal.overall.score)}
				</span>
			</div>
			{sorted.map((c) => (
				<div
					key={c.coin}
					className={cn(
						"flex items-center gap-3 rounded-8 px-2 py-2",
						coinName(c.coin) === coinName(marketName) && "bg-control",
					)}
				>
					<ScoreArc value={c.score} size={20} stroke={3} />
					<span className="flex-1 text-xs font-medium">{coinName(c.coin)}</span>
					<span className="text-xs text-fg-muted">{moodLabel(c.score)}</span>
					<span className="w-9 text-right text-xs tabular-nums" style={{ color: moodColor(c.score) }}>
						{signedScore(c.score)}
					</span>
				</div>
			))}
		</div>
	);
}
