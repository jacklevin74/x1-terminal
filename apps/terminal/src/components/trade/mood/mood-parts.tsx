import { moodColor } from "@/lib/mood/signal";

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
