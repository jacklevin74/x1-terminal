import { Button } from "@hypeterminal/ui";
import { CaretDownIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { AutoSettingsForm } from "@/components/trade/auto/auto-settings-form";
import { AutoStatusCard } from "@/components/trade/auto/auto-status-card";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { account, BOT, botMarkets, coinLabel, type Position, positions, signedUsd, sizeText, usd } from "./data";

export type Mode = "manual" | "auto";

interface ShellProps {
	mode: Mode;
	live: boolean;
	onMode: (mode: Mode) => void;
	children: ReactNode;
	className?: string;
}

export function PanelShell({ mode, live, onMode, children, className }: ShellProps) {
	return (
		<div className={cn("relative w-[328px] flex-none overflow-hidden rounded-8 bg-surface", className)}>
			<div className="flex bg-background">
				{(["manual", "auto"] as const).map((m) => {
					const on = mode === m;
					return (
						<button
							key={m}
							type="button"
							onClick={() => onMode(m)}
							className={cn(
								"flex h-9 flex-1 items-center justify-center gap-1.5 rounded-t-8 text-xs transition-colors",
								on ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg",
							)}
						>
							{m === "manual" ? "Manual" : "Auto"}
							{m === "auto" && (
								<span
									className={cn(
										"rounded-full px-1.5 py-px text-2xs",
										live ? "bg-success-soft text-market-up" : "bg-control text-fg-muted",
									)}
								>
									{live ? "Live" : "Paused"}
								</span>
							)}
						</button>
					);
				})}
			</div>
			{children}
		</div>
	);
}

export function ManualForm({
	disabled = false,
	className,
	cta,
}: {
	disabled?: boolean;
	className?: string;
	cta?: ReactNode;
}) {
	return (
		<div
			inert={disabled}
			className={cn("flex flex-col gap-3 px-3 pt-3 pb-3 transition-opacity", disabled && "opacity-35", className)}
		>
			<div className="grid grid-cols-2 gap-2">
				<span className="flex h-9 items-center justify-center rounded-8 bg-control text-xs">Cross</span>
				<span className="flex h-9 items-center justify-center rounded-8 bg-control text-xs">10x</span>
			</div>
			<div className="flex gap-5 text-xs">
				<span className="border-b border-fg pb-2 font-medium">Market</span>
				<span className="text-fg-muted">Limit</span>
				<span className="inline-flex items-center gap-1 text-fg-muted">
					More <CaretDownIcon className="size-3" />
				</span>
			</div>
			<div className="grid grid-cols-2 rounded-8 bg-control p-0.5 text-xs">
				<span className="flex h-8 items-center justify-center rounded-6 bg-market-up font-medium text-background">
					Long
				</span>
				<span className="flex h-8 items-center justify-center text-fg-muted">Short</span>
			</div>
			<div className="flex justify-between text-xs">
				<span className="text-fg-muted">Account value</span>
				<span className="tabular-nums">{usd(account.equity, 2)}</span>
			</div>
			<div className="flex h-10 items-center justify-between rounded-8 bg-control px-3 text-xs">
				<span className="text-fg-muted">Size</span>
				<span className="tabular-nums">
					<span className="text-fg-muted">0.00</span> HYPE
				</span>
			</div>
			<div className="flex items-center gap-3">
				<div className="relative h-1 flex-1 rounded-full bg-control">
					<span className="absolute top-1/2 left-0 size-3.5 -translate-y-1/2 rounded-full bg-fg" />
				</div>
				<span className="flex h-9 w-20 items-center justify-end gap-2 rounded-8 bg-control px-3 text-xs">
					<span className="text-fg-muted">0</span>%
				</span>
			</div>
			<div className="flex gap-5 text-xs">
				<span className="inline-flex items-center gap-2">
					<span className="size-4 rounded-4 bg-control" />
					Reduce Only
				</span>
				<span className="inline-flex items-center gap-2">
					<span className="size-4 rounded-4 bg-control" />
					TP/SL
				</span>
			</div>
			{cta ?? (
				<Button variant="filled" intent="neutral" size="lg" className="w-full">
					Place Order
				</Button>
			)}
			<dl className="flex flex-col gap-1.5 text-xs">
				{[
					["Liq. Price", "-"],
					["Order Value", "-"],
					["Margin Req.", "-"],
					["Slippage", "2.5%"],
					["Est. Fee", "0.0450%"],
					["Builder Fee", "0.05%"],
				].map(([k, v]) => (
					<div key={k} className="flex justify-between">
						<dt className="text-fg-muted">{k}</dt>
						<dd className="tabular-nums">{v}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

export function AutoBody({ live, onToggle, children }: { live: boolean; onToggle: () => void; children?: ReactNode }) {
	return (
		<div className="flex flex-col gap-4 px-3 pt-4 pb-3">
			<AutoStatusCard
				on={live}
				title={live ? "Trading" : "Paused"}
				subtitle={live ? "Next cycle in 3:12" : "Positions stay open"}
				equity={usd(account.equity, 2)}
				markets={botMarkets}
				actionLabel={live ? "Pause" : "Start"}
				busy={false}
				disabled={false}
				onToggle={onToggle}
				onMarkets={() => {}}
			/>
			{children}
			<AutoSettingsForm saved={BOT} saving={false} disabled={false} onSave={() => {}} />
		</div>
	);
}

export function ModalCard({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
	return (
		<div className="mood-fade-in relative flex w-full max-w-sm flex-col rounded-16 bg-overlay text-fg shadow-menu">
			<div className="flex flex-col gap-1 border-b border-stroke-weak p-4 pr-14">
				<h2 className="text-base font-medium text-balance">{title}</h2>
			</div>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="absolute top-3 right-3 grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-control hover:text-fg"
				>
					<XIcon className="size-4" weight="bold" />
				</button>
			)}
			<div className="flex flex-col gap-4 p-4">{children}</div>
		</div>
	);
}

export function ModalStage({ children, behind, open }: { children: ReactNode; behind: ReactNode; open: boolean }) {
	return (
		<div className="relative flex min-h-[820px] w-[760px] items-start overflow-hidden rounded-8 bg-background">
			<div className="isolate ml-auto">{behind}</div>
			{open && <div className="absolute inset-0 bg-scrim" />}
			{open && <div className="absolute inset-0 flex items-center justify-center p-6">{children}</div>}
		</div>
	);
}

export function PositionMini({ p, aside }: { p: Position; aside?: ReactNode }) {
	const long = p.szi > 0;
	return (
		<div className="flex items-center gap-2.5 text-xs">
			<AssetDisplay coin={p.coin} hideName iconClassName="size-5" />
			<span className="min-w-0 flex-1">
				<span className="block">
					{coinLabel(p.coin)}{" "}
					<span className={long ? "text-market-up" : "text-market-down"}>{long ? "Long" : "Short"}</span>
				</span>
				<span className="block text-2xs text-fg-muted tabular-nums">
					{usd(p.ntl)}, PNL{" "}
					<span className={p.upnl >= 0 ? "text-market-up" : "text-market-down"}>{signedUsd(p.upnl)}</span>
				</span>
			</span>
			{aside}
		</div>
	);
}

const COLS = "grid grid-cols-[120px_120px_90px_80px_80px_100px_80px_1fr] items-center gap-3 px-3";

export function PositionsTable({ action }: { action: (p: Position) => ReactNode }) {
	return (
		<div className="w-[1000px] rounded-8 bg-surface pb-1 text-xs">
			<div className="flex h-10 items-center gap-6 px-3 text-xs">
				<span className="text-fg-muted">Balances</span>
				<span className="font-medium">Positions ({positions.length})</span>
				<span className="text-fg-muted">Open Orders</span>
				<span className="text-fg-muted">Trade History</span>
			</div>
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
					<div key={p.coin} className={cn(COLS, "min-h-10 py-1 tabular-nums")}>
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
				);
			})}
		</div>
	);
}

export function RowButtons({ disabled, onClick }: { disabled?: boolean; onClick?: () => void }) {
	return (
		<span className="inline-flex items-center gap-1">
			{["Limit", "Market", "Reverse"].map((label) => (
				<Button key={label} variant="secondary" intent="neutral" size="xs" disabled={disabled} onClick={onClick}>
					{label}
				</Button>
			))}
		</span>
	);
}
