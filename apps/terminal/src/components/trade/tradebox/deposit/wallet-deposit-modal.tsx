import {
	Modal,
	ModalContent,
	ModalHeader,
	ModalPopup,
	ModalTitle,
	SegmentedControlItem,
	SegmentedControls,
} from "@hypeterminal/ui";
import { useState } from "react";
import { EthDeposit } from "./eth-deposit";
import { SolDeposit } from "./sol-deposit";

interface Props {
	open: boolean;
	onClose: () => void;
}

export function WalletDepositModal({ open, onClose }: Props) {
	const [asset, setAsset] = useState("sol");
	return (
		<Modal open={open} onOpenChange={onClose}>
			<ModalPopup size="md">
				<ModalHeader>
					<ModalTitle>Deposit from wallet</ModalTitle>
				</ModalHeader>
				<ModalContent className="space-y-4">
					<SegmentedControls value={asset} onValueChange={setAsset} fullWidth>
						<SegmentedControlItem value="sol">SOL · Solana</SegmentedControlItem>
						<SegmentedControlItem value="eth">ETH · Ethereum</SegmentedControlItem>
					</SegmentedControls>
					{asset === "sol" ? <SolDeposit /> : <EthDeposit />}
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}
