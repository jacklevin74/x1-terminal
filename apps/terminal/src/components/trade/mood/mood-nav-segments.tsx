import { Modal, ModalPopup, ModalTrigger } from "@hypeterminal/ui";
import { useState } from "react";
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
import { ScoreNumber } from "./mood-parts";

interface Props {
	signal: MoodSignal;
	score: number;
}

function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
	const p = (r: number, a: number) => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`;
	const large = a1 - a0 > Math.PI ? 1 : 0;
	return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

function Segments({
	coins,
	size,
	inner,
	outer,
	polar,
	active,
	onHover,
}: {
	coins: MoodCoin[];
	size: number;
	inner: number;
	outer: number;
	polar?: boolean;
	active?: number | null;
	onHover?: (i: number | null) => void;
}) {
	const n = Math.max(1, coins.length);
	const gap = polar ? 0.025 : 0.09;
	const c = size / 2;
	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
			{polar && <circle cx={c} cy={c} r={outer} fill="none" stroke="var(--color-stroke-faint)" />}
			{coins.map((x, i) => {
				const a0 = (i / n) * Math.PI * 2 + gap;
				const a1 = ((i + 1) / n) * Math.PI * 2 - gap;
				const r1 = polar ? inner + 6 + (outer - inner - 6) * (Math.abs(x.score) / 100) : outer;
				return (
					// biome-ignore lint/a11y/noStaticElementInteractions: hover preview only; the same data is in the side list
					<path
						key={x.coin}
						d={arcPath(c, c, inner, r1, a0, a1)}
						fill={moodColor(x.score)}
						opacity={active == null || active === i ? 1 : 0.3}
						className="transition-opacity duration-150"
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
							{coinName(x.coin)}
						</text>
					);
				})}
		</svg>
	);
}

export function MoodNavSegments({ signal, score }: Props) {
	const [hover, setHover] = useState<number | null>(null);
	const { coins, overall } = signal;
	const sel = hover == null ? null : coins[hover];
	return (
		<Modal>
			<ModalTrigger className="relative flex h-7 items-center gap-2 rounded-8 px-2 text-sm text-fg-muted transition-colors hover:bg-fill-hover hover:text-fg">
				<span className="mood-spin-slow block size-[22px]">
					<Segments coins={coins} size={22} inner={6.5} outer={11} />
				</span>
				Mood
				<ScoreNumber score={score} className="font-normal" />
			</ModalTrigger>
			<ModalPopup className="max-w-[820px] flex-row gap-6 rounded-8 p-6">
				<div className="relative flex-none">
					<Segments coins={coins} size={380} inner={92} outer={160} polar active={hover} onHover={setHover} />
					<div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
						{sel ? (
							<div>
								<div className="text-sm text-fg-secondary">{coinName(sel.coin)}</div>
								<ScoreNumber score={sel.score} className="text-[40px]" />
								<div className="mt-1 text-xs text-fg-muted">{moodLabel(sel.score)}</div>
							</div>
						) : (
							<div>
								<div className="text-xs text-fg-muted">Pool mood</div>
								<ScoreNumber score={score} className="text-[44px]" />
								<div className="mt-1 text-xs text-fg-secondary">{moodLabel(score)}</div>
							</div>
						)}
					</div>
				</div>
				<div className="flex min-w-0 flex-1 flex-col pr-6">
					<span className="text-base font-medium">{sel ? `${coinName(sel.coin)} breakdown` : "Mood Ring"}</span>
					<p className="mt-1 text-xs text-fg-muted">
						{sel
							? `${sel.tradersLong + sel.tradersShort} pool traders hold ${coinName(sel.coin)}.`
							: `Consensus of ${MOOD_POOL_SIZE} profitable Hyperliquid traders. Segment length shows conviction. Hover a segment.`}
					</p>
					{sel ? (
						<div className="mt-5 space-y-2">
							<Row label="Positions score" value={signedScore(sel.posScore)} color={moodColor(sel.posScore)} />
							<Row label="Order flow score" value={signedScore(sel.flowScore)} color={moodColor(sel.flowScore)} />
							<Row label="Long notional" value={compactUsd(sel.long)} />
							<Row label="Short notional" value={compactUsd(sel.short)} />
							<Row label="Traders long / short" value={`${sel.tradersLong} / ${sel.tradersShort}`} />
							<Row label="Net flow 24h" value={compactUsd(sel.flow24h)} />
							<Row
								label="Dominant trader"
								value={
									sel.dominant && sel.dominant.share >= 0.4
										? `${shortAddress(sel.dominant.usr)} · ${Math.round(sel.dominant.share * 100)}%`
										: "None"
								}
							/>
							<Row
								label="Auto Trader weight"
								value={
									targetWeight(sel.score) === 0
										? "0, flat band"
										: `${signedScore(Math.round(targetWeight(sel.score) * 100))}%`
								}
							/>
						</div>
					) : (
						<div className="mt-5 space-y-2">
							<Row
								label="Positions, 60% weight"
								value={signedScore(overall.posScore)}
								color={moodColor(overall.posScore)}
							/>
							<Row
								label="Order flow 24h, 40% weight"
								value={signedScore(overall.flowScore)}
								color={moodColor(overall.flowScore)}
							/>
							<div className="grid grid-cols-3 gap-2 pt-2">
								<Count label="Bullish" value={overall.bullish} tone={70} />
								<Count label="Neutral" value={overall.neutral} tone={0} />
								<Count label="Bearish" value={overall.bearish} tone={-70} />
							</div>
							<p className="pt-2 text-xs text-fg-muted">
								The overall score is the mean of {coins.length} market scores, weighted by 24h volume.
							</p>
						</div>
					)}
				</div>
			</ModalPopup>
		</Modal>
	);
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
	return (
		<div className="flex justify-between rounded-8 bg-control px-3 py-2 text-xs">
			<span className="text-fg-muted">{label}</span>
			<span className="tabular-nums" style={{ color }}>
				{value}
			</span>
		</div>
	);
}

function Count({ label, value, tone }: { label: string; value: number; tone: number }) {
	return (
		<div className="rounded-8 bg-control p-3">
			<div className="text-2xl font-semibold tabular-nums" style={{ color: moodColor(tone) }}>
				{value}
			</div>
			<div className="text-xs text-fg-muted">{label} markets</div>
		</div>
	);
}
