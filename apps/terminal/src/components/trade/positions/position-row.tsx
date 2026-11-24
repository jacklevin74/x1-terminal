import { ButtonIcon, TableCell, TableRow, Tooltip } from "@hypeterminal/ui";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { LIQ_WARNING_PROXIMITY } from "@/config/trade";
import { cn } from "@/lib/cn";
import { formatPercent, formatToken, formatUSD } from "@/lib/format";
import { getPositionMarkPrice } from "@/lib/positions/valuation";
import { toBig } from "@/lib/trade/numbers";
import { PositionPnlShare } from "./position-pnl-share";
import { PositionRowActions } from "./position-row-actions";
import { getPositionRowModel } from "./position-row-model";
import type { PositionHeading, PositionRowProps } from "./position-row-types";
import { getMarketValueClass } from "./positions-panel-table-styles";

export const POSITION_HEADINGS: readonly PositionHeading[] = [
	{ label: "Asset", numeric: false },
	{ label: "Size", numeric: true },
	{ label: "Value", numeric: true },
	{ label: "Entry", numeric: true },
	{ label: "Mark", numeric: true },
	{ label: "PNL", numeric: true },
	{ label: "Liquidation", numeric: true },
	{ label: "Margin", numeric: true },
	{ label: "Funding", numeric: true },
	{ label: "TP / SL", numeric: true },
];

const cell = "h-8 whitespace-nowrap px-3 text-xs tabular-nums text-fg";
const num = cn(cell, "text-right");

export function PositionRow(props: PositionRowProps) {
	const m = getPositionRowModel(props);
	const { p } = m;
	const valuationMark = getPositionMarkPrice(p);
	const valuationMarkNum = toBig(valuationMark)?.toNumber() ?? Number.NaN;
	const liqPx = toBig(p.liquidationPx)?.toNumber();
	const liqIsNear =
		liqPx != null &&
		Number.isFinite(valuationMarkNum) &&
		Number.isFinite(liqPx) &&
		Math.abs(liqPx - valuationMarkNum) / valuationMarkNum <= LIQ_WARNING_PROXIMITY;
	return (
		<TableRow className="group border-0">
			<TableCell className={cn(cell, "relative")}>
				<span
					aria-hidden="true"
					className={cn("absolute inset-y-0.5 left-0 w-0.5 rounded-full", m.isLong ? "bg-market-up" : "bg-market-down")}
				/>
				<span
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute inset-y-0 left-0 w-40 bg-linear-to-r to-transparent",
						m.isLong ? "from-market-up/12" : "from-market-down/12",
					)}
				/>
				<button
					type="button"
					onClick={m.select}
					aria-label={`Switch to ${m.displayName}, ${m.isLong ? "long" : "short"}`}
					className="relative flex items-center gap-2 rounded-4 focus-visible:outline-2 focus-visible:outline-stroke-focus"
				>
					<AssetDisplay coin={p.coin} hideName iconClassName="size-5" />
					<span className="text-fg">{m.symbol}</span>
					<span className="text-fg-muted">{p.leverage.value}×</span>
					{props.autoManaged && (
						<span className="rounded-4 bg-control px-1.5 py-0.5 text-2xs text-fg-secondary">Auto</span>
					)}
				</button>
			</TableCell>
			<TableCell className={cn(num, m.isLong ? "text-market-up" : "text-market-down")}>
				{formatToken(m.absSize, { decimals: m.szDecimals, minimumFractionDigits: 0 })} {m.symbol}
			</TableCell>
			<TableCell className={num}>{formatUSD(p.positionValue, { compact: false })}</TableCell>
			<TableCell className={num}>${m.fmt(p.entryPx)}</TableCell>
			<TableCell className={num}>{valuationMark ? `$${m.fmt(valuationMark)}` : "—"}</TableCell>
			<TableCell className={num}>
				<div className="inline-flex items-center justify-end gap-1.5">
					<span className={getMarketValueClass(m.unrealizedPnl)}>
						{formatUSD(m.unrealizedPnl, { signDisplay: "always", compact: false })} (
						{formatPercent(p.returnOnEquity, { decimals: 2, signDisplay: "exceptZero" })})
					</span>
					<span className="text-fg-muted">
						<PositionPnlShare position={p} markPx={valuationMark} symbol={m.symbol} szDecimals={m.szDecimals} />
					</span>
				</div>
			</TableCell>
			<TableCell className={cn(num, liqIsNear && "text-market-down")}>
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
						<ButtonIcon
							variant="ghost"
							intent="neutral"
							size="xs"
							aria-label={`${m.tpSlLabel} for ${m.symbol}`}
							disabled={typeof m.assetId !== "number"}
							onClick={m.openTpSl}
						>
							<PencilSimpleIcon className="size-3.5 text-fg-muted" />
						</ButtonIcon>
					</Tooltip>
				</div>
			</TableCell>
			<TableCell
				className={cn(
					num,
					"sticky right-0 z-10 bg-surface transition-colors group-hover:bg-[color-mix(in_oklab,var(--color-control)_50%,var(--color-surface))]",
				)}
			>
				<PositionRowActions
					disabled={m.actionsDisabled}
					closing={props.isRowClosing}
					lockedCoin={props.autoManaged ? m.symbol : null}
					onLimit={m.limitClose}
					onMarket={m.close}
					onReverse={m.reverse}
				/>
			</TableCell>
		</TableRow>
	);
}
