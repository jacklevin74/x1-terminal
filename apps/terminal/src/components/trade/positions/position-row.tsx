import { ButtonIcon, TableCell, TableRow, Tooltip } from "@hypeterminal/ui";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { formatPercent, formatToken, formatUSD } from "@/lib/format";
import { PositionPnlShare } from "./position-pnl-share";
import { PositionRowActions } from "./position-row-actions";
import { getPositionRowModel } from "./position-row-model";
import type { PositionHeading, PositionRowProps } from "./position-row-types";
import { getMarketValueClass } from "./positions-panel-table-styles";

const n = (v: unknown) => Number(v) || 0;

export const POSITION_HEADINGS: readonly PositionHeading[] = [
	{ label: "Asset", numeric: false, sortBy: (p) => p.coin.charCodeAt(0) },
	{ label: "Size", numeric: true, sortBy: (p) => Math.abs(n(p.szi)) },
	{ label: "Value", numeric: true, sort: true },
	{ label: "Entry", numeric: true, sortBy: (p) => n(p.entryPx) },
	{ label: "Mark", numeric: true, sortBy: (p) => n(p.positionValue) / Math.max(Math.abs(n(p.szi)), 1e-12) },
	{ label: "PNL", numeric: true, sortBy: (p) => n(p.unrealizedPnl) },
	{ label: "Liquidation", numeric: true, sortBy: (p) => n(p.liquidationPx) },
	{ label: "Margin", numeric: true, sortBy: (p) => n(p.marginUsed) },
	{ label: "Funding", numeric: true, sortBy: (p) => -n(p.cumFunding.sinceOpen) },
	{ label: "TP / SL", numeric: true },
];

const cell = "h-10 whitespace-nowrap px-3 text-xs tabular-nums text-fg";
const num = cn(cell, "text-right");

export function PositionRow(props: PositionRowProps) {
	const m = getPositionRowModel(props);
	const { p } = m;
	return (
		<TableRow className="group border-0">
			<TableCell className={cell}>
				<button
					type="button"
					onClick={m.select}
					aria-label={`Switch to ${m.displayName}, ${m.isLong ? "long" : "short"}`}
					className="flex items-center gap-2 rounded-4 focus-visible:outline-2 focus-visible:outline-stroke-focus"
				>
					<AssetDisplay coin={p.coin} hideName iconClassName="size-5" />
					<span className="text-fg">{m.symbol}</span>
					<span
						className={cn(
							"rounded-4 px-1.5 py-0.5 text-2xs",
							m.isLong ? "bg-success-soft text-market-up" : "bg-error-soft text-market-down",
						)}
					>
						{p.leverage.value}×
					</span>
				</button>
			</TableCell>
			<TableCell className={num}>
				{formatToken(m.absSize, { decimals: m.szDecimals, minimumFractionDigits: 0 })} {m.symbol}
			</TableCell>
			<TableCell className={num}>{formatUSD(p.positionValue, { compact: false })}</TableCell>
			<TableCell className={num}>${m.fmt(p.entryPx)}</TableCell>
			<TableCell className={num}>${m.fmt(m.markPx)}</TableCell>
			<TableCell className={num}>
				<div className="inline-flex items-center justify-end gap-1.5">
					<span className={getMarketValueClass(m.unrealizedPnl)}>
						{formatUSD(m.unrealizedPnl, { signDisplay: "always", compact: false })} (
						{formatPercent(p.returnOnEquity, { decimals: 2, signDisplay: "exceptZero" })})
					</span>
					<span className="text-fg-muted">
						<PositionPnlShare position={p} markPx={props.markPx} symbol={m.symbol} szDecimals={m.szDecimals} />
					</span>
				</div>
			</TableCell>
			<TableCell className={cn(num, m.liqIsNear && "text-market-down")}>
				{p.liquidationPx === null ? "—" : `$${m.fmt(p.liquidationPx)}`}
			</TableCell>
			<TableCell className={num}>{formatUSD(p.marginUsed, { compact: false })}</TableCell>
			<TableCell className={num}>{formatUSD(m.funding, { signDisplay: "exceptZero", compact: false })}</TableCell>
			<TableCell className={num}>
				<div className="inline-flex items-center justify-end gap-1">
					<span>{m.tpText ?? "—"}</span>
					<span className="text-fg-muted">/</span>
					<span>{m.slText ?? "—"}</span>
					<Tooltip content={m.tpSlLabel}>
						<ButtonIcon variant="ghost" intent="neutral" size="xs" aria-label={m.tpSlLabel} onClick={m.openTpSl}>
							<PencilSimpleIcon className="size-3.5 text-fg-muted" />
						</ButtonIcon>
					</Tooltip>
				</div>
			</TableCell>
			<TableCell className={num}>
				<PositionRowActions
					disabled={m.actionsDisabled}
					closing={props.isRowClosing}
					onLimit={m.limitClose}
					onMarket={m.close}
					onReverse={m.reverse}
				/>
			</TableCell>
		</TableRow>
	);
}
