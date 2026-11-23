import { MagnifyingGlassIcon, TrophyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	MY_TIER,
	me,
	move,
	pad,
	path,
	pct,
	pnlClass,
	prizeFor,
	roundDates,
	signedUsd,
	type Tier,
	type TierId,
	type Trader,
	tierIds,
	tiers,
	traderName,
	usd,
	usdCompact,
	useTimeLeft,
} from "./data";
import { Jazz, RankMove, Spark } from "./parts";

const css = `
.t2v4-in{animation:t2v4-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t2v4-in{from{opacity:0;transform:scale(.97)}}
`;

const COLS = "grid-cols-[72px_64px_1fr_200px_140px_100px_110px_110px_100px]";

type View = "live" | "past";

export default function V4() {
	const [view, setView] = useState<View>("live");
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const [query, setQuery] = useState("");
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const q = query.trim().toLowerCase();
	const rows = tier.traders.filter((r) => !q || r.address.includes(q) || r.name?.toLowerCase().includes(q));
	return (
		<>
			<style>{css}</style>
			<div className="absolute rounded-xs bg-background px-2 py-1 text-sm text-fg" style={{ left: 662, top: 11 }}>
				Tournament
			</div>
			<div className="absolute inset-x-0 bottom-0 bg-background p-1" style={{ top: 48 }}>
				<div className="flex h-full flex-col rounded-8 bg-surface">
					<div className="flex flex-none items-end gap-5 px-6 pt-5">
						{(["live", "past"] as const).map((v) => (
							<button
								key={v}
								type="button"
								onClick={() => setView(v)}
								className={cn(
									"text-2xl font-semibold transition-colors",
									v === view ? "text-fg" : "text-fg-disabled hover:text-fg-muted",
								)}
							>
								{v === "live" ? "Live round" : "Past rounds"}
							</button>
						))}
						<span className="mb-1.5 ml-auto text-xs text-fg-muted tabular-nums">
							Round 1 ends in {t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s. Pot {usd(tier.pot)} (example).
						</span>
					</div>
					<div className="px-6 pt-1 text-xs text-fg-muted">
						Ranked by dollar PNL. The top 3 at each table split 80% of its pot.
					</div>
					<div className="flex flex-none items-center gap-2 px-6 pt-4 pb-3">
						{tierIds.map((id) => (
							<button
								key={id}
								type="button"
								onClick={() => setTierId(id)}
								className={cn(
									"h-8 rounded-6 px-3 text-xs transition-colors",
									id === tierId ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary hover:bg-control-hover",
								)}
							>
								{tiers[id].label} ({tiers[id].short})
							</button>
						))}
						<label className="ml-auto flex h-8 w-[260px] items-center gap-2 rounded-6 bg-control px-3 text-xs">
							<MagnifyingGlassIcon className="size-4 text-fg-muted" />
							<input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search address"
								className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-muted"
							/>
						</label>
					</div>
					{view === "live" ? (
						<div key={tierId} className="t2v4-in flex min-h-0 flex-1 flex-col">
							<div
								className={cn(
									"grid h-8 flex-none items-center gap-2 px-6 text-2xs tracking-micro text-fg-muted uppercase",
									COLS,
								)}
							>
								<span>Rank</span>
								<span>24h</span>
								<span>Address</span>
								<span>Account value, 30d PNL</span>
								<span className="text-right">Round PNL</span>
								<span className="text-right">ROI</span>
								<span className="text-right">Volume</span>
								<span className="text-right">24h PNL</span>
								<span className="text-right">Prize</span>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto">
								{rows.map((r, i) => (
									<Row key={r.address} r={r} tier={tier} zebra={i % 2 === 0} />
								))}
								{rows.length === 0 && (
									<div className="px-6 py-10 text-center text-xs text-fg-muted">
										No trader in the top {tier.traders.length} matches "{query}".
									</div>
								)}
							</div>
							<div className="flex-none p-2">
								{tierId === MY_TIER ? (
									<div className="rounded-8 bg-control">
										<Row r={me} tier={tier} you />
									</div>
								) : (
									<div className="flex h-10 items-center rounded-8 bg-control px-4 text-xs text-fg-muted">
										You play at the {tiers[MY_TIER].label.toLowerCase()} (account {usd(me.accountValue)}).
									</div>
								)}
							</div>
						</div>
					) : (
						<Past tier={tier} ms={t.ms} />
					)}
				</div>
			</div>
		</>
	);
}

function Coin({ place }: { place: number }) {
	return (
		<span
			className={cn(
				"grid size-5 place-items-center rounded-full text-2xs font-semibold",
				place === 1 && "bg-fill text-fg-inverse",
				place === 2 && "bg-fg-secondary text-fg-inverse",
				place === 3 && "bg-fg-muted text-fg-inverse",
			)}
		>
			{place}
		</span>
	);
}

interface RowProps {
	r: Trader;
	tier: Tier;
	zebra?: boolean;
	you?: boolean;
}

function Row({ r, tier, zebra, you }: RowProps) {
	const prize = prizeFor(tier, r.rank);
	return (
		<div
			className={cn(
				"grid h-10 items-center gap-2 text-xs tabular-nums",
				you ? "px-4" : "px-6",
				zebra && "bg-band",
				COLS,
			)}
		>
			<span className="flex items-center gap-2 text-fg-secondary">
				{r.rank.toLocaleString()}
				{r.rank <= 3 && <Coin place={r.rank} />}
			</span>
			<RankMove value={move(r)} />
			<span className="flex min-w-0 items-center gap-2">
				<Jazz id={r.address} />
				<span className="truncate">{traderName(r)}</span>
				{you && <span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<span className="flex items-center gap-3">
				<span className="w-[84px] text-fg-secondary">{usd(r.accountValue)}</span>
				<Spark values={path(r)} width={64} height={18} />
			</span>
			<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
			<span className={cn("text-right", prize ? "text-fg" : "text-fg-disabled")}>{prize ? usd(prize) : "$0"}</span>
		</div>
	);
}

function Past({ tier, ms }: { tier: Tier; ms: number }) {
	const { end } = roundDates(ms);
	return (
		<div className="t2v4-in flex flex-1 flex-col items-center justify-center gap-2 pb-20 text-center">
			<span className="grid size-12 place-items-center rounded-full bg-control">
				<TrophyIcon className="size-6 text-fg-muted" />
			</span>
			<div className="text-lg font-medium">No past rounds yet</div>
			<div className="max-w-[360px] text-xs text-fg-muted">
				Round 1 is the first round. Its winners and payouts at the {tier.label.toLowerCase()} show here after it ends on{" "}
				{end}.
			</div>
		</div>
	);
}
