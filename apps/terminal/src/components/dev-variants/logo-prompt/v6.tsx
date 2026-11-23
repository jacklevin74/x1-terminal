import { useId } from "react";

export function Icon({ size = 26 }: { size?: number }) {
	const id = `lp6${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg data-part="mark" viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className="block shrink-0">
			<defs>
				<linearGradient id={id} x1="29.5" y1="0" x2="40.5" y2="0" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
			<rect x="0.5" y="0.5" width="51" height="51" rx="13.5" fill="#16171b" stroke="rgba(255,255,255,0.08)" />
			<path
				d="M26 26L14.5 37"
				fill="none"
				stroke="rgba(255,255,255,0.42)"
				strokeWidth="6.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M14.5 15L26 26"
				fill="none"
				stroke="#fff"
				strokeWidth="6.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect x="29.5" y="32.5" width="11" height="5.5" rx="1.2" fill={`url(#${id})`} />
		</svg>
	);
}
