import { X1Mark } from "@/components/trade/header/x1-terminal-logo";

export function Logo() {
	return (
		<span
			role="img"
			aria-label="X1 Terminal"
			className="inline-flex shrink-0 items-center select-none text-fg"
			style={{ gap: 6 }}
		>
			<X1Mark data-part="mark" className="block shrink-0" style={{ height: 15, width: 23.06 }} />
			<span
				aria-hidden="true"
				data-part="word"
				className="leading-none whitespace-nowrap"
				style={{
					fontFamily: '"LS Geist", sans-serif',
					fontWeight: 400,
					fontSize: 20.7,
					letterSpacing: "-0.015em",
					transform: "translateY(0.75px)",
				}}
			>
				Terminal
			</span>
		</span>
	);
}
