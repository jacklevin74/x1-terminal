import { useId } from "react";

export function Icon({ size = 26 }: { size?: number }) {
	const id = `lp8${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg data-part="mark" viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className="block shrink-0">
			<defs>
				<linearGradient id={id} x1="0" y1="0" x2="0" y2="52" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
			<rect x="0" y="0" width="52" height="52" rx="14" fill={`url(#${id})`} />
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
				stroke="#fff"
				strokeWidth="5.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
