import { useId } from "react";

export function Icon({ size = 26 }: { size?: number }) {
	const id = `lp10${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg data-part="mark" viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className="block shrink-0">
			<defs>
				<linearGradient id={id} x1="0" y1="17" x2="0" y2="35" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
			<rect x="0.5" y="0.5" width="51" height="51" rx="13.5" fill="#16171b" stroke="rgba(255,255,255,0.08)" />
			<path
				d="M12.5 17L22 26L12.5 35"
				fill="none"
				stroke="#fff"
				strokeWidth="4.6"
				strokeLinecap="butt"
				strokeLinejoin="miter"
			/>
			<rect x="27" y="17" width="11" height="18" fill={`url(#${id})`} />
		</svg>
	);
}
