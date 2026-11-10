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
const SWEEP = (120 * Math.PI) / 180;
const H = Math.round(C + R * 0.5 + STROKE / 2 + 2);
const ZONES = [-100, -60, -20, 20, 60, 100];

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
	const a = toAngle(score);
	const color = moodColor(score);
	const knob = point(R, a);
	const source = point(R * 0.4, a / 2);
	const end = point(R, SWEEP);
	return (
		<div className="relative mx-auto" style={{ width: W, height: H + 18 }}>
			<MoodGlow score={score} size={140} style={{ left: source.x, top: source.y }} />
			<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="relative block">
				{style === 2 ? <TickScale score={score} /> : null}
				{style === 3 ? <ZoneTrack score={score} /> : null}
				{style === 1 || style === 4 ? <PlainTrack score={score} /> : null}
				{style === 4 ? <Trail from={from} score={score} /> : null}
				{style !== 2 && (
					<line
						x1={C}
						x2={C}
						y1={C - R + STROKE / 2 + 3}
						y2={C - R + STROKE / 2 + 8}
						stroke="var(--color-fg-muted)"
						strokeWidth={1.5}
						strokeLinecap="round"
					/>
				)}
				<circle cx={knob.x} cy={knob.y} r={STROKE / 2 + 3.5} fill="var(--color-surface)" />
				<circle cx={knob.x} cy={knob.y} r={STROKE / 2 - 0.5} fill={style === 2 ? color : "var(--color-fg)"} />
			</svg>
			<div className="absolute inset-x-0 flex flex-col items-center" style={{ top: C - 46 }}>
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

function PlainTrack({ score }: { score: number }) {
	const a = toAngle(score);
	return (
		<>
			<path
				d={arc(R, -SWEEP, SWEEP)}
				fill="none"
				stroke="var(--color-control-hover)"
				strokeWidth={STROKE}
				strokeLinecap="round"
			/>
			{a !== 0 && (
				<path
					d={arc(R, Math.min(0, a), Math.max(0, a))}
					fill="none"
					stroke={moodColor(score)}
					strokeWidth={STROKE}
					strokeLinecap="round"
				/>
			)}
		</>
	);
}

function TickScale({ score }: { score: number }) {
	const s = clamp(score);
	const lo = Math.min(0, s);
	const hi = Math.max(0, s);
	return (
		<>
			{Array.from({ length: 41 }, (_, i) => {
				const v = -100 + i * 5;
				const major = ZONES.includes(v) || v === 0;
				const lit = v >= lo && v <= hi && s !== 0;
				const half = major ? 7 : 4;
				const p0 = point(R - half, toAngle(v));
				const p1 = point(R + half, toAngle(v));
				return (
					<line
						key={v}
						x1={p0.x}
						y1={p0.y}
						x2={p1.x}
						y2={p1.y}
						stroke={lit ? moodColor(score) : "var(--color-control-hover)"}
						strokeWidth={major ? 2.5 : 2}
						strokeLinecap="round"
						className="transition-[stroke] duration-500"
					/>
				);
			})}
		</>
	);
}

function ZoneTrack({ score }: { score: number }) {
	const s = clamp(score);
	const lo = Math.min(0, s);
	const hi = Math.max(0, s);
	const gap = 0.095;
	return (
		<>
			{ZONES.slice(0, -1).map((z0, i) => {
				const z1 = ZONES[i + 1] ?? 100;
				const f0 = Math.max(z0, lo);
				const f1 = Math.min(z1, hi);
				const a0 = toAngle(z0) + gap;
				const a1 = toAngle(z1) - gap;
				const fa0 = f0 === z0 ? a0 : toAngle(f0);
				const fa1 = f1 === z1 ? a1 : toAngle(f1);
				return (
					<g key={z0}>
						<path
							d={arc(R, a0, a1)}
							fill="none"
							stroke="var(--color-control-hover)"
							strokeWidth={STROKE}
							strokeLinecap="round"
						/>
						{f1 > f0 && fa1 > fa0 && (
							<path
								d={arc(R, fa0, fa1)}
								fill="none"
								stroke={moodColor(score)}
								strokeWidth={STROKE}
								strokeLinecap="round"
							/>
						)}
					</g>
				);
			})}
		</>
	);
}

function Trail({ from, score }: { from: number; score: number }) {
	const a0 = toAngle(from);
	const a1 = toAngle(score);
	const ghost = point(R, a0);
	const inner = R - STROKE / 2 - 7;
	return (
		<>
			{a0 !== a1 && (
				<path
					d={arc(inner, Math.min(a0, a1), Math.max(a0, a1))}
					fill="none"
					stroke="var(--color-fg-muted)"
					strokeWidth={2}
					strokeLinecap="round"
					strokeDasharray="0.5 4"
				/>
			)}
			<circle cx={ghost.x} cy={ghost.y} r={STROKE / 2 + 1} fill="var(--color-surface)" />
			<circle
				cx={ghost.x}
				cy={ghost.y}
				r={STROKE / 2 - 1.5}
				fill="none"
				stroke="var(--color-fg-muted)"
				strokeWidth={1.5}
			/>
		</>
	);
}
