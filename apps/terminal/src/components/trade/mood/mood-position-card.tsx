import { pnlClass, signedUsd, usdCompact } from "@/components/tournament/data";
import { CoinIcon } from "@/components/tournament/winner-parts";
import { cn } from "@/lib/cn";
import type { PoolPosition } from "@/lib/mood/pool";
import { isLong, levOf, marginMode, pctText, price, roeOf, size } from "@/lib/mood/position";

interface Props {
	pos: PoolPosition;
	name: string;
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex h-8 items-center justify-between text-xs">
			<span className="text-fg-muted">{label}</span>
			<span className={cn("tabular-nums", className)}>{value}</span>
		</div>
	);
}

export function MoodPositionCard({ pos, name }: Props) {
	const long = isLong(pos);
	return (
		<section className="flex flex-col rounded-12 bg-surface">
			<div className="flex items-center gap-3 p-4">
				<CoinIcon coin={pos.coin} className="size-8" />
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-medium">{name}-USDC</span>
					<span className={cn("text-xs", long ? "text-market-up" : "text-market-down")}>
						{long ? "Long" : "Short"} {levOf(pos)}x {marginMode(pos).toLowerCase()}
					</span>
				</div>
				<div className="flex flex-col items-end">
					<span className={cn("text-sm font-medium tabular-nums", pnlClass(pos.upnl))}>
						{signedUsd(pos.upnl, true)}
					</span>
					<span className={cn("text-xs tabular-nums", pnlClass(pos.upnl))}>{pctText(roeOf(pos))}</span>
				</div>
			</div>
			<div className="mx-2 mb-2 rounded-8 bg-control px-3 py-1">
				<Row label="Size" value={`${size(pos.szi)} ${name}`} />
				<Row label="Position value" value={usdCompact(pos.ntl)} />
				<Row label="Entry price" value={price(pos.entry)} />
				<Row label="Mark price" value={price(pos.mark)} />
				<Row label="Liquidation price" value={pos.liq ? price(pos.liq) : "None"} className="text-market-down" />
			</div>
		</section>
	);
}
