const COLS = 24;
const ROWS = 7;
const SIZE = 18;
const MASK = "linear-gradient(180deg, black 50%, transparent)";

interface Props {
	ink: string;
}

export function Halftone({ ink }: Props) {
	const dots = [];
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			const t = Math.max(0, 1 - Math.hypot((COLS - 1 - x) / COLS, y / ROWS) * 1.6);
			dots.push(
				<circle key={`${x}-${y}`} cx={x * SIZE + SIZE / 2} cy={y * SIZE + SIZE / 2} r={0.4 + t * 4.6} fill={ink} />,
			);
		}
	}
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute top-0 right-0 -z-10 h-[70%] w-[34%]"
			style={{ maskImage: MASK, WebkitMaskImage: MASK }}
		>
			<svg
				className="absolute inset-0 size-full"
				viewBox={`0 0 ${COLS * SIZE} ${ROWS * SIZE}`}
				preserveAspectRatio="xMaxYMid slice"
				aria-hidden="true"
			>
				{dots}
			</svg>
		</div>
	);
}
