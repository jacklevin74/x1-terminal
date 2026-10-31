import { hasUnifiedSpotBalance } from "@/lib/trade/account-mode";
import { Button, Modal, ModalContent, ModalDescription, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { ArrowsLeftRightIcon, SpinnerGapIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import { NumberInput } from "@/components/ui/number-input";
import { DEFAULT_QUOTE_TOKEN } from "@/config/app";
import { exceedsBalance, getTokenTransferDecimals, isAmountWithinBalance } from "@/domain/market";
import { getNormalizedWithdrawable, getSpotAvailable, getSpotBalance } from "@/domain/trade/balances";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { cn } from "@/lib/cn";
import { useExchange } from "@/lib/hyperliquid";
import { useSpotTokens } from "@/lib/hyperliquid/markets/use-spot-tokens";
import { floorToString, limitDecimalInput } from "@/lib/trade/numbers";
import { formatTokenId } from "@/lib/trade/token-id";

type TransferDirection = "toSpot" | "toPerp";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialDirection?: TransferDirection;
}

export function TransferModal({ open, onOpenChange, initialDirection = "toSpot" }: Props) {
	return (
		<Modal open={open} onOpenChange={onOpenChange}>
			<ModalPopup size="sm">
				<TransferModalBody
					key={`${initialDirection}:${open ? "open" : "closed"}`}
					onOpenChange={onOpenChange}
					initialDirection={initialDirection}
				/>
			</ModalPopup>
		</Modal>
	);
}

interface BodyProps {
 embedded?: boolean;
 onBusyChange?: (busy: boolean) => void;
	onOpenChange: (open: boolean) => void;
	initialDirection: TransferDirection;
}

export function TransferModalBody({ onOpenChange, initialDirection, embedded = false, onBusyChange }: BodyProps) {
	const [direction, setDirection] = useState<TransferDirection>(initialDirection);
	const [amount, setAmount] = useState("");
	const [error, setError] = useState<string | null>(null);

	const { address } = useConnection();
	const { getToken } = useSpotTokens();
	const { mutateAsync: sendAsset, isPending } = useExchange("sendAsset");
 useEffect(() => { onBusyChange?.(isPending); return () => onBusyChange?.(false); }, [isPending, onBusyChange]);
	const { withdrawable, spotBalances, spotAvailableAfterMaintenance, accountAbstraction } = useDefaultDexBalances();

	const unified = hasUnifiedSpotBalance(accountAbstraction);

	const usdcTokenInfo = getToken(DEFAULT_QUOTE_TOKEN);
	const usdcTokenId = usdcTokenInfo ? formatTokenId(usdcTokenInfo) : "";

	const usdcDecimals = getTokenTransferDecimals(usdcTokenInfo);

	const spotUsdcBal = getSpotBalance(spotBalances, DEFAULT_QUOTE_TOKEN);
	const availableBalanceValue =
		direction === "toSpot"
			? Number(getNormalizedWithdrawable(withdrawable, spotBalances, spotAvailableAfterMaintenance, accountAbstraction))
			: getSpotAvailable(spotUsdcBal, spotAvailableAfterMaintenance);

	const isValidAmount = isAmountWithinBalance(amount, availableBalanceValue) && !!address && !!usdcTokenId && !unified;

	const fromLabel = direction === "toSpot" ? t`Perp` : t`Spot`;
	const toLabel = direction === "toSpot" ? t`Spot` : t`Perp`;

	function handleFlip() {
		setDirection((prev) => (prev === "toSpot" ? "toPerp" : "toSpot"));
		setAmount("");
	}

	async function handleTransfer() {
		if (!isValidAmount || isPending || !address) return;

		setError(null);
		try {
			await sendAsset({
				destination: address,
				sourceDex: direction === "toSpot" ? "" : "spot",
				destinationDex: direction === "toSpot" ? "spot" : "",
				token: usdcTokenId,
				amount: amount,
			});
			setAmount("");
			onOpenChange(false);
		} catch (err) {
			const message = err instanceof Error ? err.message : t`Transfer failed`;
			setError(message);
		}
	}

	function handleAmountChange(value: string) {
		setAmount(limitDecimalInput(value, usdcDecimals));
	}

	function handleMaxClick() {
		setAmount(floorToString(availableBalanceValue, usdcDecimals));
	}

 if (unified) return <><ModalHeader><ModalTitle>Shared spot and perps balance</ModalTitle></ModalHeader><ModalContent>
  <p className="text-sm text-fg-muted">Your account uses a unified balance. Your USDC is already available to both spot and perps trading; no transfer to spot is needed.</p>
  <p className="mt-3 text-sm text-fg-muted">Existing orders and margin requirements still limit the amount available to spend or withdraw.</p>
  <Button className="mt-4 w-full" onClick={() => onOpenChange(false)}>Close</Button>
 </ModalContent></>;
 if (embedded) return <><ModalHeader className="sr-only"><ModalTitle>Move USDC to spot</ModalTitle></ModalHeader><ModalContent className="space-y-4 !pt-3">
  <div className="flex items-center justify-between text-sm"><span>Move USDC to spot</span><span className="text-xs text-fg-muted">{floorToString(availableBalanceValue, usdcDecimals)} USDC available</span></div>
  <NumberInput aria-label="Transfer USDC amount" value={amount} onChange={e => handleAmountChange(e.target.value)} disabled={isPending} placeholder="0.00" label="Amount (USDC)" labelValue="Max" onLabelValueClick={handleMaxClick} />
  {error && <p role="alert" className="text-xs text-error">{error}</p>}
  <Button className="w-full" disabled={!isValidAmount || isPending} onClick={handleTransfer}>{isPending ? "Transferring…" : "Confirm transfer"}</Button>
  <button type="button" disabled={isPending} onClick={() => onOpenChange(false)} className="w-full text-xs text-fg-muted disabled:opacity-40">Back to withdrawal</button>
 </ModalContent></>;

	return (
		<>
			<ModalHeader>
				<ModalTitle>{t`Transfer USDC`}</ModalTitle>
				<ModalDescription>{t`Move USDC between your Perp and Spot accounts.`}</ModalDescription>
			</ModalHeader>

			<ModalContent>
				<div className="space-y-4">
					<div className="flex items-center justify-center gap-3 py-2">
						<div className="flex flex-col items-center">
							<span
								className={cn(
									"text-xs px-2 py-1 uppercase font-medium",
									direction === "toSpot" ? "bg-brand-soft text-brand" : "bg-warning-soft text-warning",
								)}
							>
								{fromLabel}
							</span>
						</div>
						<button
							type="button"
							onClick={handleFlip}
							aria-label={t`Flip transfer direction`}
							className="p-1.5 rounded-8 hover:bg-fill-hover transition-colors text-fg-muted hover:text-brand"
						>
							<ArrowsLeftRightIcon className="size-4" />
						</button>
						<div className="flex flex-col items-center">
							<span
								className={cn(
									"text-xs px-2 py-1 uppercase font-medium",
									direction === "toPerp" ? "bg-brand-soft text-brand" : "bg-warning-soft text-warning",
								)}
							>
								{toLabel}
							</span>
						</div>
					</div>

					<NumberInput
						label={t`Amount`}
						labelValue={
							<>
								{t`Available`}:{" "}
								<span className="underline decoration-dashed underline-offset-2 decoration-stroke-weak">
									{floorToString(availableBalanceValue, usdcDecimals)} USDC
								</span>
							</>
						}
						onLabelValueClick={handleMaxClick}
						placeholder="0.00"
						value={amount}
						onChange={(e) => handleAmountChange(e.target.value)}
						className={cn(
							"w-full tabular-nums",
							exceedsBalance(amount, availableBalanceValue) &&
								"border-stroke-error-strong focus:border-stroke-error-strong",
						)}
					/>

					{error && (
						<div className="flex items-center gap-2 p-2.5 rounded-8 bg-error-soft border border-stroke-error-weak text-xs text-error">
							<WarningCircleIcon className="size-3.5 shrink-0" />
							<span className="flex-1">{error}</span>
						</div>
					)}

					<Button
						variant="filled"
						intent="neutral"
						onClick={handleTransfer}
						disabled={!isValidAmount || isPending}
						className="w-full"
					>
						{isPending && <SpinnerGapIcon className="size-3.5 animate-spin mr-2" />}
						{isPending ? t`Transferring...` : t`Transfer`}
					</Button>
				</div>
			</ModalContent>
		</>
	);
}
