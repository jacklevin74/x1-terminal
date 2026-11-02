import { type CSSProperties, useId } from "react";

const FONT = '"Martian Mono", ui-monospace, monospace';

function X1Mark({ className }: { className?: string }) {
	const gradientId = `x1-one-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg viewBox="0 0 123 80" className={className} aria-hidden="true" data-part="mark">
			<path
				d="M76.9314 0H62.289L42.451 26.1546L23.9103 0H0L29.6265 39.6956L0 80H23.0058L41.8736 54.0388L59.7085 80H82.7143L54.7044 39.7582L85.3119 0H76.9314Z"
				fill="currentColor"
			/>
			<path d="M85.3125 15.7479L97.3316 0H123.001L123.001 79.9681H104.697L104.697 15.7479H85.3125Z" fill={`url(#${gradientId})`} />
			<defs>
				<linearGradient id={gradientId} x1="104.147" y1="0" x2="104.147" y2="79.9681" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
		</svg>
	);
}

export default function LogoLockupV4() {
	return (
		<span className="inline-flex items-center text-fg" aria-label="X1 Terminal">
			<X1Mark className="h-[1em] w-auto" />
			<span data-part="sep" className="block shrink-0 self-center bg-fg-muted opacity-40" style={{ width: "max(1px, 0.03em)", height: "1.0em", marginLeft: "0.3508em" }} />
			<span style={{ marginLeft: "0.315em", transform: "translateY(-0.0018em)" }}>
				<span
					data-part="word"
					className="text-fg-muted"
					style={{ fontFamily: FONT, fontWeight: 400, fontStretch: "112.5%", fontSize: "0.7516em", letterSpacing: "0.0em", lineHeight: 1, display: "block", textBoxTrim: "trim-both", textBoxEdge: "cap alphabetic" } as CSSProperties}
				>
					TERMINAL
				</span>
			</span>
		</span>
	);
}

export const NAME = "Rule, 60%, Martian Mono wide";
export const FONT_NAME = FONT.split(",")[0].replaceAll('"', "");
