import { useId } from "react";

export function Icon({ size = 26 }: { size?: number }) {
	const id = `lp5${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg data-part="mark" viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className="block shrink-0">
			<defs>
				<linearGradient id={id} x1="23.4" y1="0" x2="38.6" y2="0" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
			<rect x="0.5" y="0.5" width="51" height="51" rx="13.5" fill="#16171b" stroke="rgba(255,255,255,0.08)" />
			<path d="M0.5 14V14A13.5 13.5 0 0 1 14 0.5H38A13.5 13.5 0 0 1 51.5 14V14Z" fill="rgba(255,255,255,0.09)" />
			<circle cx="10" cy="7.5" r="1.7" fill="rgba(255,255,255,0.45)" />
			<circle cx="16" cy="7.5" r="1.7" fill="rgba(255,255,255,0.45)" />
			<circle cx="22" cy="7.5" r="1.7" fill="rgba(255,255,255,0.45)" />
			<path
				d="M13 22.5L21.5 30L13 37.5"
				fill="none"
				stroke="#fff"
				strokeWidth="4.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M25.5 37.5L36.5 37.5"
				fill="none"
				stroke={`url(#${id})`}
				strokeWidth="4.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
