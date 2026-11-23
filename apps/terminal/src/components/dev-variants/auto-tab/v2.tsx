import { CheckIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { ACT_LABEL, CHECKS, ROWS, STATUS, signed, usd } from "./data";
import { StatusDot, StopMeter } from "./parts";
import { OrdersTable } from "./v1";

function Line({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-fg-muted">{label}</span>
			<span className="tabular-nums">{children}</span>
		</div>
	);
}

export default function V2() {
	return (
		<div className="grid h-full grid-cols-[260px_1fr] text-xs">
			<aside className="flex flex-col gap-4 border-r border-stroke-weak px-3 py-3">
				<div className="flex flex-col gap-1">
					<span className="inline-flex items-center gap-1.5 text-sm font-medium">
						<StatusDot />
						{STATUS.phase}
					</span>
					<span className="text-fg-muted">{STATUS.note}</span>
				</div>
				<div className="flex flex-col gap-2">
					<Line label="Last cycle">{STATUS.lastCycle}</Line>
					<Line label="Next cycle">{STATUS.nextCycle}</Line>
					<Line label="Account equity">{STATUS.equity}</Line>
					<Line label="Account day PNL">{STATUS.dayPnl}</Line>
					<Line label="Loss stop used">
						<StopMeter />
					</Line>
					<Line label="Trading key">
						{STATUS.key} <span className="text-fg-muted">to {STATUS.expires}</span>
					</Line>
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-2xs tracking-micro text-fg-muted uppercase">Checks</span>
					{CHECKS.map((c) => (
						<span key={c.label} className="flex items-center gap-2">
							<CheckIcon weight="bold" className="size-3 text-market-up" />
							{c.label}
						</span>
					))}
				</div>
			</aside>
			<div className="flex min-w-0 flex-col gap-4 px-3 py-3">
				<section className="flex flex-col gap-1">
					<span className="font-medium">Next cycle plan</span>
					<table className="w-full">
						<thead className="text-2xs tracking-micro text-fg-muted uppercase">
							<tr className="h-7">
								<th className="text-left font-normal">Market</th>
								<th className="text-right font-normal">Signal</th>
								<th className="text-right font-normal">Now</th>
								<th className="text-right font-normal">Target</th>
								<th className="pl-8 text-left font-normal">Action</th>
							</tr>
						</thead>
						<tbody>
							{ROWS.map((r) => (
								<tr key={r.coin} className="h-9 border-t border-stroke-faint">
									<td>
										<AssetDisplay coin={r.coin} iconClassName="size-5" />
									</td>
									<td className={cn("text-right tabular-nums", r.score >= 0 ? "text-market-up" : "text-market-down")}>
										{signed(r.score)}
									</td>
									<td className="text-right tabular-nums">{usd(r.current)}</td>
									<td className="text-right tabular-nums">{usd(r.target)}</td>
									<td className={cn("pl-8", (r.act === "hold" || r.act === "skip") && "text-fg-muted")}>
										{ACT_LABEL[r.act]}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
				<section className="flex flex-col gap-1">
					<span className="font-medium">Last cycle orders</span>
					<OrdersTable />
				</section>
			</div>
		</div>
	);
}
