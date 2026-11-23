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

const TONE = ["var(--color-fg)", "var(--color-fg-secondary)", "var(--color-fg-muted)"];
const DOT = ["bg-fill", "bg-fg-secondary", "bg-fg-muted"];

export function TopThree({ tier, className }: Props) {
	const top = tier.traders.slice(0, 3);
	return (
		<section className={cn("grid grid-cols-[360px_minmax(0,1fr)] gap-10 rounded-8 bg-surface p-6", className)}>
			<ol className="flex flex-col justify-between gap-4">
				{top.map((r) => (
					<Entry key={r.address} r={r} tier={tier} />
				))}
			</ol>
			<Race series={top.map(path)} />
		</section>
	);
}

function Entry({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<li className="flex items-center gap-3">
			<span className={cn("size-2 flex-none rounded-full", DOT[r.rank - 1])} />
			<span className="w-4 text-sm font-semibold text-fg-muted tabular-nums">{r.rank}</span>
			<Identicon id={r.address} className="size-8 rounded-4" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm">{traderName(r)}</span>
				<span className="text-xs whitespace-nowrap text-fg-muted tabular-nums">
					Prize <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
					<span className="ml-3">Account</span> <span className="text-fg-secondary">{usdCompact(r.accountValue)}</span>
				</span>
			</div>
			<div className="flex flex-col items-end gap-0.5 tabular-nums">
				<span className={cn("text-base leading-none font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
				<span className={cn("text-xs", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)} 24h</span>
			</div>
		</li>
	);
}

const X_AT = [0, 23 / 30, 29 / 30, 1];
const H = 200;

function Race({ series }: { series: number[][] }) {
	const ref = useRef<HTMLDivElement>(null);
	const [w, setW] = useState(0);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const o = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
		o.observe(el);
		return () => o.disconnect();
	}, []);
	const all = series.flat();
	const min = Math.min(...all);
	const span = Math.max(...all) - min || 1;
	const bottom = 20;
	const y = (v: number) => 6 + (1 - (v - min) / span) * (H - 6 - bottom);
	const x = (i: number) => X_AT[i] * w;
	return (
		<div ref={ref} className="w-full" style={{ height: H }}>
			{w > 0 && (
				<svg width={w} height={H} className="overflow-visible" aria-hidden="true">
					<line x1={x(1)} x2={x(1)} y1={0} y2={H - bottom} stroke="var(--color-fg-disabled)" strokeDasharray="2 3" />
					{series.map((s, i) => {
						const pts = s.map((v, j) => [x(j), y(v)]);
						const d = pts.map((p, j) => `${j ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
						const key = `${i}-${s[3]}`;
						return (
							<g key={key}>
								<path d={d} fill="none" stroke={TONE[i]} strokeWidth={i === 0 ? 2 : 1.5} strokeLinejoin="round" />
								<circle cx={pts[3][0]} cy={pts[3][1]} r={3.5} fill={TONE[i]} />
							</g>
						);
					})}
					<text x={x(0)} y={H - 2} className="fill-fg-muted text-2xs">
						30d ago
					</text>
					<text x={x(1)} y={H - 2} textAnchor="middle" className="fill-fg-muted text-2xs">
						Round start
					</text>
					<text x={x(3)} y={H - 2} textAnchor="end" className="fill-fg-muted text-2xs">
						Now
					</text>
				</svg>
			)}
		</div>
	);
}
