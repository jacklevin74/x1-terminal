import { Tabs, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	clock,
	MY_TIER,
	me,
	PAYOUT_SHARE,
	pct,
	placeLabel,
	pnlClass,
	short,
	signedUsd,
	type TierId,
	type Trader,
	tierIds,
	tiers,
	usd,
	usdCompact,
	useTimeLeft,
} from "./data";

const TABS = [
	["balances", "Balances"],
	["positions", "Positions"],
	["orders", "Open Orders"],
	["twap", "TWAP"],
	["history", "Trade History"],
	["funding", "Funding History"],
	["orders-history", "Order History"],
	["tournament", "Tournament"],
] as const;

const COLS = "grid-cols-[52px_1fr_120px_130px_90px_110px]";

export default function V3() {
	const [tab, setTab] = useState<string>("tournament");
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	return (
		<div
			className="absolute flex flex-col overflow-hidden rounded-8 bg-surface"
			style={{ left: 4, top: 660, width: 1154, height: 212 }}
		>
			<Tabs
				value={tab}
				onValueChange={(v) => setTab(String(v))}
				variant="underline"
				className="flex h-full min-h-0 flex-col"
			>
				<div className="flex h-9 shrink-0 items-stretch gap-3 border-b border-stroke-weak px-3">
					<TabsList className="h-full min-w-max border-b-0">
						{TABS.map(([value, label]) => (
							<TabsTrigger key={value} value={value} className="h-full py-0">
								{label}
								{value === "tournament" && <span className="text-fg-muted tabular-nums">{t.d}d</span>}
							</TabsTrigger>
						))}
					</TabsList>
					{tab === "tournament" && (
						<div className="ml-auto flex items-center gap-1 self-center rounded-6 bg-control p-0.5 text-xs">
							{tierIds.map((id) => (
								<button
									key={id}
									type="button"
									onClick={() => setTierId(id)}
									className={cn(
										"h-6 rounded-4 px-2.5 transition-colors",
										id === tierId ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
									)}
								>
									{tiers[id].short}
								</button>
							))}
						</div>
					)}
				</div>
				{tab === "tournament" ? (
					<div className="flex min-h-0 flex-1">
						<div className="flex w-[300px] flex-none flex-col gap-2 border-r border-stroke-weak px-3 py-2.5">
							<div className="flex items-baseline justify-between">
								<span className="text-xs text-fg-muted">Pot so far</span>
								<span className="text-xs text-fg-muted tabular-nums">Ends in {clock(t)}</span>
							</div>
							<span className="text-lg font-semibold tabular-nums">{usd(tier.pot)}</span>
							<div className="flex flex-col gap-1">
								{tier.payouts.map((p, i) => (
									<div key={placeLabel[i]} className="flex items-center justify-between text-xs tabular-nums">
										<span className="text-fg-muted">{placeLabel[i]}</span>
										<span>{usd(p)}</span>
									</div>
								))}
							</div>
							<span className="text-2xs text-fg-muted">Top 3 share {PAYOUT_SHARE * 100}% of the pot.</span>
						</div>
						<div className="flex min-w-0 flex-1 flex-col">
							<div
								className={cn(
									"grid h-6 flex-none items-center gap-3 px-3 text-2xs tracking-micro text-fg-muted uppercase",
									COLS,
								)}
							>
								<span>Rank</span>
								<span>Trader</span>
								<span className="text-right">Account</span>
								<span className="text-right">Round PNL</span>
								<span className="text-right">ROI</span>
								<span className="text-right">Payout</span>
							</div>
							{tierId === MY_TIER ? (
								<Line r={me} payout={null} you />
							) : (
								<div className="flex h-7 flex-none items-center bg-control px-3 text-xs text-fg-muted">
									You play at the {tiers[MY_TIER].label.toLowerCase()}.
								</div>
							)}
							<div className="min-h-0 flex-1 overflow-y-auto">
								{tier.traders.map((r, i) => (
									<Line key={r.address} r={r} payout={i < 3 ? tier.payouts[i] : null} />
								))}
							</div>
						</div>
					</div>
				) : (
					<div className="grid flex-1 place-items-center text-xs text-fg-muted">
						Connect your wallet to view this tab.
					</div>
				)}
			</Tabs>
		</div>
	);
}

function Line({ r, payout, you }: { r: Trader; payout: number | null; you?: boolean }) {
	return (
		<div className={cn("grid h-7 flex-none items-center gap-3 px-3 text-xs tabular-nums", COLS, you && "bg-control")}>
			<span className={cn(r.rank <= 3 ? "text-fg" : "text-fg-muted")}>{r.rank.toLocaleString()}</span>
			<span className="flex items-center gap-2">
				{short(r.address)}
				{you && <span className="text-fg-muted">You</span>}
			</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.accountValue)}</span>
			<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right">{payout === null ? <span className="text-fg-disabled">-</span> : usd(payout)}</span>
		</div>
	);
}
