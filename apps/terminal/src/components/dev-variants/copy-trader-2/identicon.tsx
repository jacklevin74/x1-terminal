import { cn } from "@/lib/cn";

interface Props {
	id: string;
	className?: string;
}

function hashOf(id: string) {
	let h = 2166136261;
	for (let i = 2; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
	return h >>> 0;
}

export function Identicon({ id, className }: Props) {
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
			className={cn("grid size-8 shrink-0 place-items-center overflow-hidden rounded-full", className)}
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
