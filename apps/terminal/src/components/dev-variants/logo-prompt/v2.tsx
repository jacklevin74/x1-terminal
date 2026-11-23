import { useId } from "react";

export function Icon({ size = 26 }: { size?: number }) {
	const id = `lp2${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg data-part="mark" viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className="block shrink-0">
			<defs>
				<linearGradient id={id} x1="25.8" y1="0" x2="42.2" y2="0" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
			<rect x="0.5" y="0.5" width="51" height="51" rx="13.5" fill="#16171b" stroke="rgba(255,255,255,0.08)" />
			<path
				d="M13 15.5L24.5 26L13 36.5"
				fill="none"
				stroke="#fff"
				strokeWidth="5.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M28.5 36.5L39.5 36.5"
				fill="none"
				stroke={`url(#${id})`}
				strokeWidth="5.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
