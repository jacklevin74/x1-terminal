import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { PortfolioChart } from "../portfolio/chart";
import { account, pnlClass, RANGES, rangeStats, SERIES, signedUsd, usd } from "../portfolio/data";
import { Actions } from "../portfolio/parts";
import { type ChartState, Dropdown, TextToggle } from "./common";

interface TopProps {
	c: ChartState;
	/** Extra label/value rows under the equity lines (variant #4). */
	ledger?: ReactNode;
	/** Chart grows to fill the card height when the summary card grows. */
	fill?: boolean;
}

function useHeight() {
	const ref = useRef<HTMLDivElement>(null);
	const [h, setH] = useState(0);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(([e]) => setH(Math.floor(e.contentRect.height)));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return { ref, h };
}

function Summary({ c, ledger, mobile }: { c: ChartState; ledger?: ReactNode; mobile?: boolean }) {
	const stats = rangeStats(c.range);
	return (
		<section className={cn("flex flex-col justify-between rounded-8 bg-surface", mobile ? "p-4" : "p-6")}>
			<div className="flex flex-col gap-2">
				<span className="text-xs text-fg-muted">Account value</span>
				<span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
				<span className={cn("text-xs tabular-nums", pnlClass(stats.pnl))}>
					{signedUsd(stats.pnl)} <span className="text-fg-muted">{RANGES.find((r) => r.id === c.range)?.long}</span>
				</span>
			</div>
			<dl className="mt-6 flex flex-col gap-2 text-xs tabular-nums">
				<div className="flex justify-between">
					<dt className="text-fg-muted">Perps</dt>
					<dd>{usd(account.perpEquity)}</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-fg-muted">Spot</dt>
					<dd>{usd(account.spotEquity)}</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-fg-muted">Withdrawable</dt>
					<dd>{usd(account.withdrawable)}</dd>
				</div>
			</dl>
			{ledger}
			<Actions size={mobile ? "md" : "sm"} fullWidth className="mt-6" />
		</section>
	);
}

function ChartControls({ c }: { c: ChartState }) {
	return (
		<div className="flex items-center justify-between">
			<TextToggle items={SERIES} value={c.series} onChange={c.setSeries} />
			<Dropdown items={RANGES.map((r) => ({ id: r.id, label: r.long }))} value={c.range} onChange={c.setRange} />
		</div>
	);
}

export function TopDesktop({ c, ledger, fill }: TopProps) {
	const { ref, h } = useHeight();
	return (
		<div className="flex flex-col">
			<h1 className="text-lg font-semibold">Portfolio</h1>
			<div className="mt-5 grid grid-cols-[340px_minmax(0,1fr)] gap-2">
				<Summary c={c} ledger={ledger} />
				<section className="flex flex-col rounded-8 bg-surface p-6">
					<ChartControls c={c} />
					{fill ? (
						<div ref={ref} className="mt-6 min-h-[176px] flex-1">
							<PortfolioChart series={c.series} range={c.range} height={Math.max(176, h - 28)} />
						</div>
					) : (
						<div className="mt-6">
							<PortfolioChart series={c.series} range={c.range} height={176} />
						</div>
					)}
				</section>
			</div>
		</div>
	);
}

export function TopMobile({ c, ledger }: TopProps) {
	return (
		<div className="flex flex-col">
			<h1 className="px-4 pt-6 text-lg font-semibold">Portfolio</h1>
			<div className="mt-4 flex flex-col gap-2 px-2">
				<Summary c={c} ledger={ledger} mobile />
				<section className="flex flex-col rounded-8 bg-surface p-4">
					<ChartControls c={c} />
					<div className="mt-4">
						<PortfolioChart series={c.series} range={c.range} height={180} />
					</div>
				</section>
			</div>
		</div>
	);
}
