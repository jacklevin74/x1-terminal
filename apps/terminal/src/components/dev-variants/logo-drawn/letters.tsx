import { useId } from "react";

const CAP = 80;
const ONE_PATH = "M0 15.7479L12.0191 0H37.6885V79.9681H19.3845V15.7479H0Z";
const ONE_WIDTH = 37.6885;

type Point = [number, number];

export interface LetterStyle {
	height: number;
	weight?: number;
	width?: number;
	gap?: number;
	join?: "miter" | "bevel" | "round";
	skew?: number;
	stencil?: number;
	aBar?: boolean;
	eStem?: boolean;
	oneAsI?: boolean;
	outline?: number;
}

interface Glyph {
	width: number;
	lines: Point[][];
	one?: boolean;
	sharp?: boolean;
}

function extend(from: Point, to: Point, by: number): Point {
	const dx = to[0] - from[0];
	const dy = to[1] - from[1];
	const len = Math.hypot(dx, dy);
	return [to[0] + (dx / len) * by, to[1] + (dy / len) * by];
}

function glyph(char: string, s: number, k: number, round: boolean, style: LetterStyle): Glyph {
	const h = s / 2;
	const lo = round ? h : 0;
	const hi = round ? CAP - h : CAP;
	const over = round ? 0 : 30;
	const cut = style.stencil ?? 0;
	const from = cut ? s + cut : h;

	if (char === "T") {
		const w = 62 * k;
		return {
			width: w,
			lines: [
				[
					[round ? h : 0, h],
					[round ? w - h : w, h],
				],
				[
					[w / 2, cut ? s + cut : h],
					[w / 2, hi],
				],
			],
		};
	}
	if (char === "E") {
		const w = 52 * k;
		const xr = round ? w - h : w;
		if (style.eStem === false) {
			const xl = round ? h : 0;
			return {
				width: w,
				lines: [h, CAP / 2, CAP - h].map((y): Point[] => [
					[xl, y],
					[xr, y],
				]),
			};
		}
		if (cut) {
			return {
				width: w,
				lines: [
					[
						[h, lo],
						[h, hi],
					],
					[
						[from, h],
						[xr, h],
					],
					[
						[from, CAP / 2],
						[xr * 0.88, CAP / 2],
					],
					[
						[from, CAP - h],
						[xr, CAP - h],
					],
				],
			};
		}
		return {
			width: w,
			lines: [
				[
					[xr, h],
					[h, h],
					[h, CAP - h],
					[xr, CAP - h],
				],
				[
					[h, CAP / 2],
					[xr * 0.88, CAP / 2],
				],
			],
		};
	}
	if (char === "R") {
		const w = 58 * k;
		const waist = 45;
		const legStart: Point = [w * 0.46, waist + (cut ? h + cut * 0.6 : 0)];
		const legEnd: Point = round ? [w - h, CAP - h] : [w - h * 1.1, CAP];
		const leg: Point[] = [legStart, over ? extend(legStart, legEnd, over) : legEnd];
		if (cut) {
			return {
				width: w,
				lines: [
					[
						[h, lo],
						[h, hi],
					],
					[
						[from, h],
						[w - h, h],
						[w - h, waist],
						[from, waist],
					],
					leg,
				],
			};
		}
		return {
			width: w,
			lines: [
				[
					[h, hi],
					[h, h],
					[w - h, h],
					[w - h, waist],
					[h, waist],
				],
				leg,
			],
		};
	}
	if (char === "M") {
		const w = 78 * k;
		return {
			width: w,
			sharp: true,
			lines: [
				[
					[h, hi],
					[h, h],
					[w / 2, 56],
					[w - h, h],
					[w - h, hi],
				],
			],
		};
	}
	if (char === "I") {
		if (style.oneAsI) return { width: ONE_WIDTH, lines: [], one: true };
		return {
			width: s,
			lines: [
				[
					[h, lo],
					[h, hi],
				],
			],
		};
	}
	if (char === "N") {
		const w = 64 * k;
		return {
			width: w,
			sharp: true,
			lines: [
				[
					[h, hi],
					[h, h],
					[w - h, CAP - h],
					[w - h, lo],
				],
			],
		};
	}
	if (char === "A") {
		const w = 70 * k;
		const apex: Point = [w / 2, h];
		const left: Point = round ? [h, CAP - h] : [s * 0.62, CAP];
		const right: Point = [w - left[0], left[1]];
		const lines: Point[][] = [[over ? extend(apex, left, over) : left, apex, over ? extend(apex, right, over) : right]];
		if (style.aBar !== false && !cut) {
			const y = 56;
			const t = (y - apex[1]) / (left[1] - apex[1]);
			const x = apex[0] + (left[0] - apex[0]) * t;
			lines.push([
				[x, y],
				[w - x, y],
			]);
		}
		return { width: w, lines, sharp: true };
	}
	const w = 50 * k;
	const xr = round ? w - h : w;
	if (cut) {
		return {
			width: w,
			lines: [
				[
					[h, lo],
					[h, hi],
				],
				[
					[from, CAP - h],
					[xr, CAP - h],
				],
			],
		};
	}
	return {
		width: w,
		lines: [
			[
				[h, lo],
				[h, CAP - h],
				[xr, CAP - h],
			],
		],
	};
}

function toPath(lines: Point[][]) {
	return lines
		.map((line) => line.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(""))
		.join("");
}

export function Lettering({ text = "TERMINAL", ...style }: LetterStyle & { text?: string }) {
	const id = useId().replace(/[^a-zA-Z0-9]/g, "");
	const s = style.weight ?? 18.3;
	const k = style.width ?? 1;
	const gap = style.gap ?? 14;
	const join = style.join ?? "miter";
	const round = join === "round";
	const skew = style.skew ?? 0;
	const lean = Math.tan((skew * Math.PI) / 180) * CAP;

	let x = 0;
	const placed = [...text].map((char, index) => {
		const g = glyph(char, s, k, round, style);
		const at = x;
		x += g.width + gap;
		return { ...g, at, key: `${char}${index}` };
	});
	const total = x - gap + lean;
	const stroke = {
		fill: "none",
		strokeLinejoin: join,
		strokeLinecap: round ? ("round" as const) : ("butt" as const),
		strokeMiterlimit: 12,
	};

	return (
		<svg
			data-part="word"
			viewBox={`0 0 ${total.toFixed(2)} ${CAP}`}
			aria-hidden="true"
			className="block shrink-0"
			style={{ height: style.height, width: (total / CAP) * style.height }}
		>
			<defs>
				<linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2={CAP} gradientUnits="userSpaceOnUse">
					<stop stopColor="#00C6FF" />
					<stop offset="1" stopColor="#0072FF" />
				</linearGradient>
				<clipPath id={`c${id}`}>
					<rect x={-200} y={0} width={total + 400} height={CAP} />
				</clipPath>
				{style.outline ? (
					<mask id={`m${id}`} maskUnits="userSpaceOnUse" x={-200} y={-20} width={total + 400} height={CAP + 40}>
						{placed.map((g) => (
							<g key={g.key} transform={`translate(${g.at} 0)`}>
								<path d={toPath(g.lines)} {...stroke} stroke="#fff" strokeWidth={s} />
								<path d={toPath(g.lines)} {...stroke} stroke="#000" strokeWidth={s - (style.outline ?? 0) * 2} />
							</g>
						))}
					</mask>
				) : null}
			</defs>
			<g clipPath={round ? undefined : `url(#c${id})`}>
				<g transform={skew ? `translate(${lean} 0) skewX(${-skew})` : undefined}>
					{style.outline ? (
						<rect x={-200} y={-20} width={total + 400} height={CAP + 40} fill="currentColor" mask={`url(#m${id})`} />
					) : (
						placed.map((g) => (
							<g key={g.key} transform={`translate(${g.at} 0)`}>
								{g.one ? (
									<path d={ONE_PATH} fill={`url(#g${id})`} />
								) : (
									<path
										d={toPath(g.lines)}
										{...stroke}
										strokeLinejoin={g.sharp && join === "bevel" ? "miter" : join}
										stroke="currentColor"
										strokeWidth={s}
									/>
								)}
							</g>
						))
					)}
				</g>
			</g>
		</svg>
	);
}
