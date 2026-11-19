import { Button, Modal, ModalContent, ModalPopup } from "@hypeterminal/ui";
import { useId, useState } from "react";
import { useConnect, useConnectors } from "wagmi";
import { WalletLogo } from "./wallet-logo";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	embedded?: boolean;
}

const walletOptionClass =
	"group flex w-full items-center gap-3 rounded-8 bg-control px-3 py-3 text-left transition-colors duration-150 hover:bg-control-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:hover:bg-control motion-reduce:transition-none";

export function WalletModal({ open, onOpenChange, embedded = false }: Props) {
	const connectors = useConnectors();
	const { mutateAsync: connect, isPending } = useConnect();
	const [error, setError] = useState<string | null>(null);
	const titleId = useId();
	const wallets = connectors.filter((c) => c.id === "rabby" || c.id === "phantom");

	function handleOpenChange(next: boolean) {
		if (!next) setError(null);
		onOpenChange(next);
	}

	async function handleConnect(connector: (typeof wallets)[number]) {
		setError(null);
		try {
			await connect({ connector });
			handleOpenChange(false);
		} catch (e) {
			setError(getConnectError(e, connector.id));
		}
	}

	const walletList = (
		<>
			<div className="flex flex-col gap-1 pr-10">
				<h2 id={titleId} className="text-base font-medium text-fg">
					Connect to X1 Terminal
				</h2>
				<p className="text-xs text-fg-muted text-pretty">
					Choose your wallet. Your Hyperliquid account uses an Ethereum address.
				</p>
			</div>
			<div className="flex flex-col gap-2">
				{wallets.map((c) => (
					<button
						key={c.uid}
						type="button"
						className={walletOptionClass}
						disabled={isPending}
						onClick={() => handleConnect(c)}
					>
						<span className="shrink-0 group-disabled:opacity-50">
							<WalletLogo connector={c} size={36} />
						</span>
						<span className="flex min-w-0 flex-col gap-0.5">
							<span className="text-sm font-medium text-fg group-disabled:text-fg-disabled">{c.name}</span>
							<span className="text-xs text-fg-muted group-disabled:text-fg-disabled">
								{c.id === "rabby"
									? "Ledger supported. Select your Ledger account in Rabby."
									: "Ethereum provider with EIP-712 signing"}
							</span>
						</span>
					</button>
				))}
			</div>
			<p className="text-xs text-fg-muted text-pretty">
				For Ledger: select your hardware account in Rabby, unlock your Ledger and open its Ethereum app. Review and
				approve signing requests on the device.
			</p>
		</>
	);

	const content = (
		<ModalContent className="flex flex-col gap-4">
			{walletList}
			{error && (
				<p role="alert" className="text-xs text-market-down">
					{error}
				</p>
			)}
			{embedded && (
				<Button variant="secondary" intent="neutral" size="sm" className="w-full" onClick={() => onOpenChange(false)}>
					Back to withdrawal
				</Button>
			)}
		</ModalContent>
	);

	if (embedded) return content;

	return (
		<Modal open={open} onOpenChange={handleOpenChange}>
			<ModalPopup size="sm" aria-labelledby={titleId}>
				{content}
			</ModalPopup>
		</Modal>
	);
}

function getConnectError(error: unknown, connectorId: string) {
	if (error instanceof Error && error.name === "ProviderNotFoundError") {
		if (connectorId === "phantom")
			return "Phantom not found. Install Phantom, or turn on Ethereum in Phantom settings, then reload.";
		return "Rabby Wallet not found. Install Rabby, then reload.";
	}
	if (error instanceof Error && error.name === "UserRejectedRequestError") return "Request cancelled in your wallet.";
	return error instanceof Error ? error.message : "Connection failed";
}
