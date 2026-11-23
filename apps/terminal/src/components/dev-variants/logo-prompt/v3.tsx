import { useId } from "react";

export function Icon({ size = 26 }: { size?: number }) {
	const id = `lp3${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg data-part="mark" viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className="block shrink-0">
			<defs>
				<linearGradient id={id} x1="23.8" y1="0" x2="39.7" y2="0" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
			<rect x="3" y="7" width="46" height="38" rx="9" fill="none" stroke="#fff" strokeWidth="4" />
			<path
				d="M13.5 19L21.5 26L13.5 33"
				fill="none"
				stroke="#fff"
				strokeWidth="4.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M26 33L37.5 33"
				fill="none"
				stroke={`url(#${id})`}
				strokeWidth="4.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
