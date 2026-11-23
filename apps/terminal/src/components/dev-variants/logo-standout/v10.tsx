import { X1Tile } from "@/components/trade/header/x1-terminal-logo";

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
					fontFamily: '"LS Zilla Slab", serif',
					fontWeight: 500,
					fontSize: 21,
					letterSpacing: "-0.005em",
					transform: "translateY(-0.38px)",
				}}
			>
				Terminal
			</span>
		</span>
	);
}
