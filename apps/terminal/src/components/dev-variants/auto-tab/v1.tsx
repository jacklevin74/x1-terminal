import { useState } from "react";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { ACT_LABEL, ORDERS, ROWS, STATUS, signed, usd } from "./data";
import { ChecksSummary, StatusDot, StopMeter } from "./parts";

function SignalBar({ score }: { score: number }) {
	const w = Math.min(50, Math.abs(score) / 2);
	return (
		<span className="flex items-center justify-end gap-2">
			<span className="relative h-1 w-16 rounded-full bg-control">
				<span className="absolute inset-y-0 left-1/2 w-px bg-fg-disabled" />
				<span
					className={cn("absolute inset-y-0 rounded-full", score >= 0 ? "bg-market-up" : "bg-market-down")}
					style={score >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
				/>
			</span>
			<span className={cn("w-7 text-right tabular-nums", score >= 0 ? "text-market-up" : "text-market-down")}>
				{signed(score)}
			</span>
		</span>
	);
}

export default function V1() {
	const [view, setView] = useState<"plan" | "orders">("plan");
	const active = ROWS.filter((r) => r.act !== "hold");
	const idle = ROWS.filter((r) => r.act === "hold");
	return (
		<div className="flex flex-col gap-3 px-3 py-3 text-xs">
			<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
				<span className="inline-flex items-center gap-1.5 font-medium">
					<StatusDot />
					{STATUS.phase}
				</span>
				<span className="text-fg-muted">
					Last cycle <span className="text-fg">{STATUS.lastCycle}</span>
				</span>
				<span className="text-fg-muted">
					Next cycle <span className="text-fg">{STATUS.nextCycle}</span>
				</span>
				<span className="text-fg-muted">
					Account equity <span className="text-fg">{STATUS.equity}</span>
				</span>
				<span className="text-fg-muted">
					Account day PNL <span className="text-fg">{STATUS.dayPnl}</span>
				</span>
				<span className="inline-flex items-center gap-2 text-fg-muted">
					Loss stop <StopMeter className="text-fg" />
				</span>
				<span className="text-fg-muted">
					Key <span className="text-fg">{STATUS.key}</span> expires <span className="text-fg">{STATUS.expires}</span>
				</span>
				<span className="ml-auto">
					<ChecksSummary />
				</span>
			</div>
			<div className="flex items-center gap-4 border-b border-stroke-weak">
				{(["plan", "orders"] as const).map((v) => (
					<button
						key={v}
						type="button"
						onClick={() => setView(v)}
						className={cn(
							"-mb-px h-8 border-b-2 border-transparent",
							view === v ? "border-fg text-fg" : "text-fg-muted hover:text-fg",
						)}
					>
						{v === "plan" ? "Next cycle plan" : `Last cycle orders ${ORDERS.length}`}
					</button>
				))}
				<span className="ml-auto text-fg-muted">{STATUS.note}</span>
			</div>
			{view === "plan" ? (
				<table className="w-full">
					<thead className="text-2xs tracking-micro text-fg-muted uppercase">
						<tr className="h-7">
							<th className="text-left font-normal">Market</th>
							<th className="text-right font-normal">Signal</th>
							<th className="text-right font-normal">Position now</th>
							<th className="text-right font-normal">Target</th>
							<th className="pl-8 text-left font-normal">Next action</th>
						</tr>
					</thead>
					<tbody>
						{[...active, ...idle].map((r) => (
							<tr key={r.coin} className={cn("h-9 border-t border-stroke-faint", r.act === "hold" && "text-fg-muted")}>
								<td>
									<AssetDisplay coin={r.coin} iconClassName="size-5" />
								</td>
								<td>
									<SignalBar score={r.score} />
								</td>
								<td className="text-right tabular-nums">{usd(r.current)}</td>
								<td className="text-right tabular-nums">{usd(r.target)}</td>
								<td className="pl-8">
									<span className={cn(r.act === "hold" || r.act === "skip" ? "text-fg-muted" : "text-fg")}>
										{ACT_LABEL[r.act]}
									</span>
									{r.note && <span className="ml-2 text-fg-muted">{r.note}</span>}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			) : (
				<OrdersTable />
			)}
		</div>
	);
}

export function OrdersTable() {
	return (
		<table className="w-full">
			<thead className="text-2xs tracking-micro text-fg-muted uppercase">
				<tr className="h-7">
					<th className="text-left font-normal">Market</th>
					<th className="text-left font-normal">Action</th>
					<th className="text-left font-normal">Side</th>
					<th className="text-right font-normal">Size</th>
					<th className="text-right font-normal">Price</th>
					<th className="pl-8 text-left font-normal">Result</th>
				</tr>
			</thead>
			<tbody>
				{ORDERS.map((o) => (
					<tr key={o.coin} className="h-9 border-t border-stroke-faint">
						<td>
							<AssetDisplay coin={o.coin} iconClassName="size-5" />
						</td>
						<td>{o.tag}</td>
						<td className={o.buy ? "text-market-up" : "text-market-down"}>{o.buy ? "Buy" : "Sell"}</td>
						<td className="text-right tabular-nums">{o.size}</td>
						<td className="text-right tabular-nums">{o.px}</td>
						<td className="pl-8 text-fg-muted">{o.result}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
