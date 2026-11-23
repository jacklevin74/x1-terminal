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
import { Line } from "./line";

interface Props {
	tier: Tier;
	className?: string;
}

const UP = "var(--color-market-up)";

export function TopThree({ tier, className }: Props) {
	const [first, ...rest] = tier.traders.slice(0, 3);
	return (
		<section className={cn("grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2", className)}>
			<article className="relative isolate flex flex-col overflow-hidden rounded-8 bg-surface p-6">
				<Glow />
				<div className="flex items-center gap-3">
					<Identicon id={first.address} className="size-9 rounded-4" />
					<div className="flex flex-col gap-0.5">
						<span className="text-sm">{traderName(first)}</span>
						<span className="text-xs text-fg-muted tabular-nums">Leader, account {usdCompact(first.accountValue)}</span>
					</div>
					<span className="ml-auto text-xs text-fg-muted tabular-nums">
						24h <span className={pnlClass(first.dayPnl)}>{signedUsd(first.dayPnl, true)}</span>
					</span>
				</div>
				<div className="mt-10 flex items-end justify-between gap-8">
					<div className="flex flex-col gap-2">
						<span
							className={cn("text-5xl leading-none font-semibold tracking-tight tabular-nums", pnlClass(first.pnl))}
						>
							{signedUsd(first.pnl)}
						</span>
						<span className="text-sm text-fg-muted tabular-nums">
							Wins <span className="text-fg">{usd(prizeFor(tier, 1))}</span>
						</span>
					</div>
				</div>
				<div className="mt-8">
					<Line values={path(first)} height={96} stroke={UP} />
				</div>
			</article>
			<div className="flex flex-col gap-2">
				{rest.map((r) => (
					<Side key={r.address} r={r} tier={tier} />
				))}
			</div>
		</section>
	);
}

function Glow() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[260px]"
			style={{ opacity: 0.55 }}
		>
			<div className="absolute inset-0" style={{ filter: "blur(56px)", mixBlendMode: "screen" }}>
				<span
					className="absolute -top-[120px] left-1/2 h-[200px] w-[640px] -translate-x-1/2 rounded-[50%]"
					style={{ backgroundColor: `color-mix(in oklch, ${UP} 45%, var(--color-background))` }}
				/>
				<span
					className="absolute -top-[90px] left-[46%] h-[130px] w-[380px] -translate-x-1/2 rounded-[50%]"
					style={{ backgroundColor: UP }}
				/>
				<span
					className="absolute -top-[60px] left-[44%] h-[60px] w-[160px] -translate-x-1/2 rounded-[50%]"
					style={{ backgroundColor: `color-mix(in oklch, ${UP} 45%, var(--color-fg))` }}
				/>
			</div>
			<span
				className="absolute inset-x-0 top-0 h-px"
				style={{
					background: `linear-gradient(90deg, transparent, color-mix(in oklch, ${UP} 50%, var(--color-fg)), transparent)`,
				}}
			/>
		</div>
	);
}

function Side({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex flex-1 items-center gap-5 rounded-8 bg-surface p-5">
			<span className="text-lg font-semibold text-fg-muted tabular-nums">{r.rank}</span>
			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<div className="flex items-center gap-2">
					<Identicon id={r.address} className="size-6 rounded-4" />
					<span className="truncate text-sm">{traderName(r)}</span>
				</div>
				<span className={cn("text-2xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
					{signedUsd(r.pnl)}
				</span>
				<span className="text-xs text-fg-muted tabular-nums">
					Wins <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
					<span className="ml-3">Account</span> {usdCompact(r.accountValue)}
					<span className="ml-3">24h</span> <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
				</span>
			</div>
			<Line values={path(r)} height={56} width={150} stroke={UP} />
		</article>
	);
}
