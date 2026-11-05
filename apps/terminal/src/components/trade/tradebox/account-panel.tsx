import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { ArrowsLeftRightIcon, DownloadSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useConnection } from "wagmi";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { RollingNumber } from "@/components/ui/rolling-number";
import { DEFAULT_QUOTE_TOKEN, FALLBACK_VALUE_PLACEHOLDER } from "@/config/app";
import { getSpotAvailableValue } from "@/domain/trade/balances";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { formatPercent, formatUSD } from "@/lib/format";
import { toNumberOrZero } from "@/lib/trade/numbers";
import { getValueColorClass } from "@/lib/ui/value-color";
import { useDepositModalActions } from "@/stores/use-global-modal-store";

type SummaryRow = {
	label: string;
	value: string;
	valueClassName?: string;
	rolling?: boolean;
};

export function AccountPanel() {
	const { open: openDepositModal } = useDepositModalActions();
	const { isConnected } = useConnection();
	const {
		marginSummary,
		perpSummary,
		perpPositions,
		spotBalances,
		spotAvailableAfterMaintenance,
		crossMaintenanceMarginUsed,
	} = useDefaultDexBalances();

	let perpMetrics = null;
	if (marginSummary && perpSummary) {
		const crossAccountValue = toNumberOrZero(perpSummary.accountValue);
		const crossTotalNtlPos = toNumberOrZero(perpSummary.totalNtlPos);
		const maintenanceMargin = toNumberOrZero(crossMaintenanceMarginUsed);

		let unrealizedPnl = 0;
		for (const pos of perpPositions) {
			unrealizedPnl += toNumberOrZero(pos.position.unrealizedPnl);
		}

		const balance = crossAccountValue - unrealizedPnl;
		const marginRatio = crossAccountValue > 0 ? maintenanceMargin / crossAccountValue : 0;
		const crossLeverage = crossAccountValue > 0 ? Math.abs(crossTotalNtlPos) / crossAccountValue : 0;

		perpMetrics = {
			accountValue: crossAccountValue,
			balance,
			unrealizedPnl,
			marginRatio,
			crossLeverage,
			maintenanceMargin,
		};
	}

	let spotMetrics = null;
	if (isConnected) {
		let totalValue = 0;
		const tokens: Array<{ coin: string; total: number; available: number; usdValue: number }> = [];

		for (const b of spotBalances) {
			const total = toNumberOrZero(b.total);
			const entryNtl = toNumberOrZero(b.entryNtl);

			if (total === 0) continue;

			const available = toNumberOrZero(getSpotAvailableValue(b, spotAvailableAfterMaintenance));
			const usdValue = b.coin === DEFAULT_QUOTE_TOKEN ? total : entryNtl;

			totalValue += usdValue;
			tokens.push({ coin: b.coin, total, available, usdValue });
		}

		tokens.sort((a, b) => b.usdValue - a.usdValue);
		spotMetrics = { totalValue, topTokens: tokens.slice(0, 3) };
	}

	const hasPerpData = isConnected && perpMetrics !== null;
	const hasSpotData = isConnected && spotMetrics !== null;

	const perpRows: SummaryRow[] = perpMetrics
		? [
				{
					label: t`Balance`,
					value: formatUSD(perpMetrics.balance),
					rolling: true,
				},
				{
					label: t`Unrealized PNL`,
					value: formatUSD(perpMetrics.unrealizedPnl, { signDisplay: "exceptZero" }),
					valueClassName: getValueColorClass(perpMetrics.unrealizedPnl),
					rolling: true,
				},
				{
					label: t`Cross Margin Ratio`,
					value: formatPercent(perpMetrics.marginRatio, { maximumFractionDigits: 2 }),
				},
				{
					label: t`Maintenance Margin`,
					value: formatUSD(perpMetrics.maintenanceMargin),
				},
				{
					label: t`Cross Account Leverage`,
					value: `${perpMetrics.crossLeverage.toFixed(2)}x`,
				},
			]
		: [];

	return (
		<div className="flex shrink-0 flex-col gap-3 overflow-hidden p-3">
			<h2 className="text-2xs font-medium uppercase tracking-micro text-fg-muted">{t`Account`}</h2>

			{!isConnected ? (
				<p className="py-2 text-center text-xs text-fg-muted">{t`Connect wallet to view account`}</p>
			) : (
				<div className="flex flex-col gap-3 overflow-y-auto">
					<section className="flex flex-col">
						<h3 className="flex min-h-6 items-center text-xs font-medium text-fg">{t`Account Equity`}</h3>
						<InfoRowGroup>
							<InfoRow
								label={t`Spot`}
								value={
									spotMetrics ? <RollingNumber value={formatUSD(spotMetrics.totalValue)} /> : FALLBACK_VALUE_PLACEHOLDER
								}
							/>
							<InfoRow
								label={t`Perps`}
								value={
									perpMetrics ? (
										<RollingNumber value={formatUSD(perpMetrics.accountValue)} />
									) : (
										FALLBACK_VALUE_PLACEHOLDER
									)
								}
							/>
						</InfoRowGroup>
					</section>

					{hasPerpData && (
						<section className="flex flex-col">
							<h3 className="flex min-h-6 items-center text-xs font-medium text-fg">{t`Perps Overview`}</h3>
							<InfoRowGroup>
								{perpRows.map((row) => (
									<InfoRow
										key={row.label}
										label={row.label}
										value={row.rolling ? <RollingNumber value={row.value} /> : row.value}
										valueClassName={row.valueClassName}
									/>
								))}
							</InfoRowGroup>
						</section>
					)}

					{(hasPerpData || hasSpotData) && (
						<div className="grid grid-cols-3 gap-2">
							<Button
								variant="secondary"
								intent="neutral"
								size="sm"
								onClick={() => openDepositModal("withdraw")}
								aria-label={t`Withdraw`}
								iconLeft={<UploadSimpleIcon className="size-4" />}
							>
								{t`Withdraw`}
							</Button>
							<Button
								variant="secondary"
								intent="neutral"
								size="sm"
								onClick={() => openDepositModal("deposit")}
								aria-label={t`Deposit`}
								iconLeft={<DownloadSimpleIcon className="size-4" />}
							>
								{t`Deposit`}
							</Button>
							<Button
								variant="secondary"
								intent="neutral"
								size="sm"
								onClick={() => openDepositModal("bridge")}
								aria-label={t`Bridge`}
								iconLeft={<ArrowsLeftRightIcon className="size-4" />}
							>
								{t`Bridge`}
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
