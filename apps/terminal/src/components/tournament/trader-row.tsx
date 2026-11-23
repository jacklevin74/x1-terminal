import { path, pnlClass, signedUsd, type Trader, traderName, usdCompact } from "@/components/tournament/data";
import { Identicon, Spark } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	r: Trader;
	className?: string;
	inverse?: boolean;
}

export function TraderRow({ r, className, inverse }: Props) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-8 p-3",
				inverse ? "bg-fill-inverse-weak" : "bg-control",
				className,
			)}
		>
			<Identicon id={r.address} className="size-9 rounded-full" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{traderName(r)}</span>
				<span
					className={cn(
						"flex flex-wrap gap-x-2 text-xs tabular-nums [&>span]:whitespace-nowrap",
						inverse ? "text-fg-inverse-muted" : "text-fg-muted",
					)}
				>
					<span>{usdCompact(r.accountValue)} account</span>
					<span>
						<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> 24h
					</span>
				</span>
			</div>
			<div className="flex flex-col items-end">
				<span className={cn("text-base font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
				<Spark values={path(r)} width={56} height={14} />
			</div>
		</div>
	);
}
