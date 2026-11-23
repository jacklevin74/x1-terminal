import { Avatar, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
	balances,
	coinDex,
	coinIcon,
	coinName,
	fills,
	funding,
	ledger,
	orders,
	pnlClass,
	positions,
	TABS,
	type TabId,
} from "./data";

const head = "h-8 whitespace-nowrap px-3 text-2xs font-normal tracking-micro text-fg-muted uppercase";
const numHead = cn(head, "text-right");

interface CoinProps {
	coin: string;
	side?: "long" | "short";
	chip?: string;
}

export function Coin({ coin, side, chip }: CoinProps) {
	const dex = coinDex(coin);
	return (
		<span className="inline-flex items-center gap-2">
			<Avatar size="xxs" src={coinIcon(coin)} initials={coinName(coin).slice(0, 1)} className="size-4" />
			<span className="text-fg">{coinName(coin)}</span>
			{chip && (
				<span
					className={cn(
						"rounded-4 px-1.5 py-0.5 text-2xs",
						side === "long" ? "bg-success-soft text-market-up" : "bg-error-soft text-market-down",
					)}
				>
					{chip}
				</span>
			)}
			{dex && <span className="rounded-4 bg-control px-1.5 py-0.5 text-2xs text-fg-muted">{dex}</span>}
		</span>
	);
}

interface EmptyProps {
	children: ReactNode;
}

export function Empty({ children }: EmptyProps) {
	return <div className="flex h-32 items-center justify-center px-3 text-xs text-fg-muted">{children}</div>;
}

function emptyText(tab: TabId) {
	if (tab === "twap") return "No active TWAPs.";
	if (tab === "orders-history") return "No order history in this snapshot.";
	return "No rows.";
}

interface Props {
	tab: TabId;
	rowHeight?: "h-8" | "h-9" | "h-10";
	maxHeight?: number;
}

export function TabTable({ tab, rowHeight = "h-9", maxHeight = 420 }: Props) {
	const cell = cn(rowHeight, "whitespace-nowrap px-3 text-xs tabular-nums text-fg");
	const num = cn(cell, "text-right");
	const count = TABS.find((t) => t.id === tab)?.count ?? 0;
	if (count === 0) return <Empty>{emptyText(tab)}</Empty>;

	function headings(cols: [string, boolean][]) {
		return (
			<TableHeader className="sticky top-0 z-10 bg-surface">
				<TableRow>
					{cols.map(([label, numeric]) => (
						<TableHead key={label} className={numeric ? numHead : head}>
							{label}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
		);
	}

	function body() {
		if (tab === "balances")
			return (
				<>
					{headings([
						["Asset", false],
						["Total Balance", true],
						["Available Balance", true],
						["USDC Value", true],
						["PNL (ROE %)", true],
						["Transfer", false],
						["Contract", false],
					])}
					<TableBody>
						{balances.map((b) => (
							<TableRow key={b.id} className="transition-colors hover:bg-band">
								<TableCell className={cell}>
									<span className="inline-flex items-center gap-2">
										<Coin coin="USDC" />
										<span className="text-fg-muted">{b.tag}</span>
									</span>
								</TableCell>
								<TableCell className={num}>{b.total}</TableCell>
								<TableCell className={num}>{b.available}</TableCell>
								<TableCell className={num}>{b.value}</TableCell>
								<TableCell className={cn(num, "text-fg-muted")}>{b.pnl}</TableCell>
								<TableCell className={cell}>
									<button type="button" className="text-fg transition-colors hover:text-fg-secondary">
										{b.tag === "Perps" ? "To spot" : "To perps"}
									</button>
								</TableCell>
								<TableCell className={cn(cell, "text-fg-muted")}>{b.contract}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</>
			);
		if (tab === "positions")
			return (
				<>
					{headings([
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
					])}
					<TableBody>
						{positions.map((p) => (
							<TableRow key={p.coin} className="transition-colors hover:bg-band">
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
						))}
					</TableBody>
				</>
			);
		if (tab === "orders")
			return (
				<>
					{headings([
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
					])}
					<TableBody>
						{orders.map((o) => (
							<TableRow key={o.id} className="transition-colors hover:bg-band">
								<TableCell className={cn(cell, "text-fg-secondary")}>{o.time}</TableCell>
								<TableCell className={cell}>{o.type}</TableCell>
								<TableCell className={cell}>
									<Coin coin={o.coin} />
								</TableCell>
								<TableCell className={cn(cell, o.buy ? "text-market-up" : "text-market-down")}>{o.direction}</TableCell>
								<TableCell className={num}>{o.size}</TableCell>
								<TableCell className={num}>{o.origSize}</TableCell>
								<TableCell className={num}>{o.value}</TableCell>
								<TableCell className={num}>{o.price}</TableCell>
								<TableCell className={cell}>{o.reduceOnly}</TableCell>
								<TableCell className={cn(cell, "text-fg-muted")}>{o.trigger}</TableCell>
								<TableCell className={cn(cell, "text-fg-muted")}>{o.tpsl}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</>
			);
		if (tab === "history")
			return (
				<>
					{headings([
						["Time", false],
						["Market", false],
						["Direction", false],
						["Price", true],
						["Size", true],
						["Trade Value", true],
						["Fee", true],
						["Closed PNL", true],
					])}
					<TableBody>
						{fills.map((f) => (
							<TableRow key={f.id} className="transition-colors hover:bg-band">
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
						))}
					</TableBody>
				</>
			);
		if (tab === "funding")
			return (
				<>
					{headings([
						["Time", false],
						["Market", false],
						["Size", true],
						["Side", false],
						["Payment", true],
						["Rate", true],
					])}
					<TableBody>
						{funding.map((f) => (
							<TableRow key={f.id} className="transition-colors hover:bg-band">
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
						))}
					</TableBody>
				</>
			);
		return (
			<>
				{headings([
					["Time", false],
					["Action", false],
					["Amount", true],
					["From", false],
					["To", false],
					["Fee", true],
				])}
				<TableBody>
					{ledger.map((l) => (
						<TableRow key={l.id} className="transition-colors hover:bg-band">
							<TableCell className={cn(cell, "text-fg-secondary")}>{l.time}</TableCell>
							<TableCell className={cell}>{l.action}</TableCell>
							<TableCell className={num}>{l.amount}</TableCell>
							<TableCell className={cell}>{l.from}</TableCell>
							<TableCell className={cell}>{l.to}</TableCell>
							<TableCell className={cn(num, "text-fg-muted")}>{l.fee}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</>
		);
	}

	return (
		<div className="min-w-0 overflow-auto scrollbar-none" style={{ maxHeight }}>
			<Table className="w-full min-w-max">{body()}</Table>
		</div>
	);
}

interface MobileProps {
	tab: TabId;
	limit?: number;
}

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

export function MobileTabRows({ tab, limit = 20 }: MobileProps) {
	const count = TABS.find((t) => t.id === tab)?.count ?? 0;
	if (count === 0) return <Empty>{emptyText(tab)}</Empty>;

	function rows() {
		if (tab === "balances")
			return balances.map((b) => (
				<Line
					key={b.id}
					left={
						<span className="inline-flex items-center gap-2">
							<Coin coin="USDC" />
							<span className="text-fg-muted">{b.tag}</span>
						</span>
					}
					sub={`Available ${b.available}`}
					right={b.value}
					rightSub={b.total}
				/>
			));
		if (tab === "positions")
			return positions.map((p) => (
				<Line
					key={p.coin}
					left={<Coin coin={p.coin} side={p.long ? "long" : "short"} chip={p.leverage} />}
					sub={`${p.size} at ${p.entry}`}
					right={<span className={pnlClass(p.pnl)}>{p.pnlText}</span>}
					rightSub={`${p.value} (${p.roe})`}
				/>
			));
		if (tab === "orders")
			return orders.map((o) => (
				<Line
					key={o.id}
					left={
						<span className="inline-flex items-center gap-2">
							<Coin coin={o.coin} />
							<span className={o.buy ? "text-market-up" : "text-market-down"}>{o.direction}</span>
						</span>
					}
					sub={`${o.type} ${o.size}`}
					right={o.price}
					rightSub={o.value}
				/>
			));
		if (tab === "history")
			return fills.slice(0, limit).map((f) => (
				<Line
					key={f.id}
					left={
						<span className="inline-flex items-center gap-2">
							<Coin coin={f.coin} />
							<span className={f.buy ? "text-market-up" : "text-market-down"}>{f.direction}</span>
						</span>
					}
					sub={`${f.size} at ${f.price}`}
					right={<span className={pnlClass(f.pnl)}>{f.pnlText}</span>}
					rightSub={f.time}
				/>
			));
		if (tab === "funding")
			return funding
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
		return ledger
			.slice(0, limit)
			.map((l) => <Line key={l.id} left={l.action} sub={`${l.from} to ${l.to}`} right={l.amount} rightSub={l.time} />);
	}

	return (
		<div className="flex flex-col">
			{rows()}
			{count > limit && (
				<div className="px-4 pt-2 pb-4">
					<Button variant="secondary" intent="neutral" size="md" className="w-full">
						Show all {count}
					</Button>
				</div>
			)}
		</div>
	);
}
