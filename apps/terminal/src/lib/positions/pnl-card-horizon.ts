import geistMonoWoff2 from "@fontsource/geist-mono/files/geist-mono-latin-700-normal.woff2?inline";
import interWoff2 from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline";
import type { PnlCardData } from "@/lib/positions/pnl-card";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 760;
const UP = "#2ee6a6";
const DOWN = "#ff5c6c";
const GROUND = "#07070a";
const FG = "rgba(255,255,255,0.95)";
const MUTED = "rgba(255,255,255,0.56)";
const FAINT = "rgba(255,255,255,0.32)";
const HAIRLINE = "rgba(255,255,255,0.08)";
const MINUS = "−";
const CAP = 0.727;

const WIDTH_CHARS =
	" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u2212\u00b7\u00d7$%";
const WIDTHS: Record<400 | 500 | 600, number[]> = {
	400: [
		281, 288, 466, 633, 642, 982, 644, 300, 365, 365, 501, 662, 288, 460, 288, 360, 631, 407, 610, 618, 646, 593, 620,
		566, 619, 620, 288, 302, 662, 662, 662, 511, 966, 690, 654, 730, 722, 601, 590, 746, 743, 269, 571, 672, 565, 903,
		753, 765, 639, 765, 644, 642, 646, 744, 690, 985, 682, 679, 629, 365, 360, 365, 471, 456, 323, 562, 612, 571, 612,
		583, 370, 613, 591, 242, 242, 549, 242, 876, 591, 600, 612, 612, 376, 528, 327, 591, 562, 818, 546, 562, 552, 426,
		333, 426, 662, 662, 288, 662, 642, 982,
	],
	500: [
		267, 304, 494, 639, 646, 993, 653, 313, 369, 369, 520, 667, 303, 463, 303, 370, 645, 415, 616, 627, 656, 603, 630,
		571, 629, 630, 303, 315, 667, 667, 667, 527, 983, 709, 657, 734, 722, 603, 589, 748, 744, 273, 575, 688, 565, 913,
		756, 767, 642, 769, 648, 646, 653, 740, 709, 1003, 701, 696, 641, 369, 370, 369, 476, 463, 337, 568, 618, 577, 618,
		587, 379, 619, 602, 252, 252, 559, 252, 888, 601, 604, 618, 618, 387, 539, 340, 602, 575, 829, 557, 575, 559, 441,
		346, 441, 667, 667, 303, 667, 646, 993,
	],
	600: [
		252, 321, 523, 644, 650, 1004, 663, 326, 373, 373, 540, 673, 319, 465, 319, 379, 660, 423, 623, 636, 666, 612, 640,
		576, 640, 640, 319, 329, 673, 673, 673, 543, 999, 728, 659, 737, 722, 605, 588, 749, 746, 277, 580, 703, 565, 922,
		759, 769, 645, 773, 652, 650, 660, 736, 728, 1020, 720, 714, 652, 373, 379, 373, 482, 469, 351, 574, 624, 583, 624,
		591, 389, 626, 612, 262, 262, 570, 262, 900, 612, 609, 624, 624, 397, 549, 353, 612, 587, 839, 569, 589, 566, 455,
		359, 455, 673, 673, 319, 673, 650, 1004,
	],
};

const BEARING_CHARS = "0123456789+\u2212$ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BEARINGS: Record<500 | 600, number[]> = {
	500: [
		55, 46, 69, 57, 55, 57, 55, 44, 55, 55, 93, 99, 52, 25, 81, 55, 81, 81, 81, 55, 81, 81, 44, 81, 81, 81, 81, 55, 81,
		55, 81, 52, 44, 81, 25, 25, 27, 25, 58,
	],
	600: [
		50, 46, 62, 52, 52, 51, 50, 40, 50, 50, 91, 96, 46, 24, 73, 50, 73, 73, 73, 50, 73, 73, 38, 73, 73, 73, 73, 50, 73,
		50, 73, 46, 40, 73, 24, 24, 26, 24, 56,
	],
};

const X1_X_PATH =
	"M76.9314 0H62.289L42.451 26.1546L23.9103 0H0L29.6265 39.6956L0 80H23.0058L41.8736 54.0388L59.7085 80H82.7143L54.7044 39.7582L85.3119 0H76.9314Z";
const X1_ONE_PATH = "M85.3125 15.7479L97.3316 0H123.001L123.001 79.9681H104.697L104.697 15.7479H85.3125Z";

function xml(text: string): string {
	return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function textWidth(text: string, size: number, weight: 400 | 500 | 600 = 400, tracking = 0): number {
	const table = WIDTHS[weight];
	let units = 0;
	let count = 0;
	for (const char of text) {
		const index = WIDTH_CHARS.indexOf(char);
		units += index === -1 ? 640 : (table[index] ?? 640);
		count += 1;
	}
	return (units / 1000) * size + tracking * size * Math.max(0, count - 1);
}

function inkX(x: number, text: string, size: number, weight: 500 | 600): number {
	const index = BEARING_CHARS.indexOf(text.charAt(0));
	return index === -1 ? x : x - ((BEARINGS[weight][index] ?? 0) / 1000) * size;
}

function fitSize(text: string, maxWidth: number, maxSize: number, weight: 400 | 500 | 600, tracking = 0): number {
	return Math.min(maxSize, Math.floor(maxWidth / textWidth(text, 1, weight, tracking)));
}

function capBaseline(centerY: number, size: number): number {
	return centerY + (CAP * size) / 2;
}

function formatRoe(roe: number): string {
	if (!Number.isFinite(roe)) return "n/a";
	const value = roe * 100;
	const digits = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
		Math.abs(value),
	);
	return `${value < 0 ? MINUS : "+"}${digits}%`;
}

function formatPnl(pnl: number): string {
	if (!Number.isFinite(pnl)) return "n/a";
	const digits = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
		Math.abs(pnl),
	);
	return `${pnl < 0 ? MINUS : "+"}$${digits}`;
}

function formatLeverage(leverage: number): string {
	return Number.isFinite(leverage) && leverage > 0 ? `${leverage}x` : "n/a";
}

function fontStyle(): string {
	return `<style>@font-face{font-family:"X1 Inter";src:url(${interWoff2}) format("woff2");font-weight:100 900;}@font-face{font-family:"X1 Mono";src:url(${geistMonoWoff2}) format("woff2");font-weight:700;}text{font-family:"X1 Inter";}.mono{font-family:"X1 Mono";font-weight:700;}</style>`;
}

// Same lockup as the app nav: public/brand/x1-terminal-logo-dark.svg (viewBox 383.78 x 81).
const LOGO_H = 81;
const LOGO_BODY =
	'<g transform="translate(0 0) scale(0.44)"><path d="M76.9314 0H62.289L42.451 26.1546L23.9103 0H0L29.6265 39.6956L0 80H23.0058L41.8736 54.0388L59.7085 80H82.7143L54.7044 39.7582L85.3119 0H76.9314Z"/><path d="M85.3125 15.7479L97.3316 0H123.001V79.9681H104.697V15.7479H85.3125Z" fill="url(#x1-logo-blue)"/></g><g transform="translate(65 18) scale(1)"><g transform="scale(0.8798882681564246) translate(-1.3 70)"><path d="M25.300 0.100L33.500 0.100L33.500-59.800L57.300-59.800L57.300-66.500L1.300-66.500L1.300-59.800L25.300-59.800ZM76.500 1.600C93.100 1.600 98.900-7.800 99.900-15.400L92.600-15.400C91.100-9.100 86.600-4.500 76.800-4.500C66.800-4.500 60.200-9.500 59.600-23.200L99.800-23.200C100-24.400 100-25.400 100-26.700C100-41.300 91.500-51.600 76.500-51.600C59.900-51.600 51.700-40 51.700-25.100C51.700-10 59.300 1.600 76.500 1.600ZM59.800-29.200C60.900-41 67.100-45.500 76.600-45.500C85.900-45.500 91.800-40.700 92.200-29.200ZM107.600 0L115.600 0L115.600-18.400C115.600-32.500 118.700-43.300 133.500-42.800L135.700-42.800L135.700-50.700L133.900-50.700C124.300-50.700 118.500-45.100 115.500-36.700L115.500-50L107.600-50ZM212.500-31.300L212.500 0L220.500 0L220.500-32.200C220.500-45 215.000-51.600 203.600-51.600C193.700-51.600 187.900-46.400 185.000-37.700C183.600-46.900 178.200-51.600 168.500-51.600C159.000-51.600 153.400-46.500 150.400-38L150.400-50L142.400-50L142.400 0L150.400 0L150.400-19.100C150.400-36.300 155.300-44.900 166.000-44.900C173.400-44.900 177.500-41.400 177.500-31.300L177.500 0L185.400 0L185.400-19.100C185.400-36.300 190.300-44.900 201.100-44.900C208.400-44.900 212.500-41.400 212.500-31.300ZM230.700 0L238.700 0L238.700-50L230.700-50ZM229.500-58.200L239.800-58.200L239.800-66.500L229.500-66.500ZM249.900 0L257.900 0L257.900-19.100C257.900-36.300 263.800-44.900 274.900-44.900C282.200-44.900 286.900-41.700 286.900-31L286.900 0L294.900 0L294.900-31.900C294.900-44.800 289.600-51.600 277-51.600C267.100-51.600 261-46 257.900-36.900L257.900-50L249.900-50ZM319 1.300C330.600 1.300 335.900-5.700 337.800-11.700C337.800-8 338-4.300 338.500 0L345.700 0C345.300-4.900 345.100-8.800 345.100-12.400L345.100-36.400C345.100-45.400 339-51.700 325.300-51.700C311.500-51.700 303.900-44.900 303.600-34.300L311.600-34.300C312.100-40.800 315.800-45.400 325.500-45.400C335.300-45.400 337.800-41.500 337.800-36.400C337.800-32.600 335.600-31.200 330.400-30.300L317.700-28.200C306.800-26.400 302.500-21.300 302.500-13.200C302.500-3.700 309.400 1.300 319 1.300ZM310.600-13.500C310.600-18.900 313.700-21.500 320.500-22.900L328.800-24.600C332.600-25.400 335.300-26.200 337.800-28L337.800-23.700C337.800-14.200 332.400-5 320.500-5C314.700-5 310.600-7.800 310.600-13.500ZM355.600 0L363.600 0L363.600-70L355.600-70Z"/></g></g>';

function logo(x: number, y: number, size: number, _wordColor: string): string {
	const scale = size / LOGO_H;
	return `<g transform="translate(${x} ${y}) scale(${scale})" fill="#f2f4f7">${LOGO_BODY}</g>`;
}

function logoDefs(): string {
	return `<linearGradient id="x1-logo-blue" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#00c6ff"/><stop offset="1" stop-color="#0072ff"/></linearGradient>`;
}

function microLabel(x: number, y: number, label: string, color: string, anchor: "start" | "end" = "start"): string {
	return `<text x="${anchor === "start" ? inkX(x, label.toUpperCase(), 16, 500) : x + 0.96}" y="${y}" font-size="16" font-weight="500" letter-spacing="0.96" fill="${color}" text-anchor="${anchor}">${xml(label.toUpperCase())}</text>`;
}

function cardFrame(defs: string, body: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">${fontStyle()}<defs>${logoDefs()}${defs}</defs>${body}</svg>`;
}

export const NAME = "Low camera, monolith, glossy mirror";

const MARK_GAP = 48;

interface Palette {
	deep: string;
	mid: string;
	core: string;
	hot: string;
	surface: string;
}

interface MarkBox {
	x: number;
	y: number;
	width: number;
	height: number;
	scale: number;
}

type Point = [number, number];

const X_POLY: Point[] = [
	[76.9314, 0],
	[62.289, 0],
	[42.451, 26.1546],
	[23.9103, 0],
	[0, 0],
	[29.6265, 39.6956],
	[0, 80],
	[23.0058, 80],
	[41.8736, 54.0388],
	[59.7085, 80],
	[82.7143, 80],
	[54.7044, 39.7582],
	[85.3119, 0],
];
const ONE_POLY: Point[] = [
	[85.3125, 15.7479],
	[97.3316, 0],
	[123.001, 0],
	[123.001, 79.9681],
	[104.697, 79.9681],
	[104.697, 15.7479],
];

function palette(gain: boolean): Palette {
	return gain
		? { deep: "#0a3a3c", mid: UP, core: "#dcfff0", hot: "#f4fffa", surface: "#0a1311" }
		: { deep: "#4a0f22", mid: DOWN, core: "#ffe1d6", hot: "#fff6f1", surface: "#150a0c" };
}

function blurFilter(id: string, deviation: number): string {
	return `<filter id="${id}" filterUnits="userSpaceOnUse" x="-900" y="-900" width="3000" height="2560" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${deviation}"/></filter>`;
}

function roeInkRight(roe: string, left: number): number {
	const size = fitSize(roe, 780, 156, 600, -0.03);
	return inkX(left, roe, size, 600) + textWidth(roe, size, 600, -0.03);
}

function placeMark(
	roeRight: number,
	centerX: number,
	preferredWidth: number,
	minWidth: number,
	maxRight: number,
	rightExtension = 0,
): { x: number; width: number } {
	const minLeft = roeRight + MARK_GAP;
	let width = preferredWidth;
	let x = Math.max(centerX - width / 2, minLeft);
	const fits = (maxRight - x) / (1 + rightExtension);
	if (width > fits) width = Math.max(minWidth, fits);
	if (x + width * (1 + rightExtension) > maxRight) x = maxRight - width * (1 + rightExtension);
	return { x, width };
}

function box(x: number, y: number, width: number): MarkBox {
	const scale = width / 123;
	return { x, y, width, height: 80 * scale, scale };
}

function markGroup(mark: MarkBox, inner: string, attrs = ""): string {
	return `<g transform="translate(${mark.x} ${mark.y}) scale(${mark.scale})" ${attrs}>${inner}</g>`;
}

const MARK_PATHS = `<path d="${X1_X_PATH}"/><path d="${X1_ONE_PATH}"/>`;

function markClip(id: string, mark: MarkBox): string {
	const transform = `translate(${mark.x} ${mark.y}) scale(${mark.scale})`;
	return `<clipPath id="${id}"><path transform="${transform}" d="${X1_X_PATH}"/><path transform="${transform}" d="${X1_ONE_PATH}"/></clipPath>`;
}

function insidePoly(poly: Point[], u: number, v: number): boolean {
	let result = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
		const [xi, yi] = poly[i] as Point;
		const [xj, yj] = poly[j] as Point;
		if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) result = !result;
	}
	return result;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
	const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}

function rimMask(
	id: string,
	mark: MarkBox,
	light: Point,
	reach: number,
	mode: "toward" | "away",
	width: number,
	peak = 1,
): string {
	const edges: { a: Point; b: Point; va: number; vb: number }[] = [];
	const corners = [...X_POLY, ...ONE_POLY].map(([u, v]) => [mark.x + u * mark.scale, mark.y + v * mark.scale] as Point);
	const nearest = Math.min(...corners.map(([px, py]) => Math.hypot(light[0] - px, light[1] - py)));
	function level(point: Point, normal: Point): number {
		const dx = light[0] - point[0];
		const dy = light[1] - point[1];
		const distance = Math.hypot(dx, dy) || 1;
		const sign = mode === "toward" ? 1 : -1;
		const facing = smoothstep(0.05, 0.65, (sign * (normal[0] * dx + normal[1] * dy)) / distance);
		return peak * facing * Math.exp(-(distance - nearest) / reach);
	}
	for (const poly of [X_POLY, ONE_POLY]) {
		for (let i = 0; i < poly.length; i += 1) {
			const [u1, v1] = poly[i] as Point;
			const [u2, v2] = poly[(i + 1) % poly.length] as Point;
			const length = Math.hypot(u2 - u1, v2 - v1);
			let normal: Point = [(v2 - v1) / length, -(u2 - u1) / length];
			if (insidePoly(poly, (u1 + u2) / 2 + normal[0] * 0.05, (v1 + v2) / 2 + normal[1] * 0.05)) {
				normal = [-normal[0], -normal[1]];
			}
			const a: Point = [mark.x + u1 * mark.scale, mark.y + v1 * mark.scale];
			const b: Point = [mark.x + u2 * mark.scale, mark.y + v2 * mark.scale];
			edges.push({ a, b, va: level(a, normal), vb: level(b, normal) });
		}
	}
	edges.sort((left, right) => Math.max(left.va, left.vb) - Math.max(right.va, right.vb));
	const gradients: string[] = [];
	const lines: string[] = [];
	edges.forEach((edge, index) => {
		if (Math.max(edge.va, edge.vb) < 0.02) return;
		const gray = (value: number) => {
			const channel = Math.round(255 * Math.min(1, value));
			return `rgb(${channel},${channel},${channel})`;
		};
		gradients.push(
			`<linearGradient id="${id}-e${index}" gradientUnits="userSpaceOnUse" x1="${edge.a[0]}" y1="${edge.a[1]}" x2="${edge.b[0]}" y2="${edge.b[1]}"><stop stop-color="${gray(edge.va)}"/><stop offset="1" stop-color="${gray(edge.vb)}"/></linearGradient>`,
		);
		lines.push(
			`<line x1="${edge.a[0]}" y1="${edge.a[1]}" x2="${edge.b[0]}" y2="${edge.b[1]}" stroke="url(#${id}-e${index})" stroke-width="${width * 2}"/>`,
		);
	});
	return `${gradients.join("")}<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#000"/>${lines.join("")}</mask>`;
}

type Shape = [number, number, number, number, string];

function glow(filterId: string, opacity: number, shapes: Shape[]): string {
	const body = shapes
		.map(([cx, cy, rx, ry, fill]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`)
		.join("");
	return `<g opacity="${opacity}" filter="url(#${filterId})" style="mix-blend-mode:screen"><rect x="-900" y="-900" width="3000" height="2560" fill="#000"/>${body}</g>`;
}

function shortRadius(shape: Shape): number {
	return Math.min(shape[2], shape[3]);
}

function glowFilter(id: string, shapes: Shape[], ratio = 0.5): string {
	const largest = Math.max(...shapes.map((shape) => shortRadius(shape)));
	return blurFilter(id, largest * ratio);
}

function standing(roeRight: number, horizon: number, centerX: number, preferred: number, min: number): MarkBox {
	const place = placeMark(roeRight, centerX, preferred, min, CARD_WIDTH - 64);
	const height = (80 * place.width) / 123;
	return box(place.x, horizon - height, place.width);
}

function rampMask(id: string, x1: number, y1: number, x2: number, y2: number, stops: [number, number][]): string {
	const body = stops
		.map(([offset, value]) => `<stop offset="${offset}" stop-color="#fff" stop-opacity="${value}"/>`)
		.join("");
	return `<linearGradient id="${id}-ramp" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${body}</linearGradient><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#${id}-ramp)"/></mask>`;
}

function rim(mark: MarkBox, maskId: string, clipId: string, color: string): string {
	return `<g clip-path="url(#${clipId})"><rect x="${mark.x - 4}" y="${mark.y - 4}" width="${mark.width + 8}" height="${mark.height + 8}" fill="${color}" mask="url(#${maskId})"/></g>`;
}

function horizonLine(id: string, start: number, end: number, horizon: number): string {
	return `<rect x="${start}" y="${horizon - 0.75}" width="${end - start}" height="1.5" fill="url(#${id})"/>`;
}

function horizonGradient(id: string, start: number, end: number, peakX: number, color: string): string {
	const peak = Math.min(0.95, Math.max(0.05, (peakX - start) / (end - start)));
	return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${start}" y1="0" x2="${end}" y2="0"><stop stop-color="${color}" stop-opacity="0"/><stop offset="${peak}" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`;
}

function mirror(horizon: number, inner: string, extra = ""): string {
	return `<g transform="translate(0 ${2 * horizon}) scale(1 -1)" ${extra}>${inner}</g>`;
}

function floorMask(id: string, roeRight: number, horizon: number, floorEnd: number): string {
	const start = Math.max(560, roeRight + 24);
	return `${rampMask(`${id}-x`, start, 0, start + 300, 0, [
		[0, 0],
		[1, 1],
	])}<linearGradient id="${id}-y" gradientUnits="userSpaceOnUse" x1="0" y1="${horizon}" x2="0" y2="${floorEnd}"><stop stop-color="#000"/><stop offset="0.12" stop-color="#fff"/><stop offset="0.7" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"><g mask="url(#${id}-x)"><rect y="${horizon}" width="${CARD_WIDTH}" height="${floorEnd - horizon}" fill="url(#${id}-y)"/></g></mask>`;
}

function horizonStart(roeRight: number, vx: number, reach = 440): number {
	return Math.max(roeRight + 24, vx - reach);
}

function horizonEnd(vx: number, reach = 440): number {
	return Math.min(CARD_WIDTH - 16, vx + reach);
}

const HORIZON = 528;

function layout(roeRight: number): MarkBox {
	return standing(roeRight, HORIZON, 995, 300, 190);
}

function shapes(gain: boolean, roeRight: number): { ambient: Shape[]; dawn: Shape[] } {
	const p = palette(gain);
	const m = layout(roeRight);
	const vx = m.x + m.width / 2;
	return {
		ambient: [[vx, HORIZON - m.height * 0.3, m.width * 1.5, m.height * 1.05, p.deep]],
		dawn: [
			[vx, HORIZON - m.height * 0.16, m.width * 0.62, m.height * 0.46, p.mid],
			[vx, HORIZON - m.height * 0.06, m.width * 0.26, m.height * 0.17, p.core],
		],
	};
}

function floor(vx: number, color: string): string {
	const lines: string[] = [];
	for (let index = -7; index <= 7; index += 1) {
		lines.push(`<line x1="${vx}" y1="${HORIZON}" x2="${vx + index * 340}" y2="${CARD_HEIGHT}"/>`);
	}
	for (let index = 0; index < 8; index += 1) {
		const y = HORIZON + 230 / (40 * 0.6 ** index);
		if (y < CARD_HEIGHT) lines.push(`<line x1="0" y1="${y}" x2="${CARD_WIDTH}" y2="${y}"/>`);
	}
	return `<g stroke="${color}" stroke-width="1" opacity="0.4">${lines.join("")}</g>`;
}

function background(gain: boolean, roeRight: number): string {
	const p = palette(gain);
	const m = layout(roeRight);
	const vx = m.x + m.width / 2;
	const s = shapes(gain, roeRight);
	const figure = markGroup(m, MARK_PATHS, `fill="${p.surface}"`) + rim(m, "rim", "mark-clip", p.core);
	const reflection = `<g mask="url(#reflection-fade)">${mirror(HORIZON, figure)}</g>`;
	return `${glow("ambient", 0.55, s.ambient)}${glow("dawn", 0.5, s.dawn)}<g mask="url(#floor)">${floor(vx, p.mid)}</g>${reflection}${figure}${horizonLine("horizon", horizonStart(roeRight, vx), horizonEnd(vx), HORIZON)}`;
}

function backgroundDefs(gain: boolean, roeRight: number): string {
	const p = palette(gain);
	const m = layout(roeRight);
	const vx = m.x + m.width / 2;
	const s = shapes(gain, roeRight);
	const start = horizonStart(roeRight, vx);
	return `${glowFilter("ambient", s.ambient)}${glowFilter("dawn", s.dawn, 0.62)}${markClip("mark-clip", m)}${rimMask("rim", m, [vx, HORIZON + 8], m.width * 0.6, "away", 1.4, 0.62)}${horizonGradient("horizon", start, horizonEnd(vx), vx, p.core)}${floorMask("floor", roeRight, HORIZON, CARD_HEIGHT)}${rampMask(
		"reflection-fade",
		0,
		HORIZON,
		0,
		HORIZON + m.height * 0.75,
		[
			[0, 0.55],
			[1, 0],
		],
	)}`;
}

export function buildPnlCardSvg(data: PnlCardData): string {
	const gain = Number.isFinite(data.pnl) ? data.pnl >= 0 : data.roe >= 0;
	const accent = gain ? UP : DOWN;
	const roe = formatRoe(data.roe);
	const pnl = formatPnl(data.pnl);
	const left = 64;
	const right = CARD_WIDTH - 64;
	const parts: string[] = [];
	const roeRight = roeInkRight(roe, left);
	parts.push(`<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${GROUND}"/>`);
	parts.push(background(gain, roeRight));
	parts.push(logo(left, 52, 36, FG));
	parts.push(microLabel(right, capBaseline(74, 16), "Position snapshot", MUTED, "end"));

	const symbolSize = fitSize(data.symbol, 640, 40, 600);
	parts.push(
		`<text x="${inkX(left, data.symbol, symbolSize, 600)}" y="214" font-size="${symbolSize}" font-weight="600" fill="${FG}">${xml(data.symbol)}</text>`,
	);
	const sideLine = `${data.side} ${formatLeverage(data.leverage).toUpperCase()}${data.dex ? ` · ${data.dex.slice(0, 20).toUpperCase()}` : ""}`;
	parts.push(
		`<text x="${inkX(left, sideLine, 20, 600)}" y="262" font-size="20" font-weight="600" letter-spacing="1.2" fill="${accent}">${xml(sideLine)}</text>`,
	);
	const roeSize = fitSize(roe, 780, 156, 600, -0.03);
	parts.push(
		`<text x="${inkX(left, roe, roeSize, 600)}" y="430" font-size="${roeSize}" font-weight="600" letter-spacing="${-0.03 * roeSize}" fill="${accent}">${xml(roe)}</text>`,
	);
	const pnlLabelWidth = textWidth("UNREALIZED PNL", 16, 500, 0.06);
	parts.push(microLabel(left, 500, "Unrealized PNL", MUTED));
	parts.push(
		`<text x="${left + pnlLabelWidth + 16}" y="500" font-size="28" font-weight="500" fill="${accent}">${xml(pnl)}</text>`,
	);
	const columns = [
		{ label: "Entry price", value: data.entryPrice },
		{ label: "Mark price", value: data.markPrice },
	];
	let columnX = left;
	for (const column of columns) {
		parts.push(microLabel(columnX, 588, column.label, MUTED));
		parts.push(
			`<text x="${inkX(columnX, column.value, 30, 500)}" y="628" font-size="30" font-weight="500" fill="${FG}">${xml(column.value)}</text>`,
		);
		columnX +=
			Math.max(textWidth(column.label.toUpperCase(), 16, 500, 0.06), textWidth(column.value, 30, 500), 200) + 72;
	}
	parts.push(`<rect x="${left}" y="672" width="${right - left}" height="1" fill="${HAIRLINE}"/>`);
	parts.push(
		`<text x="${inkX(left, data.timestamp, 15, 500)}" y="714" font-size="15" fill="${FAINT}">${xml(`${data.timestamp} · Hyperliquid · Unrealized PNL may change`)}</text>`,
	);
	parts.push(
		`<text x="${right}" y="714" font-size="15" font-weight="500" fill="${MUTED}" text-anchor="end">terminal.x1.xyz</text>`,
	);
	const defs = backgroundDefs(gain, roeRight);
	return cardFrame(defs, parts.join(""));
}
