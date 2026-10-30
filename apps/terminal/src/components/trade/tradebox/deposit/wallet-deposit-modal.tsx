import { Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle, SegmentedControls, SegmentedControlItem } from "@hypeterminal/ui";
import { useState } from "react";
import { SolDeposit } from "./sol-deposit";
import { EthDeposit } from "./eth-deposit";
export function WalletDepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
 const [asset, setAsset] = useState("sol");
 return <Modal open={open} onOpenChange={onClose}><ModalPopup size="md"><ModalHeader><ModalTitle>Deposit from wallet</ModalTitle></ModalHeader><ModalContent className="space-y-4">
  <SegmentedControls value={asset} onValueChange={setAsset} fullWidth><SegmentedControlItem value="sol">SOL · Solana</SegmentedControlItem><SegmentedControlItem value="eth">ETH · Ethereum</SegmentedControlItem></SegmentedControls>
  {asset === "sol" ? <SolDeposit /> : <EthDeposit />}
 </ModalContent></ModalPopup></Modal>;
}
