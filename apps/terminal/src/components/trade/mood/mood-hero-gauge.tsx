import { moodColor, moodLabel, signedScore } from "@/lib/mood/signal";
import { MoodGlow } from "./mood-glow";
import { useRevealValue } from "./use-reveal-value";

interface Props {
	score: number;
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

export function MoodHeroGauge({ score: target, name }: Props) {
	const { value: score, settled } = useRevealValue(target);
	const shown = Math.round(score);
	const a = toAngle(score);
	const lo = Math.min(0, a);
	const hi = Math.max(0, a);
	const color = moodColor(score);
	const end = point(R, SWEEP);
	return (
		<div className="relative mx-auto" style={{ width: W, height: H + 18 }}>
			<svg
				width={W}
				height={H}
				viewBox={`0 0 ${W} ${H}`}
				aria-hidden="true"
				className="relative block overflow-visible"
			>
				<MoodGlow score={score} center={C} radius={R} inner={INNER} lo={lo} hi={hi} />
				<TickScale score={score} />
			</svg>
			<div className="absolute inset-x-0 flex flex-col items-center" style={{ top: C - 44 }}>
				<span className="text-2xs text-fg-muted">{name}</span>
				<span className="text-[44px] leading-none font-semibold tabular-nums" style={{ color }}>
					{signedScore(shown)}
				</span>
				<span
					className="mt-1.5 text-sm font-medium transition-opacity duration-300"
					style={{ opacity: settled ? 1 : 0 }}
				>
					{moodLabel(target)}
				</span>
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
