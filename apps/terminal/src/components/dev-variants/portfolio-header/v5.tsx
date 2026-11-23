import { Button } from "@hypeterminal/ui";
import { RangeSwitch, SeriesSwitch } from "../portfolio/parts";
import {
	ADDRESS,
	account,
	cn,
	Identicon,
	PortfolioChart,
	pnlClass,
	rangeStats,
	SHORT_ADDRESS,
	signedUsd,
	usd,
	useChartState,
} from "./common";

export function Header() {
	const c = useChartState();
	const stats = rangeStats(c.range);
	return (
		<div className="flex flex-col overflow-hidden rounded-16 bg-surface">
			<div
				className="flex items-end justify-between gap-8 px-8 py-7"
				style={{ backgroundColor: "color-mix(in oklch, var(--color-x1-blue) 32%, var(--color-background))" }}
			>
				<div className="flex flex-col gap-3">
					<span className="flex items-center gap-2 text-xs text-fg-secondary tabular-nums">
						<Identicon id={ADDRESS} className="size-5 rounded-4" />
						{SHORT_ADDRESS}
					</span>
					<span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
					<span className={cn("text-sm tabular-nums", pnlClass(stats.pnl))}>
						{signedUsd(stats.pnl)} <span className="text-fg-muted">30 days</span>
					</span>
				</div>
				<div className="flex gap-2">
					<Button variant="filled" intent="neutral" size="md" className="bg-fill text-fg-inverse">
						Deposit
					</Button>
					<Button variant="secondary" intent="neutral" size="md">
						Withdraw
					</Button>
					<Button variant="secondary" intent="neutral" size="md">
						Send
					</Button>
				</div>
			</div>
			<div className="flex flex-col gap-4 p-5">
				<div className="flex items-center justify-between">
					<SeriesSwitch value={c.series} onChange={c.setSeries} size="xs" />
					<RangeSwitch value={c.range} onChange={c.setRange} size="xs" />
				</div>
				<PortfolioChart series={c.series} range={c.range} height={170} />
			</div>
		</div>
	);
}
