import { useId } from "react";

export function Icon({ size = 26 }: { size?: number }) {
	const id = `lp9${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg data-part="mark" viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className="block shrink-0">
			<defs>
				<linearGradient id={`${id}m`} x1="104" y1="0" x2="104" y2="80" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
				<clipPath id={`${id}c`}>
					<rect x="0" y="0" width="42.2" height="80" />
				</clipPath>
			</defs>
			<rect x="0.5" y="0.5" width="51" height="51" rx="13.5" fill="#16171b" stroke="rgba(255,255,255,0.08)" />
			<g transform="translate(11.5 16) scale(0.2358)">
				<path
					d="M76.9314 0H62.289L42.451 26.1546L23.9103 0H0L29.6265 39.6956L0 80H23.0058L41.8736 54.0388L59.7085 80H82.7143L54.7044 39.7582L85.3119 0H76.9314Z"
					fill="rgba(255,255,255,0.3)"
				/>
				<path
					d="M76.9314 0H62.289L42.451 26.1546L23.9103 0H0L29.6265 39.6956L0 80H23.0058L41.8736 54.0388L59.7085 80H82.7143L54.7044 39.7582L85.3119 0H76.9314Z"
					fill="#fff"
					clipPath={`url(#${id}c)`}
				/>
				<path
					d="M85.3125 15.7479L97.3316 0H123.001L123.001 79.9681H104.697L104.697 15.7479H85.3125Z"
					fill={`url(#${id}m)`}
				/>
			</g>
		</svg>
	);
}
