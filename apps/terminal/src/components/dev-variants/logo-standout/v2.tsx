import { X1Mark } from "@/components/trade/header/x1-terminal-logo";

export function Logo() {
	return (
		<span
			role="img"
			aria-label="X1 Terminal"
			className="inline-flex shrink-0 items-center select-none text-fg"
			style={{ gap: 8 }}
		>
			<X1Mark data-part="mark" className="block shrink-0" style={{ height: 14, width: 21.52 }} />
			<span
				aria-hidden="true"
				data-part="word"
				className="leading-none whitespace-nowrap"
				style={{
					fontFamily: '"LS Inter Tight", sans-serif',
					fontWeight: 800,
					fontSize: 20,
					letterSpacing: "-0.035em",
					transform: "translateY(-0.25px)",
				}}
			>
				Terminal
			</span>
		</span>
	);
}
