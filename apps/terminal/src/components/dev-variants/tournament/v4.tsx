import { MedalIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	MY_TIER,
	me,
	PAYOUT_SHARE,
	pad,
	placeLabel,
	pnlClass,
	short,
	signedUsd,
	type TierId,
	tierIds,
	tiers,
	traderName,
	usd,
	usdCompact,
	useTimeLeft,
} from "./data";

const css = `
.t4-drawer{animation:t4-in .2s cubic-bezier(.2,.8,.2,1);transform-origin:top right}
@keyframes t4-in{from{opacity:0;transform:scale(.97)}}
`;

export default function V4() {
	const [open, setOpen] = useState(true);
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const mine = tierId === MY_TIER;
	return (
		<>
			<style>{css}</style>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className={cn(
					"absolute flex items-center gap-2.5 rounded-xs px-2 py-1 hover:bg-fill-hover",
					open && "bg-fill-hover",
				)}
				style={{ left: 712, top: 90 }}
			>
				<span className="grid size-7 place-items-center rounded-full bg-control">
					<MedalIcon className="size-4" />
				</span>
				<span className="text-left">
					<span className="block text-2xs tracking-micro text-fg-muted uppercase">Tournament</span>
					<span className="block text-xs tabular-nums">
						{usdCompact(tiers[MY_TIER].pot)} <span className="text-fg-muted">#{me.rank.toLocaleString()}</span>
					</span>
				</span>
			</button>
			{open && (
				<div
					className="t4-drawer absolute flex w-[400px] flex-col rounded-8 bg-overlay shadow-menu"
					style={{ right: 4, top: 136, bottom: 28 }}
				>
					<div className="flex h-12 flex-none items-center gap-3 px-4">
						<span className="flex-1 text-sm font-medium">Tournament</span>
						<button
							type="button"
							onClick={() => setOpen(false)}
							aria-label="Close"
							className="grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-fill-hover hover:text-fg"
						>
							<XIcon className="size-4" />
						</button>
					</div>
					<div className="px-4">
						<div className="grid grid-cols-2 rounded-8 bg-control p-1 text-xs">
							{tierIds.map((id) => (
								<button
									key={id}
									type="button"
									onClick={() => setTierId(id)}
									className={cn(
										"h-8 rounded-6 transition-colors",
										id === tierId ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
									)}
								>
									{tiers[id].rule}
								</button>
							))}
						</div>
						<div className="mt-4 flex items-end justify-between">
							<div>
								<div className="text-xs text-fg-muted">Pot so far</div>
								<div className="text-xl font-semibold tabular-nums">{usd(tier.pot)}</div>
							</div>
							<div className="text-right">
								<div className="text-xs text-fg-muted">Ends in</div>
								<div className="flex gap-1 text-sm tabular-nums">
									<Unit v={t.d} u="d" />
									<Unit v={t.h} u="h" />
									<Unit v={t.m} u="m" />
									<Unit v={t.s} u="s" />
								</div>
							</div>
						</div>
						<div className="mt-3 h-1 overflow-hidden rounded-full bg-control">
							<div className="h-full rounded-full bg-fill" style={{ width: `${t.progress * 100}%` }} />
						</div>
						<div className="mt-4 text-2xs tracking-micro text-fg-muted uppercase">
							Top 3 share {PAYOUT_SHARE * 100}%
						</div>
						<div className="mt-2 flex flex-col gap-1">
							{tier.traders.slice(0, 3).map((r, i) => (
								<div
									key={r.address}
									className="flex h-11 items-center gap-3 rounded-8 bg-control px-3 text-xs tabular-nums"
								>
									<span
										className={cn(
											"grid size-6 place-items-center rounded-full text-2xs font-semibold",
											i === 0 ? "bg-fill text-fg-inverse" : "bg-control-hover",
										)}
									>
										{i + 1}
									</span>
									<span className="flex min-w-0 flex-1 flex-col">
										<span>{traderName(r)}</span>
										<span className={pnlClass(r.pnl)}>{signedUsd(r.pnl)}</span>
									</span>
									<span className="flex flex-col items-end">
										<span className="text-fg-muted">{placeLabel[i]} wins</span>
										<span>{usd(tier.payouts[i])}</span>
									</span>
								</div>
							))}
						</div>
					</div>
					<div className="mt-3 min-h-0 flex-1 overflow-y-auto px-4">
						{tier.traders.slice(3).map((r) => (
							<div
								key={r.address}
								className="flex h-8 items-center gap-3 border-b border-stroke-faint text-xs tabular-nums last:border-b-0"
							>
								<span className="w-8 text-fg-muted">{r.rank}</span>
								<span className="flex-1 text-fg-secondary">{short(r.address)}</span>
								<span className={pnlClass(r.pnl)}>{signedUsd(r.pnl)}</span>
							</div>
						))}
					</div>
					<div className="flex-none p-3">
						<div className="flex h-12 items-center gap-3 rounded-8 bg-control px-3 text-xs tabular-nums">
							{mine ? (
								<>
									<span className="w-12 text-fg">#{me.rank.toLocaleString()}</span>
									<span className="flex flex-1 flex-col">
										<span>You ({short(me.address)})</span>
										<span className="text-fg-muted">
											Rank {me.rank.toLocaleString()} of {tier.count.toLocaleString()}
										</span>
									</span>
									<span className={pnlClass(me.pnl)}>{signedUsd(me.pnl)}</span>
								</>
							) : (
								<span className="text-fg-muted">
									You play at the {tiers[MY_TIER].label.toLowerCase()} (account {usd(me.accountValue)}).
								</span>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}

function Unit({ v, u }: { v: number; u: string }) {
	return (
		<span>
			{pad(v)}
			<span className="text-fg-muted">{u}</span>
		</span>
	);
}
