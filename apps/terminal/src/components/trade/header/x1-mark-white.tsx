import type { CSSProperties } from "react";

export function X1MarkWhite({ height, style }: { height: number; style?: CSSProperties }) {
	return (
		<svg
			viewBox="0 0 123 80"
			aria-hidden="true"
			style={{ display: "block", height, width: (height * 123) / 80, ...style }}
		>
			<path
				d="M76.9314 0H62.289L42.451 26.1546L23.9103 0H0L29.6265 39.6956L0 80H23.0058L41.8736 54.0388L59.7085 80H82.7143L54.7044 39.7582L85.3119 0H76.9314Z"
				fill="#fff"
			/>
			<path d="M85.3125 15.7479L97.3316 0H123.001L123.001 79.9681H104.697L104.697 15.7479H85.3125Z" fill="#fff" />
		</svg>
	);
}
