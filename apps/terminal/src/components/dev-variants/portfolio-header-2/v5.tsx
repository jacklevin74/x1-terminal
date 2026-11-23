import { Button } from "@hypeterminal/ui";
import {
	ADDRESS,
	account,
	cn,
	Identicon,
	PortfolioChart,
	pnlClass,
	RANGES,
	rangeLong,
	rangeStats,
	SERIES,
	SHORT_ADDRESS,
	signedUsd,
	TextToggle,
	usd,
	useChartState,
} from "./common";

export function Header() {
	const c = useChartState();
	const stats = rangeStats(c.range);
	return (
		<section className="flex flex-col overflow-hidden rounded-16 bg-surface">
			<div
				className="flex items-start justify-between px-8 pt-7 pb-6"
				style={{ backgroundColor: "color-mix(in oklch, var(--color-x1-blue) 32%, var(--color-background))" }}
			>
				<div className="flex flex-col gap-3">
					<span className="flex items-center gap-2 text-xs text-fg-secondary tabular-nums">
						<Identicon id={ADDRESS} className="size-5 rounded-4" />
						{SHORT_ADDRESS}
					</span>
					<span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
					<span className={cn("text-sm tabular-nums", pnlClass(stats.pnl))}>
						{signedUsd(stats.pnl)} <span className="text-fg-muted">{rangeLong(c.range)}</span>
					</span>
				</div>
				<div className="flex flex-col items-end gap-5">
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
					<TextToggle items={RANGES} value={c.range} onChange={c.setRange} size="sm" />
				</div>
			</div>
			<div className="px-8 pt-6 pb-6">
				<TextToggle items={SERIES} value={c.series} onChange={c.setSeries} />
				<div className="mt-5">
					<PortfolioChart series={c.series} range={c.range} height={170} />
				</div>
			</div>
		</section>
	);
}
