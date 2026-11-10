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
	const a = toAngle(score);
	const lo = Math.min(0, a);
	const hi = Math.max(0, a);
	const color = moodColor(score);
	const end = point(R, SWEEP);
	const zone = zoneRange(score);
	const glow = style === 3 ? zone : { lo, hi };
	return (
		<div className="relative mx-auto" style={{ width: W, height: H + 18 }}>
			<svg
				width={W}
				height={H}
				viewBox={`0 0 ${W} ${H}`}
				aria-hidden="true"
				className="relative block overflow-visible"
			>
				<MoodGlow score={score} center={C} radius={R} inner={INNER} lo={glow.lo} hi={glow.hi} />
				{style === 2 && <TickScale score={score} />}
				{style === 3 && <ZoneTrack score={score} />}
				{(style === 1 || style === 4) && <PlainTrack score={score} />}
				{style === 4 && <Trail from={from} score={score} />}
				{style !== 4 && <ZeroTick />}
				{style !== 2 && <Knob score={score} />}
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

function zoneRange(score: number) {
	const edges = [-100, ...BOUNDS, 100];
	const s = clamp(score);
	const i = Math.max(
		0,
		edges.findIndex((_, k) => k < edges.length - 1 && s <= (edges[k + 1] ?? 100)),
	);
	return { lo: toAngle(edges[i] ?? -100), hi: toAngle(edges[i + 1] ?? 100) };
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
	return <circle cx={p.x} cy={p.y} r={2.5} fill="var(--color-fg)" />;
}

function Track({ a0, a1 }: { a0: number; a1: number }) {
	return (
		<path
			d={arc(R, a0, a1)}
			fill="none"
			stroke="var(--color-control-hover)"
			strokeWidth={STROKE}
			strokeLinecap="round"
		/>
	);
}

function Fill({ a0, a1, color }: { a0: number; a1: number; color: string }) {
	if (a1 - a0 < 0.001) {
		const p = point(R, a0);
		return <circle cx={p.x} cy={p.y} r={STROKE / 2} fill={color} />;
	}
	return <path d={arc(R, a0, a1)} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />;
}

function PlainTrack({ score }: { score: number }) {
	const a = toAngle(score);
	return (
		<>
			<Track a0={-SWEEP} a1={SWEEP} />
			<Fill a0={Math.min(0, a)} a1={Math.max(0, a)} color={moodColor(score)} />
		</>
	);
}

function ZoneTrack({ score }: { score: number }) {
	const trim = (STROKE / 2 + 2.5) / R;
	const edges = [-100, ...BOUNDS, 100];
	const s = clamp(score);
	const active = edges.findIndex((e, i) => i < edges.length - 1 && s >= e && s <= (edges[i + 1] ?? 100));
	return (
		<>
			{edges.slice(0, -1).map((e, i) => {
				const a0 = toAngle(e) + (i === 0 ? 0 : trim);
				const a1 = toAngle(edges[i + 1] ?? 100) - (i === edges.length - 2 ? 0 : trim);
				return i === active ? (
					<Fill key={e} a0={a0} a1={a1} color={moodColor(score)} />
				) : (
					<Track key={e} a0={a0} a1={a1} />
				);
			})}
		</>
	);
}

function TickScale({ score }: { score: number }) {
	const s = clamp(score);
	const lo = Math.min(0, s);
	const hi = Math.max(0, s);
	const marker = toAngle(s);
	const m0 = point(INNER - 4, marker);
	const m1 = point(OUTER + 4, marker);
	return (
		<>
			{Array.from({ length: 41 }, (_, i) => {
				const v = -100 + i * 5;
				const major = v === 0 || v === -100 || v === 100 || BOUNDS.includes(v);
				const lit = s !== 0 && v >= lo && v <= hi;
				const p0 = point(major ? INNER - 1 : INNER + 1.5, toAngle(v));
				const p1 = point(major ? OUTER + 1 : OUTER - 1.5, toAngle(v));
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
					/>
				);
			})}
			<line x1={m0.x} y1={m0.y} x2={m1.x} y2={m1.y} stroke="var(--color-fg)" strokeWidth={3} strokeLinecap="round" />
		</>
	);
}

function Trail({ from, score }: { from: number; score: number }) {
	const a0 = toAngle(from);
	const a1 = toAngle(score);
	if (Math.abs(clamp(score) - clamp(from)) < 6) return null;
	const r = OUTER + 6;
	const ghost = point(r, a0);
	return (
		<>
			<path
				d={arc(r, Math.min(a0, a1), Math.max(a0, a1))}
				fill="none"
				stroke="var(--color-fg-muted)"
				strokeWidth={1.5}
				strokeLinecap="round"
			/>
			<circle cx={ghost.x} cy={ghost.y} r={2.5} fill="var(--color-fg-muted)" />
		</>
	);
}
