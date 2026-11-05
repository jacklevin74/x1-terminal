import { Button, ModalContent, ModalHeader, ModalTitle } from "@hypeterminal/ui";
import { WalletIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { isAddress, parseEther, zeroAddress } from "viem";
import { useConnection } from "wagmi";
import { FieldLabel } from "@/components/ui/field-label";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { getTokenTransferDecimals } from "@/domain/market";
import { getSpotAvailable } from "@/domain/trade/balances";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { getInfoClient, useExchange } from "@/lib/hyperliquid";
import { useSpotTokens } from "@/lib/hyperliquid/markets/use-spot-tokens";
import { isTestnet } from "@/lib/network";
import { hasUnifiedSpotBalance } from "@/lib/trade/account-mode";
import { floorToString } from "@/lib/trade/numbers";
import { formatTokenId } from "@/lib/trade/token-id";
import { isSolDepositAddress } from "@/lib/unit/sol-deposit";
import {
	fetchEthWithdrawalAddress,
	fetchEthWithdrawalFees,
	fetchSolWithdrawalAddress,
	fetchSolWithdrawalFees,
	MIN_SOL_WITHDRAWAL,
	parseSolWithdrawalAmount,
} from "@/lib/unit/sol-withdraw";
import { hasWithdrawalGas, withdrawalErrorMessage } from "@/lib/unit/withdrawal-gas";
import { SpotSwapModalContent } from "../components/spot-swap-modal";
import { WalletModal } from "../components/wallet-modal";
import { explorerLinkClass, inlineLinkButtonClass } from "../tradebox/deposit/shared-ui";
import { TransferModalBody } from "./transfer-modal";
import { useWithdrawalRecipient } from "./use-withdrawal-recipient";

function trimZeros(value: string): string {
	return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

export function NativeWithdrawForm({
	onBack,
	asset = "SOL",
	onBusyChange,
}: {
	onBack: () => void;
	asset?: "SOL" | "ETH";
	onBusyChange?: (busy: boolean) => void;
}) {
	const sol = asset === "SOL";
	const destinationId = useId();
	const amountId = useId();
	const coin = sol ? "USOL" : "UETH";
	const chain = sol ? "Solana" : "Ethereum";
	const minimum = sol ? MIN_SOL_WITHDRAWAL : "0.007";
	const fetchRoute = sol ? fetchSolWithdrawalAddress : fetchEthWithdrawalAddress;
	const fetchFees = sol ? fetchSolWithdrawalFees : fetchEthWithdrawalFees;
	const { address, connector, isConnected } = useConnection();
	const { getToken } = useSpotTokens();
	const token = getToken(coin);
	const decimals = Math.min(getTokenTransferDecimals(token), sol ? 9 : 18);
	const { spotBalances, spotAvailableAfterMaintenance, withdrawable, accountAbstraction } = useDefaultDexBalances();

	const usdcAvailable = getSpotAvailable(
		spotBalances?.find((b) => b.coin === "USDC"),
		spotAvailableAfterMaintenance,
	);
	const balance = getSpotAvailable(
		spotBalances?.find((b) => b.coin === coin),
		spotAvailableAfterMaintenance,
	);
	const recipient = useWithdrawalRecipient(asset, connector?.id, address);
	const [destination, setDestination] = useState("");
	const [walletModalOpen, setWalletModalOpen] = useState(false);
	const [swapDirection, setSwapDirection] = useState<"buy" | "gas" | null>(null);
	const [swapBusy, setSwapBusy] = useState(false);
	const [swapSubmitted, setSwapSubmitted] = useState(false);
	const [transferOpen, setTransferOpen] = useState(false);
	const automaticDestination = useRef("");
	const [amount, setAmount] = useState("");
	const [review, setReview] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [submittedDestination, setSubmittedDestination] = useState("");
	const [error, setError] = useState<string | null>(null);
	const locked = useRef(false);
	const active = useRef(true);
	const [preparing, setPreparing] = useState(false);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
		};
	}, []);
	const identity = useRef({ address, destination });
	identity.current = { address, destination };
	const { mutateAsync: spotSend, isPending: isSpotPending } = useExchange("spotSend");
	const { mutateAsync: sendAsset, isPending: isAssetPending } = useExchange("sendAsset");
	const isPending = isSpotPending || isAssetPending;
	const busy = preparing || isPending || swapBusy;
	useEffect(() => {
		onBusyChange?.(busy);
		return () => onBusyChange?.(false);
	}, [busy, onBusyChange]);
	const fees = useQuery({
		queryKey: ["unit", asset, "withdraw-fees"],
		queryFn: ({ signal }) => fetchFees(signal),
		enabled: !isTestnet(),
		retry: false,
		staleTime: 30_000,
	});
	const walletReady = !recipient.reading && (recipient.status === "ready" || recipient.status === "manual");
	const validDestination = sol
		? isSolDepositAddress(destination)
		: isAddress(destination) && destination.toLowerCase() !== zeroAddress;
	const route = useQuery({
		queryKey: ["unit", asset, "withdraw-address", destination],
		queryFn: ({ signal }) => fetchRoute(destination, signal),
		enabled: !isTestnet() && validDestination && walletReady,
		retry: false,
		staleTime: 60_000,
	});
	const gasCheck = useQuery({
		queryKey: ["native-withdraw-gas", address, route.data],
		queryFn: ({ signal }) => getInfoClient().preTransferCheck({ user: route.data!, source: address! }, signal),
		enabled: !!address && !!route.data && walletReady && !submitted && !isTestnet(),
		retry: true,
		retryDelay: (attempt) => Math.min(2000 * 2 ** Math.min(attempt, 4), 30_000),
		staleTime: 15_000,
	});
	const enoughGas = gasCheck.data
		? hasWithdrawalGas(gasCheck.data.fee, spotBalances, spotAvailableAfterMaintenance, withdrawable)
		: false;
	useEffect(() => {
		setReview(false);
		const previousAutomatic = automaticDestination.current;
		setDestination((previous) => {
			if (
				sol ||
				recipient.address !== previousAutomatic ||
				recipient.status === "locked" ||
				recipient.status === "unavailable" ||
				!previous ||
				previous === previousAutomatic
			)
				return recipient.address;
			return previous;
		});
		automaticDestination.current = recipient.address;
	}, [recipient.address, recipient.status, sol]);

	let validAmount = false;
	try {
		const value = sol ? parseSolWithdrawalAmount(amount) : /^\d+(\.\d{1,18})?$/.test(amount) ? parseEther(amount) : 0n;
		const scale = sol ? 1e9 : 1e18;
		validAmount =
			(amount.split(".")[1]?.length ?? 0) <= decimals &&
			value >= (sol ? 120_000_000n : parseEther("0.007")) &&
			value <= BigInt(Math.floor(balance * scale)) &&
			Number(value) / scale > (fees.data?.fee ?? Infinity);
	} catch {
		/* Input validation only. */
	}
	const canSubmit =
		isConnected &&
		!!address &&
		!!token &&
		!!route.data &&
		!!fees.data &&
		!!gasCheck.data &&
		!gasCheck.error &&
		enoughGas &&
		!route.error &&
		!fees.error &&
		validAmount &&
		!busy &&
		!submitted &&
		!isTestnet() &&
		validDestination &&
		walletReady;
	async function submit() {
		if (!canSubmit || locked.current || !token || !route.data) return;
		locked.current = true;
		setPreparing(true);
		setError(null);
		try {
			if (
				!active.current ||
				isTestnet() ||
				(sol && recipient.address !== destination) ||
				identity.current.address !== address ||
				identity.current.destination !== destination
			)
				throw new Error("Wallet changed. Review the destination again.");
			const connectedRecipient = await recipient.refresh();
			if (connectedRecipient.status !== "ready" && connectedRecipient.status !== "manual")
				throw new Error(connectedRecipient.message ?? "Unlock and reconnect your wallet.");
			if (sol && connectedRecipient.address !== destination)
				throw new Error("Wallet changed. Review the destination again.");
			// Refresh attestations before signing rather than trusting a stale route.
			const bridge = await fetchRoute(destination);
			if (
				!active.current ||
				isTestnet() ||
				(sol && recipient.address !== destination) ||
				identity.current.address !== address ||
				identity.current.destination !== destination
			)
				throw new Error("Wallet changed. Review the destination again.");
			const gas = await getInfoClient().preTransferCheck({ user: bridge, source: address! });
			if (!hasWithdrawalGas(gas.fee, spotBalances, spotAvailableAfterMaintenance, withdrawable))
				throw new Error("Insufficient quote token balance for token transfer gas.");
			if (
				!active.current ||
				identity.current.address !== address ||
				identity.current.destination !== destination ||
				(sol && recipient.address !== destination) ||
				isTestnet()
			)
				throw new Error("Wallet changed. Review the destination again.");
			const finalRecipient = await recipient.refresh();
			if (
				(finalRecipient.status !== "ready" && finalRecipient.status !== "manual") ||
				(sol && finalRecipient.address !== destination)
			)
				throw new Error("Unlock your wallet and review the destination again.");
			if (connectedRecipient.status === "ready" && finalRecipient.address !== connectedRecipient.address)
				throw new Error("Wallet changed. Review the destination again.");
			if (!active.current || identity.current.address !== address || identity.current.destination !== destination)
				throw new Error("Account changed. Reopen Withdraw to continue.");
			if (hasUnifiedSpotBalance(accountAbstraction))
				await sendAsset({
					destination: bridge,
					sourceDex: "spot",
					destinationDex: "spot",
					token: formatTokenId(token),
					amount,
				});
			else await spotSend({ destination: bridge, token: formatTokenId(token), amount });
			setSubmittedDestination(destination);
			setSubmitted(true);
			setReview(false);
		} catch (e) {
			setReview(false);
			setError(withdrawalErrorMessage(e));
		} finally {
			locked.current = false;
			setPreparing(false);
		}
	}

	if (swapDirection)
		return (
			<SpotSwapModalContent
				embedded
				initialFromToken={swapDirection === "buy" ? "USDC" : coin}
				initialToToken={swapDirection === "buy" ? coin : "USDC"}
				fixedPair
				reserveFromBalance={swapDirection === "buy" ? Math.max(1, Number(gasCheck.data?.fee) || 1) : 0}
				onBusyChange={setSwapBusy}
				onSubmitted={() => {
					setSwapSubmitted(true);
					setAmount("");
					setReview(false);
				}}
				onClose={() => setSwapDirection(null)}
			/>
		);
	if (transferOpen)
		return (
			<TransferModalBody
				embedded
				initialDirection="toSpot"
				onBusyChange={setSwapBusy}
				onOpenChange={(open) => setTransferOpen(open)}
			/>
		);
	if (walletModalOpen) return <WalletModal embedded open onOpenChange={setWalletModalOpen} />;
	const recipientMessage =
		recipient.status === "locked" ? "Wallet locked or disconnected." : "Connect your wallet to continue.";
	const needsWallet = !!recipient.message && recipient.status !== "manual";
	const balanceText = trimZeros(floorToString(balance, decimals));
	function connectWallet() {
		if (connector?.id) void recipient.refresh(true);
		else setWalletModalOpen(true);
	}
	return (
		<>
			<ModalHeader className="sr-only">
				<ModalTitle>
					Withdraw {asset} to {chain}
				</ModalTitle>
			</ModalHeader>
			<ModalContent>
				<div className="space-y-3 text-xs">
					{submitted ? (
						<div className="space-y-2">
							<output className="block text-market-up">Withdrawal submitted. Delivery to {chain} is processing.</output>
							<a
								className={explorerLinkClass}
								href={`https://explorer.hyperunit.xyz/addresses/${encodeURIComponent(submittedDestination)}`}
								target="_blank"
								rel="noreferrer"
							>
								Track withdrawal
							</a>
						</div>
					) : (
						<>
							<div className="space-y-1">
								<FieldLabel htmlFor={destinationId}>Recipient</FieldLabel>
								{needsWallet && !destination ? (
									<button
										id={destinationId}
										type="button"
										disabled={busy || recipient.reading}
										onClick={connectWallet}
										className="flex h-10 w-full items-center justify-between rounded-8 bg-control px-3 text-xs text-fg transition-colors duration-150 hover:bg-control-hover disabled:cursor-not-allowed disabled:text-fg-disabled motion-reduce:transition-none"
									>
										<span>
											{recipient.reading
												? "Reading wallet…"
												: `${recipient.status === "locked" ? "Unlock" : "Connect"} ${chain} wallet`}
										</span>
										<WalletIcon className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
									</button>
								) : (
									<Input
										id={destinationId}
										aria-label={`${chain} withdrawal destination`}
										readOnly={sol || busy || review}
										value={destination}
										onChange={(e) => {
											setDestination(e.target.value.trim());
											setReview(false);
										}}
										placeholder={sol ? `${chain} wallet address` : "0x… Ethereum address"}
										spellCheck={false}
										autoComplete="off"
									/>
								)}
							</div>
							{recipient.reading && destination && <output className="block text-fg-muted">Reading wallet…</output>}
							{needsWallet && destination && (
								<output className="flex flex-wrap items-center justify-between gap-2">
									<p className="text-fg-muted">{recipientMessage}</p>
									<Button
										variant="link"
										intent="neutral"
										size="xs"
										disabled={busy || recipient.reading}
										onClick={connectWallet}
									>
										Unlock / reconnect wallet
									</Button>
								</output>
							)}
							<div className="space-y-1">
								<NumberInput
									id={amountId}
									aria-label={`${asset} withdrawal amount`}
									inlineLabel="Amount"
									suffix={asset}
									value={amount}
									disabled={busy || review}
									onChange={(e) => {
										setAmount(e.target.value);
										setReview(false);
									}}
									placeholder="0.00"
									maxLabel="Max"
									onMaxClick={() => setAmount(floorToString(balance, decimals))}
								/>
								<div className="flex min-h-6 items-center justify-between gap-2 text-fg-muted tabular-nums">
									<span>
										Min {minimum} {asset}
									</span>
									<span>
										{balanceText} {asset} available
									</span>
								</div>
							</div>
							{usdcAvailable > 0 && (
								<div className="flex min-h-6 items-center">
									<Button
										variant="link"
										intent="neutral"
										size="xs"
										disabled={busy || review || !walletReady}
										onClick={() => {
											setSwapSubmitted(false);
											setSwapDirection("buy");
										}}
									>
										Swap USDC to {asset}
									</Button>
								</div>
							)}
							{!hasUnifiedSpotBalance(accountAbstraction) && !(usdcAvailable > 0) && Number(withdrawable) > 0 && (
								<Button variant="link" intent="neutral" size="xs" disabled={busy} onClick={() => setTransferOpen(true)}>
									Move USDC from perps to spot
								</Button>
							)}
							{swapSubmitted && (
								<output className="block text-fg-secondary">Swap submitted. Check your updated balance.</output>
							)}
							<InfoRowGroup className="border-t border-stroke-weak pt-3">
								{fees.data && <InfoRow label={`Fee · est. ${fees.data.eta}`} value={`${fees.data.fee} ${asset}`} />}
								{gasCheck.data && Number(gasCheck.data.fee) > 0 && (
									<InfoRow
										label={
											<span title="One-time Hyperliquid destination activation, separate from Unit's fee.">
												Activation
											</span>
										}
										value={`${gasCheck.data.fee} USDC`}
									/>
								)}
								{fees.data && Number(amount) > 0 && (
									<InfoRow
										label="Estimated receive"
										value={`${Math.max(0, Number(amount) - fees.data.fee).toFixed(sol ? 9 : 8)} ${asset}`}
									/>
								)}
							</InfoRowGroup>
							{gasCheck.data && !enoughGas && (
								<div role="alert" className="space-y-1">
									<p className="text-market-down">Need {gasCheck.data.fee} USDC for activation.</p>
									<Button
										variant="link"
										intent="neutral"
										size="xs"
										disabled={busy}
										onClick={() => setSwapDirection("gas")}
									>
										Swap some {asset} for USDC
									</Button>
								</div>
							)}
							{isTestnet() && (
								<p role="alert" className="text-market-down">
									Withdrawals require mainnet.
								</p>
							)}
							{(route.error || fees.error) && (
								<p role="alert" className="text-market-down">
									{route.error?.message ?? fees.error?.message}{" "}
									<Button
										variant="link"
										intent="neutral"
										size="xs"
										className={inlineLinkButtonClass}
										onClick={() => {
											void route.refetch();
											void fees.refetch();
										}}
									>
										Retry
									</Button>
								</p>
							)}
							{review && <p className="text-fg-muted">Confirm the recipient and amount above.</p>}
							{error && (
								<p role="alert" className="text-market-down">
									{error}
								</p>
							)}
							<Button
								variant="filled"
								intent="neutral"
								size="md"
								className="w-full"
								disabled={!canSubmit}
								onClick={() => (review ? void submit() : setReview(true))}
							>
								{busy ? "Confirm in wallet…" : review ? "Confirm withdrawal" : "Review withdrawal"}
							</Button>
							{review && (
								<Button
									variant="ghost"
									intent="neutral"
									size="xs"
									className="w-full text-fg-muted hover:text-fg"
									disabled={busy}
									onClick={() => setReview(false)}
								>
									Edit
								</Button>
							)}
						</>
					)}
					{submitted && (
						<Button variant="filled" intent="neutral" size="md" className="w-full" onClick={onBack}>
							Done
						</Button>
					)}
				</div>
			</ModalContent>
		</>
	);
}
