import { useEffect, useRef, useState } from "react";

const DURATION = 1100;
const DELAY = 180;

function easeOutBack(t: number) {
	const c = 1.2;
	return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

export function useRevealValue(target: number) {
	const [value, setValue] = useState(0);
	const [settled, setSettled] = useState(false);
	const current = useRef(0);
	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			current.current = target;
			setValue(target);
			setSettled(true);
			return;
		}
		const from = current.current;
		const first = from === 0;
		if (first) setSettled(false);
		let frame = 0;
		let start = 0;
		function tick(now: number) {
			if (!start) start = now + (first ? DELAY : 0);
			const t = Math.min(1, Math.max(0, (now - start) / DURATION));
			const next = from + (target - from) * easeOutBack(t);
			current.current = next;
			setValue(next);
			if (t < 1) frame = requestAnimationFrame(tick);
			else setSettled(true);
		}
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target]);
	return { value, settled };
}
