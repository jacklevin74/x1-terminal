import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { useId } from "react";
import { cn } from "@/lib/cn";

function hashOf(id: string) {
	let h = 2166136261;
	for (let i = 2; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
	return h >>> 0;
}

interface AvatarProps {
	id: string;
	className?: string;
}

export function Identicon({ id, className }: AvatarProps) {
	const h = hashOf(id);
	const hue = h % 360;
	const cells: { x: number; y: number }[] = [];
	for (let y = 0; y < 5; y++) {
		for (let x = 0; x < 3; x++) {
			if (!((h >>> (y * 3 + x + 8)) & 1)) continue;
			cells.push({ x, y });
			if (x < 2) cells.push({ x: 4 - x, y });
		}
	}
	return (
		<span
			className={cn("grid size-7 shrink-0 place-items-center overflow-hidden rounded-6", className)}
			style={{ backgroundColor: `oklch(0.3 0.05 ${hue})` }}
		>
			<svg viewBox="-1.5 -1.5 8 8" className="size-full" aria-hidden="true">
				{cells.map((c) => (
					<rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1.02} height={1.02} fill={`oklch(0.78 0.13 ${hue})`} />
				))}
			</svg>
		</span>
	);
}

export function Blob({ id, className }: AvatarProps) {
	const h = hashOf(`${id}blob`);
	const a = Math.imul(h, 2654435761) >>> 0;
	const hueA = a % 360;
	const hueB = (hueA + 90 + ((a >>> 11) % 150)) % 360;
	const angle = (a >>> 5) % 360;
	return (
		<span
			className={cn("block size-8 shrink-0 rounded-full", className)}
			style={{
				backgroundImage: `linear-gradient(${angle}deg, oklch(0.58 0.19 ${hueA}), oklch(0.78 0.15 ${hueB}))`,
			}}
		/>
	);
}

export function Jazz({ id, className }: AvatarProps) {
	const h = hashOf(id);
	const hues = [h % 360, (h >>> 7) % 360, (h >>> 14) % 360, (h >>> 21) % 360];
	return (
		<span className={cn("block size-6 shrink-0 overflow-hidden rounded-full", className)}>
			<svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
				<rect width="24" height="24" fill={`oklch(0.7 0.16 ${hues[0]})`} />
				{[1, 2, 3].map((layer) => (
					<rect
						key={layer}
						x={-11 + layer * 5}
						y={3 + layer * 3}
						width="30"
						height="30"
						fill={`oklch(${0.45 + layer * 0.1} 0.17 ${hues[layer]})`}
						transform={`rotate(${(h >>> ((layer - 1) * 5)) % 90} 12 12)`}
					/>
				))}
			</svg>
		</span>
	);
}

interface MoveProps {
	value: number;
	zero?: string;
	className?: string;
}

export function RankMove({ value, zero = "0", className }: MoveProps) {
	if (value === 0) return <span className={cn("text-fg-disabled tabular-nums", className)}>{zero}</span>;
	const up = value > 0;
	const Icon = up ? CaretUpIcon : CaretDownIcon;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 tabular-nums",
				up ? "text-market-up" : "text-market-down",
				className,
			)}
		>
			<Icon weight="fill" className="size-2.5" />
			{Math.abs(value).toLocaleString()}
		</span>
	);
}

interface SparkProps {
	values: number[];
	width: number;
	height: number;
	area?: boolean;
	roundFrom?: number;
	className?: string;
}

function smooth(pts: [number, number][]) {
	let d = `M${pts[0][0]},${pts[0][1]}`;
	for (let i = 1; i < pts.length; i++) {
		const [x0, y0] = pts[i - 1];
		const [x1, y1] = pts[i];
		const cx = (x0 + x1) / 2;
		d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
	}
	return d;
}

const X_AT = [0, 23 / 30, 29 / 30, 1];

export function Spark({ values, width, height, area, roundFrom = 1, className }: SparkProps) {
	const gid = useId();
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min || 1;
	const pad = 2;
	const pts = values.map(
		(v, i) =>
			[(X_AT[i] ?? i / (values.length - 1)) * width, pad + (1 - (v - min) / span) * (height - pad * 2)] as [
				number,
				number,
			],
	);
	const up = values[values.length - 1] >= values[roundFrom];
	const line = smooth(pts);
	const roundLine = smooth(pts.slice(roundFrom));
	const color = up ? "var(--color-market-up)" : "var(--color-market-down)";
	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className={cn("overflow-visible", className)}
			aria-hidden="true"
		>
			{area && (
				<>
					<defs>
						<pattern id={gid} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
							<line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="1" strokeOpacity="0.32" />
						</pattern>
					</defs>
					<path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gid})`} />
				</>
			)}
			<path d={line} fill="none" stroke="var(--color-fg-disabled)" strokeWidth={1.25} />
			<path d={roundLine} fill="none" stroke={color} strokeWidth={area ? 2 : 1.5} strokeLinecap="round" />
			{area && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3} fill={color} />}
		</svg>
	);
}

interface LaurelProps {
	place: number;
	className?: string;
}

export function Laurel({ place, className }: LaurelProps) {
	const leaves = [0, 1, 2, 3, 4];
	return (
		<span
			className={cn(
				"relative grid size-11 shrink-0 place-items-center",
				place === 1 ? "text-fg" : "text-fg-muted",
				className,
			)}
		>
			<svg viewBox="0 0 44 44" className="absolute inset-0 size-full" aria-hidden="true">
				{[-1, 1].map((side) =>
					leaves.map((i) => {
						const deg = 238 - i * 27;
						const a = (deg * Math.PI) / 180;
						const x = 22 + side * -Math.abs(Math.cos(a)) * 16;
						const y = 22 - Math.sin(a) * 16;
						const rot = -side * (deg - 180 + 32);
						return (
							<ellipse
								key={`${side}-${i}`}
								cx={x}
								cy={y}
								rx={1.9}
								ry={3.5}
								fill="currentColor"
								transform={`rotate(${rot} ${x} ${y})`}
							/>
						);
					}),
				)}
			</svg>
			<span className="relative text-base font-semibold tabular-nums italic">{place}</span>
		</span>
	);
}
