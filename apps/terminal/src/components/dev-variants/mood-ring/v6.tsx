import { useState } from "react";
import { coins, labelOf, moodColor, short, signed, usd, weight } from "./data";

interface Props {
	score: number;
}

const css = `
.mr6-ring{position:relative;width:16px;height:16px;border-radius:999px;background:conic-gradient(var(--c) calc(var(--p)*1%),var(--color-control-hover) 0)}
.mr6-ring::after{content:"";position:absolute;inset:3px;border-radius:999px;background:var(--color-surface)}
.mr6-ring::before{content:"";position:absolute;inset:-2px;border-radius:999px;background:var(--c);filter:blur(6px);opacity:.35;z-index:-1}
.mr6-pop{transform-origin:top right;animation:mr6-in .16s cubic-bezier(.2,.8,.2,1)}
@keyframes mr6-in{from{opacity:0;transform:scale(.97)}}
`;

export default function V6({ score }: Props) {
	const [open, setOpen] = useState(true);
	const btc = coins.find((c) => c.coin === "BTC")!;
	const longPct = btc.pctLong;
	const w = weight(btc.score);
	const posPart = Math.round(0.6 * btc.posScore);
	const flowPart = Math.round(0.4 * btc.flowScore);
	return (
		<>
			<style>{css}</style>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="absolute isolate flex h-7 items-center gap-2 rounded-xs px-2 text-xs hover:bg-fill-hover"
				style={{ right: 16, top: 188, ["--c" as string]: moodColor(score), ["--p" as string]: Math.abs(score) }}
			>
				<span className="mr6-ring" />
				<span className="text-fg-muted">Pool</span>
				<span className="tabular-nums" style={{ color: moodColor(score) }}>
					{signed(score)}
				</span>
			</button>
			{open && (
				<div
					className="mr6-pop absolute w-[360px] rounded-xs bg-overlay p-4 shadow-menu"
					style={{ right: 16, top: 222 }}
				>
					<div className="flex items-baseline justify-between">
						<span className="text-sm font-medium">How the pool trades BTC</span>
						<span className="text-xs text-fg-muted">37 traders</span>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-[32px] leading-none font-semibold tabular-nums" style={{ color: moodColor(score) }}>
							{signed(score)}
						</span>
						<span className="text-sm text-fg-secondary">{labelOf(score)}</span>
					</div>
					<div className="mt-4 text-xs text-fg-muted">Where the score comes from</div>
					<div className="mt-1.5 grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2 text-center text-xs">
						<div className="rounded-xs bg-control px-2 py-2">
							<div className="text-fg-muted">Positions × 0.6</div>
							<div className="mt-0.5 text-sm tabular-nums" style={{ color: moodColor(btc.posScore) }}>
								{signed(posPart)}
							</div>
						</div>
						<span className="text-fg-muted">+</span>
						<div className="rounded-xs bg-control px-2 py-2">
							<div className="text-fg-muted">Flow × 0.4</div>
							<div className="mt-0.5 text-sm tabular-nums" style={{ color: moodColor(btc.flowScore) }}>
								{signed(flowPart)}
							</div>
						</div>
						<span className="text-fg-muted">=</span>
						<span className="text-sm font-medium tabular-nums" style={{ color: moodColor(btc.score) }}>
							{signed(btc.score)}
						</span>
					</div>
					<p className="mt-2 text-xs text-fg-muted">
						They hold BTC short, but bought {usd(btc.flow24h)} net in the last 24h.
					</p>
					<div className="mt-4 flex justify-between text-xs">
						<span className="text-market-up">Long {usd(btc.long)}</span>
						<span className="text-market-down">Short {usd(btc.short)}</span>
					</div>
					<div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
						<div className="bg-market-up" style={{ width: `${longPct}%` }} />
						<div className="flex-1 bg-market-down" />
					</div>
					<div className="mt-1.5 flex justify-between text-xs text-fg-muted">
						<span>{btc.tradersLong} traders</span>
						<span>{btc.tradersShort} traders</span>
					</div>
					{btc.dominant && (
						<p className="mt-3 text-xs text-fg-secondary">
							<span className="text-warning">{short(btc.dominant.usr)}</span> holds{" "}
							{Math.round(btc.dominant.share * 100)}% of the gross. The score caps one trader at 40%.
						</p>
					)}
					<div className="mt-4 flex items-center justify-between rounded-xs bg-control px-3 py-2.5 text-xs">
						<span className="text-fg-muted">Auto Trader on BTC</span>
						<span>
							{w === 0 ? "Flat, inside ±15" : `${w > 0 ? "Long" : "Short"} ${Math.abs(Math.round(w * 100))}%`}
						</span>
					</div>
				</div>
			)}
		</>
	);
}
