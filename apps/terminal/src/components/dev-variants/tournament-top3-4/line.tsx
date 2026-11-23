import { useEffect, useRef, useState } from "react";

const X_AT = [0, 23 / 30, 29 / 30, 1];

interface Props {
	values: number[];
	height: number;
	stroke: string;
	before?: string;
	fill?: string;
	width?: number;
}

export function useWidth() {
	const ref = useRef<HTMLDivElement>(null);
	const [w, setW] = useState(0);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const o = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
		o.observe(el);
		return () => o.disconnect();
	}, []);
	return { ref, w };
}

export function Line({ values, height, stroke, before = "var(--color-fg-disabled)", fill, width }: Props) {
	const { ref, w } = useWidth();
	const W = width ?? w;
	const min = Math.min(...values);
	const span = Math.max(...values) - min || 1;
	const pts = values.map((v, i) => [X_AT[i] * W, 4 + (1 - (v - min) / span) * (height - 8)]);
	const d = (p: number[][]) => p.map((q, i) => `${i ? "L" : "M"}${q[0]},${q[1]}`).join(" ");
	return (
		<div ref={ref} className="w-full" style={{ height, width }}>
			{W > 0 && (
				<svg width={W} height={height} className="overflow-visible" aria-hidden="true">
					{fill && <path d={`${d(pts)} L${W},${height} L0,${height} Z`} fill={fill} />}
					<path d={d(pts.slice(0, 2))} fill="none" stroke={before} strokeWidth={1.5} strokeDasharray="3 4" />
					<path d={d(pts.slice(1))} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
					<circle cx={pts[3][0]} cy={pts[3][1]} r={3.5} fill={stroke} />
				</svg>
			)}
		</div>
	);
}
