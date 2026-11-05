import type { ExecutionFill } from "./execution-markers";

export const FRESH_FILL_MAX_AGE_MS = 60_000;

export interface FreshFillTracker {
	seen: Set<number> | null;
}

export function createFreshFillTracker(): FreshFillTracker {
	return { seen: null };
}

export function observeFills(
	tracker: FreshFillTracker,
	fills: readonly ExecutionFill[],
	isSnapshot: boolean,
	now: number,
): ExecutionFill[] {
	if (!tracker.seen || isSnapshot) {
		tracker.seen = new Set(fills.map((f) => f.tid));
		return [];
	}
	const fresh: ExecutionFill[] = [];
	for (const fill of fills) {
		if (tracker.seen.has(fill.tid)) continue;
		tracker.seen.add(fill.tid);
		if (now - fill.time <= FRESH_FILL_MAX_AGE_MS) fresh.push(fill);
	}
	return fresh;
}

export function resetFreshFills(tracker: FreshFillTracker) {
	tracker.seen = null;
}

export function easeOutCubic(t: number): number {
	const c = Math.min(1, Math.max(0, t));
	return 1 - (1 - c) ** 3;
}

export function animateProgress(durationMs: number, onFrame: (t: number) => void): () => void {
	let raf = 0;
	const start = performance.now();
	function tick(now: number) {
		const t = Math.min(1, (now - start) / durationMs);
		onFrame(t);
		if (t < 1) raf = requestAnimationFrame(tick);
	}
	raf = requestAnimationFrame(tick);
	return () => cancelAnimationFrame(raf);
}
