import { useId } from "react";

interface Props {
	score: number;
	center: number;
	radius: number;
	inner: number;
	lo: number;
	hi: number;
}

function strength(score: number) {
	const a = Math.min(100, Math.abs(score));
	if (a < 20) return 0.3;
	return 0.4 + ((a - 20) / 80) * 0.3;
}

export function MoodGlow({ score, center, radius, inner, lo, hi }: Props) {
	const id = useId();
	if (hi - lo < 0.02) return null;
	const span = hi - lo;
	const arc = (r: number, a0: number, a1: number) => {
		const p = (a: number) => `${(center + r * Math.sin(a)).toFixed(2)} ${(center - r * Math.cos(a)).toFixed(2)}`;
		return `M${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
	};
	const layer = (side: "bear" | "bull", on: boolean) => (
		<g opacity={on ? strength(score) : 0} className="transition-opacity duration-500">
			<path
				d={arc(radius - 6, lo - span * 0.1, hi + span * 0.1)}
				stroke={`var(--mood-${side}-rim)`}
				strokeWidth={32}
				strokeLinecap="round"
				fill="none"
			/>
			<path
				d={arc(radius - 4, lo + span * 0.08, hi - span * 0.08)}
				stroke={`var(--mood-${side}-mid)`}
				strokeWidth={18}
				strokeLinecap="round"
				fill="none"
			/>
			<path
				d={arc(radius - 2, lo + span * 0.3, hi - span * 0.3)}
				stroke={`var(--mood-${side}-core)`}
				strokeWidth={8}
				strokeLinecap="round"
				fill="none"
			/>
		</g>
	);
	return (
		<g style={{ mixBlendMode: "screen" }} mask={`url(#${id}-floor)`}>
			<defs>
				<filter id={`${id}-blur`} filterUnits="userSpaceOnUse" x={0} y={0} width={center * 2} height={center * 2}>
					<feGaussianBlur stdDeviation="12" />
				</filter>
				<mask id={`${id}-floor`} maskUnits="userSpaceOnUse">
					<circle cx={center} cy={center} r={inner} fill="#fff" />
				</mask>
			</defs>
			<g filter={`url(#${id}-blur)`}>
				{layer("bear", score < 0)}
				{layer("bull", score > 0)}
			</g>
		</g>
	);
}
