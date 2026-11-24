import { useId } from "react";

const UP = "var(--color-market-up)";
const DOWN = "var(--color-market-down)";

export function sparkSize(height: number) {
	const big = height >= 32;
	const dot = big ? 3.5 : 2;
	return { dot, stroke: big ? 2 : 1.5, top: dot * 2 + 1, bottom: 2, inset: dot * 2 + 1 };
}

interface MarksProps {
	pts: [number, number][];
	zero: number;
	width: number;
	height: number;
	up: boolean;
}

export function SparkMarks({ pts, zero, width, height, up }: MarksProps) {
	const id = useId().replace(/[^a-zA-Z0-9]/g, "");
	const { dot, stroke } = sparkSize(height);
	const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
	const end = pts[pts.length - 1];
	const area = `${line} L${end[0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
	const endColor = up ? UP : DOWN;
	return (
		<>
			<defs>
				<pattern id={`h${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
					<circle cx="2" cy="2" r="0.85" fill="var(--color-fg-disabled)" />
				</pattern>
				<linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="white" />
					<stop offset="1" stopColor="white" stopOpacity="0" />
				</linearGradient>
				<mask id={`m${id}`} maskContentUnits="objectBoundingBox">
					<rect width="1" height="1" fill={`url(#f${id})`} />
				</mask>
				<clipPath id={`u${id}`}>
					<rect x={-10} y={-10} width={width + 20} height={zero + 10 + stroke / 2} />
				</clipPath>
				<clipPath id={`d${id}`}>
					<rect x={-10} y={zero + stroke / 2} width={width + 20} height={height} />
				</clipPath>
				<clipPath id={`r${id}`}>
					<rect x={-10} y={-10} height={height + 20} width={0}>
						<animate
							attributeName="width"
							from="0"
							to={width + 20}
							dur="0.9s"
							fill="freeze"
							calcMode="spline"
							keySplines="0.2 0 0 1"
							keyTimes="0;1"
						/>
					</rect>
				</clipPath>
			</defs>
			<g clipPath={`url(#r${id})`}>
				<path d={area} fill={`url(#h${id})`} mask={`url(#m${id})`} />
				<path d={line} fill="none" stroke={UP} strokeWidth={stroke} strokeLinejoin="round" clipPath={`url(#u${id})`} />
				<path
					d={line}
					fill="none"
					stroke={DOWN}
					strokeWidth={stroke}
					strokeLinejoin="round"
					clipPath={`url(#d${id})`}
				/>
				<circle cx={end[0]} cy={end[1]} r={dot * 2} fill={endColor} opacity={0.2} />
				<circle cx={end[0]} cy={end[1]} r={dot} fill={endColor} />
			</g>
		</>
	);
}

interface Props {
	values: number[];
	width: number;
	height: number;
	xs?: number[];
	baseline?: number;
	grid?: boolean;
	ink?: string;
}

export function Spark({
	values,
	width,
	height,
	xs,
	baseline = 0,
	grid = false,
	ink = "var(--color-stroke-weak)",
}: Props) {
	if (values.length < 2 || width <= 0) return <div style={{ width, height }} />;
	const { top, bottom, inset } = sparkSize(height);
	const min = Math.min(baseline, ...values);
	const span = Math.max(baseline, ...values) - min || 1;
	const y = (v: number) => top + (1 - (v - min) / span) * (height - top - bottom);
	const pts = values.map((v, i) => [(xs?.[i] ?? i / (values.length - 1)) * (width - inset), y(v)] as [number, number]);
	return (
		<svg width={width} height={height} className="shrink-0 overflow-visible" aria-hidden="true">
			{grid &&
				[0.2, 0.5, 0.8].map((f) => (
					<line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={ink} strokeDasharray="1 5" />
				))}
			<SparkMarks
				pts={pts}
				zero={y(baseline)}
				width={width}
				height={height}
				up={values[values.length - 1] >= baseline}
			/>
		</svg>
	);
}
