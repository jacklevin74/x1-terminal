import { type CSSProperties, useId } from "react";

function X1Mark({ className, style }: { className?: string; style?: CSSProperties }) {
	const gradientId = `x1-one-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg viewBox="0 0 123 80" className={className} aria-hidden="true" style={style}>
			<path
				d="M76.9314 0H62.289L42.451 26.1546L23.9103 0H0L29.6265 39.6956L0 80H23.0058L41.8736 54.0388L59.7085 80H82.7143L54.7044 39.7582L85.3119 0H76.9314Z"
				fill="currentColor"
			/>
			<path
				d="M85.3125 15.7479L97.3316 0H123.001L123.001 79.9681H104.697L104.697 15.7479H85.3125Z"
				fill={`url(#${gradientId})`}
			/>
			<defs>
				<linearGradient id={gradientId} x1="104.147" y1="0" x2="104.147" y2="79.9681" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
		</svg>
	);
}

export function X1Tile({ style, size = 26 }: { style?: CSSProperties; size?: number }) {
	const scale = size / 26;
	return (
		<span
			data-part="mark"
			className="inline-flex shrink-0 items-center justify-center text-white"
			style={{
				width: size,
				height: size,
				borderRadius: 7 * scale,
				background: "#16171b",
				border: "1px solid rgba(255,255,255,0.08)",
				...style,
			}}
		>
			<X1Mark className="block" style={{ width: 14.56 * scale, height: 9.88 * scale }} />
		</span>
	);
}

export default function X1TerminalLogo() {
	return (
		<img
			src="/brand/x1-terminal-logo-dark.svg"
			alt="X1 Terminal"
			draggable={false}
			className="block h-5 w-auto shrink-0 select-none"
		/>
	);
}
