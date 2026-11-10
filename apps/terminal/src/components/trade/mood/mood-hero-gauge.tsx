import { cn } from "@/lib/cn";
import { moodColor, moodLabel, moodTile, signedScore } from "@/lib/mood/signal";
import type { MoodGauge } from "@/stores/use-mood-variant-store";
import { moodVars } from "./mood-parts";

interface Props {
	style: MoodGauge;
	score: number;
	name: string;
}

const ZONES = [
	{ from: -100, to: -60 },
	{ from: -60, to: -20 },
	{ from: -20, to: 20 },
	{ from: 20, to: 60 },
	{ from: 60, to: 100 },
];

const clamp = (s: number) => Math.max(-100, Math.min(100, s));

function zoneOf(score: number) {
	const s = clamp(score);
	return ZONES.findIndex((z, i) => s < z.to || i === ZONES.length - 1);
}

function point(c: number, r: number, a: number) {
	return { x: c + r * Math.sin(a), y: c - r * Math.cos(a) };
}

function arc(c: number, r: number, a0: number, a1: number) {
	const p0 = point(c, r, a0);
	const p1 = point(c, r, a1);
	return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

export function MoodHeroGauge({ style, score, name }: Props) {
	if (style === 2) return <RingHero score={score} name={name} />;
	if (style === 3) return <SpectrumHero score={score} name={name} />;
	if (style === 4) return <DialHero score={score} name={name} />;
	return <ArcHero score={score} name={name} />;
}

function Glow({ score, className }: { score: number; className?: string }) {
	return (
		<span
			className={cn("pointer-events-none absolute rounded-full transition-colors duration-500", className)}
			style={{ background: moodColor(score), filter: "blur(48px)", opacity: 0.18 + Math.abs(score) / 400 }}
		/>
	);
}

function Readout({ score, name, className }: { score: number; name: string; className?: string }) {
	return (
		<div className={cn("flex flex-col items-center", className)}>
			<span className="text-2xs text-fg-muted">{name}</span>
			<span
				className="text-[44px] leading-none font-semibold tabular-nums transition-colors duration-500"
				style={{ color: moodColor(score) }}
			>
				{signedScore(score)}
			</span>
			<span className="mt-1.5 text-sm font-medium">{moodLabel(score)}</span>
		</div>
	);
}

function ArcHero({ score, name }: { score: number; name: string }) {
	const size = 172;
	const stroke = 10;
	const c = size / 2;
	const r = c - stroke / 2 - 2;
	const sweep = (120 * Math.PI) / 180;
	const a = (clamp(score) / 100) * sweep;
	const knob = point(c, r, a);
	return (
		<>
			<Glow score={score} className="top-6 left-1/2 size-32 -translate-x-1/2" />
			<div className="relative mx-auto w-[172px]">
				<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="block">
					<path
						d={arc(c, r, -sweep, sweep)}
						fill="none"
						stroke="var(--color-control-hover)"
						strokeWidth={stroke}
						strokeLinecap="round"
					/>
					{a !== 0 && (
						<path
							d={arc(c, r, Math.min(0, a), Math.max(0, a))}
							fill="none"
							stroke={moodColor(score)}
							strokeWidth={stroke}
							strokeLinecap="round"
						/>
					)}
					<line
						x1={c}
						x2={c}
						y1={c - r - stroke / 2 - 4}
						y2={c - r + stroke / 2 + 4}
						stroke="var(--color-fg-muted)"
						strokeWidth={1.5}
					/>
					<circle cx={knob.x} cy={knob.y} r={stroke / 2 + 2.5} fill="var(--color-fg)" />
					<circle cx={knob.x} cy={knob.y} r={stroke / 2 - 1} fill={moodColor(score)} />
				</svg>
				<Readout score={score} name={name} className="absolute inset-0 justify-center pt-1" />
				<div className="absolute inset-x-0 bottom-1 flex justify-between px-3 text-2xs tabular-nums text-fg-muted">
					<span>−100</span>
					<span>+100</span>
				</div>
			</div>
		</>
	);
}

function RingHero({ score, name }: { score: number; name: string }) {
	return (
		<div className="relative mx-auto grid size-[176px] place-items-center" style={moodVars(score)}>
			<span
				className="mood-breathe absolute inset-4 rounded-full"
				style={{ background: "var(--mood)", filter: "blur(28px)", opacity: 0.2 + Math.abs(score) / 300 }}
			/>
			<span
				className="mood-ring-spin absolute inset-0"
				style={{
					WebkitMask: "radial-gradient(circle closest-side, transparent 88%, #000 89.5%, #000 99%, transparent 100%)",
					mask: "radial-gradient(circle closest-side, transparent 88%, #000 89.5%, #000 99%, transparent 100%)",
				}}
			/>
			<Readout score={score} name={name} className="relative" />
		</div>
	);
}

function SpectrumHero({ score, name }: { score: number; name: string }) {
	const active = zoneOf(score);
	const pos = (clamp(score) + 100) / 2;
	return (
		<>
			<Glow score={score} className="-top-10 -left-10 size-40" />
			<div className="relative">
				<div className="flex items-end justify-between">
					<div>
						<div className="text-xs text-fg-muted">{name} mood</div>
						<div className="mt-1 text-sm font-medium">{moodLabel(score)}</div>
					</div>
					<span
						className="text-[52px] leading-none font-semibold tabular-nums transition-colors duration-500"
						style={{ color: moodColor(score) }}
					>
						{signedScore(score)}
					</span>
				</div>
				<div className="relative mt-5">
					<div className="flex h-3 gap-1">
						{ZONES.map((z, i) => (
							<span
								key={z.from}
								className="flex-1 rounded-full transition-colors duration-500"
								style={{
									background: i === active ? moodColor((z.from + z.to) / 2) : moodTile((z.from + z.to) / 2),
								}}
							/>
						))}
					</div>
					<span
						className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg p-1 transition-[left] duration-500"
						style={{ left: `${pos}%` }}
					>
						<span className="block size-full rounded-full" style={{ background: moodColor(score) }} />
					</span>
				</div>
				<div className="mt-2 flex justify-between text-2xs tabular-nums text-fg-muted">
					{[-100, -60, -20, 20, 60, 100].map((t) => (
						<span key={t} className="w-6 text-center first:text-left last:text-right">
							{signedScore(t)}
						</span>
					))}
				</div>
			</div>
		</>
	);
}

function DialHero({ score, name }: { score: number; name: string }) {
	const W = 220;
	const c = W / 2;
	const r = 92;
	const stroke = 14;
	const gap = 0.035;
	const angle = (s: number) => (s / 100) * (Math.PI / 2);
	const active = zoneOf(score);
	const tip = point(c, r - stroke - 6, angle(clamp(score)));
	return (
		<>
			<Glow score={score} className="top-4 left-1/2 size-36 -translate-x-1/2" />
			<div className="relative mx-auto w-[220px]">
				<svg width={W} height={c + 10} viewBox={`0 0 ${W} ${c + 10}`} aria-hidden="true" className="block">
					{ZONES.map((z, i) => (
						<path
							key={z.from}
							d={arc(c, r, angle(z.from) + gap, angle(z.to) - gap)}
							fill="none"
							stroke={i === active ? moodColor((z.from + z.to) / 2) : moodTile((z.from + z.to) / 2)}
							strokeWidth={stroke}
							className="transition-[stroke] duration-500"
						/>
					))}
					<line
						x1={c}
						y1={c}
						x2={tip.x}
						y2={tip.y}
						stroke="var(--color-fg)"
						strokeWidth={3}
						strokeLinecap="round"
						className="transition-all duration-500"
					/>
					<circle cx={c} cy={c} r={7} fill="var(--color-fg)" />
					<circle cx={c} cy={c} r={3} fill={moodColor(score)} />
				</svg>
				<div className="absolute inset-x-0 bottom-0 flex justify-between px-1 text-2xs tabular-nums text-fg-muted">
					<span>−100</span>
					<span>+100</span>
				</div>
			</div>
			<Readout score={score} name={name} className="relative mt-2" />
		</>
	);
}
