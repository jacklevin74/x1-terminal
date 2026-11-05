import { Badge, Button, ButtonIcon } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import {
	ArrowsLeftRightIcon,
	DownloadSimpleIcon,
	SignOutIcon,
	UploadSimpleIcon,
	WalletIcon,
} from "@phosphor-icons/react";
import { Skeleton } from "boneyard-js/react";
import { useState } from "react";
import { useConnection, useDisconnect } from "wagmi";
import { CopyStateIcon } from "@/components/ui/copy-state-icon";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { UI_TEXT } from "@/config/ui-text";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { cn } from "@/lib/cn";
import { formatPercent, formatUSD } from "@/lib/format";
import { toNumberOrZero } from "@/lib/trade/numbers";
import { useDepositModalActions } from "@/stores/use-global-modal-store";
import { WalletModal } from "../components/wallet-modal";
import { MobileBottomNavSpacer } from "./mobile-bottom-nav";

const ACCOUNT_TEXT = UI_TEXT.ACCOUNT_PANEL;

interface MobileAccountViewProps {
	className?: string;
}

export function MobileAccountView({ className }: MobileAccountViewProps) {
	const { address, isConnected } = useConnection();
	const disconnect = useDisconnect();

	const { marginSummary, perpSummary, perpPositions, withdrawable, crossMaintenanceMarginUsed, isLoading } =
		useDefaultDexBalances();

	const [walletModalOpen, setWalletModalOpen] = useState(false);
	const { copied, copy } = useCopyToClipboard();
	const { open: openDepositModal } = useDepositModalActions();

	function handleCopyAddress() {
		if (!address) return;
		copy(address);
	}

	const accountValue = toNumberOrZero(marginSummary?.accountValue);
	const totalMarginUsed = toNumberOrZero(marginSummary?.totalMarginUsed);
	const totalRawUsd = toNumberOrZero(marginSummary?.totalRawUsd);
	const crossAccountValue = toNumberOrZero(perpSummary?.accountValue);
	const crossNtlPos = toNumberOrZero(perpSummary?.totalNtlPos);
	const maintenanceMargin = toNumberOrZero(crossMaintenanceMarginUsed);
	const availableBalance = toNumberOrZero(withdrawable);
	const marginRatio = crossAccountValue > 0 ? maintenanceMargin / crossAccountValue : 0;
	const crossLeverage = crossAccountValue > 0 ? Math.abs(crossNtlPos) / crossAccountValue : 0;

	let unrealizedPnl = 0;
	for (const pos of perpPositions) {
		unrealizedPnl += toNumberOrZero(pos.position.unrealizedPnl);
	}

	if (!isConnected) {
		return (
			<div className={cn("flex flex-col h-full min-h-0 bg-surface", className)}>
				<div className="flex-1 flex flex-col items-center justify-center gap-4 px-3 py-6 text-center">
					<div className="size-12 rounded-full bg-control flex items-center justify-center">
						<WalletIcon className="size-6 text-fg-muted" />
					</div>
					<div className="flex flex-col gap-2">
						<h2 className="text-lg font-medium text-fg">{t`Connect Wallet`}</h2>
						<p className="text-xs text-fg-muted max-w-xs text-pretty">
							{t`Connect your wallet to view your account, positions, and start trading.`}
						</p>
					</div>
					<Button variant="filled" intent="brand" size="md" onClick={() => setWalletModalOpen(true)}>
						{t`Connect Wallet`}
					</Button>
				</div>
				<MobileBottomNavSpacer />
				<WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col h-full min-h-0 bg-surface", className)}>
			<div className="shrink-0 h-14 px-3 flex items-center justify-between gap-3 border-b border-stroke-weak">
				<div className="flex min-w-0 items-center gap-3">
					<div className="size-8 shrink-0 rounded-full bg-control flex items-center justify-center">
						<span className="text-xs font-medium text-fg">{address?.slice(2, 4).toUpperCase()}</span>
					</div>
					<div className="flex min-w-0 flex-col gap-0.5">
						<div className="flex items-center gap-1">
							<span className="text-xs font-medium tabular-nums text-fg">
								{address?.slice(0, 6)}...{address?.slice(-4)}
							</span>
							<ButtonIcon
								variant="ghost"
								intent="neutral"
								size="xs"
								onClick={handleCopyAddress}
								aria-label={t`Copy address`}
							>
								<CopyStateIcon copied={copied} announcement={t`Address copied`} className="size-3.5" />
							</ButtonIcon>
						</div>
						<Badge tone="neutral" size="xs" className="self-start">
							{t`Cross Margin`}
						</Badge>
					</div>
				</div>
				<ButtonIcon
					variant="ghost"
					intent="neutral"
					size="sm"
					onClick={() => disconnect.mutate()}
					aria-label={t`Disconnect wallet`}
				>
					<SignOutIcon className="size-4" />
				</ButtonIcon>
			</div>

			<div className="flex-1 min-h-0 overflow-y-auto">
				<div className="flex flex-col gap-4 px-3 py-4">
					<Skeleton name="account-equity" loading={isLoading}>
						<div className="flex flex-col gap-1">
							<div className="text-2xs uppercase tracking-micro text-fg-muted">{ACCOUNT_TEXT.EQUITY_LABEL}</div>
							<div className="text-base font-medium tabular-nums text-fg">{formatUSD(accountValue)}</div>
							<div className={cn("text-xs tabular-nums", unrealizedPnl >= 0 ? "text-market-up" : "text-market-down")}>
								{unrealizedPnl >= 0 ? "+" : ""}
								{formatUSD(unrealizedPnl)} <span className="text-fg-muted">{ACCOUNT_TEXT.UNREALIZED_LABEL}</span>
							</div>
						</div>
					</Skeleton>

					<div className="grid grid-cols-3 gap-2">
						<Button
							variant="secondary"
							intent="neutral"
							size="sm"
							onClick={() => openDepositModal("withdraw")}
							iconLeft={<UploadSimpleIcon className="size-4" />}
						>
							{ACCOUNT_TEXT.WITHDRAW_LABEL}
						</Button>
						<Button
							variant="secondary"
							intent="neutral"
							size="sm"
							onClick={() => openDepositModal("deposit")}
							iconLeft={<DownloadSimpleIcon className="size-4" />}
						>
							{ACCOUNT_TEXT.DEPOSIT_LABEL}
						</Button>
						<Button
							variant="secondary"
							intent="neutral"
							size="sm"
							onClick={() => openDepositModal("bridge")}
							iconLeft={<ArrowsLeftRightIcon className="size-4" />}
						>
							{t`Bridge`}
						</Button>
					</div>

					<InfoRowGroup className="border-t border-stroke-weak pt-2">
						<StatRow label={ACCOUNT_TEXT.BALANCE_LABEL} value={formatUSD(totalRawUsd)} isLoading={isLoading} />
						<StatRow label={ACCOUNT_TEXT.AVAILABLE_LABEL} value={formatUSD(availableBalance)} isLoading={isLoading} />
						<StatRow label={ACCOUNT_TEXT.MARGIN_USED_LABEL} value={formatUSD(totalMarginUsed)} isLoading={isLoading} />
						<StatRow
							label={ACCOUNT_TEXT.MARGIN_RATIO_LABEL}
							value={formatPercent(marginRatio)}
							valueClass={getMarginRatioClass(marginRatio)}
							isLoading={isLoading}
						/>
						<StatRow label={t`Maintenance Margin`} value={formatUSD(maintenanceMargin)} isLoading={isLoading} />
						<StatRow
							label={ACCOUNT_TEXT.CROSS_LEVERAGE_LABEL}
							value={`${crossLeverage.toFixed(2)}x`}
							isLoading={isLoading}
						/>
					</InfoRowGroup>
				</div>
			</div>

			<MobileBottomNavSpacer />
		</div>
	);
}

function getMarginRatioClass(marginRatio: number): string | undefined {
	if (marginRatio > 0.8) return "text-market-down";
	if (marginRatio > 0.5) return "text-warning";
	return undefined;
}

interface StatCardProps {
	label: string;
	value: string;
	valueClass?: string;
	isLoading?: boolean;
}

function StatRow({ label, value, valueClass, isLoading }: StatCardProps) {
	return (
		<InfoRow
			label={label}
			value={
				<Skeleton name="stat-card-value" loading={isLoading ?? false}>
					<span>{value}</span>
				</Skeleton>
			}
			valueClassName={valueClass}
		/>
	);
}
