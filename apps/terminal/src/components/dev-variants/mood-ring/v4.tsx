import { useState } from "react";
import { coins, labelOf, moodColor, name, overall, short, signed, usd, weight } from "./data";

interface Props {
	score: number;
}

const css = `
.mr4-modal{animation:mr4-in .18s cubic-bezier(.2,.8,.2,1)}
@keyframes mr4-in{from{opacity:0;transform:translate(-50%,-50%) scale(.97)}}
.mr4-seg{transition:opacity .15s}
.mr4-mini{animation:mr4-spin 40s linear infinite}
@keyframes mr4-spin{to{transform:rotate(360deg)}}
`;

function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
	const p = (r: number, a: number) => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`;
	const large = a1 - a0 > Math.PI ? 1 : 0;
	return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

function Ring({
	size,
	inner,
	outer,
	polar,
	active,
	onHover,
}: {
	size: number;
	inner: number;
	outer: number;
	polar?: boolean;
	active?: number | null;
	onHover?: (i: number | null) => void;
}) {
	const n = coins.length;
	const gap = polar ? 0.025 : 0.09;
	const c = size / 2;
	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
			{polar && <circle cx={c} cy={c} r={outer} fill="none" stroke="var(--color-stroke-faint)" />}
			{coins.map((x, i) => {
				const a0 = (i / n) * Math.PI * 2 + gap;
				const a1 = ((i + 1) / n) * Math.PI * 2 - gap;
				const r1 = polar ? inner + 6 + (outer - inner - 6) * (Math.abs(x.score) / 100) : outer;
				return (
					<path
						key={x.coin}
						className="mr4-seg"
						d={arc(c, c, inner, r1, a0, a1)}
						fill={moodColor(x.score)}
						opacity={active == null || active === i ? 1 : 0.3}
						onMouseEnter={() => onHover?.(i)}
						onMouseLeave={() => onHover?.(null)}
					/>
				);
			})}
			{polar &&
				coins.map((x, i) => {
					const a = ((i + 0.5) / n) * Math.PI * 2;
					return (
						<text
							key={x.coin}
							x={c + (outer + 16) * Math.sin(a)}
							y={c - (outer + 16) * Math.cos(a) + 4}
							textAnchor="middle"
							fontSize="11"
							fill="var(--color-fg-muted)"
						>
							{name(x.coin)}
						</text>
					);
				})}
		</svg>
	);
}

export default function V4({ score }: Props) {
	const [open, setOpen] = useState(true);
	const [hover, setHover] = useState<number | null>(null);
	const sel = hover == null ? null : coins[hover];
	return (
		<>
			<style>{css}</style>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="absolute flex h-8 items-center gap-2 rounded-xs px-2 text-sm text-fg-muted hover:bg-fill-hover hover:text-fg"
				style={{ left: 782, top: 8 }}
			>
				<span className="mr4-mini block size-[22px]">
					<Ring size={22} inner={6.5} outer={11} />
				</span>
				Mood
				<span className="tabular-nums" style={{ color: moodColor(score) }}>
					{signed(score)}
				</span>
			</button>
			{open && (
				<>
					<div className="absolute inset-0 bg-scrim" onClick={() => setOpen(false)} />
					<div className="mr4-modal absolute top-1/2 left-1/2 flex w-[820px] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xs bg-overlay p-6 shadow-menu">
						<div className="relative flex-none">
							<Ring size={380} inner={92} outer={160} polar active={hover} onHover={setHover} />
							<div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
								{sel ? (
									<div>
										<div className="text-sm text-fg-secondary">{name(sel.coin)}</div>
										<div
											className="text-[40px] leading-none font-semibold tabular-nums"
											style={{ color: moodColor(sel.score) }}
										>
											{signed(sel.score)}
										</div>
										<div className="mt-1 text-xs text-fg-muted">{sel.label}</div>
									</div>
								) : (
									<div>
										<div className="text-xs text-fg-muted">Pool mood</div>
										<div
											className="text-[44px] leading-none font-semibold tabular-nums"
											style={{ color: moodColor(score) }}
										>
											{signed(score)}
										</div>
										<div className="mt-1 text-xs text-fg-secondary">{labelOf(score)}</div>
									</div>
								)}
							</div>
						</div>
						<div className="flex min-w-0 flex-1 flex-col">
							<div className="flex items-center justify-between">
								<span className="text-base font-medium">{sel ? `${name(sel.coin)} breakdown` : "Mood Ring"}</span>
								<button type="button" onClick={() => setOpen(false)} className="text-sm text-fg-muted hover:text-fg">
									Close
								</button>
							</div>
							<p className="mt-1 text-xs text-fg-muted">
								{sel
									? `${sel.tradersLong + sel.tradersShort} pool traders hold ${name(sel.coin)}.`
									: "Consensus of 37 profitable Hyperliquid traders. Segment length is conviction. Hover a segment."}
							</p>
							{sel ? (
								<div className="mt-5 space-y-2">
									{[
										["Positions score", signed(sel.posScore), moodColor(sel.posScore)],
										["Order flow score", signed(sel.flowScore), moodColor(sel.flowScore)],
										["Long notional", usd(sel.long), undefined],
										["Short notional", usd(sel.short), undefined],
										["Traders long / short", `${sel.tradersLong} / ${sel.tradersShort}`, undefined],
										["Net flow 24h", usd(sel.flow24h), undefined],
										[
											"Dominant trader",
											sel.dominant ? `${short(sel.dominant.usr)} · ${Math.round(sel.dominant.share * 100)}%` : "None",
											undefined,
										],
										[
											"Auto Trader weight",
											weight(sel.score) === 0 ? "0, flat band" : `${signed(Math.round(weight(sel.score) * 100))}%`,
											undefined,
										],
									].map(([l, v, col]) => (
										<div key={l} className="flex justify-between rounded-xs bg-control px-3 py-2 text-xs">
											<span className="text-fg-muted">{l}</span>
											<span className="tabular-nums" style={{ color: col }}>
												{v}
											</span>
										</div>
									))}
								</div>
							) : (
								<div className="mt-5 space-y-2">
									{[
										["Positions, 60% weight", overall.posScore],
										["Order flow 24h, 40% weight", overall.flowScore],
									].map(([l, v]) => (
										<div key={l} className="flex justify-between rounded-xs bg-control px-3 py-2.5 text-xs">
											<span className="text-fg-muted">{l}</span>
											<span className="tabular-nums" style={{ color: moodColor(v as number) }}>
												{signed(v as number)}
											</span>
										</div>
									))}
									<div className="grid grid-cols-3 gap-2 pt-2">
										{[
											["Bullish", overall.bullish, 70],
											["Neutral", overall.neutral, 0],
											["Bearish", overall.bearish, -70],
										].map(([l, v, s]) => (
											<div key={l} className="rounded-xs bg-control p-3">
												<div className="text-2xl font-semibold tabular-nums" style={{ color: moodColor(s as number) }}>
													{v}
												</div>
												<div className="text-xs text-fg-muted">{l} markets</div>
											</div>
										))}
									</div>
									<p className="pt-2 text-xs text-fg-muted">
										Overall score is the 24h-volume-weighted mean of 18 market scores.
									</p>
								</div>
							)}
						</div>
					</div>
				</>
			)}
		</>
	);
}
