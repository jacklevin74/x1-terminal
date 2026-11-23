import { Button } from "@hypeterminal/ui";
import { type ReactNode, useState } from "react";
import { pnlClass } from "@/lib/portfolio/format";
import type { PortfolioRows, TabId } from "@/lib/portfolio/model";
import { Coin, Empty, emptyText, FAILED_TEXT, SkeletonRows } from "./table-parts";

const LIMIT = 20;

interface LineProps {
	left: ReactNode;
	sub: ReactNode;
	right: ReactNode;
	rightSub?: ReactNode;
}

function Line({ left, sub, right, rightSub }: LineProps) {
	return (
		<div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 text-xs tabular-nums">
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate">{left}</span>
				<span className="truncate text-fg-muted">{sub}</span>
			</span>
			<span className="flex shrink-0 flex-col items-end gap-0.5">
				<span>{right}</span>
				{rightSub && <span className="text-fg-muted">{rightSub}</span>}
			</span>
		</div>
	);
}

function Side({ coin, buy, text }: { coin: string; buy: boolean; text: string }) {
	return (
		<span className="inline-flex items-center gap-2">
			<Coin coin={coin} />
			<span className={buy ? "text-market-up" : "text-market-down"}>{text}</span>
		</span>
	);
}

interface Props {
	tab: TabId;
	rows: PortfolioRows;
	loading: boolean;
	failed: boolean;
}

export function MobileTabRows({ tab, rows, loading, failed }: Props) {
	const [expanded, setExpanded] = useState<TabId | null>(null);
	const count = rows[tab].length;
	const limit = expanded === tab ? count : LIMIT;
	if (failed) return <Empty>{FAILED_TEXT}</Empty>;
	if (loading) return <SkeletonRows height="h-14" />;
	if (count === 0) return <Empty>{emptyText(tab)}</Empty>;

	function lines() {
		if (tab === "balances")
			return rows.balances.map((b) => (
				<Line
					key={b.id}
					left={
						<span className="inline-flex items-center gap-2">
							<Coin coin={b.asset} />
							<span className="text-fg-muted">{b.tag}</span>
						</span>
					}
					sub={`Available ${b.available}`}
					right={b.value}
					rightSub={b.total}
				/>
			));
		if (tab === "positions")
			return rows.positions.map((p) => (
				<Line
					key={p.id}
					left={<Coin coin={p.coin} side={p.long ? "long" : "short"} chip={p.leverage} />}
					sub={`${p.size} at ${p.entry}`}
					right={<span className={pnlClass(p.pnl)}>{p.pnlText}</span>}
					rightSub={`${p.value} (${p.roe})`}
				/>
			));
		if (tab === "orders" || tab === "orders-history")
			return rows[tab]
				.slice(0, limit)
				.map((o) => (
					<Line
						key={`${o.id}-${"status" in o ? o.status : ""}`}
						left={<Side coin={o.coin} buy={o.buy} text={o.direction} />}
						sub={"status" in o ? `${o.type} ${o.origSize}, ${o.status}` : `${o.type} ${o.size}`}
						right={o.price}
						rightSub={"status" in o ? o.time : o.value}
					/>
				));
		if (tab === "twap")
			return rows.twap.map((t) => (
				<Line
					key={t.id}
					left={<Side coin={t.coin} buy={t.buy} text={t.buy ? "Buy" : "Sell"} />}
					sub={`${t.executed} of ${t.size}`}
					right={t.avgPrice}
					rightSub={t.running}
				/>
			));
		if (tab === "history")
			return rows.history
				.slice(0, limit)
				.map((f) => (
					<Line
						key={f.id}
						left={<Side coin={f.coin} buy={f.buy} text={f.direction} />}
						sub={`${f.size} at ${f.price}`}
						right={<span className={pnlClass(f.pnl)}>{f.pnlText}</span>}
						rightSub={f.time}
					/>
				));
		if (tab === "funding")
			return rows.funding
				.slice(0, limit)
				.map((f) => (
					<Line
						key={f.id}
						left={<Coin coin={f.coin} />}
						sub={`${f.long ? "Long" : "Short"} ${f.size}`}
						right={<span className={pnlClass(f.payment)}>{f.paymentText}</span>}
						rightSub={f.rate}
					/>
				));
		return rows.ledger
			.slice(0, limit)
			.map((l) => <Line key={l.id} left={l.action} sub={`${l.from} to ${l.to}`} right={l.amount} rightSub={l.time} />);
	}

	return (
		<div className="flex flex-col">
			{lines()}
			{count > limit && (
				<div className="px-4 pt-2 pb-4">
					<Button variant="secondary" intent="neutral" size="md" className="w-full" onClick={() => setExpanded(tab)}>
						Show all {count}
					</Button>
				</div>
			)}
		</div>
	);
}
