import { useEffect, useRef, useState } from "react";

const X_AT = [0, 23 / 30, 29 / 30, 1];
const LABELS = [
	{ i: 0, text: "30d ago", anchor: "start" },
	{ i: 1, text: "Round start", anchor: "middle" },
	{ i: 3, text: "Now", anchor: "end" },
] as const;

interface Props {
	values: number[];
	height: number;
	labels?: boolean;
}

export function PnlChart({ values, height, labels }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const bottom = labels ? 20 : 4;
	const min = Math.min(...values);
	const span = Math.max(...values) - min || 1;
	const pts = values.map((v, i) => [X_AT[i] * width, 6 + (1 - (v - min) / span) * (height - 6 - bottom)]);
	const before = `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
	const round = pts
		.slice(1)
		.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`)
		.join(" ");
	const color = values[3] >= values[1] ? "var(--color-market-up)" : "var(--color-market-down)";
	const end = pts[3];

	return (
		<div ref={ref} className="w-full" style={{ height }}>
			{width > 0 && (
				<svg width={width} height={height} className="overflow-visible" aria-hidden="true">
					<path d={before} fill="none" stroke="var(--color-fg-disabled)" strokeWidth={1.5} strokeDasharray="3 4" />
					<path d={round} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
					<circle cx={end[0]} cy={end[1]} r={3.5} fill={color} />
					{labels &&
						LABELS.map((l) => (
							<text
								key={l.text}
								x={pts[l.i][0]}
								y={height - 2}
								textAnchor={l.anchor}
								className="fill-fg-muted text-2xs"
							>
								{l.text}
							</text>
						))}
				</svg>
			)}
		</div>
	);
}
