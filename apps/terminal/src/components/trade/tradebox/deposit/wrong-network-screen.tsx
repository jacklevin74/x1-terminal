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
				<ModalContent className="space-y-4">
					<div className="flex items-start gap-3 rounded-8 border border-stroke-warning-strong/20 bg-warning-soft/10 p-4">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-soft/20">
							<WarningCircleIcon className="size-4 text-warning" />
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium">
								<Trans>Choose a deposit route</Trans>
							</p>
							<p className="text-xs text-fg">
								<Trans>Direct USDC deposits use Arbitrum. To deposit native ETH from Ethereum, choose the ETH deposit route.</Trans>
							</p>
						</div>
					</div>
					{onEthDeposit && <Button variant="filled" intent="brand" onClick={onEthDeposit} disabled={isSwitching} className="w-full">Deposit native ETH</Button>}
                    {error && <p className="text-xs text-error px-1">{error.message}</p>}
					<Button variant="filled" intent="neutral" onClick={onSwitch} disabled={isSwitching} className="w-full">
						{isSwitching ? (
							<>
								<SpinnerGapIcon className="size-4 animate-spin" />
								<Trans>Switching...</Trans>
							</>
						) : (
							<Trans>Switch to Arbitrum</Trans>
						)}
					</Button>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}
