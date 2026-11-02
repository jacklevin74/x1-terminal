import { cn } from "@/lib/cn";

interface Props {
	label: string;
	pulse?: boolean;
	className?: string;
}

export function ChartStatus({ label, pulse = false, className }: Props) {
	return (
		<output
			className={cn(
				"absolute inset-0 z-10 flex items-center justify-center bg-surface text-xs font-normal text-fg-muted",
				className,
			)}
		>
			<span className={cn(pulse && "animate-pulse motion-reduce:animate-none")}>{label}</span>
		</output>
	);
}
