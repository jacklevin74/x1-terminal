import {
	Button,
	ButtonIcon,
	Modal,
	ModalContent,
	ModalDescription,
	ModalHeader,
	ModalPopup,
	ModalTitle,
} from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowsDownUpIcon, CaretDownIcon, CheckIcon, SpinnerGapIcon, WarningIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { NumberInput } from "@/components/ui/number-input";
import { DEFAULT_QUOTE_TOKEN } from "@/config/app";
import { SWAP_SUCCESS_DURATION_MS } from "@/config/time";
import { getSpotAvailable, getSpotBalance } from "@/domain/trade/balances";
import { buildOrderPlan } from "@/domain/trade/order-intent";
import { findSpotPair, getAvailablePairTokens, getSwapSide } from "@/domain/trade/swap";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { useSubmitPlan } from "@/hooks/trade/use-submit-plan";
import { useAutoCloseSuccess } from "@/hooks/ui/use-auto-close-success";
import { cn } from "@/lib/cn";
import { formatToken } from "@/lib/format";
import { useMarketsInfo } from "@/lib/hyperliquid/hooks/useMarketsInfo";
import { toNumber, toNumberOrZero } from "@/lib/trade/numbers";
import {
	useSwapModalActions,
	useSwapModalFromToken,
	useSwapModalOpen,
	useSwapModalToToken,
} from "@/stores/use-global-modal-store";
import { TokenSelectorDropdown } from "./token-selector-dropdown";
import { TradingActionButton } from "./trading-action-button";

const DEFAULT_SLIPPAGE_BPS = 100;

const quickFillChipClass =
	"bg-control-hover text-fg-muted hover:text-fg data-disabled:bg-control-hover data-disabled:text-fg-disabled";

export function SpotSwapModal() {
	const isOpen = useSwapModalOpen();
	const initialFromToken = useSwapModalFromToken() ?? DEFAULT_QUOTE_TOKEN;
	const initialToToken = useSwapModalToToken();
	const { close } = useSwapModalActions();

	if (!isOpen) return null;

	return <SpotSwapModalContent initialFromToken={initialFromToken} initialToToken={initialToToken} onClose={close} />;
}

interface Props {
	embedded?: boolean;
	fixedPair?: boolean;
	reserveFromBalance?: number;
	onSubmitted?: () => void;
	onBusyChange?: (busy: boolean) => void;
	contextNote?: string;
	initialFromToken: string;
	initialToToken?: string;
	onClose: () => void;
}

export function SpotSwapModalContent({
	initialFromToken,
	initialToToken,
	onClose,
	fixedPair = false,
	reserveFromBalance = 0,
	onSubmitted,
	onBusyChange,
	contextNote,
	embedded = false,
}: Props) {
	const { spotMarkets } = useMarketsInfo();
	const { spotBalances, spotAvailableAfterMaintenance } = useDefaultDexBalances();
	const { submitPlan, isSubmitting } = useSubmitPlan();

	const defaultToToken = useMemo(() => {
		if (initialToToken) return initialToToken;
		const pairs = getAvailablePairTokens(initialFromToken, spotMarkets);
		return pairs[0]?.name ?? "";
	}, [initialFromToken, initialToToken, spotMarkets]);

	const [fromToken, setFromToken] = useState(initialFromToken);
	const [toToken, setToToken] = useState(defaultToToken);
	const [amount, setAmount] = useState("");
	const [error, setError] = useState<string | null>(null);
	const { showSuccess, trigger: triggerAutoClose } = useAutoCloseSuccess(onClose, SWAP_SUCCESS_DURATION_MS);

	const getTokenBalance = useCallback(
		(token: string) => {
			const balance = getSpotBalance(spotBalances, token);
			return getSpotAvailable(balance, spotAvailableAfterMaintenance);
		},
		[spotBalances, spotAvailableAfterMaintenance],
	);

	const fromBalance = getTokenBalance(fromToken);
	const maxSpend =
		reserveFromBalance > 0
			? Math.max(0, fromBalance - reserveFromBalance) / (1 + DEFAULT_SLIPPAGE_BPS / 10_000)
			: fromBalance;
	useEffect(() => {
		onBusyChange?.(isSubmitting);
		return () => onBusyChange?.(false);
	}, [isSubmitting, onBusyChange]);
	const toBalance = getTokenBalance(toToken);

	const availableFromTokens = useMemo(() => {
		if (!toToken) return [];
		return getAvailablePairTokens(toToken, spotMarkets);
	}, [toToken, spotMarkets]);

	const availableToTokens = useMemo(() => {
		if (!fromToken) return [];
		return getAvailablePairTokens(fromToken, spotMarkets);
	}, [fromToken, spotMarkets]);

	const spotMarket = useMemo(() => {
		if (!fromToken || !toToken) return null;
		return findSpotPair(fromToken, toToken, spotMarkets);
	}, [fromToken, toToken, spotMarkets]);

	const markPx = toNumberOrZero(spotMarket?.markPx);
	const szDecimals = spotMarket?.szDecimals ?? 2;
	const baseToken = spotMarket?.tokensInfo[0]?.name ?? "";
	const isBuying = spotMarket ? getSwapSide(fromToken, spotMarket) : false;

	const amountValue = toNumber(amount) ?? 0;

	const { estimatedReceive, orderSize } = useMemo(() => {
		if (amountValue <= 0 || markPx <= 0) {
			return { estimatedReceive: 0, orderSize: 0 };
		}

		if (isBuying) {
			const size = amountValue / markPx;
			return { estimatedReceive: size, orderSize: size };
		}
		const receive = amountValue * markPx;
		return { estimatedReceive: receive, orderSize: amountValue };
	}, [amountValue, markPx, isBuying]);

	const rate = useMemo(() => {
		if (markPx <= 0) return 0;
		if (fromToken === baseToken) {
			return markPx;
		}
		return 1 / markPx;
	}, [markPx, fromToken, baseToken]);

	function handleFlip() {
		const newFrom = toToken;
		const newTo = fromToken;
		setFromToken(newFrom);
		setToToken(newTo);
		setAmount("");
		setError(null);
	}

	function handleFromTokenChange(token: string) {
		setFromToken(token);
		setAmount("");
		setError(null);

		const pairs = getAvailablePairTokens(token, spotMarkets);
		if (!pairs.some((p) => p.name === toToken)) {
			setToToken(pairs[0]?.name ?? "");
		}
	}

	function handleToTokenChange(token: string) {
		setToToken(token);
		setError(null);

		const pairs = getAvailablePairTokens(token, spotMarkets);
		if (!pairs.some((p) => p.name === fromToken)) {
			setFromToken(pairs[0]?.name ?? "");
			setAmount("");
		}
	}

	function handleMaxClick() {
		setAmount(String(maxSpend));
	}

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open && !isSubmitting) onClose();
		},
		[onClose, isSubmitting],
	);

	const handleSubmit = useCallback(async () => {
		if (!spotMarket || orderSize <= 0 || amountValue <= 0 || amountValue > maxSpend || isSubmitting) return;

		setError(null);

		const plan = buildOrderPlan({
			kind: "swap",
			assetId: spotMarket.assetId,
			isBuy: isBuying,
			sizeValue: orderSize,
			szDecimals,
			markPx,
			slippageBps: DEFAULT_SLIPPAGE_BPS,
		});

		if (
			reserveFromBalance > 0 &&
			isBuying &&
			plan.orders.some((order) => Number(order.p) * Number(order.s) > fromBalance - reserveFromBalance)
		) {
			setError("Reduce the swap amount slightly to leave the withdrawal activation reserve.");
			return;
		}
		const result = await submitPlan(plan);
		if (result.ok) {
			onSubmitted?.();
			triggerAutoClose();
		} else {
			setError(result.error || t`Swap failed`);
		}
	}, [
		spotMarket,
		orderSize,
		isSubmitting,
		isBuying,
		markPx,
		szDecimals,
		submitPlan,
		triggerAutoClose,
		onSubmitted,
		amountValue,
		maxSpend,
		reserveFromBalance,
		fromBalance,
	]);

	const insufficientBalance = amountValue > maxSpend;
	const noPairAvailable = fromToken && toToken && !spotMarket;
	const canSubmit = amountValue > 0 && !insufficientBalance && orderSize > 0 && !showSuccess && spotMarket;
	const isDisabled = isSubmitting || showSuccess;

	const fromName = spotMarket?.tokensInfo.find((token) => token.name === fromToken)?.displayName ?? fromToken;
	const toName = spotMarket?.tokensInfo.find((token) => token.name === toToken)?.displayName ?? toToken;

	if (embedded) {
		return (
			<>
				<ModalHeader className="sr-only">
					<ModalTitle>
						Swap {fromName} to {toName}
					</ModalTitle>
				</ModalHeader>
				<ModalContent className="space-y-3">
					<div className="flex min-h-6 items-center justify-between text-xs">
						<span className="font-medium text-fg">
							Swap {fromName} → {toName}
						</span>
						<span className="text-fg-muted tabular-nums">
							{formatToken(fromBalance, { decimals: 2, symbol: fromName })}
						</span>
					</div>
					<NumberInput
						aria-label="Swap amount"
						inlineLabel={`Amount (${fromName})`}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						disabled={isDisabled}
						placeholder="0.00"
						maxLabel="Max"
						onMaxClick={handleMaxClick}
						invalid={insufficientBalance}
					/>
					<InfoRowGroup>
						<InfoRow label="Estimated receive" value={formatToken(estimatedReceive, { decimals: 6, symbol: toName })} />
						<InfoRow label="Slippage" value={`${DEFAULT_SLIPPAGE_BPS / 100}%`} />
						{reserveFromBalance > 0 && (
							<InfoRow label="USDC kept for activation" value={`${reserveFromBalance} USDC`} />
						)}
					</InfoRowGroup>
					{noPairAvailable && (
						<p role="alert" className="text-xs text-market-down">
							This swap pair is unavailable.
						</p>
					)}
					{insufficientBalance && (
						<p role="alert" className="text-xs text-market-down">
							Amount exceeds the balance available to swap.
						</p>
					)}
					{error && (
						<p role="alert" className="text-xs text-market-down">
							{error}
						</p>
					)}
					{showSuccess && <output className="block text-xs text-market-up">Swap submitted.</output>}
					<TradingActionButton
						size="md"
						onClick={handleSubmit}
						disabled={!canSubmit || isSubmitting}
						className="w-full"
					>
						{isSubmitting ? "Swapping…" : "Confirm swap"}
					</TradingActionButton>
					<Button
						variant="ghost"
						intent="neutral"
						size="xs"
						disabled={isSubmitting}
						onClick={onClose}
						className="w-full text-fg-muted hover:text-fg"
					>
						Back to withdrawal
					</Button>
				</ModalContent>
			</>
		);
	}

	const actionLabel = getActionLabel({
		showSuccess,
		insufficientBalance,
		noPairAvailable: !!noPairAvailable,
		hasAmount: amountValue > 0,
		fromName,
	});
	return (
		<Modal open onOpenChange={handleOpenChange}>
			<ModalPopup size="sm" showClose={!isSubmitting}>
				<ModalHeader>
					<ModalTitle>
						<Trans>Swap</Trans>
					</ModalTitle>
					<ModalDescription>Use your Hyperliquid spot balance</ModalDescription>
				</ModalHeader>
				<ModalContent className="space-y-3">
					{contextNote && <p className="text-xs text-fg-muted">{contextNote}</p>}
					<div className="space-y-1">
						<TokenField
							label="You pay"
							balance={fromBalance}
							balanceToken={fromName}
							tokenSelector={
								<TokenSelectorDropdown
									ariaLabel="Pay token"
									tokens={availableFromTokens}
									selectedToken={fromToken}
									onSelect={handleFromTokenChange}
									getBalance={getTokenBalance}
									disabled={isDisabled || fixedPair}
								/>
							}
						>
							<NumberInput
								aria-label="Swap amount"
								placeholder="0"
								value={amount}
								onChange={(e) => {
									setAmount(e.target.value);
									setError(null);
								}}
								disabled={isDisabled}
								invalid={insufficientBalance}
								suffix={
									<span className="inline-flex items-center gap-1">
										<Button
											variant="secondary"
											intent="neutral"
											size="xxs"
											className={quickFillChipClass}
											disabled={isDisabled || fromBalance <= 0}
											onClick={() => {
												setAmount(String(maxSpend / 2));
												setError(null);
											}}
										>
											Half
										</Button>
										<Button
											variant="secondary"
											intent="neutral"
											size="xxs"
											className={quickFillChipClass}
											disabled={isDisabled || fromBalance <= 0}
											onClick={handleMaxClick}
										>
											Max
										</Button>
									</span>
								}
							/>
						</TokenField>
						<div className="flex justify-center">
							<ButtonIcon
								variant="secondary"
								intent="neutral"
								size="sm"
								onClick={handleFlip}
								disabled={isDisabled || fixedPair}
								aria-label={t`Swap direction`}
							>
								<ArrowsDownUpIcon className="size-4" />
							</ButtonIcon>
						</div>
						<TokenField
							label="You receive"
							hint="Estimated"
							balance={toBalance}
							balanceToken={toName}
							tokenSelector={
								<TokenSelectorDropdown
									ariaLabel="Receive token"
									tokens={availableToTokens}
									selectedToken={toToken}
									onSelect={handleToTokenChange}
									getBalance={getTokenBalance}
									disabled={isDisabled || fixedPair}
								/>
							}
						>
							<output
								aria-label="Estimated receive"
								aria-live="polite"
								title={estimatedReceive > 0 ? formatToken(estimatedReceive, 6) : "0"}
								className={cn(
									"flex h-8 items-center rounded-8 bg-control px-3 text-xs tabular-nums max-md:h-10 max-md:text-base",
									estimatedReceive > 0 ? "text-fg" : "text-fg-muted",
								)}
							>
								<span className="truncate">{estimatedReceive > 0 ? formatToken(estimatedReceive, 6) : "0"}</span>
							</output>
						</TokenField>
					</div>
					<details className="group text-xs text-fg-muted">
						<summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
							<span className="tabular-nums">
								{rate > 0 ? `1 ${fromName} ≈ ${formatToken(rate, 6)} ${toName}` : "Rate unavailable"}
							</span>
							<span className="inline-flex shrink-0 items-center gap-1">
								{DEFAULT_SLIPPAGE_BPS / 100}% slippage
								<CaretDownIcon
									className="size-3 transition-transform group-open:rotate-180 motion-reduce:transition-none"
									aria-hidden="true"
								/>
							</span>
						</summary>
						<div className="mt-1 border-t border-stroke-weak pt-2">
							<InfoRowGroup>
								<InfoRow label="Market" value={spotMarket?.pairName ?? "—"} />
								<InfoRow label="Slippage tolerance" value={`${DEFAULT_SLIPPAGE_BPS / 100}%`} />
							</InfoRowGroup>
							<p className="pt-1">Output is estimated before trading fees. Final execution may differ.</p>
						</div>
					</details>
					{reserveFromBalance > 0 && (
						<p className="text-xs text-fg-muted">
							{formatToken(reserveFromBalance, { decimals: 2, symbol: fromName })} reserved for withdrawal activation.
						</p>
					)}
					{error && !showSuccess && (
						<p role="alert" className="flex items-start gap-2 rounded-8 bg-control p-3 text-xs text-market-down">
							<WarningIcon className="size-4 shrink-0" />
							{error}
						</p>
					)}
					{showSuccess && (
						<output className="block flex items-center justify-center gap-2 text-xs text-market-up">
							<CheckIcon className="size-4" />
							Swap submitted
						</output>
					)}
					<TradingActionButton
						size="md"
						onClick={handleSubmit}
						disabled={!canSubmit || isSubmitting}
						className="w-full"
					>
						{isSubmitting ? (
							<>
								<SpinnerGapIcon className="size-4 animate-spin" />
								Swapping…
							</>
						) : (
							actionLabel
						)}
					</TradingActionButton>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}

interface ActionLabelInput {
	showSuccess: boolean;
	insufficientBalance: boolean;
	noPairAvailable: boolean;
	hasAmount: boolean;
	fromName: string;
}

function getActionLabel({ showSuccess, insufficientBalance, noPairAvailable, hasAmount, fromName }: ActionLabelInput) {
	if (showSuccess) return "Swap submitted";
	if (insufficientBalance) return `Insufficient ${fromName}`;
	if (noPairAvailable) return "Pair unavailable";
	if (!hasAmount) return "Enter an amount";
	return "Swap";
}

interface TokenFieldProps {
	label: string;
	hint?: string;
	balance: number;
	balanceToken: string;
	tokenSelector: React.ReactNode;
	children: React.ReactNode;
}

function TokenField({ label, hint, balance, balanceToken, tokenSelector, children }: TokenFieldProps) {
	return (
		<div className="space-y-1">
			<div className="flex min-h-6 items-center justify-between gap-2 text-xs text-fg-muted">
				<span>
					{label}
					{hint && <span className="text-fg-disabled"> · {hint}</span>}
				</span>
				<span className="min-w-0 truncate tabular-nums" title={`${balance} ${balanceToken}`}>
					Balance: {formatToken(balance, { decimals: 6, symbol: balanceToken })}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<div className="min-w-0 flex-1">{children}</div>
				<div className="flex h-8 shrink-0 items-center rounded-8 bg-control px-1 max-md:h-10">{tokenSelector}</div>
			</div>
		</div>
	);
}
