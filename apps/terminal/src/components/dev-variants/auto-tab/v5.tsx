import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { ACT_LABEL, ORDERS, ROWS, STATUS, signed, usd } from "./data";
import { ChecksSummary, StatusDot, StopMeter } from "./parts";

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1 rounded-8 bg-control px-3 py-2.5">
			<span className="text-fg-muted">{label}</span>
			<span className="text-sm tabular-nums">{children}</span>
		</div>
	);
}

export default function V5() {
	const moves = ROWS.filter((r) => r.act !== "hold");
	const holds = ROWS.filter((r) => r.act === "hold");
	return (
		<div className="grid grid-cols-[1fr_320px] gap-4 px-3 py-3 text-xs">
			<div className="flex min-w-0 flex-col gap-3">
				<div className="flex items-center justify-between">
					<span className="font-medium">Next cycle plan</span>
					<span className="text-fg-muted">{STATUS.note}</span>
				</div>
				<div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
					{moves.map((r) => (
						<div key={r.coin} className="flex flex-col gap-2 rounded-8 bg-control p-3">
							<div className="flex items-center justify-between">
								<AssetDisplay coin={r.coin} iconClassName="size-5" />
								<span className={cn("tabular-nums", r.score >= 0 ? "text-market-up" : "text-market-down")}>
									{signed(r.score)}
								</span>
							</div>
							<span className="tabular-nums text-fg-secondary">
								{usd(r.current)} to <span className="text-fg">{usd(r.target)}</span>
							</span>
							<span className={cn(r.act === "skip" ? "text-fg-muted" : "text-fg")}>
								{ACT_LABEL[r.act]}
								{r.act === "skip" && ", under $10 minimum"}
							</span>
						</div>
					))}
				</div>
				<span className="text-fg-muted">
					No change: {holds.map((h) => `${h.coin} (${signed(h.score)})`).join(", ")}
				</span>
			</div>
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="inline-flex items-center gap-1.5 font-medium">
						<StatusDot />
						{STATUS.phase}
					</span>
					<ChecksSummary />
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Tile label="Account equity">{STATUS.equity}</Tile>
					<Tile label="Account day PNL">{STATUS.dayPnl}</Tile>
					<Tile label="Last cycle">{STATUS.lastCycle}</Tile>
					<Tile label="Next cycle">{STATUS.nextCycle}</Tile>
				</div>
				<div className="flex items-center justify-between rounded-8 bg-control px-3 py-2.5">
					<span className="text-fg-muted">Loss stop used</span>
					<StopMeter />
				</div>
				<div className="flex items-center justify-between rounded-8 bg-control px-3 py-2.5">
					<span className="text-fg-muted">Last cycle orders</span>
					<span>{ORDERS.length ? `${ORDERS.length} planned` : "None"}</span>
				</div>
				<span className="text-fg-muted">
					Trading key {STATUS.key}, expires {STATUS.expires}
				</span>
			</div>
		</div>
	);
}
