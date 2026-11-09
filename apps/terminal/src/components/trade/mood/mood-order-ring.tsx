import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	coinName,
	compactUsd,
	MOOD_POOL_SIZE,
	type MoodCoin,
	moodLabel,
	shortAddress,
	targetWeight,
} from "@/lib/mood/signal";
import { moodVars, ScoreNumber } from "./mood-parts";

interface Props {
	coin: MoodCoin | undefined;
	marketName: string;
	score: number | null;
}

export function MoodOrderRing({ coin, marketName, score }: Props) {
	const s = score ?? 0;
	return (
		<Popover>
			<PopoverTrigger
				className="my-auto mr-1 ml-auto flex h-7 items-center gap-2 rounded-8 px-2 text-xs transition-colors hover:bg-fill-hover"
				style={moodVars(s)}
			>
				<span
					className="relative isolate block size-4 rounded-full"
					style={{ background: `conic-gradient(var(--mood) ${Math.abs(s)}%, var(--color-control-hover) 0)` }}
				>
					<span className="mood-glow absolute -inset-0.5 -z-10" style={{ filter: "blur(6px)", opacity: 0.35 }} />
					<span className="absolute inset-[3px] rounded-full bg-surface" />
				</span>
				<span className="text-fg-muted">Pool</span>
				{score === null ? (
					<span className="text-fg-muted">{"—"}</span>
				) : (
					<ScoreNumber score={s} className="font-normal" />
				)}
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="w-[360px] rounded-8">
				{coin ? (
					<Explainer coin={coin} score={s} />
				) : (
					<p className="text-sm text-fg-muted">
						The pool of {MOOD_POOL_SIZE} traders does not trade {coinName(marketName)}.
					</p>
				)}
			</PopoverContent>
		</Popover>
	);
}

function Explainer({ coin, score }: { coin: MoodCoin; score: number }) {
	const name = coinName(coin.coin);
	const w = targetWeight(coin.score);
	const posPart = Math.round(0.6 * coin.posScore);
	const flowPart = Math.round(0.4 * coin.flowScore);
	const held = coin.posScore >= 0 ? "long" : "short";
	const flowVerb = coin.flow24h >= 0 ? "bought" : "sold";
	return (
		<>
			<div className="flex items-baseline justify-between">
				<span className="text-sm font-medium">How the pool trades {name}</span>
				<span className="text-xs text-fg-muted">{MOOD_POOL_SIZE} traders</span>
			</div>
			<div className="mt-3 flex items-baseline gap-2">
				<ScoreNumber score={score} className="text-[32px]" />
				<span className="text-sm text-fg-secondary">{moodLabel(score)}</span>
			</div>
			<div className="mt-4 text-xs text-fg-muted">Where the score comes from</div>
			<div className="mt-1.5 grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2 text-center text-xs">
				<div className="rounded-8 bg-control px-2 py-2">
					<div className="text-fg-muted">Positions × 0.6</div>
					<ScoreNumber score={posPart} className="mt-1 block text-sm font-normal" />
				</div>
				<span className="text-fg-muted">+</span>
				<div className="rounded-8 bg-control px-2 py-2">
					<div className="text-fg-muted">Flow × 0.4</div>
					<ScoreNumber score={flowPart} className="mt-1 block text-sm font-normal" />
				</div>
				<span className="text-fg-muted">=</span>
				<ScoreNumber score={coin.score} className="text-sm font-medium" />
			</div>
			<p className="mt-2 text-xs text-fg-muted">
				The pool holds {name} net {held}. It {flowVerb} {compactUsd(Math.abs(coin.flow24h))} net in the last 24h.
			</p>
			<div className="mt-4 flex justify-between text-xs">
				<span className="text-market-up">Long {compactUsd(coin.long)}</span>
				<span className="text-market-down">Short {compactUsd(coin.short)}</span>
			</div>
			<div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
				<div className="bg-market-up" style={{ width: `${coin.pctLong}%` }} />
				<div className="flex-1 bg-market-down" />
			</div>
			<div className="mt-1.5 flex justify-between text-xs text-fg-muted">
				<span>{coin.tradersLong} traders</span>
				<span>{coin.tradersShort} traders</span>
			</div>
			{coin.dominant && coin.dominant.share >= 0.4 && (
				<p className="mt-3 text-xs text-fg-secondary">
					<span className="text-warning">{shortAddress(coin.dominant.usr)}</span> holds{" "}
					{Math.round(coin.dominant.share * 100)}% of the gross. The score caps one trader at 40%.
				</p>
			)}
			<div className="mt-4 flex items-center justify-between rounded-8 bg-control px-3 py-2.5 text-xs">
				<span className="text-fg-muted">Auto Trader on {name}</span>
				<span>{w === 0 ? "Flat, inside ±15" : `${w > 0 ? "Long" : "Short"} ${Math.abs(Math.round(w * 100))}%`}</span>
			</div>
		</>
	);
}
