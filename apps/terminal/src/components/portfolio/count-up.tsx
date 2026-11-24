import { useEffect, useRef, useState } from "react";

const DURATION_MS = 900;

function easeOut(t: number) {
	return 1 - (1 - t) ** 4;
}

interface Props {
	value: number;
	format: (n: number) => string;
	className?: string;
}

export function CountUp({ value, format, className }: Props) {
	const [shown, setShown] = useState(0);
	const from = useRef(0);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			from.current = value;
			setShown(value);
			return;
		}
		const start = from.current;
		const t0 = performance.now();
		let frame = requestAnimationFrame(function tick(now) {
			const t = Math.min(1, (now - t0) / DURATION_MS);
			const v = start + (value - start) * easeOut(t);
			from.current = v;
			setShown(v);
			if (t < 1) frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	}, [value]);

	return (
		<span className={className}>
			<span className="sr-only">{format(value)}</span>
			<span aria-hidden="true">{format(shown)}</span>
		</span>
	);
}
