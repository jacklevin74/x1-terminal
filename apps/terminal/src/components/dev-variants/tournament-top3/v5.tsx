import { useEffect, useRef, useState } from "react";
import {
	path,
	pnlClass,
	prizeFor,
	signedUsd,
	type Tier,
	type Trader,
	traderName,
	usd,
	usdCompact,
} from "@/components/tournament/data";
import { Identicon } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("grid grid-cols-3 gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Card({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="relative isolate flex h-[280px] flex-col overflow-hidden rounded-8 bg-surface p-5">
			<div className="flex items-center gap-3">
				<Identicon id={r.address} className="size-8 rounded-4" />
				<span className="truncate text-sm">{traderName(r)}</span>
				<span className={cn("ml-auto text-sm font-semibold tabular-nums", r.rank === 1 ? "text-fg" : "text-fg-muted")}>
					#{r.rank}
				</span>
			</div>
			<span className={cn("mt-5 text-2xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
				{signedUsd(r.pnl)}
			</span>
			<div className="mt-3 flex gap-4 text-xs text-fg-muted tabular-nums">
				<span>
					Prize <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
				</span>
				<span>
					Account <span className="text-fg-secondary">{usdCompact(r.accountValue)}</span>
				</span>
				<span>
					24h <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
				</span>
			</div>
			<div className="absolute inset-x-0 bottom-0 -z-10 h-[140px]">
				<Area values={path(r)} />
			</div>
			<div className="pointer-events-none absolute inset-x-5 bottom-3 flex justify-between text-2xs text-fg-muted">
				<span>30d ago</span>
				<span>Round start</span>
				<span>Now</span>
			</div>
		</article>
	);
}

const X_AT = [0, 23 / 30, 29 / 30, 1];

function Area({ values }: { values: number[] }) {
	const ref = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ w: 0, h: 0 });
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const o = new ResizeObserver(([e]) =>
			setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }),
		);
		o.observe(el);
		return () => o.disconnect();
	}, []);
	const { w, h } = size;
	const min = Math.min(...values);
	const span = Math.max(...values) - min || 1;
	const top = 16;
	const bottom = 28;
	const pts = values.map((v, i) => [X_AT[i] * w, top + (1 - (v - min) / span) * (h - top - bottom)]);
	const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
	const up = values[3] >= values[1];
	const stroke = up ? "var(--color-market-up)" : "var(--color-market-down)";
	const fill = `color-mix(in oklch, ${stroke} 14%, var(--color-surface))`;
	return (
		<div ref={ref} className="size-full">
			{w > 0 && (
				<svg width={w} height={h} aria-hidden="true">
					<path d={`${line} L${w},${h} L0,${h} Z`} fill={fill} />
					<path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
					<line
						x1={pts[1][0]}
						x2={pts[1][0]}
						y1={top - 8}
						y2={h - bottom + 8}
						stroke="var(--color-fg-disabled)"
						strokeDasharray="2 3"
					/>
					<circle cx={pts[3][0]} cy={pts[3][1]} r={3.5} fill={stroke} />
				</svg>
			)}
		</div>
	);
}
