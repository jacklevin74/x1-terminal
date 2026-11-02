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
import { ArrowsLeftRightIcon, SpinnerGapIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import { NumberInput } from "@/components/ui/number-input";
import { DEFAULT_QUOTE_TOKEN } from "@/config/app";
import { exceedsBalance, getTokenTransferDecimals, isAmountWithinBalance } from "@/domain/market";
import { getNormalizedWithdrawable, getSpotAvailable, getSpotBalance } from "@/domain/trade/balances";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { useExchange } from "@/lib/hyperliquid";
import { useSpotTokens } from "@/lib/hyperliquid/markets/use-spot-tokens";
import { hasUnifiedSpotBalance } from "@/lib/trade/account-mode";
import { floorToString, limitDecimalInput } from "@/lib/trade/numbers";
import { formatTokenId } from "@/lib/trade/token-id";
import { inlineLinkButtonClass } from "../tradebox/deposit/shared-ui";

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
	useEffect(() => {
		onBusyChange?.(isPending);
		return () => onBusyChange?.(false);
	}, [isPending, onBusyChange]);
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

	const availableLabel = `${floorToString(availableBalanceValue, usdcDecimals)} USDC`;
	const overBalance = exceedsBalance(amount, availableBalanceValue);

	if (unified) {
		return (
			<>
				<ModalHeader>
					<ModalTitle>Shared spot and perps balance</ModalTitle>
				</ModalHeader>
				<ModalContent className="space-y-3">
					<p className="text-xs text-fg-secondary">
						Your account uses a unified balance. Your USDC is already available to both spot and perps trading; no
						transfer to spot is needed.
					</p>
					<p className="text-xs text-fg-secondary">
						Existing orders and margin requirements still limit the amount available to spend or withdraw.
					</p>
					<Button variant="filled" intent="neutral" size="md" className="w-full" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</ModalContent>
			</>
		);
	}

	if (embedded) {
		return (
			<>
				<ModalHeader className="sr-only">
					<ModalTitle>Move USDC to spot</ModalTitle>
				</ModalHeader>
				<ModalContent className="space-y-3">
					<div className="flex min-h-6 items-center justify-between text-xs">
						<span className="font-medium text-fg">Move USDC to spot</span>
						<span className="text-fg-muted tabular-nums">{availableLabel} available</span>
					</div>
					<NumberInput
						aria-label="Transfer USDC amount"
						value={amount}
						onChange={(e) => handleAmountChange(e.target.value)}
						disabled={isPending}
						placeholder="0.00"
						inlineLabel="Amount"
						suffix="USDC"
						maxLabel="Max"
						onMaxClick={handleMaxClick}
						invalid={overBalance}
					/>
					{error && (
						<p role="alert" className="text-xs text-market-down">
							{error}
						</p>
					)}
					<Button
						variant="filled"
						intent="neutral"
						size="md"
						className="w-full"
						disabled={!isValidAmount || isPending}
						onClick={handleTransfer}
					>
						{isPending ? "Transferring…" : "Confirm transfer"}
					</Button>
					<Button
						variant="ghost"
						intent="neutral"
						size="xs"
						className="w-full text-fg-muted hover:text-fg"
						disabled={isPending}
						onClick={() => onOpenChange(false)}
					>
						Back to withdrawal
					</Button>
				</ModalContent>
			</>
		);
	}

	return (
		<>
			<ModalHeader>
				<ModalTitle>{t`Transfer USDC`}</ModalTitle>
				<ModalDescription>{t`Move USDC between your Perp and Spot accounts.`}</ModalDescription>
			</ModalHeader>

			<ModalContent className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="flex h-8 flex-1 items-center justify-between rounded-8 bg-control px-3 text-xs max-md:h-10">
						<span className="text-fg-muted">{t`From`}</span>
						<span className="font-medium text-fg">{fromLabel}</span>
					</div>
					<ButtonIcon
						variant="ghost"
						intent="neutral"
						size="sm"
						onClick={handleFlip}
						aria-label={t`Flip transfer direction`}
						className="text-fg-muted hover:text-fg"
					>
						<ArrowsLeftRightIcon className="size-4" />
					</ButtonIcon>
					<div className="flex h-8 flex-1 items-center justify-between rounded-8 bg-control px-3 text-xs max-md:h-10">
						<span className="text-fg-muted">{t`To`}</span>
						<span className="font-medium text-fg">{toLabel}</span>
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<div className="flex min-h-6 items-center justify-between text-xs">
						<span className="text-fg-muted">{t`Available`}</span>
						<Button
							variant="link"
							intent="neutral"
							size="xs"
							className={inlineLinkButtonClass}
							onClick={handleMaxClick}
						>
							{availableLabel}
						</Button>
					</div>
					<NumberInput
						inlineLabel={t`Amount`}
						suffix="USDC"
						maxLabel={t`Max`}
						onMaxClick={handleMaxClick}
						placeholder="0.00"
						value={amount}
						onChange={(e) => handleAmountChange(e.target.value)}
						invalid={overBalance}
					/>
				</div>

				{error && (
					<div className="flex items-center gap-2 rounded-8 bg-control p-3 text-xs text-market-down">
						<WarningCircleIcon className="size-4 shrink-0" />
						<span className="flex-1">{error}</span>
					</div>
				)}

				<Button
					variant="filled"
					intent="neutral"
					size="md"
					onClick={handleTransfer}
					disabled={!isValidAmount || isPending}
					className="w-full"
				>
					{isPending && <SpinnerGapIcon className="size-4 animate-spin" />}
					{isPending ? t`Transferring...` : t`Transfer`}
				</Button>
			</ModalContent>
		</>
	);
}
