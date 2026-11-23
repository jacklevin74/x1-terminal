import { cn } from "@/lib/cn";
import raw from "./candles.json";
import type { Palette } from "./palettes";

interface Candle {
	o: string;
	h: string;
	l: string;
	c: string;
}

const candles = (raw as Candle[]).slice(-60);

const W = 560;
const H = 220;

function Candles({ up, down }: Palette) {
	const hi = Math.max(...candles.map((c) => Number(c.h)));
	const lo = Math.min(...candles.map((c) => Number(c.l)));
	const span = hi - lo || 1;
	const y = (v: number) => 8 + (1 - (v - lo) / span) * (H - 16);
	const step = W / candles.length;
	const last = candles[candles.length - 1];
	const lastUp = Number(last.c) >= Number(last.o);
	return (
		<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
			{candles.map((c, i) => {
				const key = (raw as { t: number }[]).slice(-60)[i].t;
				const o = Number(c.o);
				const cl = Number(c.c);
				const isUp = cl >= o;
				const x = i * step + step / 2;
				const top = y(Math.max(o, cl));
				const bot = y(Math.min(o, cl));
				return (
					<g key={key} fill={isUp ? up : down} stroke={isUp ? up : down}>
						<line x1={x} x2={x} y1={y(Number(c.h))} y2={y(Number(c.l))} strokeWidth={1} />
						<rect x={x - step * 0.3} y={top} width={step * 0.6} height={Math.max(1, bot - top)} stroke="none" />
					</g>
				);
			})}
			<line
				x1={0}
				x2={W}
				y1={y(Number(last.c))}
				y2={y(Number(last.c))}
				stroke={lastUp ? up : down}
				strokeDasharray="2 3"
			/>
			<rect x={W - 64} y={y(Number(last.c)) - 9} width={64} height={18} rx={3} fill={lastUp ? up : down} />
			<text
				x={W - 32}
				y={y(Number(last.c)) + 4}
				textAnchor="middle"
				className="fill-fg-inverse text-2xs font-medium tabular-nums"
			>
				{Number(last.c).toFixed(3)}
			</text>
		</svg>
	);
}

const BOOK = [
	["62.760", "1,240"],
	["62.755", "3,180"],
	["62.750", "860"],
	["62.745", "5,420"],
];

function Book({ up, down }: Palette) {
	return (
		<div className="flex flex-col gap-px text-xs tabular-nums">
			{BOOK.map(([p, s], i) => (
				<div key={p} className="relative flex h-6 items-center justify-between px-2">
					<span
						className="absolute inset-y-0 right-0"
						style={{
							width: `${30 + i * 15}%`,
							backgroundColor: `color-mix(in oklch, ${down} 16%, var(--color-surface))`,
						}}
					/>
					<span className="relative" style={{ color: down }}>
						{p}
					</span>
					<span className="relative text-fg-secondary">{s}</span>
				</div>
			))}
			<div className="flex h-6 items-center justify-between bg-band px-2 text-fg-muted">
				<span>Spread</span>
				<span>0.005</span>
			</div>
			{BOOK.map(([p, s], i) => (
				<div key={p} className="relative flex h-6 items-center justify-between px-2">
					<span
						className="absolute inset-y-0 right-0"
						style={{
							width: `${70 - i * 15}%`,
							backgroundColor: `color-mix(in oklch, ${up} 16%, var(--color-surface))`,
						}}
					/>
					<span className="relative" style={{ color: up }}>
						{(62.74 - i * 0.005).toFixed(3)}
					</span>
					<span className="relative text-fg-secondary">{s}</span>
				</div>
			))}
		</div>
	);
}

export function Preview({ p }: { p: Palette }) {
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_220px_200px] gap-2">
			<div className="rounded-8 bg-surface p-4">
				<Candles {...p} />
			</div>
			<div className="rounded-8 bg-surface p-2">
				<Book {...p} />
			</div>
			<div className="flex flex-col gap-3 rounded-8 bg-surface p-4 text-xs tabular-nums">
				<div className="flex gap-1">
					<span
						className="flex h-8 flex-1 items-center justify-center rounded-6 text-sm font-medium text-fg-inverse"
						style={{ backgroundColor: p.up }}
					>
						Long
					</span>
					<span className="flex h-8 flex-1 items-center justify-center rounded-6 bg-control text-sm font-medium text-fg-secondary">
						Short
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-fg-muted">PNL</span>
					<span style={{ color: p.up }}>+$813.04 (+5.14%)</span>
				</div>
				<div className="flex justify-between">
					<span className="text-fg-muted">PNL</span>
					<span style={{ color: p.down }}>-$41.39 (-1.59%)</span>
				</div>
				<div className="flex justify-between">
					<span className="text-fg-muted">24h</span>
					<span style={{ color: p.down }}>-3.23%</span>
				</div>
				<div className="flex gap-1">
					<span
						className="rounded-xs px-1.5 py-0.5 text-2xs"
						style={{ color: p.up, backgroundColor: `color-mix(in oklch, ${p.up} 16%, var(--color-surface))` }}
					>
						3x
					</span>
					<span
						className="rounded-xs px-1.5 py-0.5 text-2xs"
						style={{ color: p.down, backgroundColor: `color-mix(in oklch, ${p.down} 16%, var(--color-surface))` }}
					>
						3x
					</span>
				</div>
				<div className={cn("mt-auto flex gap-3 text-2xs text-fg-muted")}>
					<span>{p.up}</span>
					<span>{p.down}</span>
				</div>
			</div>
		</div>
	);
}
