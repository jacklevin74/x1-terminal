import { useId } from "react";

export function Icon({ size = 26 }: { size?: number }) {
	const id = `lp7${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg data-part="mark" viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className="block shrink-0">
			<defs>
				<linearGradient id={id} x1="32" y1="0" x2="41.5" y2="0" gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
			</defs>
			<rect x="0.5" y="0.5" width="51" height="51" rx="13.5" fill="#16171b" stroke="rgba(255,255,255,0.08)" />
			<path d="M12 14H21L32.5 26L21 38H12L23.5 26Z" fill="#fff" />
			<rect x="32" y="32.5" width="9.5" height="5.5" fill={`url(#${id})`} />
		</svg>
	);
}
