import { type CSSProperties, useId } from "react";

const FONT = '"Geist Mono", ui-monospace, monospace';

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

function X1Tile({ style }: { style?: CSSProperties }) {
	return (
		<span
			data-part="mark"
			className="inline-flex shrink-0 items-center justify-center text-white"
			style={{
				width: 26,
				height: 26,
				borderRadius: 7,
				background: "#16171b",
				border: "1px solid rgba(255,255,255,0.08)",
				...style,
			}}
		>
			<X1Mark className="block" style={{ width: 14.56, height: 9.88 }} />
		</span>
	);
}

export default function LogoLockup9V4() {
	return (
		<span className="inline-flex items-center gap-px" role="img" aria-label="X1 Terminal">
			<X1Tile style={{ borderRadius: "7px 2px 2px 7px" }} />
			<span
				className="inline-flex h-[26px] items-center px-[10px]"
				style={{ borderRadius: "2px 7px 7px 2px", background: "#16171b", border: "1px solid rgba(255,255,255,0.08)" }}
			>
				<span
					data-part="word"
					className="text-white/70"
					style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 500, letterSpacing: "0.1em" }}
				>
					TERMINAL
				</span>
			</span>
		</span>
	);
}

export const NAME = "Welded pair";
export const FONT_NAME = FONT.split(",")[0].replaceAll('"', "");
