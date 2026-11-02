import { Button, Modal, ModalContent, ModalDescription, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import { BUILDER_CONFIGURED } from "@/config/hyperliquid";
import { useAgentRegistration, useAgentStatus } from "@/lib/hyperliquid";
import { useIsTestnet } from "@/stores/use-global-settings-store";

const stepBadgeClass =
	"flex size-4 shrink-0 items-center justify-center rounded-4 bg-control text-xs font-medium tabular-nums text-fg-secondary";

export function X1Setup() {
	const { address, connector } = useConnection();
	const { isReady } = useAgentStatus();
	const { register, status, error } = useAgentRegistration();
	const testnet = useIsTestnet();
	const [open, setOpen] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);
	const busy = status === "approving_fee" || status === "approving_agent" || status === "verifying";
	useEffect(() => {
		const show = () => setOpen(true);
		window.addEventListener("x1:setup", show);
		return () => window.removeEventListener("x1:setup", show);
	}, []);
	useEffect(() => {
		setOpen(false);
	}, [address]);
	useEffect(() => {
		if (isReady) setOpen(false);
	}, [isReady]);

	async function handleApprove() {
		setLocalError(null);
		try {
			await register();
		} catch (e) {
			setLocalError(e instanceof Error ? e.message : "Setup failed");
		}
	}

	const errorMessage = localError ?? error?.message;

	return (
		<Modal
			open={open && !!address}
			onOpenChange={(next) => {
				if (!busy) setOpen(next);
			}}
		>
			<ModalPopup size="sm">
				<ModalHeader>
					<ModalTitle>Set up trading · {testnet ? "Testnet" : "Mainnet"}</ModalTitle>
					<ModalDescription>Review both approvals before continuing.</ModalDescription>
				</ModalHeader>
				<ModalContent className="flex flex-col gap-4">
					<ol className="flex flex-col gap-3 text-xs text-fg">
						<li className="flex items-start gap-2">
							<span className={stepBadgeClass}>1</span>
							<span className="text-pretty">
								Approve X1’s builder fee: <strong className="font-medium">0.05% per trade</strong>.
							</span>
						</li>
						<li className="flex items-start gap-2">
							<span className={stepBadgeClass}>2</span>
							<span className="text-pretty">
								Approve a trading-only key so orders do not prompt your wallet each time. This key stays in this browser
								tab’s session.
							</span>
						</li>
					</ol>
					<div className="flex flex-col gap-1 rounded-8 bg-control px-3 py-2">
						<span className="text-2xs uppercase tracking-micro text-fg-muted">Hyperliquid account</span>
						<span className="text-xs tabular-nums text-fg break-all">{address}</span>
					</div>
					{connector?.id === "x1" && (
						<p className="text-xs text-warning text-pretty">
							Derived from your X1 signature. Withdrawals are signed by this derived key. Reconnect with the same X1
							wallet to recover this account.
						</p>
					)}
					{!BUILDER_CONFIGURED && (
						<p role="alert" className="text-xs text-warning">
							Trading is unavailable until the operator configures VITE_BUILDER_ADDRESS.
						</p>
					)}
					{errorMessage && (
						<p role="alert" className="text-xs text-market-down">
							{errorMessage}
						</p>
					)}
					<Button
						variant="filled"
						intent="brand"
						size="md"
						className="w-full"
						disabled={busy || !BUILDER_CONFIGURED}
						iconLeft={busy ? <SpinnerGapIcon className="size-4 animate-spin" /> : undefined}
						onClick={handleApprove}
					>
						{busy ? status.replaceAll("_", " ") : "Approve fee & trading key"}
					</Button>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}
