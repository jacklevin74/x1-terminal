import { X1Tile } from "@/components/trade/header/x1-terminal-logo";

const GRADIENT = "linear-gradient(180deg, #00C6FF, #0072FF)";

export function Logo() {
	return (
		<span
			role="img"
			aria-label="X1 Terminal"
			className="inline-flex shrink-0 items-center select-none text-fg"
			style={{ gap: 9 }}
		>
			<X1Tile size={26} />
			<span
				aria-hidden="true"
				data-part="word"
				className="leading-none whitespace-nowrap"
				style={{
					fontFamily: '"LS Clash Grotesk", sans-serif',
					fontWeight: 700,
					fontSize: 18,
					letterSpacing: "0.01em",
					transform: "translateY(0.63px)",
				}}
			>
				TERM
				<span
					style={{
						backgroundImage: GRADIENT,
						backgroundClip: "text",
						WebkitBackgroundClip: "text",
						color: "transparent",
					}}
				>
					I
				</span>
				NAL
			</span>
		</span>
	);
}
