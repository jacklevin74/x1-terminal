import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { ACT_LABEL, ORDERS, ROWS, STATUS, signed, usd } from "./data";
import { ChecksSummary, StatusDot, StopMeter } from "./parts";

const SCALE = 460;

function bar(v: number) {
	const w = Math.min(50, (Math.abs(v) / SCALE) * 50);
	return v >= 0
		? { left: "50%", width: `${Math.max(w, v ? 0.6 : 0)}%` }
		: { right: "50%", width: `${Math.max(w, 0.6)}%` };
}

export default function V3() {
	return (
		<div className="flex flex-col gap-3 px-3 py-3 text-xs">
			<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
				<span className="inline-flex items-center gap-1.5 font-medium">
					<StatusDot />
					{STATUS.phase}
				</span>
				<span className="text-fg-muted">{STATUS.note}</span>
				<span className="text-fg-muted">
					Account equity <span className="text-fg">{STATUS.equity}</span>
				</span>
				<span className="inline-flex items-center gap-2 text-fg-muted">
					Loss stop <StopMeter className="text-fg" />
				</span>
				<span className="ml-auto">
					<ChecksSummary />
				</span>
			</div>
			<div className="-mt-1 flex flex-wrap gap-x-5 gap-y-1 text-fg-muted">
				<span>
					Last cycle <span className="text-fg">{STATUS.lastCycle}</span>
				</span>
				<span>
					Next cycle <span className="text-fg">{STATUS.nextCycle}</span>
				</span>
				<span>
					Account day PNL <span className="text-fg">{STATUS.dayPnl}</span>
				</span>
				<span>
					Last cycle orders <span className="text-fg">{ORDERS.length} planned</span>
				</span>
				<span>
					Key <span className="text-fg">{STATUS.key}</span> expires <span className="text-fg">{STATUS.expires}</span>
				</span>
			</div>
			<div className="grid grid-cols-[120px_1fr_200px] items-center gap-x-4 text-2xs tracking-micro text-fg-muted uppercase">
				<span>Market</span>
				<span className="flex justify-between">
					<span>Short</span>
					<span>Position now and target</span>
					<span>Long</span>
				</span>
				<span>Next action</span>
			</div>
			{ROWS.map((r) => (
				<div key={r.coin} className="grid grid-cols-[120px_1fr_200px] items-center gap-x-4">
					<span className="flex items-center gap-2">
						<AssetDisplay coin={r.coin} iconClassName="size-5" />
						<span className={cn("tabular-nums", r.score >= 0 ? "text-market-up" : "text-market-down")}>
							{signed(r.score)}
						</span>
					</span>
					<span className="relative h-6 rounded-4 bg-control">
						<span className="absolute inset-y-0 left-1/2 w-px bg-fg-disabled" />
						{r.current !== 0 && (
							<span
								className={cn(
									"absolute inset-y-1.5 rounded-2 opacity-40",
									r.current >= 0 ? "bg-market-up" : "bg-market-down",
								)}
								style={bar(r.current)}
							/>
						)}
						{r.target !== 0 && (
							<span
								className={cn("absolute inset-y-2 rounded-2", r.target >= 0 ? "bg-market-up" : "bg-market-down")}
								style={bar(r.target)}
							/>
						)}
						<span className="absolute inset-y-0 right-2 flex items-center text-2xs text-fg-muted tabular-nums">
							{usd(r.current)} to {usd(r.target)}
						</span>
					</span>
					<span className={cn((r.act === "hold" || r.act === "skip") && "text-fg-muted")}>
						{ACT_LABEL[r.act]}
						{r.act === "skip" && <span className="block text-2xs text-fg-disabled">Under $10 minimum</span>}
					</span>
				</div>
			))}
		</div>
	);
}
