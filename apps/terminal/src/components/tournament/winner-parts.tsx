// Shared parts for the winner-cards round.
// assets.json is real: api.hyperliquid.xyz userFillsByTime (30d, per trader), allMids,
// candleSnapshot 12h closes, portfolio pnlHistory (month). See assets.json "note".
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
	pad,
	signedUsd,
	type Tier,
	type Trader,
	traderName,
	usd,
	usdCompact,
	usdc,
	useTimeLeft,
} from "@/components/tournament/data";
import { Identicon } from "@/components/tournament/parts";
import { Spark } from "@/components/ui/spark";
import { cn } from "@/lib/cn";
import raw from "./winner-assets.json";

export interface AssetRow {
	coin: string;
	vlm: number;
	pnl: number;
	trades: number;
	long: number;
}

const data = raw as unknown as {
	traders: Record<string, AssetRow[]>;
	coins: Record<string, { price: number | null; closes: number[] }>;
	pnl: Record<string, { month: number[]; week: number[]; av: number }>;
};

export const assetsOf = (t: Trader) => data.traders[t.address] ?? [];
export const pnlPathOf = (t: Trader) => data.pnl[t.address]?.month ?? [0, t.pnl];

export const NAMES: Record<string, string> = {
	BTC: "Bitcoin",
	ETH: "Ethereum",
	HYPE: "Hyperliquid",
	ZEC: "Zcash",
	SOL: "Solana",
	NEAR: "NEAR Protocol",
	"xyz:GOLD": "Gold",
	"xyz:SILVER": "Silver",
	"xyz:CL": "WTI crude oil",
	"xyz:BRENTOIL": "Brent crude oil",
	"xyz:NATGAS": "Natural gas",
};

export const ticker = (c: string) => c.replace(/^xyz:/, "");

export const PLACE = ["1st place", "2nd place", "3rd place"];

export const price = (n: number | null) => {
	if (n == null) return "n/a";
	if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
	if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
	return `$${n.toPrecision(4)}`;
};

export const usdCents = (n: number) =>
	`${n > 0 ? "+" : n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const svgId = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");

// ---------------------------------------------------------------- coin icon

export function CoinIcon({ coin, className }: { coin: string; className?: string }) {
	const [failed, setFailed] = useState(false);
	if (failed)
		return (
			<span
				className={cn(
					"grid size-5 shrink-0 place-items-center rounded-full bg-white text-2xs font-semibold text-fg-inverse",
					className,
				)}
			>
				{ticker(coin).slice(0, 2)}
			</span>
		);
	return (
		<span className={cn("block size-5 shrink-0 overflow-hidden rounded-full bg-white", className)}>
			<img
				src={`https://app.hyperliquid.xyz/coins/${coin}.svg`}
				alt=""
				onError={() => setFailed(true)}
				className="size-full object-cover"
			/>
		</span>
	);
}

// ---------------------------------------------------------------- price sparkline (neutral, straight, draws in)

export function PriceSpark({ values, width, height }: { values: number[]; width: number; height: number }) {
	return <Spark values={values} width={width} height={height} baseline={values[0]} grid />;
}

// ---------------------------------------------------------------- asset hover card

export function AssetCard({ a, total }: { a: AssetRow; total: number }) {
	const c = data.coins[a.coin];
	return (
		<div className="flex flex-col">
			<div className="flex items-center gap-3 p-4">
				<CoinIcon coin={a.coin} className="size-10" />
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="text-base font-semibold">{ticker(a.coin)}</span>
					<span className="truncate text-sm text-fg-muted">{NAMES[a.coin] ?? ticker(a.coin)}</span>
				</div>
				<PriceSpark values={c?.closes ?? []} width={112} height={40} />
			</div>
			<div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-sunken p-4">
				<Stat label="Price" value={price(c?.price ?? null)} />
				<Stat label="Trader volume" value={usdCompact(a.vlm)} />
				<Stat label="Closed PNL" value={signedUsd(a.pnl, true)} tone={a.pnl} />
				<Stat label="Fills" value={a.trades.toLocaleString()} />
				<div className="col-span-2 flex flex-col gap-1.5">
					<div className="flex justify-between text-xs text-fg-muted">
						<span>{Math.round((a.vlm / total) * 100)}% of their volume</span>
						<span>{Math.round(a.long * 100)}% buys</span>
					</div>
					<div className="h-1 overflow-hidden rounded-full bg-fill-weak">
						<div className="h-full rounded-full bg-fg" style={{ width: `${Math.max(2, (a.vlm / total) * 100)}%` }} />
					</div>
				</div>
			</div>
		</div>
	);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span
				className={cn(
					"text-sm font-semibold tabular-nums",
					tone != null && (tone >= 0 ? "text-market-up" : "text-market-down"),
				)}
			>
				{value}
			</span>
			<span className="text-xs text-fg-muted">{label}</span>
		</div>
	);
}

export function AssetHover({ a, total, children }: { a: AssetRow; total: number; children: ReactNode }) {
	return (
		<PopoverPrimitive.Root>
			<PopoverPrimitive.Trigger
				openOnHover
				delay={60}
				closeDelay={80}
				nativeButton={false}
				render={<span />}
				className="inline-flex cursor-default"
				aria-label={`${ticker(a.coin)} volume`}
			>
				{children}
			</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Positioner side="top" align="start" sideOffset={10} collisionPadding={12} className="z-50">
					<PopoverPrimitive.Popup
						className={cn(
							"w-80 overflow-hidden rounded-12 bg-overlay font-sans text-fg shadow-menu outline-hidden",
							"origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-out",
							"data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0",
						)}
					>
						<AssetCard a={a} total={total} />
					</PopoverPrimitive.Popup>
				</PopoverPrimitive.Positioner>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}

/** Overlapping icon stack, each icon opens the hover card. */
export function AssetStack({
	t,
	size = "size-5",
	ring = "ring-surface",
	max = 6,
}: {
	t: Trader;
	size?: string;
	ring?: string;
	max?: number;
}) {
	const rows = assetsOf(t);
	const total = rows.reduce((s, r) => s + r.vlm, 0);
	return (
		<span className="flex items-center">
			{rows.slice(0, max).map((a, i) => (
				<AssetHover key={a.coin} a={a} total={total}>
					<CoinIcon
						coin={a.coin}
						className={cn(
							size,
							"ring-2 transition-transform duration-150 ease-out hover:-translate-y-0.5",
							ring,
							i > 0 && "-ml-1",
						)}
					/>
				</AssetHover>
			))}
		</span>
	);
}

// ---------------------------------------------------------------- PNL area chart (straight segments, hatched, draws in)

export function PnlArea({
	t,
	height,
	className,
	grid = true,
	ink = "var(--color-stroke-weak)",
}: {
	t: Trader;
	height: number;
	className?: string;
	grid?: boolean;
	ink?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [w, setW] = useState(0);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const o = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
		o.observe(el);
		return () => o.disconnect();
	}, []);
	return (
		<div ref={ref} className={cn("w-full", className)} style={{ height }}>
			{w > 0 && <Spark values={pnlPathOf(t)} width={w} height={height} grid={grid} ink={ink} />}
		</div>
	);
}

// ---------------------------------------------------------------- laurel rank

const MEDAL = [
	"var(--color-yellow)",
	"color-mix(in oklch, var(--color-grey-solid-0) 72%, var(--color-grey-solid-800))",
	"color-mix(in oklch, var(--color-yellow) 55%, var(--color-market-down))",
];

const NUDGE = [-2, -0.9, -1];

export function Laurel({ rank, size = 64 }: { rank: number; size?: number }) {
	const color = MEDAL[rank - 1];
	const leaves: { x: number; y: number; rot: number; k: string }[] = [];
	for (let i = 0; i < 6; i++) {
		const deg = 252 - i * 20;
		const a = (deg * Math.PI) / 180;
		const sx = 32 + Math.cos(a) * 18;
		const sy = 33 - Math.sin(a) * 18;
		const tan = 180 - deg;
		const ox = Math.cos(a) * 4;
		const oy = -Math.sin(a) * 4;
		leaves.push({ x: sx + ox, y: sy + oy, rot: tan - 38, k: `o${i}` });
		if (i < 5) leaves.push({ x: sx - ox * 0.7, y: sy - oy * 0.7, rot: tan + 34, k: `i${i}` });
	}
	return (
		<svg width={size} height={size} viewBox="0 4.5 64 64" role="img" aria-label={PLACE[rank - 1]}>
			{[1, -1].map((side) => (
				<g key={side} transform={side < 0 ? "translate(64 0) scale(-1 1)" : undefined}>
					<path d="M27.5 51 A 18 18 0 0 1 15 25" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
					{leaves.map((l) => (
						<path
							key={l.k}
							d="M0 -5.5 C 2.6 -2.5, 2.6 2.5, 0 5.5 C -2.6 2.5, -2.6 -2.5, 0 -5.5 Z"
							fill={color}
							transform={`translate(${l.x.toFixed(2)} ${l.y.toFixed(2)}) rotate(${l.rot})`}
						/>
					))}
				</g>
			))}
			<text
				x={31.6 + NUDGE[rank - 1]}
				y="34"
				textAnchor="middle"
				dominantBaseline="central"
				fontSize="18"
				fontStyle="italic"
				fontWeight="500"
				fill={color}
			>
				{rank}
			</text>
		</svg>
	);
}

// ---------------------------------------------------------------- avatar, links

export function Avatar({ t, className }: { t: Trader; className?: string }) {
	return (
		<span className={cn("grid size-14 shrink-0 place-items-center rounded-12 bg-control", className)}>
			<Identicon id={t.address} className="size-8 rounded-8" />
		</span>
	);
}

export function TraderLink({ t, className, children }: { t: Trader; className?: string; children?: ReactNode }) {
	return (
		<Link to="/tournament/$address" params={{ address: t.address }} className={cn("hover:underline", className)}>
			{children ?? traderName(t)}
		</Link>
	);
}

export { usd, usdc, usdCompact, signedUsd, traderName };

// ---------------------------------------------------------------- white prize banner

export type PatternKind =
	| "hatch"
	| "rings"
	| "cross"
	| "contour"
	| "steps"
	| "dots"
	| "chevron"
	| "grid"
	| "diamond"
	| "squares";

const INK = "color-mix(in oklch, var(--color-grey-solid-1000) 13%, var(--color-white))";

export function BannerPattern({ kind, className }: { kind: PatternKind; className?: string }) {
	const id = svgId(useId());
	const mask = "linear-gradient(90deg, transparent, black 55%)";
	let body: ReactNode = null;
	if (kind === "hatch")
		body = (
			<>
				<defs>
					<pattern id={`p${id}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
						<line x1="0" y1="0" x2="0" y2="10" stroke={INK} strokeWidth="2" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill={`url(#p${id})`} />
			</>
		);
	if (kind === "rings")
		body = (
			<g fill="none" stroke={INK} strokeWidth="1.5">
				{Array.from({ length: 14 }, (_, i) => (
					<circle key={`r${24 + i * 22}`} cx="100%" cy="100%" r={24 + i * 22} />
				))}
			</g>
		);
	if (kind === "cross")
		body = (
			<>
				<defs>
					<pattern id={`p${id}`} width="24" height="24" patternUnits="userSpaceOnUse">
						<path d="M12 7 V17 M7 12 H17" stroke={INK} strokeWidth="1.5" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill={`url(#p${id})`} />
			</>
		);
	if (kind === "contour")
		body = (
			<g fill="none" stroke={INK} strokeWidth="1.5">
				{Array.from({ length: 12 }, (_, i) => {
					const yy = 10 + i * 14;
					return (
						<path
							key={`c${yy}`}
							d={`M0 ${yy} C 80 ${yy - 18 - i}, 160 ${yy + 22}, 240 ${yy} S 400 ${yy - 20}, 480 ${yy + 4} S 620 ${yy + 16}, 700 ${yy - 6}`}
						/>
					);
				})}
			</g>
		);
	if (kind === "steps")
		body = (
			<g fill={INK}>
				{Array.from({ length: 22 }, (_, i) => {
					const h = 14 + (i / 21) ** 2.2 * 150 + ((i * 37) % 11);
					return <rect key={`s${i * 22}`} x={i * 22} y={180 - h} width={14} height={h} rx={2} />;
				})}
			</g>
		);
	if (kind === "dots")
		body = (
			<>
				<defs>
					<pattern id={`p${id}`} width="12" height="12" patternUnits="userSpaceOnUse">
						<circle cx="6" cy="6" r="1.6" fill={INK} />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill={`url(#p${id})`} />
			</>
		);
	if (kind === "chevron")
		body = (
			<>
				<defs>
					<pattern id={`p${id}`} width="28" height="16" patternUnits="userSpaceOnUse">
						<path d="M0 12 L14 4 L28 12" fill="none" stroke={INK} strokeWidth="1.5" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill={`url(#p${id})`} />
			</>
		);
	if (kind === "grid")
		body = (
			<>
				<defs>
					<pattern id={`p${id}`} width="22" height="22" patternUnits="userSpaceOnUse">
						<path d="M22 0 V22 M0 22 H22" fill="none" stroke={INK} strokeWidth="1" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill={`url(#p${id})`} />
			</>
		);
	if (kind === "diamond")
		body = (
			<>
				<defs>
					<pattern id={`p${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
						<path d="M10 4 L16 10 L10 16 L4 10 Z" fill={INK} />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill={`url(#p${id})`} />
			</>
		);
	if (kind === "squares")
		body = (
			<svg x="100%" y="100%" overflow="visible" aria-hidden="true">
				<g fill="none" stroke={INK} strokeWidth="1.5">
					{Array.from({ length: 12 }, (_, i) => {
						const r = 14 + i * 15;
						return <rect key={`q${r}`} x={-r} y={-r} width={r * 2} height={r * 2} rx={r * 0.28} />;
					})}
				</g>
			</svg>
		);
	return (
		<div
			aria-hidden="true"
			className={cn("pointer-events-none absolute inset-y-0 right-0 w-1/2", className)}
			style={{ maskImage: mask, WebkitMaskImage: mask }}
		>
			<svg
				aria-hidden="true"
				className="size-full"
				preserveAspectRatio={kind === "steps" ? "xMaxYMax meet" : "none"}
				viewBox={kind === "steps" ? "0 0 480 180" : undefined}
			>
				{body}
			</svg>
		</div>
	);
}

export function Countdown({ className, dark = true }: { className?: string; dark?: boolean }) {
	const t = useTimeLeft();
	const u = dark ? "text-fg-inverse-muted" : "text-fg-muted";
	return (
		<span
			className={cn(
				"flex items-baseline gap-1 text-xl leading-none font-semibold tracking-tight tabular-nums",
				className,
			)}
		>
			{t.d}
			<span className={cn("text-sm font-medium", u)}>d</span>
			<span className="ml-1.5">{pad(t.h)}</span>
			<span className={cn("text-sm font-medium", u)}>h</span>
			<span className="ml-1.5">{pad(t.m)}</span>
			<span className={cn("text-sm font-medium", u)}>m</span>
			<span className="ml-1.5">{pad(t.s)}</span>
			<span className={cn("text-sm font-medium", u)}>s</span>
		</span>
	);
}

/** White prize pool banner: black type on white, grey pattern on the right. */
export function PrizeBanner({
	tier,
	pattern,
	className,
	patternClass,
}: {
	tier: Tier;
	pattern: PatternKind;
	className?: string;
	patternClass?: string;
}) {
	return (
		<div
			className={cn(
				"relative isolate flex items-center justify-between overflow-hidden bg-white px-8 py-7 text-fg-inverse",
				className,
			)}
		>
			<BannerPattern kind={pattern} className={cn("-z-10", patternClass)} />
			<div className="flex flex-col gap-2">
				<span className="text-sm text-fg-inverse-muted">Round 1 prize pool</span>
				<span className="flex items-baseline gap-2 text-3xl leading-none font-semibold tracking-tight tabular-nums">
					{usd(tier.pot)}
				</span>
			</div>
			<Countdown className="self-end" />
		</div>
	);
}

export function Prize({ tier, rank, className }: { tier: Tier; rank: number; className?: string }) {
	return (
		<span className={cn("flex items-baseline gap-1 tabular-nums", className)}>
			<span className="font-semibold">{usd(tier.payouts[rank - 1])}</span>
		</span>
	);
}
