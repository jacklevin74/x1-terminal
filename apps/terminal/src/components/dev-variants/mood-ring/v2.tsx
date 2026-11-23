import { useState } from "react";
import { coins, labelOf, moodColor, name, overall, short, signed, sparkPath, usd, weight } from "./data";

interface Props {
	score: number;
}

const css = `
.mr2-ring{transition:stroke .5s,stroke-dasharray .5s}
.mr2-drawer{animation:mr2-in .2s cubic-bezier(.2,.8,.2,1)}
@keyframes mr2-in{from{opacity:0;transform:translateX(16px)}}
`;

function Arc({ value, size, stroke }: { value: number; size: number; stroke: number }) {
	const r = (size - stroke) / 2;
	const len = 2 * Math.PI * r;
	const part = (Math.abs(value) / 100) * len;
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			style={{ transform: `rotate(-90deg) scaleY(${value < 0 ? -1 : 1})` }}
		>
			<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-control)" strokeWidth={stroke} />
			<circle
				className="mr2-ring"
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke={moodColor(value)}
				strokeWidth={stroke}
				strokeLinecap="round"
				strokeDasharray={`${Math.max(part, 0.01)} ${len}`}
			/>
		</svg>
	);
}

function Split({ label, value, note }: { label: string; value: number; note: string }) {
	const w = Math.abs(value) / 2;
	return (
		<div>
			<div className="flex justify-between text-xs">
				<span className="text-fg-muted">{label}</span>
				<span className="tabular-nums" style={{ color: moodColor(value) }}>
					{signed(value)}
				</span>
			</div>
			<div className="relative mt-1.5 h-1.5 rounded-full bg-control">
				<div className="absolute top-0 bottom-0 w-px bg-fg-muted" style={{ left: "50%" }} />
				<div
					className="absolute top-0 bottom-0 rounded-full"
					style={{ background: moodColor(value), width: `${w}%`, left: value >= 0 ? "50%" : `${50 - w}%` }}
				/>
			</div>
			<div className="mt-1 text-2xs text-fg-muted">{note}</div>
		</div>
	);
}

export default function V2({ score }: Props) {
	const [open, setOpen] = useState(true);
	const [tab, setTab] = useState<"market" | "all">("market");
	const btc = coins.find((c) => c.coin === "BTC")!;
	const s = score;
	const w = weight(btc.score);
	const sorted = [...coins].sort((a, b) => b.score - a.score);
	return (
		<>
			<style>{css}</style>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="absolute flex items-center gap-2.5 rounded-xs px-2 py-1 hover:bg-fill-hover"
				style={{ left: 712, top: 90 }}
			>
				<Arc value={s} size={26} stroke={3.5} />
				<span className="text-left">
					<span className="block text-2xs tracking-micro text-fg-muted uppercase">Mood</span>
					<span className="block text-xs tabular-nums" style={{ color: moodColor(s) }}>
						{signed(s)} {labelOf(s)}
					</span>
				</span>
			</button>
			{open && (
				<div
					className="mr2-drawer absolute flex w-[400px] flex-col bg-overlay shadow-menu"
					style={{ right: 4, top: 136, bottom: 28 }}
				>
					<div className="flex items-center gap-1 border-b border-stroke-weak px-3 pt-3">
						{(["market", "all"] as const).map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setTab(t)}
								className={`h-9 border-b-2 px-2 text-sm ${tab === t ? "border-fg text-fg" : "border-transparent text-fg-muted"}`}
							>
								{t === "market" ? "BTC" : "All markets"}
							</button>
						))}
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="ml-auto h-9 px-2 text-sm text-fg-muted hover:text-fg"
						>
							Close
						</button>
					</div>
					{tab === "market" ? (
						<div className="flex-1 space-y-5 overflow-y-auto p-4">
							<div className="flex items-center gap-4">
								<div className="relative">
									<Arc value={s} size={112} stroke={8} />
									<span
										className="absolute inset-0 grid place-items-center text-[28px] font-semibold tabular-nums"
										style={{ color: moodColor(s) }}
									>
										{signed(s)}
									</span>
								</div>
								<div>
									<div className="text-base font-medium">{labelOf(s)}</div>
									<div className="mt-1 text-xs text-fg-muted">
										{btc.tradersLong + btc.tradersShort} of 37 pool traders hold BTC
									</div>
								</div>
							</div>
							<div>
								<div className="mb-1.5 flex justify-between text-xs text-fg-muted">
									<span>Last 24h</span>
									<span className="tabular-nums">
										{signed(btc.history[0][1])} → {signed(btc.score)}
									</span>
								</div>
								<svg viewBox="0 0 368 64" className="h-16 w-full rounded-xs bg-surface">
									<line x1="0" x2="368" y1="32" y2="32" stroke="var(--color-stroke-weak)" />
									<path
										d={sparkPath(btc.history, 368, 64)}
										fill="none"
										stroke={moodColor(btc.score)}
										strokeWidth="1.5"
									/>
								</svg>
							</div>
							<Split
								label="Positions (60%)"
								value={btc.posScore}
								note={`${usd(btc.long)} long, ${usd(btc.short)} short`}
							/>
							<Split
								label="Order flow 24h (40%)"
								value={btc.flowScore}
								note={`Net ${usd(btc.flow24h)} bought in 24h`}
							/>
							<div className="grid grid-cols-2 gap-2">
								<div className="rounded-xs bg-control p-2.5">
									<div className="text-xs text-fg-muted">Traders long</div>
									<div className="mt-0.5 text-base tabular-nums text-market-up">{btc.tradersLong}</div>
								</div>
								<div className="rounded-xs bg-control p-2.5">
									<div className="text-xs text-fg-muted">Traders short</div>
									<div className="mt-0.5 text-base tabular-nums text-market-down">{btc.tradersShort}</div>
								</div>
							</div>
							{btc.dominant && (
								<div className="rounded-xs bg-warning-soft p-3 text-xs text-fg-secondary">
									<span className="text-warning">Dominant trader.</span> {short(btc.dominant.usr)} holds{" "}
									{Math.round(btc.dominant.share * 100)}% of gross BTC exposure. The score caps each trader at 40%.
								</div>
							)}
							<div className="rounded-xs bg-control p-3">
								<div className="text-xs text-fg-muted">Auto Trader target</div>
								<div className="mt-0.5 text-sm">
									{w === 0
										? "No position. The score is inside the ±15 flat band."
										: `${w > 0 ? "Long" : "Short"} ${Math.abs(w * 100).toFixed(0)}% of equity × leverage`}
								</div>
							</div>
						</div>
					) : (
						<div className="flex-1 overflow-y-auto p-4">
							<div className="mb-3 flex items-baseline justify-between">
								<span className="text-xs text-fg-muted">Pool mood, all markets</span>
								<span className="text-base font-medium tabular-nums" style={{ color: moodColor(overall.score) }}>
									{signed(overall.score)} {labelOf(overall.score)}
								</span>
							</div>
							{sorted.map((x) => (
								<div
									key={x.coin}
									className={`flex items-center gap-3 rounded-xs px-2 py-2 ${x.coin === "BTC" ? "bg-control" : ""}`}
								>
									<Arc value={x.score} size={20} stroke={3} />
									<span className="flex-1 text-xs font-medium">{name(x.coin)}</span>
									<span className="text-xs text-fg-muted">{x.label}</span>
									<span className="w-9 text-right text-xs tabular-nums" style={{ color: moodColor(x.score) }}>
										{signed(x.score)}
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</>
	);
}
