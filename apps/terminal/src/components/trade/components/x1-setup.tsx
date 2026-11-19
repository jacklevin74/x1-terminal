import { Button, Modal, ModalContent, ModalDescription, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useConnection, useWalletClient } from "wagmi";
import { BUILDER_CONFIGURED } from "@/config/hyperliquid";
import { useAgentRegistration, useAgentStatus } from "@/lib/hyperliquid";
import { useIsTestnet } from "@/stores/use-global-settings-store";
import { WalletModal } from "./wallet-modal";

const stepBadgeClass =
	"flex size-4 shrink-0 items-center justify-center rounded-4 bg-control text-xs font-medium tabular-nums text-fg-secondary";

export function X1Setup() {
	const { address } = useConnection();
	const { isReady, needsAgent, needsBuilderFee, isLoading } = useAgentStatus();
	const { data: walletClient } = useWalletClient();
	const [walletOpen, setWalletOpen] = useState(false);
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
		if (!walletClient || !address) {
			setOpen(false);
			setWalletOpen(true);
			return;
		}
		try {
			await register();
		} catch (e) {
			setLocalError(e instanceof Error ? e.message : "Setup failed");
		}
	}

	const errorMessage = localError ?? error?.message;
	const steps: { key: string; body: React.ReactNode }[] = [];
	if (needsBuilderFee)
		steps.push({
			key: "fee",
			body: (
				<>
					Approve X1’s builder fee: <strong className="font-medium">0.05% per trade</strong>.
				</>
			),
		});
	if (needsAgent)
		steps.push({
			key: "agent",
			body: "Approve a trading-only key. It is saved on this device so you do not need to approve each trade. Expired or revoked keys require approval again.",
		});
	const buttonLabel = busy
		? status.replaceAll("_", " ")
		: !walletClient
			? "Connect / unlock wallet"
			: isLoading
				? "Checking approval…"
				: "Approve trading";

	return (
		<>
			<WalletModal open={walletOpen} onOpenChange={setWalletOpen} />
			<Modal
				open={open}
				onOpenChange={(next) => {
					if (!busy) setOpen(next);
				}}
			>
				<ModalPopup size="sm">
					<ModalHeader>
						<ModalTitle>Approve trading on {testnet ? "Testnet" : "Mainnet"}</ModalTitle>
						<ModalDescription>Approve in your wallet to enable trading.</ModalDescription>
					</ModalHeader>
					<ModalContent className="flex flex-col gap-4">
						{steps.length > 0 && (
							<ol className="flex flex-col gap-3 text-xs text-fg">
								{steps.map((step, index) => (
									<li key={step.key} className="flex items-start gap-2">
										<span className={stepBadgeClass}>{index + 1}</span>
										<span className="text-pretty">{step.body}</span>
									</li>
								))}
							</ol>
						)}
						{address && (
							<div className="flex flex-col gap-1 rounded-8 bg-control px-3 py-2">
								<span className="text-2xs uppercase tracking-micro text-fg-muted">Hyperliquid account</span>
								<span className="text-xs tabular-nums text-fg break-all">{address}</span>
							</div>
						)}
						{!walletClient && (
							<output className="block text-xs text-fg-muted text-pretty">
								Unlock and connect your wallet to approve trading. Your saved trading key will be reused when its
								approval is valid.
							</output>
						)}
						{busy && (
							<output className="block text-xs text-fg-muted text-pretty">
								{status === "verifying" ? "Checking approval…" : "Open your wallet and confirm the approval request."}
							</output>
						)}
						{!BUILDER_CONFIGURED && (
							<p role="alert" className="text-xs text-warning">
								Trading setup is unavailable for this deployment. Please contact support.
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
							disabled={busy || !BUILDER_CONFIGURED || (!!walletClient && isLoading)}
							iconLeft={busy ? <SpinnerGapIcon className="size-4 animate-spin" /> : undefined}
							onClick={handleApprove}
						>
							{buttonLabel}
						</Button>
					</ModalContent>
				</ModalPopup>
			</Modal>
		</>
	);
}
