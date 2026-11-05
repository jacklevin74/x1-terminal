import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle, Select } from "@hypeterminal/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import { CopyStateIcon } from "@/components/ui/copy-state-icon";
import { formatDepositAddressError } from "@/lib/jurisdiction";
import { fetchEthDepositAddress, fetchEthDepositFees, MIN_ETH_DEPOSIT } from "@/lib/unit/eth-deposit";
import { fetchSolDepositAddress, fetchSolDepositFees, MIN_SOL_DEPOSIT } from "@/lib/unit/sol-deposit";
import { useIsTestnet } from "@/stores/use-global-settings-store";
import { NativeDepositIntro } from "./native-deposit-intro";
import { readOnlyFieldClass, warningNoticeClass } from "./shared-ui";
import { SolDeposit } from "./sol-deposit";

function AssetIcon({ coin }: { coin: string }) {
	return <img src={`/tokens/${coin}.svg`} alt="" className="size-4 shrink-0 rounded-full" draggable={false} />;
}

const DEPOSIT_ASSET_OPTIONS = [
	{ value: "ETH", label: "ETH", icon: <AssetIcon coin="ETH" /> },
	{ value: "SOL", label: "SOL", icon: <AssetIcon coin="SOL" /> },
];

interface Props {
	open: boolean;
	onClose: () => void;
}

export function NativeDepositModal({ open, onClose }: Props) {
	const { address } = useConnection();
	const testnet = useIsTestnet();
	const [asset, setAsset] = useState<"ETH" | "SOL">("ETH");
	const [copied, setCopied] = useState(false);
	const [copyError, setCopyError] = useState(false);
	const chain = asset === "ETH" ? "Ethereum" : "Solana";
	const minimum = asset === "ETH" ? MIN_ETH_DEPOSIT : MIN_SOL_DEPOSIT;
	const enabled = open && !!address && !testnet;
	const deposit = useQuery({
		queryKey: [asset === "ETH" ? "unit-eth-deposit" : "unit-sol-deposit", "mainnet", address],
		queryFn: ({ signal }) => {
			if (!address) throw new Error("Connect your wallet first.");
			return asset === "ETH" ? fetchEthDepositAddress(address, signal) : fetchSolDepositAddress(address, signal);
		},
		enabled,
		staleTime: 300_000,
		retry: false,
	});
	const fees = useQuery({
		queryKey: [asset === "ETH" ? "unit-eth-fees" : "unit-sol-fees", "mainnet"],
		queryFn: ({ signal }) => (asset === "ETH" ? fetchEthDepositFees(signal) : fetchSolDepositFees(signal)),
		enabled,
		staleTime: 60_000,
		retry: false,
	});
	useEffect(() => {
		setCopied(false);
		setCopyError(false);
	}, [address, asset, open]);

	async function copyAddress() {
		if (!deposit.data) return;
		try {
			await navigator.clipboard.writeText(deposit.data);
			setCopied(true);
			setCopyError(false);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopyError(true);
		}
	}

	return (
		<Modal open={open} onOpenChange={onClose}>
			<ModalPopup size="lg">
				<ModalHeader className="sr-only" divider={false}>
					<ModalTitle>
						Deposit {asset} from {chain}
					</ModalTitle>
				</ModalHeader>
				<ModalContent className="space-y-4 p-6 pt-12">
					<NativeDepositIntro asset={asset} chain={chain} fee={fees.data?.fee} eta={fees.data?.eta} />
					{!address && (
						<p className="text-center text-xs text-fg-muted">
							Connect Phantom or X1 Wallet to get your deposit address.
						</p>
					)}
					{address && testnet && (
						<p className="text-center text-xs text-fg-muted">Native asset deposits are available on mainnet.</p>
					)}
					{address && !testnet && (
						<div className="space-y-3">
							<Select
								aria-label="Deposit asset"
								inlineLabel="Asset"
								value={asset}
								onValueChange={(value) => {
									if (value === "ETH" || value === "SOL") setAsset(value);
								}}
								options={DEPOSIT_ASSET_OPTIONS}
							/>
							<div className={readOnlyFieldClass}>
								<span className="text-fg-muted">Deposit Chain</span>
								<span className="text-fg">{chain}</span>
							</div>
							{deposit.error ? (
								<div role="alert" className="space-y-2 text-xs text-market-down">
									<p>{formatDepositAddressError(deposit.error)}</p>
									<Button variant="secondary" intent="neutral" size="sm" onClick={() => void deposit.refetch()}>
										Retry address
									</Button>
								</div>
							) : (
								<button
									type="button"
									disabled={!deposit.data}
									aria-label={`Copy ${asset} deposit address`}
									title={deposit.data}
									className="flex min-h-10 w-full items-center justify-center gap-2 rounded-8 bg-control px-3 py-2 text-xs font-medium text-fg tabular-nums transition-colors hover:bg-control-hover disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-control"
									onClick={() => void copyAddress()}
								>
									<span className="break-all">{deposit.data ?? "Generating deposit address…"}</span>
									{deposit.data && <CopyStateIcon copied={copied} />}
								</button>
							)}
							{asset === "SOL" && deposit.data && <SolDeposit compact />}
							<output className="sr-only">{copied ? "Address copied" : ""}</output>
							{copyError && (
								<p role="alert" className="text-center text-xs text-market-down">
									Copy unavailable. Select the address and copy it manually.
								</p>
							)}
						</div>
					)}
					{(asset !== "SOL" || !address || testnet) && (
						<Button variant="filled" intent="neutral" size="md" className="w-full" onClick={onClose}>
							Done
						</Button>
					)}
					<div className="border-t border-stroke-weak pt-4">
						<p className={`${warningNoticeClass} text-center`}>
							IMPORTANT: Minimum deposit is {minimum} {asset}. This address only receives native {asset} on {chain}{" "}
							mainnet. Other assets, other networks, and deposits below the minimum cannot be credited.
						</p>
					</div>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}
