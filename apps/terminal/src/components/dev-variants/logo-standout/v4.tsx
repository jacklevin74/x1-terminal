import { X1Mark } from "@/components/trade/header/x1-terminal-logo";

const GRADIENT = "linear-gradient(180deg, #00C6FF, #0072FF)";

export function Logo() {
	return (
		<span
			role="img"
			aria-label="Terminal by X1"
			className="inline-flex shrink-0 flex-col items-end select-none text-fg"
			style={{ gap: 2 }}
		>
			<span
				aria-hidden="true"
				data-part="word"
				className="leading-none whitespace-nowrap"
				style={{
					fontFamily: '"LS Sora", sans-serif',
					fontWeight: 800,
					fontSize: 21,
					letterSpacing: "-0.03em",
					backgroundImage: GRADIENT,
					backgroundClip: "text",
					WebkitBackgroundClip: "text",
					color: "transparent",
				}}
			>
				terminal
			</span>
			<span
				aria-hidden="true"
				className="inline-flex items-center text-fg-muted"
				style={{ gap: 3, fontSize: 7, lineHeight: 1, fontWeight: 600, letterSpacing: "0.04em" }}
			>
				by
				<X1Mark data-part="mark" className="block text-fg" style={{ height: 6, width: 9.2 }} />
			</span>
		</span>
	);
}
