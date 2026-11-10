import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { coinName, type MoodCoin, moodColor, signedScore, sparkPath } from "@/lib/mood/signal";

export function moodVars(score: number): CSSProperties {
	return {
		["--mood" as string]: moodColor(score),
		["--mood-a" as string]: moodColor(score + 45),
		["--mood-b" as string]: moodColor(score - 45),
	};
}

export function DivergingBar({ value, className }: { value: number; className?: string }) {
	const w = Math.abs(value) / 2;
	return (
		<div className={cn("relative h-1.5 w-full rounded-full bg-control", className)}>
			<div
				className="absolute inset-y-0 transition-[width,left] duration-300"
				style={{
					background: moodColor(value),
					width: `${w}%`,
					left: value >= 0 ? "50%" : `${50 - w}%`,
					borderRadius: value >= 0 ? "0 9999px 9999px 0" : "9999px 0 0 9999px",
				}}
			/>
			<div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-fg-muted" />
		</div>
	);
}

export function SpinRing({ score, size }: { score: number; size: number }) {
	return (
		<span className="relative block shrink-0" style={{ width: size, height: size, ...moodVars(score) }}>
			<span className="mood-glow absolute inset-[15%]" />
			<span className="mood-ring-spin absolute inset-0" />
		</span>
	);
}

export function ScoreArc({ value, size, stroke }: { value: number; size: number; stroke: number }) {
	const r = (size - stroke) / 2;
	const len = 2 * Math.PI * r;
	const part = (Math.abs(value) / 100) * len;
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className="shrink-0"
			style={{ transform: `rotate(-90deg) scaleY(${value < 0 ? -1 : 1})` }}
			aria-hidden="true"
		>
			<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-control-hover)" strokeWidth={stroke} />
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke={moodColor(value)}
				strokeWidth={stroke}
				strokeLinecap="round"
				strokeDasharray={`${Math.max(part, 0.01)} ${len}`}
				className="transition-[stroke-dasharray,stroke] duration-500"
			/>
		</svg>
	);
}

export function Spark({
	history,
	width,
	height,
	color,
	strokeWidth = 1.5,
}: {
	history: [number, number][];
	width: number;
	height: number;
	color: string;
	strokeWidth?: number;
}) {
	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			className="w-full"
			style={{ height }}
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="var(--color-stroke-weak)" />
			<path
				d={sparkPath(history, width, height)}
				fill="none"
				stroke={color}
				strokeWidth={strokeWidth}
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

export function CoinScoreRow({ coin }: { coin: MoodCoin }) {
	return (
		<div className="grid grid-cols-[72px_1fr_40px] items-center gap-3 py-1.5">
			<span className="truncate text-xs font-medium">{coinName(coin.coin)}</span>
			<DivergingBar value={coin.score} />
			<span className="text-right text-xs tabular-nums" style={{ color: moodColor(coin.score) }}>
				{signedScore(coin.score)}
			</span>
		</div>
	);
}

export function ScoreNumber({ score, className }: { score: number; className?: string }) {
	return (
		<span
			className={cn("leading-none font-semibold tabular-nums transition-colors duration-500", className)}
			style={{ color: moodColor(score) }}
		>
			{signedScore(score)}
		</span>
	);
}
