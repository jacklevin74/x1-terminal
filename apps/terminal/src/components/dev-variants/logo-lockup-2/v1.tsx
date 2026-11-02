import { type CSSProperties, useId } from "react";

const FONT = '"Spline Sans Mono", ui-monospace, monospace';
const WORD = { fontFamily: FONT, fontWeight: 500, fontSize: "1em", fontSizeAdjust: "cap-height 0.89", textBoxTrim: "trim-both", textBoxEdge: "cap alphabetic", lineHeight: 1, letterSpacing: "-0.03em" } as CSSProperties;

function X1Mark({ className }: { className?: string }) {
	const gradientId = `x1-one-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg viewBox="0 0 123 80" className={className} aria-hidden="true">
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

export default function LogoLockup2V1() {
	return (
		<span className="inline-flex items-end gap-[0.4em] text-fg" aria-label="X1 Terminal">
			<X1Mark className="h-[1em] w-auto" />
			<span className="text-fg-muted" style={WORD}>terminal</span>
		</span>
	);
}

export const NAME = "Matched height";
export const FONT_NAME = FONT.split(",")[0].replaceAll('"', "");
