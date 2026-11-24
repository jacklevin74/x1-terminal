import { cn } from "@/lib/cn";

export function Icon({ size = 26, bare = false, className }: { size?: number; bare?: boolean; className?: string }) {
	return (
		<svg
			data-part="mark"
			viewBox={bare ? "12 14 29.5 24" : "0 0 52 52"}
			width={bare ? (size * 29.5) / 24 : size}
			height={size}
			aria-hidden="true"
			className={cn("block shrink-0", className)}
		>
			{!bare && (
				<rect x="0.5" y="0.5" width="51" height="51" rx="13.5" fill="#16171b" stroke="rgba(255,255,255,0.08)" />
			)}
			<path d="M12 14H21L32.5 26L21 38H12L23.5 26Z" fill="#fff" />
			<rect x="32" y="32.5" width="9.5" height="5.5" fill="var(--color-x1-cyan)" />
		</svg>
	);
}
