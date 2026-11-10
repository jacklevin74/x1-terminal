import { cn } from "@/lib/cn";

interface Props {
	score: number;
	size: number;
	className?: string;
	style?: React.CSSProperties;
}

function strength(score: number) {
	const a = Math.min(100, Math.abs(score));
	if (a < 20) return 0.1;
	return 0.2 + ((a - 20) / 80) * 0.25;
}

export function MoodGlow({ score, size, className, style }: Props) {
	const s = strength(score);
	return (
		<span
			aria-hidden="true"
			className={cn("pointer-events-none absolute -translate-x-1/2 -translate-y-1/2", className)}
			style={{ width: size, height: size * 0.7, mixBlendMode: "screen", ...style }}
		>
			<Shapes side="bear" opacity={score < 0 ? s : 0} />
			<Shapes side="bull" opacity={score >= 0 ? s : 0} />
		</span>
	);
}

function Shapes({ side, opacity }: { side: "bear" | "bull"; opacity: number }) {
	return (
		<span className="absolute inset-0 transition-opacity duration-700" style={{ opacity, filter: "blur(28px)" }}>
			<span
				className="absolute inset-x-0 top-[6%] bottom-0 rounded-[50%]"
				style={{ background: `var(--mood-${side}-rim)` }}
			/>
			<span
				className="absolute top-[18%] right-[18%] bottom-[14%] left-[16%] rounded-[50%]"
				style={{ background: `var(--mood-${side}-mid)` }}
			/>
			<span
				className="absolute top-[30%] right-[34%] bottom-[34%] left-[32%] rounded-[50%]"
				style={{ background: `var(--mood-${side}-core)` }}
			/>
		</span>
	);
}
