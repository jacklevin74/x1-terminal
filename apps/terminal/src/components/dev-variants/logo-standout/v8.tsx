import { X1Tile } from "@/components/trade/header/x1-terminal-logo";

export function Logo() {
	return (
		<span
			role="img"
			aria-label="X1 Terminal"
			className="inline-flex shrink-0 items-center select-none text-fg"
			style={{ gap: 8 }}
		>
			<X1Tile size={26} />
			<span
				aria-hidden="true"
				data-part="word"
				className="leading-none whitespace-nowrap"
				style={{
					fontFamily: '"LS Satoshi", sans-serif',
					fontWeight: 900,
					fontSize: 22,
					letterSpacing: "-0.045em",
					transform: "translateY(-0.25px)",
				}}
			>
				terminal
			</span>
		</span>
	);
}
