import type { ReactNode } from "react";
import {
	path,
	pnlClass,
	prizeFor,
	signedUsd,
	type Tier,
	traderName,
	usd,
	usdCompact,
} from "@/components/tournament/data";
import { Identicon, Spark } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st", "2nd", "3rd"];

function Row({ label, children, band }: { label: string; children: ReactNode; band?: boolean }) {
	return (
		<div
			className={cn(
				"grid h-12 grid-cols-[180px_repeat(3,minmax(0,1fr))] items-center gap-6 rounded-6 px-4",
				band && "bg-band",
			)}
		>
			<span className="text-xs text-fg-muted">{label}</span>
			{children}
		</div>
	);
}

export function TopThree({ tier, className }: Props) {
	const top = tier.traders.slice(0, 3);
	return (
		<section className={cn("flex flex-col rounded-8 bg-surface p-3", className)}>
			<div className="grid grid-cols-[180px_repeat(3,minmax(0,1fr))] items-center gap-6 px-4 py-4">
				<span className="text-sm">Top 3</span>
				{top.map((r) => (
					<div key={r.address} className="flex items-center gap-3">
						<Identicon id={r.address} className="size-9 rounded-4" />
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="truncate text-sm">{traderName(r)}</span>
							<span className={cn("text-xs", r.rank === 1 ? "text-fg" : "text-fg-muted")}>{PLACE[r.rank - 1]}</span>
						</div>
					</div>
				))}
			</div>
			<Row label="Round PNL" band>
				{top.map((r) => (
					<span key={r.address} className={cn("text-lg font-semibold tabular-nums", pnlClass(r.pnl))}>
						{signedUsd(r.pnl)}
					</span>
				))}
			</Row>
			<Row label="Prize">
				{top.map((r) => (
					<span key={r.address} className="text-sm font-medium text-fg tabular-nums">
						{usd(prizeFor(tier, r.rank))}
					</span>
				))}
			</Row>
			<Row label="Account value" band>
				{top.map((r) => (
					<span key={r.address} className="text-sm text-fg-secondary tabular-nums">
						{usdCompact(r.accountValue)}
					</span>
				))}
			</Row>
			<Row label="24h PNL">
				{top.map((r) => (
					<span key={r.address} className={cn("text-sm tabular-nums", pnlClass(r.dayPnl))}>
						{signedUsd(r.dayPnl, true)}
					</span>
				))}
			</Row>
			<Row label="30 days" band>
				{top.map((r) => (
					<Spark key={r.address} values={path(r)} width={120} height={24} />
				))}
			</Row>
		</section>
	);
}
