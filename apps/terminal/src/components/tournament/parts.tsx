// Promoted from dev-variants/tournament-2/parts.tsx (Identicon, RankMove, Spark).
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
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

export const hueOf = (id: string) => hashOf(id) % 360;

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

interface MoveProps {
	value: number;
	className?: string;
}

export function RankMove({ value, className }: MoveProps) {
	if (value === 0) return <span className={className} />;
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

interface SparkProps {
	values: number[];
	width: number;
	height: number;
}

export function Spark({ values, width, height }: SparkProps) {
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min || 1;
	const pts = values.map((v, i) => [X_AT[i] * width, 2 + (1 - (v - min) / span) * (height - 4)] as [number, number]);
	const color = values[3] >= values[1] ? "var(--color-market-up)" : "var(--color-market-down)";
	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className="overflow-visible"
			aria-hidden="true"
		>
			<path d={smooth(pts)} fill="none" stroke="var(--color-fg-disabled)" strokeWidth={1.25} />
			<path d={smooth(pts.slice(1))} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
		</svg>
	);
}
