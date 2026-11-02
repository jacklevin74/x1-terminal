import { Button, Checkbox, Modal, ModalContent, ModalPopup } from "@hypeterminal/ui";
import { useId, useState } from "react";
import { useConnect, useConnectors } from "wagmi";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	embedded?: boolean;
}

const walletOptionClass =
	"group flex w-full flex-col items-start gap-1 rounded-8 bg-control px-3 py-3 text-left transition-colors duration-150 hover:bg-control-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:hover:bg-control motion-reduce:transition-none";

export function WalletModal({ open, onOpenChange, embedded = false }: Props) {
	const connectors = useConnectors();
	const { mutateAsync: connect, isPending } = useConnect();
	const [error, setError] = useState<string | null>(null);
	const [acknowledged, setAcknowledged] = useState(false);
	const titleId = useId();
	const wallets = connectors.filter((c) => c.id === "phantom" || c.id === "x1");

	async function handleConnect(connector: (typeof wallets)[number]) {
		setError(null);
		try {
			await connect({ connector });
			onOpenChange(false);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Connection failed");
		}
	}

	const content = (
		<ModalContent className="flex flex-col gap-4">
			<div className="flex flex-col gap-1 pr-10">
				<h2 id={titleId} className="text-base font-medium text-fg">
					Connect to X1 Terminal
				</h2>
				<p className="text-xs text-fg-muted text-pretty">
					Choose your wallet. Your Hyperliquid account uses an Ethereum address.
				</p>
			</div>
			<Checkbox
				checked={acknowledged}
				onCheckedChange={(checked) => setAcknowledged(checked)}
				className="text-pretty"
				label="For X1: I understand my account is derived from my X1 signature. Withdrawals are signed by this derived key. I must use the same wallet and signature to recover this account."
			/>
			<div className="flex flex-col gap-2">
				{wallets.map((c) => (
					<button
						key={c.uid}
						type="button"
						className={walletOptionClass}
						disabled={isPending || (c.id === "x1" && !acknowledged)}
						onClick={() => handleConnect(c)}
					>
						<span className="text-xs font-medium text-fg group-disabled:text-fg-disabled">{c.name}</span>
						<span className="text-xs text-fg-muted group-disabled:text-fg-disabled">
							{c.id === "x1"
								? "Derived from your X1 signature · session reconnect"
								: "Ethereum provider · EIP-712 signing"}
						</span>
					</button>
				))}
			</div>
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
		<Modal open={open} onOpenChange={onOpenChange}>
			<ModalPopup size="sm" aria-labelledby={titleId}>
				{content}
			</ModalPopup>
		</Modal>
	);
}
