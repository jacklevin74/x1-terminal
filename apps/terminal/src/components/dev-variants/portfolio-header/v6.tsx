import { Button } from "@hypeterminal/ui";
import { ArrowDownIcon, ArrowUpIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { RangeSwitch } from "../portfolio/parts";
import {
	AccountChip,
	account,
	cn,
	PortfolioChart,
	pnlClass,
	rangeStats,
	SERIES,
	signedUsd,
	UnderlineTabs,
	usd,
	useChartState,
} from "./common";

export function Header() {
	const c = useChartState();
	const stats = rangeStats(c.range);
	return (
		<div className="flex flex-col">
			<div className="flex h-9 items-center justify-between">
				<AccountChip size="md" />
				<div className="flex gap-1">
					<Button variant="secondary" intent="neutral" size="sm">
						<ArrowDownIcon className="size-4" />
						Deposit
					</Button>
					<Button variant="secondary" intent="neutral" size="sm">
						<ArrowUpIcon className="size-4" />
						Withdraw
					</Button>
					<Button variant="secondary" intent="neutral" size="sm">
						<PaperPlaneTiltIcon className="size-4" />
						Send
					</Button>
				</div>
			</div>
			<section className="mt-4 overflow-hidden rounded-8 bg-surface">
				<div className="flex items-end justify-between px-5 pt-5">
					<div className="flex flex-col gap-2">
						<span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
							{usd(account.value)}
						</span>
						<span className={cn("text-xs tabular-nums", pnlClass(stats.pnl))}>
							{signedUsd(stats.pnl)} <span className="text-fg-muted">30 days</span>
						</span>
					</div>
					<RangeSwitch value={c.range} onChange={c.setRange} size="xs" />
				</div>
				<div className="mt-4">
					<UnderlineTabs items={SERIES} value={c.series} onChange={c.setSeries} />
				</div>
				<div className="p-4">
					<PortfolioChart series={c.series} range={c.range} height={170} />
				</div>
			</section>
		</div>
	);
}
