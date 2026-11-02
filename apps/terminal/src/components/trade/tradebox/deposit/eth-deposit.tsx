import { Button, TextInput } from "@hypeterminal/ui";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useConnection, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { mainnet } from "wagmi/chains";
import { formatDepositAddressError } from "@/lib/jurisdiction";
import {
	fetchEthDepositAddress,
	fetchEthDepositFees,
	MIN_ETH_DEPOSIT,
	parseEthDepositAmount,
} from "@/lib/unit/eth-deposit";
import { useIsTestnet } from "@/stores/use-global-settings-store";
import { NativeDepositIntro } from "./native-deposit-intro";
import { explorerLinkClass, warningNoticeClass } from "./shared-ui";

export function EthDeposit() {
	const { address } = useConnection();
	const testnet = useIsTestnet();
	if (!address)
		return (
			<p className="py-4 text-xs text-fg-muted">Connect Phantom or X1 Wallet to generate an ETH deposit address.</p>
		);
	if (testnet)
		return (
			<p className="py-4 text-xs text-fg-muted">
				Native ETH deposits are available on mainnet. Switch the terminal to mainnet to continue.
			</p>
		);
	return <EthDepositAccount key={address} recipient={address} />;
}

function EthDepositAccount({ recipient }: { recipient: `0x${string}` }) {
	const amountId = useId();
	const { connector, chainId } = useConnection();
	const { mutateAsync: switchChain, isPending: switching } = useSwitchChain();
	const { mutateAsync: send, data: hash, isPending: sending, error: sendError } = useSendTransaction();
	const receipt = useWaitForTransactionReceipt({ hash, chainId: mainnet.id, query: { enabled: !!hash } });
	const [amount, setAmount] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const depositAddress = useQuery({
		queryKey: ["unit-eth-deposit", "mainnet", recipient],
		queryFn: ({ signal }) => fetchEthDepositAddress(recipient, signal),
		staleTime: 300_000,
		retry: false,
	});
	const fees = useQuery({
		queryKey: ["unit-eth-fees", "mainnet"],
		queryFn: ({ signal }) => fetchEthDepositFees(signal),
		staleTime: 30_000,
		refetchInterval: 30_000,
		retry: false,
	});

	async function sendEth() {
		setError(null);
		try {
			if (!depositAddress.data) throw new Error("Wait for a verified deposit address.");
			if (connector?.id !== "phantom") throw new Error("Use an Ethereum wallet to send ETH to the displayed address.");
			const value = parseEthDepositAmount(amount);
			if (chainId !== mainnet.id) await switchChain({ chainId: mainnet.id });
			await send({ account: recipient, to: depositAddress.data, value, chainId: mainnet.id });
		} catch (e) {
			setError(e instanceof Error ? e.message : "ETH transfer failed.");
		}
	}
	return (
		<div className="space-y-3 text-xs">
			<NativeDepositIntro asset="ETH" chain="Ethereum" fee={fees.data?.fee} eta={fees.data?.eta} />
			{depositAddress.isPending && (
				<output className="block text-fg-muted">Generating and verifying your deposit address…</output>
			)}
			{depositAddress.error && (
				<div role="alert" className="space-y-2 text-market-down">
					<p>{formatDepositAddressError(depositAddress.error)}</p>
					<Button variant="secondary" intent="neutral" size="sm" onClick={() => void depositAddress.refetch()}>
						Retry address
					</Button>
				</div>
			)}
			{depositAddress.data && (
				<>
					<p className="text-2xs uppercase tracking-micro text-fg-muted">Ethereum ETH deposit address</p>
					<div className="break-all rounded-8 bg-control p-3 text-fg tabular-nums">{depositAddress.data}</div>
					<Button
						variant="secondary"
						intent="neutral"
						size="sm"
						className="w-full"
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(depositAddress.data);
								setCopied(true);
							} catch {
								setError("Could not copy. Select the address above to copy it manually.");
							}
						}}
					>
						{copied ? "Copied" : "Copy ETH deposit address"}
					</Button>
					<p className="text-fg-muted">
						You can send from another Ethereum wallet or exchange to this address. It credits the Hyperliquid account
						shown above.
					</p>
				</>
			)}

			{connector?.id === "phantom" && depositAddress.data && !hash && (
				<>
					<TextInput
						id={amountId}
						aria-label="ETH deposit amount"
						inlineLabel="Amount"
						suffix="ETH"
						inputMode="decimal"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						placeholder={`Minimum ${MIN_ETH_DEPOSIT}`}
						disabled={sending || switching}
					/>
					<Button
						variant="filled"
						intent="neutral"
						size="md"
						className="w-full"
						onClick={() => void sendEth()}
						disabled={sending || switching || !amount}
					>
						{switching
							? "Switching to Ethereum…"
							: sending
								? "Confirm ETH transfer in Phantom…"
								: "Send ETH with Phantom"}
					</Button>
				</>
			)}
			{(error || sendError || receipt.error) && (
				<p role="alert" className="text-market-down">
					{formatDepositAddressError(error ?? sendError ?? receipt.error)}
				</p>
			)}
			{hash && (
				<output className="block text-fg-secondary">
					{receipt.data?.status === "reverted"
						? "Ethereum transfer reverted. No deposit was made."
						: receipt.isSuccess
							? "Ethereum transfer confirmed. Unit is processing your deposit; check your ETH spot balance for arrival."
							: "Ethereum transfer submitted. Waiting for confirmation…"}{" "}
					<a
						href={`https://etherscan.io/tx/${hash}`}
						target="_blank"
						rel="noopener noreferrer"
						className={explorerLinkClass}
					>
						View transaction
					</a>
				</output>
			)}
			<p className={warningNoticeClass}>
				Minimum deposit: {MIN_ETH_DEPOSIT} ETH. Send native ETH on Ethereum mainnet only. Other assets and deposits
				below the minimum cannot be credited.
			</p>
		</div>
	);
}
