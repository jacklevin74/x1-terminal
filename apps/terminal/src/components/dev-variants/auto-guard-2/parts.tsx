import { AdaptiveModal } from "@hypeterminal/ui";
import { XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { AutoBody, PanelShell } from "../auto-guard/panel";
import { account, coinLabel, type Position, positions, signedUsd, sizeText, usd } from "./data";

export function PanelBehind({ full = false }: { full?: boolean }) {
	return (
		<PanelShell mode="auto" live={false} onMode={() => {}} className={full ? "w-full rounded-none" : undefined}>
			<AutoBody live={false} onToggle={() => {}} />
		</PanelShell>
	);
}

interface SurfaceProps {
	mobile?: boolean;
	open: boolean;
	onClose: () => void;
	children: ReactNode;
}

export function Surface({ mobile = false, open, onClose, children }: SurfaceProps) {
	if (mobile)
		return (
			<div className="min-h-screen bg-background">
				<PanelBehind full />
				<AdaptiveModal open={open} onOpenChange={(next) => !next && onClose()} className="fixed text-fg">
					{children}
				</AdaptiveModal>
			</div>
		);
	return (
		<div className="relative flex h-[760px] w-[760px] flex-none items-start overflow-hidden rounded-8 bg-background">
			<div className="isolate ml-auto">
				<PanelBehind />
			</div>
			{open && <div className="absolute inset-0 bg-scrim" />}
			{open && (
				<div className="absolute inset-0 flex items-center justify-center p-6">
					<div className="mood-fade-in relative flex max-h-full w-full max-w-md flex-col overflow-y-auto rounded-16 bg-overlay text-fg shadow-menu">
						{children}
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							className="absolute top-3 right-3 grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-control hover:text-fg"
						>
							<XIcon className="size-4" weight="bold" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export function PositionLine({ p }: { p: Position }) {
	const long = p.szi > 0;
	return (
		<div className="flex items-center gap-2.5 text-xs">
			<AssetDisplay coin={p.coin} hideName iconClassName="size-5" />
			<span className="min-w-0 flex-1">
				<span className="block">
					{coinLabel(p.coin)}{" "}
					<span className={long ? "text-market-up" : "text-market-down"}>{long ? "Long" : "Short"}</span>{" "}
					<span className="text-fg-muted">{p.lev}</span>
				</span>
				<span className="block text-2xs text-fg-muted tabular-nums">{sizeText(p)}</span>
			</span>
			<span className="text-right tabular-nums">
				<span className="block">{usd(p.ntl)}</span>
				<span className={cn("block text-2xs", p.upnl >= 0 ? "text-market-up" : "text-market-down")}>
					{signedUsd(p.upnl)}
				</span>
			</span>
		</div>
	);
}

interface FieldsProps {
	name: string;
	amount: string;
	onName: (v: string) => void;
	onAmount: (v: string) => void;
	className?: string;
}

export function SubFields({ name, amount, onName, onAmount, className }: FieldsProps) {
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<label className="flex h-10 items-center justify-between gap-3 rounded-8 bg-control px-3 text-xs max-md:h-12 max-md:text-base">
				<span className="text-fg-muted">Name</span>
				<input
					value={name}
					onChange={(e) => onName(e.target.value)}
					className="min-w-0 flex-1 bg-transparent text-right outline-none"
				/>
			</label>
			<label className="flex h-10 items-center justify-between gap-3 rounded-8 bg-control px-3 text-xs max-md:h-12 max-md:text-base">
				<span className="text-fg-muted">USDC to move</span>
				<input
					value={amount}
					inputMode="decimal"
					placeholder="0.00"
					onChange={(e) => onAmount(e.target.value.replace(/[^\d.]/g, ""))}
					className="min-w-0 flex-1 bg-transparent text-right tabular-nums outline-none placeholder:text-fg-muted"
				/>
			</label>
			<div className="flex justify-between px-1 text-2xs text-fg-muted">
				<span>From Main account</span>
				<span className="tabular-nums">Account value {usd(account.equity, 2)}</span>
			</div>
		</div>
	);
}

const COLS = "grid grid-cols-[110px_120px_100px_80px_80px_90px_90px_1fr] items-center gap-3 px-3";

interface TableProps {
	closeAll: ReactNode;
	action: (p: Position) => ReactNode;
	expanded?: string | null;
	expansion?: (p: Position) => ReactNode;
	banner?: ReactNode;
}

export function PositionsTable({ closeAll, action, expanded, expansion, banner }: TableProps) {
	return (
		<div className="w-[1100px] rounded-8 bg-surface pb-1 text-xs">
			<div className="flex h-10 items-center gap-6 pr-2 pl-3 text-xs">
				<span className="text-fg-muted">Balances</span>
				<span className="font-medium">Positions ({positions.length})</span>
				<span className="text-fg-muted">Open Orders</span>
				<span className="text-fg-muted">Trade History</span>
				<span className="ml-auto">{closeAll}</span>
			</div>
			{banner}
			<div className={cn(COLS, "h-8 text-fg-muted")}>
				<span>Asset</span>
				<span>Size</span>
				<span className="text-right">Value</span>
				<span className="text-right">Entry</span>
				<span className="text-right">Mark</span>
				<span className="text-right">PNL</span>
				<span className="text-right">Liquidation</span>
				<span className="text-right">Close</span>
			</div>
			{positions.map((p) => {
				const long = p.szi > 0;
				return (
					<div key={p.coin}>
						<div className={cn(COLS, "min-h-10 py-1 tabular-nums", expanded === p.coin && "bg-control")}>
							<span className="flex items-center gap-2">
								<AssetDisplay coin={p.coin} hideName iconClassName="size-4" />
								<span className={long ? "text-market-up" : "text-market-down"}>{coinLabel(p.coin)}</span>
								<span className="text-2xs text-fg-muted">{p.lev.split(" ")[0]}</span>
							</span>
							<span className={long ? "text-market-up" : "text-market-down"}>{sizeText(p)}</span>
							<span className="text-right">{usd(p.ntl, 2)}</span>
							<span className="text-right">{p.entry}</span>
							<span className="text-right">{Number(p.mark.toPrecision(5))}</span>
							<span className={cn("text-right", p.upnl >= 0 ? "text-market-up" : "text-market-down")}>
								{signedUsd(p.upnl)}
							</span>
							<span className="text-right">{p.liq ? Number(p.liq.toPrecision(5)) : "-"}</span>
							<span className="flex justify-end">{action(p)}</span>
						</div>
						{expanded === p.coin && expansion?.(p)}
					</div>
				);
			})}
		</div>
	);
}
