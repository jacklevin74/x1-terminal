import { TrophyIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	MY_TIER,
	me,
	move,
	pad,
	pnlClass,
	roundDates,
	signedUsd,
	type TierId,
	type Trader,
	tierIds,
	tiers,
	traderName,
	usd,
	usdCompact,
	useTimeLeft,
} from "./data";
import { Blob, RankMove } from "./parts";

const css = `
.t2v5-drawer{animation:t2v5-drawer .28s cubic-bezier(.2,.8,.2,1)}
@keyframes t2v5-drawer{from{opacity:0;transform:translateX(24px) scale(.97)}}
.t2v5-sheet{animation:t2v5-sheet .28s cubic-bezier(.2,.8,.2,1)}
@keyframes t2v5-sheet{from{opacity:0;transform:translateY(24px) scale(.97)}}
.t2v5-in{animation:t2v5-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t2v5-in{from{opacity:0;transform:scale(.97)}}
`;

function stamp(d: Date) {
	return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export default function V5() {
	return (
		<>
			<style>{css}</style>
			<div className="absolute inset-0 bg-scrim" />
			<div className="t2v5-drawer absolute top-1 right-1 bottom-1 flex w-[420px] flex-col overflow-hidden rounded-8 bg-overlay shadow-menu">
				<Board />
			</div>
		</>
	);
}

function Board({ compact }: { compact?: boolean }) {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const { startDate, endDate } = roundDates(t.ms);
	return (
		<>
			<div className="flex-none px-4 pt-4">
				<div className="flex items-center gap-2">
					<TrophyIcon weight="fill" className="size-5 text-fg" />
					<span className="text-base font-semibold">Weekly tournament</span>
					<button type="button" className="ml-auto grid size-8 place-items-center rounded-6 hover:bg-control">
						<XIcon className="size-4 text-fg-muted" />
					</button>
				</div>
				<div className="mt-1 text-xs text-fg-muted tabular-nums">
					Round 1 runs from {stamp(startDate)} to {stamp(endDate)} (UTC)
				</div>
				<div className="mt-3 flex gap-1 rounded-8 bg-control p-1 text-xs">
					{tierIds.map((id) => (
						<button
							key={id}
							type="button"
							onClick={() => setTierId(id)}
							className={cn(
								"h-8 flex-1 rounded-6 transition-colors",
								id === tierId ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
							)}
						>
							{tiers[id].label} ({tiers[id].short})
						</button>
					))}
				</div>
			</div>
			<div key={tierId} className="t2v5-in flex min-h-0 flex-1 flex-col">
				<div className={cn("grid flex-none grid-cols-3 gap-2 px-4 pt-3", compact && "gap-1.5")}>
					<Stat label="Pot (example)" value={usd(tier.pot)} />
					<Stat label="1st wins" value={usdCompact(tier.payouts[0])} />
					<Stat label="Ends in" value={`${t.d}d ${pad(t.h)}h ${pad(t.m)}m`} />
				</div>
				<div className="mx-4 mt-3 flex-none">
					{tierId === MY_TIER ? (
						<div className="rounded-8 bg-control-hover">
							<Line r={me} you />
						</div>
					) : (
						<div className="rounded-8 bg-control px-3 py-2.5 text-xs text-fg-muted">
							You play at the {tiers[MY_TIER].label.toLowerCase()} (account {usd(me.accountValue)}).
						</div>
					)}
				</div>
				<div className="flex flex-none items-center justify-between px-4 pt-3 pb-1 text-xs text-fg-muted">
					<span>Top traders by round PNL</span>
					<span className="tabular-nums">{tier.count.toLocaleString()} playing</span>
				</div>
				<div className="mx-2 min-h-0 flex-1 overflow-y-auto">
					{tier.traders.map((r) => (
						<Line key={r.address} r={r} />
					))}
				</div>
				<div className="flex-none p-4 pt-3">
					<button type="button" className="h-11 w-full rounded-8 bg-fill text-sm font-medium text-fg-inverse">
						Trade to climb
					</button>
				</div>
			</div>
		</>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-8 bg-control px-3 py-2">
			<div className="text-xs text-fg-muted">{label}</div>
			<div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
		</div>
	);
}

function Line({ r, you }: { r: Trader; you?: boolean }) {
	const top = r.rank <= 3;
	return (
		<div className="flex h-12 items-center gap-3 rounded-6 px-2 text-xs tabular-nums hover:bg-control">
			<span className="grid w-9 shrink-0 place-items-center">
				<span
					className={cn(
						"grid h-6 min-w-6 place-items-center rounded-full text-xs",
						top && r.rank === 1 && "bg-fill font-semibold text-fg-inverse",
						top && r.rank > 1 && "bg-control-hover font-semibold text-fg",
						!top && "text-fg-muted",
					)}
				>
					{r.rank.toLocaleString()}
				</span>
			</span>
			<Blob id={r.address} className="size-7" />
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5">
					<span className="truncate text-sm">{traderName(r)}</span>
					{you && <span className="rounded-full bg-fill px-1.5 text-2xs font-medium text-fg-inverse">You</span>}
				</span>
				<span className="flex items-center gap-1.5 text-fg-muted">
					<RankMove value={move(r)} zero="Same rank" className={move(r) === 0 ? "text-fg-muted" : undefined} />
					<span>in 24h</span>
				</span>
			</span>
			<span className={cn("text-right text-sm", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
		</div>
	);
}

export function V5Mobile() {
	return (
		<div
			className="dark relative h-dvh overflow-hidden bg-background font-sans text-fg"
			style={{ backgroundImage: "url(/dev-refs/tournament-2/trade-mobile.png)", backgroundSize: "390px 844px" }}
		>
			<style>{css}</style>
			<div className="absolute inset-0 bg-scrim" />
			<div className="t2v5-sheet absolute inset-x-0 bottom-0 flex h-[88%] flex-col overflow-hidden rounded-t-16 bg-overlay shadow-menu">
				<div className="mx-auto mt-2 h-1 w-9 flex-none rounded-full bg-control-hover" />
				<Board compact />
			</div>
		</div>
	);
}
