// Promoted from dev-variants/tournament-2/parts.tsx (Identicon, RankMove, Spark).
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { Spark } from "@/components/ui/spark";

export { Spark };

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

const X_AT = [0, 23 / 30, 29 / 30, 1];

export function RoundSpark({ values, width, height }: { values: number[]; width: number; height: number }) {
	return <Spark values={values} width={width} height={height} xs={X_AT} />;
}
