import { useId } from "react";

export function Icon({ size = 26 }: { size?: number }) {
	const id = `lp4${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg data-part="mark" viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className="block shrink-0">
			<defs>
				<linearGradient id={id} x1="35" y1="0" x2="49" y2="0" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
			<path d="M5 8H18L35 26L18 44H5L22 26Z" fill="#fff" />
			<rect x="35" y="35" width="14" height="9" fill={`url(#${id})`} />
		</svg>
	);
}
