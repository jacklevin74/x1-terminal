import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { pnlClass } from "@/lib/portfolio/format";
import type { OrderHistoryRow, OrderRow, PortfolioRows, TabId } from "@/lib/portfolio/model";
import { TransferModal } from "../trade/positions/transfer-modal";
import { Coin, Empty, emptyText, FAILED_TEXT, SkeletonRows } from "./table-parts";

const LIMIT = 100;

const head = "h-8 whitespace-nowrap px-3 text-2xs font-normal tracking-micro text-fg-muted uppercase";
const numHead = cn(head, "text-right");
const cell = "h-8 whitespace-nowrap px-3 text-xs tabular-nums text-fg";
const num = cn(cell, "text-right");
const row = "transition-colors hover:bg-band";

const COLUMNS: Record<TabId, [string, boolean][]> = {
	balances: [
		["Asset", false],
		["Total Balance", true],
		["Available Balance", true],
		["USDC Value", true],
		["PNL (ROE %)", true],
		["Transfer", false],
		["Contract", false],
	],
	positions: [
		["Asset", false],
		["Size", true],
		["Value", true],
		["Entry", true],
		["Mark", true],
		["PNL", true],
		["Liquidation", true],
		["Margin", true],
		["Funding", true],
		["TP / SL", true],
	],
	orders: [
		["Time", false],
		["Type", false],
		["Market", false],
		["Direction", false],
		["Size", true],
		["Original Size", true],
		["Order Value", true],
		["Price", true],
		["Reduce Only", false],
		["Trigger Conditions", false],
		["TP/SL", false],
	],
	twap: [
		["Asset", false],
		["Size", true],
		["Executed", true],
		["Avg Price", true],
		["Running / Total", false],
		["Reduce Only", false],
		["Created", false],
	],
	history: [
		["Time", false],
		["Market", false],
		["Direction", false],
		["Price", true],
		["Size", true],
		["Trade Value", true],
		["Fee", true],
		["Closed PNL", true],
	],
	funding: [
		["Time", false],
		["Market", false],
		["Size", true],
		["Side", false],
		["Payment", true],
		["Rate", true],
	],
	"orders-history": [
		["Time", false],
		["Type", false],
		["Market", false],
		["Direction", false],
		["Size", true],
		["Filled Size", true],
		["Order Value", true],
		["Price", true],
		["Reduce Only", false],
		["Trigger Conditions", false],
		["TP/SL", false],
		["Status", false],
	],
	ledger: [
		["Time", false],
		["Action", false],
		["Amount", true],
		["From", false],
		["To", false],
		["Fee", true],
	],
};

interface Props {
	tab: TabId;
	rows: PortfolioRows;
	loading: boolean;
	failed: boolean;
	maxHeight?: number;
}

export function TabTable({ tab, rows, loading, failed, maxHeight = 640 }: Props) {
	const [transfer, setTransfer] = useState<"toSpot" | "toPerp" | null>(null);
	const [expanded, setExpanded] = useState<TabId | null>(null);
	const count = rows[tab].length;
	const limit = expanded === tab ? count : LIMIT;
	if (failed) return <Empty>{FAILED_TEXT}</Empty>;
	if (loading) return <SkeletonRows height="h-8" />;
	if (count === 0) return <Empty>{emptyText(tab)}</Empty>;

	function body() {
		if (tab === "balances")
			return rows.balances.map((b) => (
				<TableRow key={b.id} className={row}>
					<TableCell className={cell}>
						<span className="inline-flex items-center gap-2">
							<Coin coin={b.asset} />
							<span className="text-fg-muted">{b.tag}</span>
						</span>
					</TableCell>
					<TableCell className={num}>{b.total}</TableCell>
					<TableCell className={num}>{b.available}</TableCell>
					<TableCell className={num}>{b.value}</TableCell>
					<TableCell className={cn(num, b.pnl === "-" ? "text-fg-muted" : pnlClass(b.pnlNum))}>{b.pnl}</TableCell>
					<TableCell className={cell}>
						{b.asset === "USDC" ? (
							<button
								type="button"
								onClick={() => setTransfer(b.perp ? "toSpot" : "toPerp")}
								className="text-fg transition-colors hover:text-fg-secondary"
							>
								{b.perp ? "To spot" : "To perps"}
							</button>
						) : (
							<span className="text-fg-muted">-</span>
						)}
					</TableCell>
					<TableCell className={cn(cell, "text-fg-muted")}>{b.contract}</TableCell>
				</TableRow>
			));
		if (tab === "positions")
			return rows.positions.map((p) => (
				<TableRow key={p.id} className={row}>
					<TableCell className={cell}>
						<Coin coin={p.coin} side={p.long ? "long" : "short"} chip={p.leverage} />
					</TableCell>
					<TableCell className={num}>{p.size}</TableCell>
					<TableCell className={num}>{p.value}</TableCell>
					<TableCell className={num}>{p.entry}</TableCell>
					<TableCell className={num}>{p.mark}</TableCell>
					<TableCell className={cn(num, pnlClass(p.pnl))}>
						{p.pnlText} ({p.roe})
					</TableCell>
					<TableCell className={num}>{p.liq}</TableCell>
					<TableCell className={num}>{p.margin}</TableCell>
					<TableCell className={cn(num, pnlClass(p.funding))}>{p.fundingText}</TableCell>
					<TableCell className={cn(num, "text-fg-muted")}>{p.tpsl}</TableCell>
				</TableRow>
			));
		if (tab === "orders" || tab === "orders-history")
			return rows[tab].slice(0, limit).map((o: OrderRow | OrderHistoryRow) => (
				<TableRow key={`${o.id}-${"status" in o ? o.status : ""}`} className={row}>
					<TableCell className={cn(cell, "text-fg-secondary")}>{o.time}</TableCell>
					<TableCell className={cell}>{o.type}</TableCell>
					<TableCell className={cell}>
						<Coin coin={o.coin} />
					</TableCell>
					<TableCell className={cn(cell, o.buy ? "text-market-up" : "text-market-down")}>{o.direction}</TableCell>
					<TableCell className={num}>{"filled" in o ? o.origSize : o.size}</TableCell>
					<TableCell className={num}>{"filled" in o ? o.filled : o.origSize}</TableCell>
					<TableCell className={num}>{o.value}</TableCell>
					<TableCell className={num}>{o.price}</TableCell>
					<TableCell className={cell}>{o.reduceOnly}</TableCell>
					<TableCell className={cn(cell, "text-fg-muted")}>{o.trigger}</TableCell>
					<TableCell className={cn(cell, "text-fg-muted")}>{o.tpsl}</TableCell>
					{"status" in o && <TableCell className={cn(cell, "text-fg-secondary")}>{o.status}</TableCell>}
				</TableRow>
			));
		if (tab === "twap")
			return rows.twap.map((t) => (
				<TableRow key={t.id} className={row}>
					<TableCell className={cell}>
						<Coin coin={t.coin} side={t.buy ? "long" : "short"} chip={t.buy ? "Buy" : "Sell"} />
					</TableCell>
					<TableCell className={num}>{t.size}</TableCell>
					<TableCell className={cn(num, t.buy ? "text-market-up" : "text-market-down")}>{t.executed}</TableCell>
					<TableCell className={num}>{t.avgPrice}</TableCell>
					<TableCell className={cell}>{t.running}</TableCell>
					<TableCell className={cell}>{t.reduceOnly}</TableCell>
					<TableCell className={cn(cell, "text-fg-secondary")}>{t.created}</TableCell>
				</TableRow>
			));
		if (tab === "history")
			return rows.history.slice(0, limit).map((f) => (
				<TableRow key={f.id} className={row}>
					<TableCell className={cn(cell, "text-fg-secondary")}>{f.time}</TableCell>
					<TableCell className={cell}>
						<Coin coin={f.coin} />
					</TableCell>
					<TableCell className={cn(cell, f.buy ? "text-market-up" : "text-market-down")}>{f.direction}</TableCell>
					<TableCell className={num}>{f.price}</TableCell>
					<TableCell className={num}>{f.size}</TableCell>
					<TableCell className={num}>{f.tradeValue}</TableCell>
					<TableCell className={cn(num, "text-fg-secondary")}>{f.fee}</TableCell>
					<TableCell className={cn(num, pnlClass(f.pnl))}>{f.pnlText}</TableCell>
				</TableRow>
			));
		if (tab === "funding")
			return rows.funding.slice(0, limit).map((f) => (
				<TableRow key={f.id} className={row}>
					<TableCell className={cn(cell, "text-fg-secondary")}>{f.time}</TableCell>
					<TableCell className={cell}>
						<Coin coin={f.coin} />
					</TableCell>
					<TableCell className={num}>{f.size}</TableCell>
					<TableCell className={cn(cell, f.long ? "text-market-up" : "text-market-down")}>
						{f.long ? "Long" : "Short"}
					</TableCell>
					<TableCell className={cn(num, pnlClass(f.payment))}>{f.paymentText}</TableCell>
					<TableCell className={num}>{f.rate}</TableCell>
				</TableRow>
			));
		return rows.ledger.slice(0, limit).map((l) => (
			<TableRow key={l.id} className={row}>
				<TableCell className={cn(cell, "text-fg-secondary")}>{l.time}</TableCell>
				<TableCell className={cell}>{l.action}</TableCell>
				<TableCell className={num}>{l.amount}</TableCell>
				<TableCell className={cell}>{l.from}</TableCell>
				<TableCell className={cell}>{l.to}</TableCell>
				<TableCell className={cn(num, "text-fg-muted")}>{l.fee}</TableCell>
			</TableRow>
		));
	}

	return (
		<div className="min-w-0 overflow-auto scrollbar-none" style={{ maxHeight }}>
			<Table className="w-full min-w-max">
				<TableHeader className="sticky top-0 z-10 bg-surface">
					<TableRow>
						{COLUMNS[tab].map(([label, numeric]) => (
							<TableHead key={label} className={numeric ? numHead : head}>
								{label}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>{body()}</TableBody>
			</Table>
			{count > limit && (
				<div className="flex justify-center px-3 py-3">
					<Button variant="secondary" intent="neutral" size="sm" onClick={() => setExpanded(tab)}>
						Show all {count}
					</Button>
				</div>
			)}
			<TransferModal
				open={transfer !== null}
				onOpenChange={(open) => !open && setTransfer(null)}
				initialDirection={transfer ?? "toSpot"}
			/>
		</div>
	);
}
