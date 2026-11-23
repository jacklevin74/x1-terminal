import { cn } from "@/lib/cn";
import type { Outcome } from "@/lib/portfolio/model";

interface Props {
	outcomes: Outcome[];
	className?: string;
}

const H = 14;
const W = 160;

export function V8({ outcomes, className }: Props) {
	const steps = outcomes.reduce<number[]>((acc, o) => [...acc, (acc[acc.length - 1] ?? 0) + (o.win ? 1 : -1)], []);
	const vals = [0, ...steps];
	const min = Math.min(...vals);
	const max = Math.max(...vals);
	const x = (i: number) => (i / (vals.length - 1)) * W;
	const y = (v: number) => 1 + (1 - (v - min) / (max - min || 1)) * (H - 2);
	const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
	const last = vals[vals.length - 1];
	return (
		<svg
			viewBox={`0 0 ${W} ${H}`}
			className={cn("h-3.5", className)}
			style={{ width: W }}
			aria-label="Win streak"
			role="img"
		>
			<title>Win streak</title>
			<line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--color-fg-disabled)" strokeDasharray="2 2" />
			<path
				d={d}
				fill="none"
				stroke={last >= 0 ? "var(--color-market-up)" : "var(--color-market-down)"}
				strokeWidth={1.5}
				strokeLinejoin="miter"
			/>
		</svg>
	);
}
