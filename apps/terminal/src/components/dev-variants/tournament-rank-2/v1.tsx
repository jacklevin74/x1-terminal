import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const TONE = ["text-fg", "text-fg-secondary", "text-fg-muted"];
const CX = 20;
const CY = 21;
const R = 14.5;
const ANGLES = [112, 134, 156, 178, 200, 222, 242];

function Branch() {
	return (
		<g>
			{ANGLES.map((deg, i) => {
				const a = (deg * Math.PI) / 180;
				const x = CX + R * Math.cos(a);
				const y = CY + R * Math.sin(a);
				const size = 1 - i * 0.06;
				return (
					<ellipse
						key={deg}
						cx={x}
						cy={y}
						rx={3.4 * size}
						ry={1.45 * size}
						transform={`rotate(${deg + 90 - 38} ${x} ${y})`}
						fill="currentColor"
					/>
				);
			})}
			<path
				d={`M ${CX - 3} ${CY + R + 1.5} A ${R} ${R} 0 0 1 ${CX + R * Math.cos((246 * Math.PI) / 180)} ${CY + R * Math.sin((246 * Math.PI) / 180)}`}
				fill="none"
				stroke="currentColor"
				strokeWidth={0.9}
				strokeLinecap="round"
			/>
		</g>
	);
}

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"relative grid flex-none place-items-center self-start",
				lead ? "size-14" : "size-11",
				TONE[rank - 1],
			)}
		>
			<svg viewBox="0 0 40 40" className="absolute inset-0 size-full" aria-hidden="true">
				<Branch />
				<g transform="translate(40 0) scale(-1 1)">
					<Branch />
				</g>
			</svg>
			<span className={cn("relative font-medium italic tabular-nums leading-none", lead ? "text-xl" : "text-base")}>
				{rank}
			</span>
		</span>
	);
}
