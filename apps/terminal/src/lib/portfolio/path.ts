/** Monotone cubic interpolation (Fritsch and Carlson). The curve never overshoots or doubles back between points. */
export function smoothPath(pts: [number, number][]) {
	const n = pts.length;
	if (n < 2) return "";
	if (n === 2)
		return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;
	const dx: number[] = [];
	const slope: number[] = [];
	for (let i = 0; i < n - 1; i++) {
		const h = pts[i + 1][0] - pts[i][0];
		dx.push(h);
		slope.push(h === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / h);
	}
	const m: number[] = [slope[0]];
	for (let i = 1; i < n - 1; i++) {
		if (slope[i - 1] * slope[i] <= 0) m.push(0);
		else {
			const w1 = 2 * dx[i] + dx[i - 1];
			const w2 = dx[i] + 2 * dx[i - 1];
			m.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]));
		}
	}
	m.push(slope[n - 2]);
	let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
	for (let i = 0; i < n - 1; i++) {
		const h = dx[i];
		const c1x = pts[i][0] + h / 3;
		const c1y = pts[i][1] + (m[i] * h) / 3;
		const c2x = pts[i + 1][0] - h / 3;
		const c2y = pts[i + 1][1] - (m[i + 1] * h) / 3;
		d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
	}
	return d;
}

/** Straight segments between points. Sharp corners, no smoothing. */
export function linePath(pts: [number, number][]) {
	return pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

export function stepPath(pts: [number, number][]) {
	return pts
		.map((p, i) => {
			const x = p[0].toFixed(1);
			const y = p[1].toFixed(1);
			if (i === 0) return `M${x},${y}`;
			return `H${x} V${y}`;
		})
		.join(" ");
}
