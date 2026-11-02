import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { Trans } from "@lingui/react/macro";
import { SpinnerGapIcon, WarningCircleIcon } from "@phosphor-icons/react";

interface Props {
	open: boolean;
	onClose: () => void;
	onSwitch: () => void;
	onEthDeposit?: () => void;
	isSwitching: boolean;
	error?: Error | null;
}

export function WrongNetworkScreen({ open, onClose, onSwitch, isSwitching, error, onEthDeposit }: Props) {
	return (
		<Modal open={open} onOpenChange={onClose}>
			<ModalPopup size="sm">
				<ModalHeader>
					<ModalTitle>
						<Trans>Transfer</Trans>
					</ModalTitle>
				</ModalHeader>
				<ModalContent className="space-y-3">
					<div className="flex items-start gap-3 rounded-8 bg-control p-3">
						<WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-warning" />
						<div className="space-y-1">
							<p className="text-xs font-medium text-fg">
								<Trans>Choose a deposit route</Trans>
							</p>
							<p className="text-xs text-fg-secondary">
								<Trans>
									Direct USDC deposits use Arbitrum. To deposit native ETH from Ethereum, choose the ETH deposit route.
								</Trans>
							</p>
						</div>
					</div>
					{error && <p className="text-xs text-market-down">{error.message}</p>}
					<div className="flex flex-col gap-2">
						{onEthDeposit && (
							<Button
								variant="filled"
								intent="neutral"
								size="md"
								onClick={onEthDeposit}
								disabled={isSwitching}
								className="w-full"
							>
								Deposit native ETH
							</Button>
						)}
						<Button
							variant="secondary"
							intent="neutral"
							size="md"
							onClick={onSwitch}
							disabled={isSwitching}
							className="w-full"
						>
							{isSwitching ? (
								<>
									<SpinnerGapIcon className="size-4 animate-spin" />
									<Trans>Switching...</Trans>
								</>
							) : (
								<Trans>Switch to Arbitrum</Trans>
							)}
						</Button>
					</div>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}
