import { CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { ACT_LABEL, CHECKS, ROWS, STATUS, signed, usd } from "./data";
import { StatusDot, StopMeter } from "./parts";
import { OrdersTable } from "./v1";

type View = "plan" | "orders" | "health";

export default function V4() {
	const [view, setView] = useState<View>("plan");
	return (
		<div className="flex flex-col gap-3 px-3 py-3 text-xs">
			<div className="flex items-center gap-3">
				<span className="inline-flex items-center gap-1.5 font-medium">
					<StatusDot />
					{STATUS.phase}
				</span>
				<span className="text-fg-muted">{STATUS.note}</span>
				<div className="ml-auto flex h-7 items-center rounded-8 bg-control p-0.5">
					{(["plan", "orders", "health"] as const).map((v) => (
						<button
							key={v}
							type="button"
							onClick={() => setView(v)}
							className={cn(
								"h-full rounded-6 px-3 capitalize",
								view === v ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
							)}
						>
							{v === "plan" ? "Plan" : v === "orders" ? "Orders" : "Health"}
						</button>
					))}
				</div>
			</div>
			{view === "plan" && (
				<table className="w-full">
					<thead className="text-2xs tracking-micro text-fg-muted uppercase">
						<tr className="h-7">
							<th className="text-left font-normal">Market</th>
							<th className="text-right font-normal">Signal</th>
							<th className="text-right font-normal">Now</th>
							<th className="text-right font-normal">Target</th>
							<th className="text-right font-normal">Change</th>
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
								<td className={cn("text-right tabular-nums", r.target === r.current && "text-fg-muted")}>
									{usd(r.target - r.current)}
								</td>
								<td className="pl-8">
									<span
										className={cn(
											"inline-flex h-5 items-center rounded-full bg-control px-2",
											r.act === "hold" || r.act === "skip" ? "text-fg-muted" : "text-fg",
										)}
									>
										{ACT_LABEL[r.act]}
									</span>
									{r.act === "skip" && <span className="ml-2 text-fg-muted">Under $10 minimum</span>}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
			{view === "orders" && <OrdersTable />}
			{view === "health" && (
				<div className="grid grid-cols-2 gap-x-10 gap-y-2.5 sm:max-w-2xl">
					{[
						["Last cycle", STATUS.lastCycle],
						["Next cycle", STATUS.nextCycle],
						["Account equity", STATUS.equity],
						["Account day PNL", STATUS.dayPnl],
						["Trading key", `${STATUS.key}, expires ${STATUS.expires}`],
					].map(([k, v]) => (
						<div key={k} className="flex justify-between border-b border-stroke-faint pb-2">
							<span className="text-fg-muted">{k}</span>
							<span className="tabular-nums">{v}</span>
						</div>
					))}
					<div className="flex justify-between border-b border-stroke-faint pb-2">
						<span className="text-fg-muted">Loss stop used</span>
						<StopMeter />
					</div>
					{CHECKS.map((c) => (
						<div key={c.label} className="flex justify-between border-b border-stroke-faint pb-2">
							<span className="text-fg-muted">{c.label}</span>
							<CheckIcon weight="bold" className="size-3.5 text-market-up" />
						</div>
					))}
				</div>
			)}
		</div>
	);
}
