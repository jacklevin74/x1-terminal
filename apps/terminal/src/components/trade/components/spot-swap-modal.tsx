import { Button, Modal, ModalContent, ModalDescription, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowsDownUpIcon, CheckIcon, SpinnerGapIcon, WarningIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export function SpotSwapModalContent({ initialFromToken, initialToToken, onClose, fixedPair = false, reserveFromBalance = 0, onSubmitted, onBusyChange, contextNote, embedded = false }: Props) {
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
 // For withdrawal purchases leave the quote-token activation reserve even at max slippage.
 const maxSpend = reserveFromBalance > 0 ? Math.max(0, fromBalance - reserveFromBalance) / (1 + DEFAULT_SLIPPAGE_BPS / 10_000) : fromBalance;
 useEffect(() => { onBusyChange?.(isSubmitting); return () => onBusyChange?.(false); }, [isSubmitting, onBusyChange]);
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

  if (reserveFromBalance > 0 && isBuying && plan.orders.some(order => Number(order.p) * Number(order.s) > fromBalance - reserveFromBalance)) {
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
	}, [spotMarket, orderSize, isSubmitting, isBuying, markPx, szDecimals, submitPlan, triggerAutoClose, onSubmitted, amountValue, maxSpend, reserveFromBalance, fromBalance]);

	const insufficientBalance = amountValue > maxSpend;
	const noPairAvailable = fromToken && toToken && !spotMarket;
	const canSubmit = amountValue > 0 && !insufficientBalance && orderSize > 0 && !showSuccess && spotMarket;
	const isDisabled = isSubmitting || showSuccess;

 if (embedded) {
  const fromName = spotMarket?.tokensInfo.find(token => token.name === fromToken)?.displayName ?? fromToken;
  const toName = spotMarket?.tokensInfo.find(token => token.name === toToken)?.displayName ?? toToken;
  return <><ModalHeader className="sr-only"><ModalTitle>Swap {fromName} to {toName}</ModalTitle></ModalHeader><ModalContent className="space-y-4 !pt-3">
   <div className="flex items-center justify-between"><span className="text-sm font-medium">Swap {fromName} → {toName}</span><span className="text-xs text-fg-muted">{formatToken(fromBalance, { decimals: 2, symbol: fromName })}</span></div>
   <div className="flex items-center gap-3 rounded-lg border border-stroke-weak px-3 py-2"><label className="text-sm text-fg-muted">Amount ({fromName})</label><NumberInput aria-label="Swap amount" value={amount} onChange={e => setAmount(e.target.value)} disabled={isDisabled} placeholder="0.00" className="min-w-0 flex-1 text-right" /><button type="button" disabled={isDisabled} onClick={handleMaxClick} className="text-xs text-brand disabled:opacity-40">Max</button></div>
   <div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-fg-muted">Estimated receive</span><span>{formatToken(estimatedReceive, { decimals: 6, symbol: toName })}</span></div><div className="flex justify-between text-fg-muted"><span>Slippage</span><span>{DEFAULT_SLIPPAGE_BPS / 100}%</span></div>{reserveFromBalance > 0 && <div className="flex justify-between text-fg-muted"><span>USDC kept for activation</span><span>{reserveFromBalance} USDC</span></div>}</div>
   {noPairAvailable && <p role="alert" className="text-xs text-error">This swap pair is unavailable.</p>}
   {insufficientBalance && <p role="alert" className="text-xs text-error">Amount exceeds the balance available to swap.</p>}
   {error && <p role="alert" className="text-xs text-error">{error}</p>}
   {showSuccess && <p role="status" className="text-xs text-success">Swap submitted.</p>}
   <TradingActionButton onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="w-full">{isSubmitting ? "Swapping…" : "Confirm swap"}</TradingActionButton>
   <button type="button" disabled={isSubmitting} onClick={onClose} className="w-full text-xs text-fg-muted hover:text-fg disabled:opacity-40">Back to withdrawal</button>
  </ModalContent></>;
 }

 const fromName = spotMarket?.tokensInfo.find(token => token.name === fromToken)?.displayName ?? fromToken;
 const toName = spotMarket?.tokensInfo.find(token => token.name === toToken)?.displayName ?? toToken;
 const actionLabel = showSuccess ? "Swap submitted" : insufficientBalance ? `Insufficient ${fromName}` : noPairAvailable ? "Pair unavailable" : amountValue <= 0 ? "Enter an amount" : "Swap";
 return (
  <Modal open onOpenChange={handleOpenChange}>
   <ModalPopup size="sm" showClose={!isSubmitting} className="!max-w-[420px] !rounded-3xl">
    <ModalHeader divider={false} className="!px-5 !pb-3 !pt-5">
     <ModalTitle className="!text-lg"><Trans>Swap</Trans></ModalTitle>
     <ModalDescription>Use your Hyperliquid spot balance</ModalDescription>
    </ModalHeader>
    <ModalContent className="!px-4 !pb-4 !pt-0 space-y-3">
     {contextNote && <p className="px-1 text-xs text-fg-muted">{contextNote}</p>}
     <div className="relative space-y-1.5">
      <TokenPanel label="You pay" balance={fromBalance} balanceToken={fromName} amount={amount}
       onAmountChange={value => { setAmount(value); setError(null); }} onMaxClick={handleMaxClick}
       onHalfClick={() => { setAmount(String(maxSpend / 2)); setError(null); }}
       disabled={isDisabled} hasError={insufficientBalance} editable
       tokenSelector={<TokenSelectorDropdown tokens={availableFromTokens} selectedToken={fromToken} onSelect={handleFromTokenChange} getBalance={getTokenBalance} disabled={isDisabled || fixedPair} className="!gap-1.5" />} />
      <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center pointer-events-none">
       <Button variant="outline" intent="neutral" size="sm" onClick={handleFlip} disabled={isDisabled || fixedPair}
        className="pointer-events-auto !size-9 !rounded-xl !border-4 !border-overlay !bg-surface !p-0 text-fg-muted hover:text-brand transition-colors" aria-label={t`Swap direction`}>
        <ArrowsDownUpIcon className="!size-4" />
       </Button>
      </div>
      <TokenPanel label="You receive" balance={toBalance} balanceToken={toName} amount={estimatedReceive > 0 ? formatToken(estimatedReceive, 6) : ""} disabled={isDisabled} editable={false}
       tokenSelector={<TokenSelectorDropdown tokens={availableToTokens} selectedToken={toToken} onSelect={handleToTokenChange} getBalance={getTokenBalance} disabled={isDisabled || fixedPair} className="!gap-1.5" />} />
     </div>
     <details className="group px-1 text-xs text-fg-muted">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1.5 [&::-webkit-details-marker]:hidden">
       <span className="tabular-nums">{rate > 0 ? `1 ${fromName} ≈ ${formatToken(rate, 6)} ${toName}` : "Rate unavailable"}</span>
       <span className="inline-flex shrink-0 items-center gap-1">{DEFAULT_SLIPPAGE_BPS / 100}% slippage <span className="transition-transform group-open:rotate-180" aria-hidden="true">⌄</span></span>
      </summary>
      <div className="space-y-2 border-t border-stroke-weak/50 pb-1 pt-2">
       <div className="flex justify-between gap-3"><span>Market</span><span className="text-fg">{spotMarket?.pairName ?? "—"}</span></div>
       <div className="flex justify-between gap-3"><span>Slippage tolerance</span><span className="text-fg">{DEFAULT_SLIPPAGE_BPS / 100}%</span></div>
       <p className="text-[11px] leading-relaxed">Output is estimated before trading fees. Final execution may differ.</p>
      </div>
     </details>
     {reserveFromBalance > 0 && <p className="px-1 text-xs text-fg-muted">{formatToken(reserveFromBalance, { decimals: 2, symbol: fromName })} reserved for withdrawal activation.</p>}
     {error && !showSuccess && <p role="alert" className="flex items-start gap-2 rounded-xl bg-error-soft px-3 py-2 text-xs text-error"><WarningIcon className="size-4 shrink-0" />{error}</p>}
     {showSuccess && <p role="status" className="flex items-center justify-center gap-2 text-xs text-success"><CheckIcon className="size-4" />Swap submitted</p>}
     <TradingActionButton onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="!h-12 w-full !rounded-2xl !text-sm !font-semibold">
      {isSubmitting ? <><SpinnerGapIcon className="size-4 animate-spin" />Swapping…</> : actionLabel}
     </TradingActionButton>
    </ModalContent>
   </ModalPopup>
  </Modal>
 );
}

interface TokenPanelProps {
	label: string;
	balance: number;
	balanceToken: string;
	amount: string;
	onAmountChange?: (value: string) => void;
	onMaxClick?: () => void;
 onHalfClick?: () => void;
	disabled?: boolean;
	hasError?: boolean;
	editable: boolean;
	tokenSelector: React.ReactNode;
}

function TokenPanel({ label, balance, balanceToken, amount, onAmountChange, onMaxClick, onHalfClick, disabled, hasError, editable, tokenSelector }: TokenPanelProps) {
 return <div className={cn("rounded-2xl border bg-fill-weak/50 px-4 py-3.5 transition-colors focus-within:border-brand/50", hasError ? "border-stroke-warning-strong/50" : "border-transparent")}>
  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-fg-muted"><span>{label}</span>{!editable && <span className="text-[10px]">Estimated</span>}</div>
  <div className="flex min-w-0 items-center gap-3">
   <div className="min-w-0 flex-1">
    {editable ? <NumberInput aria-label="Swap amount" aria-invalid={hasError || undefined} placeholder="0" value={amount} onChange={e => onAmountChange?.(e.target.value)} disabled={disabled}
     className={cn("!h-12 w-full !rounded-none !border-0 !bg-transparent !p-0 !text-[32px] !font-medium !leading-none !tracking-tight !shadow-none !ring-0 tabular-nums placeholder:!text-fg-muted/50", hasError && "!text-warning")} />
     : <div aria-label="Estimated receive" aria-live="polite" className={cn("flex h-12 items-center overflow-hidden text-[32px] font-medium leading-none tracking-tight tabular-nums", !amount && "text-fg-muted/50")} title={amount || "0"}><span className="truncate">{amount || "0"}</span></div>}
   </div>
   <div className="shrink-0 [&_button]:!rounded-full [&_button]:!border-0 [&_button]:!bg-surface [&_button]:!px-3 [&_button]:!py-2 [&_button]:!shadow-sm">{tokenSelector}</div>
  </div>
  <div className="mt-2 flex min-h-5 items-center justify-between gap-2 text-[11px] text-fg-muted">
   <span className="tabular-nums" title={`${balance} ${balanceToken}`}>Balance: {formatToken(balance, { decimals: 6, symbol: balanceToken })}</span>
   {editable && <div className="flex items-center gap-1"><button type="button" disabled={disabled || balance <= 0} onClick={onHalfClick} className="rounded-md px-1.5 py-0.5 text-brand hover:bg-brand/10 disabled:opacity-40">Half</button><button type="button" disabled={disabled || balance <= 0} onClick={onMaxClick} className="rounded-md bg-brand/10 px-1.5 py-0.5 font-medium text-brand hover:bg-brand/20 disabled:opacity-40">Max</button></div>}
  </div>
 </div>;
}
