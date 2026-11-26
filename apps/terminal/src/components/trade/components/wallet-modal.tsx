import { Button, Modal, ModalContent, ModalPopup, Tooltip } from "@hypeterminal/ui";
import { useId, useState } from "react";
import { useConnect, useConnectors } from "wagmi";
import { WalletLogo } from "./wallet-logo";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	embedded?: boolean;
}

const walletOptionClass =
	"group flex h-11 w-full items-center gap-3 rounded-8 bg-control px-3 text-left transition-colors duration-150 hover:bg-control-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:hover:bg-control motion-reduce:transition-none";

export function WalletModal({ open, onOpenChange, embedded = false }: Props) {
	const connectors = useConnectors();
	const { mutateAsync: connect, isPending } = useConnect();
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState<"choose" | "x1">("choose");
	const titleId = useId();
	const wallets = connectors.filter((c) => c.id === "rabby" || c.id === "phantom" || c.id === "x1");
	const x1 = wallets.find((c) => c.id === "x1");
	const rabby = wallets.find((c) => c.id === "rabby");

	function handleOpenChange(next: boolean) {
		if (!next) {
			setStep("choose");
			setError(null);
		}
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

	function handleSelect(connector: (typeof wallets)[number]) {
		if (connector.id === "x1") {
			setError(null);
			setStep("x1");
			return;
		}
		handleConnect(connector);
	}

	const chooseStep = (
		<>
			<h2 id={titleId} className="pt-1 text-center text-base font-medium text-fg">
				Connect
			</h2>
			<div className="flex flex-col gap-2">
				{wallets.map((c) => (
					<button
						key={c.uid}
						type="button"
						className={walletOptionClass}
						disabled={isPending}
						onClick={() => handleSelect(c)}
					>
						<span className="shrink-0 group-disabled:opacity-50">
							<WalletLogo connector={c} size={22} />
						</span>
						<span className="text-sm text-fg group-disabled:text-fg-disabled">{c.name}</span>
					</button>
				))}
			</div>
			{rabby && (
				<p className="text-center text-xs text-fg-muted">
					Using a Ledger?{" "}
					<Tooltip
						side="bottom"
						content="Select your hardware account in Rabby, unlock your Ledger and open its Ethereum app. Approve each request on the device."
					>
						<button
							type="button"
							disabled={isPending}
							onClick={() => handleSelect(rabby)}
							className="text-fg-secondary transition-colors hover:text-fg disabled:text-fg-disabled"
						>
							Connect it through Rabby
						</button>
					</Tooltip>
				</p>
			)}
		</>
	);

	const x1Step = (
		<>
			<div className="flex flex-col gap-1 pr-10">
				<h2 id={titleId} className="text-base font-medium text-fg">
					Connect X1 Wallet
				</h2>
				<p className="text-xs text-fg-muted text-pretty">
					X1 Wallet signs one message. That signature creates your Hyperliquid account key.
				</p>
			</div>
			<ul className="flex flex-col gap-2 rounded-8 bg-control p-3 text-xs text-fg-secondary">
				<li>Your account is derived from your X1 signature.</li>
				<li>Withdrawals are signed by this derived key.</li>
				<li>To recover this account, use the same wallet and signature.</li>
			</ul>
			<div className="flex flex-col gap-2">
				<Button size="md" className="w-full" disabled={isPending || !x1} onClick={() => x1 && handleConnect(x1)}>
					I understand, connect
				</Button>
				<Button
					variant="ghost"
					intent="neutral"
					size="sm"
					className="w-full text-fg-muted"
					disabled={isPending}
					onClick={() => {
						setError(null);
						setStep("choose");
					}}
				>
					Back
				</Button>
			</div>
		</>
	);

	const content = (
		<ModalContent className="flex flex-col gap-4">
			{step === "x1" ? x1Step : chooseStep}
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
		if (connectorId === "rabby") return "Rabby Wallet not found. Install Rabby, then reload.";
		return "X1 Wallet not found. Install X1 Wallet, then reload.";
	}
	if (error instanceof Error && error.name === "UserRejectedRequestError") return "Request cancelled in your wallet.";
	return error instanceof Error ? error.message : "Connection failed";
}
