import { X1Mark } from "@/components/trade/header/x1-terminal-logo";

export function Logo() {
	return (
		<span
			role="img"
			aria-label="X1 Terminal"
			className="inline-flex shrink-0 items-center select-none text-fg"
			style={{ gap: 9 }}
		>
			<X1Mark data-part="mark" className="block shrink-0" style={{ height: 13, width: 19.99 }} />
			<span
				aria-hidden="true"
				data-part="word"
				className="leading-none whitespace-nowrap"
				style={{
					fontFamily: '"LS Toxigenesis", sans-serif',
					fontWeight: 700,
					fontSize: 17.7,
					letterSpacing: "0.04em",
					transform: "translateY(0.09px)",
				}}
			>
				TERMINAL
			</span>
		</span>
	);
}
