import { useId } from "react";
import { moodColor, moodLabel, signedScore } from "@/lib/mood/signal";
import type { MoodGauge } from "@/stores/use-mood-variant-store";
import { MoodGlow } from "./mood-glow";

interface Props {
	style: MoodGauge;
	score: number;
	from: number;
	name: string;
}

const W = 200;
const C = 100;
const R = 84;
const STROKE = 10;
const INNER = R - STROKE / 2;
const OUTER = R + STROKE / 2;
const SWEEP = (120 * Math.PI) / 180;
const H = Math.round(C + R * 0.5 + STROKE / 2 + 2);
const BOUNDS = [-60, -20, 20, 60];

const clamp = (s: number) => Math.max(-100, Math.min(100, s));
const toAngle = (s: number) => (clamp(s) / 100) * SWEEP;

function point(r: number, a: number) {
	return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

function arc(r: number, a0: number, a1: number) {
	const p0 = point(r, a0);
	const p1 = point(r, a1);
	return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

export function MoodHeroGauge({ style, score, from, name }: Props) {
	const id = useId();
	const a = toAngle(score);
	const lo = Math.min(0, a);
	const hi = Math.max(0, a);
	const color = moodColor(score);
	const end = point(R, SWEEP);
	const side = score < 0 ? "bear" : "bull";
	const h0 = point(INNER + 0.75, lo);
	const h1 = point(INNER + 0.75, hi);
	return (
		<div className="relative mx-auto" style={{ width: W, height: H + 18 }}>
			<svg
				width={W}
				height={H}
				viewBox={`0 0 ${W} ${H}`}
				aria-hidden="true"
				className="relative block overflow-visible"
			>
				<defs>
					<linearGradient id={`${id}-hl`} gradientUnits="userSpaceOnUse" x1={h0.x} y1={h0.y} x2={h1.x} y2={h1.y}>
						<stop offset="0" stopColor={`var(--mood-${side}-core)`} stopOpacity="0" />
						<stop offset="0.5" stopColor={`var(--mood-${side}-core)`} />
						<stop offset="1" stopColor={`var(--mood-${side}-core)`} stopOpacity="0" />
					</linearGradient>
				</defs>
				<MoodGlow score={score} center={C} radius={R} inner={INNER} lo={lo} hi={hi} />
				{style === 2 ? (
					<TickScale score={score} />
				) : (
					<>
						<path
							d={arc(R, -SWEEP, SWEEP)}
							fill="none"
							stroke="var(--color-control-hover)"
							strokeWidth={STROKE}
							strokeLinecap="round"
						/>
						{hi > lo && (
							<path
								d={arc(R, lo, hi)}
								fill="none"
								stroke={color}
								strokeWidth={STROKE}
								className="transition-[stroke] duration-500"
							/>
						)}
						{a !== 0 && <circle cx={point(R, a).x} cy={point(R, a).y} r={STROKE / 2} fill={color} />}
						{style === 3 &&
							BOUNDS.map((b) => {
								const p0 = point(INNER - 1, toAngle(b));
								const p1 = point(OUTER + 1, toAngle(b));
								return (
									<line key={b} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="var(--color-surface)" strokeWidth={3} />
								);
							})}
					</>
				)}
				{style !== 2 && Math.abs(score) >= 3 && (
					<path d={arc(INNER + 0.75, lo, hi)} fill="none" stroke={`url(#${id}-hl)`} strokeWidth={1.5} />
				)}
				{style === 4 && <Trail from={from} score={score} />}
				<ZeroTick />
				<Knob score={score} />
			</svg>
			<div className="absolute inset-x-0 flex flex-col items-center" style={{ top: C - 44 }}>
				<span className="text-2xs text-fg-muted">{name}</span>
				<span
					className="text-[44px] leading-none font-semibold tabular-nums transition-colors duration-500"
					style={{ color }}
				>
					{signedScore(score)}
				</span>
				<span className="mt-1.5 text-sm font-medium">{moodLabel(score)}</span>
			</div>
			<span
				className="absolute -translate-x-1/2 text-2xs tabular-nums text-fg-muted"
				style={{ left: W - end.x, top: H + 2 }}
			>
				−100
			</span>
			<span
				className="absolute -translate-x-1/2 text-2xs tabular-nums text-fg-muted"
				style={{ left: end.x, top: H + 2 }}
			>
				+100
			</span>
		</div>
	);
}

function ZeroTick() {
	return (
		<line
			x1={C}
			x2={C}
			y1={C - OUTER - 7}
			y2={C - OUTER - 3}
			stroke="var(--color-fg-muted)"
			strokeWidth={1.5}
			strokeLinecap="round"
		/>
	);
}

function Knob({ score }: { score: number }) {
	const p = point(R, toAngle(score));
	return <circle cx={p.x} cy={p.y} r={2.75} fill="var(--color-fg)" className="transition-all duration-500" />;
}

function TickScale({ score }: { score: number }) {
	const s = clamp(score);
	const lo = Math.min(0, s);
	const hi = Math.max(0, s);
	return (
		<>
			{Array.from({ length: 41 }, (_, i) => {
				const v = -100 + i * 5;
				const major = v === 0 || v === -100 || v === 100 || BOUNDS.includes(v);
				const lit = s !== 0 && v >= lo && v <= hi;
				const p0 = point(major ? INNER - 2 : INNER + 1, toAngle(v));
				const p1 = point(major ? OUTER + 2 : OUTER - 1, toAngle(v));
				return (
					<line
						key={v}
						x1={p0.x}
						y1={p0.y}
						x2={p1.x}
						y2={p1.y}
						stroke={lit ? moodColor(score) : "var(--color-control-hover)"}
						strokeWidth={2}
						strokeLinecap="round"
						className="transition-[stroke] duration-500"
					/>
				);
			})}
			<circle cx={point(R, toAngle(s)).x} cy={point(R, toAngle(s)).y} r={6} fill={moodColor(score)} />
		</>
	);
}

function Trail({ from, score }: { from: number; score: number }) {
	const a0 = toAngle(from);
	const a1 = toAngle(score);
	const r = INNER - 6;
	const ghost = point(r, a0);
	if (Math.abs(a1 - a0) < 0.02) return null;
	return (
		<>
			<path
				d={arc(r, Math.min(a0, a1), Math.max(a0, a1))}
				fill="none"
				stroke="var(--color-fg-secondary)"
				strokeWidth={1.5}
				strokeLinecap="round"
			/>
			<circle cx={ghost.x} cy={ghost.y} r={2.5} fill="var(--color-fg-secondary)" />
		</>
	);
}
