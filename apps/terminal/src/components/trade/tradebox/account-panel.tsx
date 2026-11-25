import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { ArrowsLeftRightIcon, DownloadSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useConnection } from "wagmi";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { RollingNumber } from "@/components/ui/rolling-number";
import { FALLBACK_VALUE_PLACEHOLDER } from "@/config/app";
import { useAllDexsAccountState } from "@/hooks/trade/use-account-balances";
import { formatPercent, formatUSD } from "@/lib/format";
import { useInfo } from "@/lib/hyperliquid";
import { spotUsdPrices, summarizeAccount } from "@/lib/positions/account-summary";
import { getValueColorClass } from "@/lib/ui/value-color";
import { useDepositModalActions } from "@/stores/use-global-modal-store";

type AccountMode = "unified" | "portfolio" | "standard";

export function AccountPanel() {
	const { open: openDepositModal } = useDepositModalActions();
	const { isConnected } = useConnection();
	const state = useAllDexsAccountState();
	const metaOptions = { enabled: isConnected, staleTime: 300_000 };
	const metas = useInfo("allPerpMetas", undefined, metaOptions);
	const dexs = useInfo("perpDexs", undefined, metaOptions);
	const spot = useInfo("spotMetaAndAssetCtxs", undefined, { enabled: isConnected, refetchInterval: 30_000 });

	const collateral: Record<string, number> = {};
	if (metas.data && dexs.data && !metas.isError && !dexs.isError) {
		metas.data.forEach((meta, index) => {
			const name = index === 0 ? "" : dexs.data?.[index]?.name;
			if (name !== undefined) collateral[name] = meta.collateralToken;
		});
	}
	const prices = spot.data ? spotUsdPrices(spot.data[0].universe, spot.data[1]) : { 0: 1 };

	const summary = summarizeAccount({
		states: state.clearinghouseStates,
		balances: state.spotBalances,
		mode: state.accountAbstraction,
		collateral,
		prices,
		ready: !state.isLoading && !state.hasError,
	});
	const mode = getAccountMode(state.accountAbstraction);
	const copy = getModeCopy(mode);

	return (
		<div className="flex shrink-0 flex-col gap-3 overflow-hidden p-3">
			{!isConnected ? (
				<>
					<h2 className="text-2xs font-medium uppercase tracking-micro text-fg-muted">{t`Account`}</h2>
					<p className="py-2 text-center text-xs text-fg-muted">{t`Connect wallet to view account`}</p>
				</>
			) : (
				<div className="flex flex-col gap-3 overflow-y-auto">
					<section aria-label={t`Account summary`} className="flex flex-col">
						<h3 className="flex min-h-6 items-center text-xs font-medium text-fg">{copy.title}</h3>
						<InfoRowGroup>
							<InfoRow
								label={<Hint label={copy.ratioLabel} text={copy.ratioHint} />}
								value={
									summary.ratio === null ? (
										FALLBACK_VALUE_PLACEHOLDER
									) : (
										<span className="inline-flex items-center gap-1.5">
											<RiskGauge ratio={summary.ratio} />
											{formatRatio(summary.ratio)}
										</span>
									)
								}
								valueClassName={getRatioColorClass(summary.ratio)}
							/>
							<InfoRow
								label={t`Portfolio Value`}
								value={
									summary.portfolioValue === null ? (
										FALLBACK_VALUE_PLACEHOLDER
									) : (
										<RollingNumber value={formatUSD(summary.portfolioValue, { compact: false })} />
									)
								}
							/>
							<InfoRow
								label={t`Unrealized PNL`}
								value={formatUSD(summary.unrealizedPnl, { compact: false })}
								valueClassName={
									summary.unrealizedPnl === null ? "text-fg-muted" : getValueColorClass(summary.unrealizedPnl)
								}
							/>
							<InfoRow
								label={
									<Hint
										label={t`Perps Maintenance Margin`}
										text={t`Cross maintenance margin reported by Hyperliquid, summed across perpetual DEXs for the selected account.`}
									/>
								}
								value={formatUSD(summary.maintenance, { compact: false })}
							/>
							<InfoRow
								label={<Hint label={copy.leverageLabel} text={copy.leverageHint} />}
								value={summary.leverage === null ? FALLBACK_VALUE_PLACEHOLDER : `${summary.leverage.toFixed(2)}x`}
							/>
						</InfoRowGroup>
					</section>

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
				</div>
			)}
		</div>
	);
}

interface HintProps {
	label: string;
	text: string;
}

function Hint({ label, text }: HintProps) {
	return (
		<span
			title={text}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users need focus to reveal the native title hint
			tabIndex={0}
			className="cursor-help underline decoration-fg-disabled decoration-dotted underline-offset-4"
		>
			{label}
		</span>
	);
}

interface RiskGaugeProps {
	ratio: number;
}

const GAUGE_ARC = "M3 16a13 13 0 0 1 26 0";

function RiskGauge({ ratio }: RiskGaugeProps) {
	const progress = Math.max(0, Math.min(1, ratio));
	return (
		<svg aria-hidden="true" viewBox="0 0 32 18" className="h-3.5 w-6 shrink-0">
			<path d={GAUGE_ARC} fill="none" stroke="currentColor" strokeWidth="6" className="text-control-hover" />
			<path
				d={GAUGE_ARC}
				fill="none"
				stroke="currentColor"
				strokeWidth="6"
				pathLength="1"
				strokeDasharray="0.75 0.25"
				className="text-success"
			/>
			<path
				d={GAUGE_ARC}
				fill="none"
				stroke="currentColor"
				strokeWidth="6"
				pathLength="1"
				strokeDasharray="0.25 0.75"
				strokeDashoffset="-0.75"
				className="text-error"
			/>
			<path
				d="M16 16v-9"
				stroke="currentColor"
				strokeWidth="2"
				className="text-fg"
				transform={`rotate(${-90 + 180 * progress} 16 16)`}
			/>
		</svg>
	);
}

function getAccountMode(abstraction: string | null): AccountMode {
	if (abstraction === "unifiedAccount") return "unified";
	if (abstraction === "portfolioMargin") return "portfolio";
	return "standard";
}

function getModeCopy(mode: AccountMode) {
	if (mode === "unified") {
		return {
			title: t`Unified Account Summary`,
			ratioLabel: t`Unified Account Ratio`,
			ratioHint: t`Highest collateral-token maintenance ratio across perpetual DEXs. Isolated margin is deducted from that token’s available balance. A higher ratio means less margin headroom.`,
			leverageLabel: t`Unified Account Leverage`,
			leverageHint: t`Cross-perpetual exposure divided by the value of balances used as perpetual collateral. Other spot holdings are excluded.`,
		};
	}
	const leverageLabel = t`Account Leverage`;
	const leverageHint = t`Total absolute perpetual position value across DEXs divided by portfolio value. This is account exposure, not an individual order’s leverage setting.`;
	if (mode === "portfolio") {
		return {
			title: t`Portfolio Margin Summary`,
			ratioLabel: t`Portfolio Margin Ratio`,
			ratioHint: t`Portfolio margin risk requires portfolio-specific collateral and borrowing data. It is unavailable in this summary.`,
			leverageLabel,
			leverageHint,
		};
	}
	return {
		title: t`Account Summary`,
		ratioLabel: t`Cross Margin Ratio`,
		ratioHint: t`Highest cross maintenance margin divided by cross account equity across perpetual DEXs.`,
		leverageLabel,
		leverageHint,
	};
}

function formatRatio(ratio: number) {
	if (ratio === Number.POSITIVE_INFINITY) return ">100%";
	return formatPercent(ratio, { maximumFractionDigits: 2, signDisplay: "never" });
}

function getRatioColorClass(ratio: number | null) {
	if (ratio === null) return "text-fg-muted";
	if (ratio >= 0.95) return "text-error";
	if (ratio >= 0.75) return "text-warning";
	return "text-success";
}
