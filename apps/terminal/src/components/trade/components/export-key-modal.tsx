import { Button, Checkbox, Modal, ModalContent, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { WarningIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { exportX1PrivateKey } from "@/lib/x1/provider";

interface Props {
	address: string;
	onClose: () => void;
}

export function ExportKeyModal({ address, onClose }: Props) {
	const [acknowledged, setAcknowledged] = useState(false);
	const [key, setKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		const hide = () => {
			setKey(null);
			setAcknowledged(false);
			setCopied(false);
		};
		const visibility = () => {
			if (document.hidden) hide();
		};
		const sessionChanged = () => {
			hide();
			onClose();
		};
		document.addEventListener("visibilitychange", visibility);
		window.addEventListener("blur", hide);
		window.addEventListener("storage", sessionChanged);
		const timer = key ? window.setTimeout(hide, 60_000) : undefined;
		return () => {
			document.removeEventListener("visibilitychange", visibility);
			window.removeEventListener("blur", hide);
			window.removeEventListener("storage", sessionChanged);
			window.clearTimeout(timer);
		};
	}, [key, onClose]);

	function handleReveal() {
		setError(null);
		try {
			setKey(exportX1PrivateKey(address));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unable to export this account.");
		}
	}

	async function handleCopy() {
		setError(null);
		try {
			const current = exportX1PrivateKey(address);
			if (current !== key) throw new Error("Account changed. Close this window and try again.");
			await navigator.clipboard.writeText(current);
			setCopied(true);
		} catch {
			setError("Could not copy the key. Check the connected account and clipboard permissions.");
		}
	}

	function handleClose() {
		setKey(null);
		onClose();
	}

	return (
		<Modal
			open
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<ModalPopup size="md">
				<ModalContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-1 pr-10">
						<ModalTitle>Export derived private key</ModalTitle>
						<p className="text-xs text-fg-muted text-pretty">
							This Ethereum key controls your X1 Terminal Hyperliquid account and funds withdrawn to its address. It is
							separate from your native Solana wallet key.
						</p>
					</div>
					<p className="rounded-8 bg-control px-3 py-2 text-xs tabular-nums text-fg break-all">{address}</p>
					<div role="note" className="flex items-start gap-2 rounded-8 bg-control p-3 text-xs text-market-down">
						<WarningIcon className="size-4 shrink-0" weight="fill" />
						<span className="text-pretty">
							Anyone with this key can take this account’s funds. Never share it, send it to support, or paste it into a
							website. Import it only into a wallet you trust and verify the imported address matches the address above.
							Store any backup securely offline.
						</span>
					</div>
					<p className="text-xs text-fg-muted text-pretty">
						Arbitrum withdrawals arrive as USDC at this address. Sending them requires ETH on Arbitrum for gas.
					</p>
					{!key ? (
						<>
							<Checkbox
								checked={acknowledged}
								onCheckedChange={(checked) => setAcknowledged(checked)}
								label="I understand this exposes full control of this account and I am in a private place."
							/>
							<Button
								variant="filled"
								intent="brand"
								size="md"
								className="w-full"
								disabled={!acknowledged}
								onClick={handleReveal}
							>
								Reveal private key
							</Button>
						</>
					) : (
						<div className="flex flex-col gap-3">
							<textarea
								aria-label="Derived Ethereum private key"
								readOnly
								spellCheck={false}
								autoComplete="off"
								rows={3}
								value={key}
								className="w-full resize-none rounded-8 bg-control p-3 text-xs tabular-nums text-fg break-all outline-none transition-[background-color,box-shadow] duration-150 focus:bg-control-hover focus:ring-1 focus:ring-inset focus:ring-stroke-control-focus motion-reduce:transition-none"
							/>
							<p className="text-xs text-fg-muted text-pretty">
								Hidden after 60 seconds or when you leave this tab. Copying puts the key on your system clipboard;
								replace the clipboard contents after importing.
							</p>
							<Button variant="filled" intent="brand" size="md" className="w-full" onClick={handleCopy}>
								{copied ? "Private key copied" : "Copy private key"}
							</Button>
						</div>
					)}
					{error && (
						<p role="alert" className="text-xs text-market-down">
							{error}
						</p>
					)}
					<Button variant="secondary" intent="neutral" size="sm" className="w-full" onClick={handleClose}>
						Close
					</Button>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}
