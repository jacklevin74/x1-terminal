import { NativeWithdrawModal } from "./deposit/native-withdraw-modal";
import { NativeDepositModal } from "./deposit/native-deposit-modal";
import { WalletDepositModal } from "./deposit/wallet-deposit-modal";
import {
	Button,
	Modal,
	ModalContent,
	ModalHeader,
	ModalPopup,
	ModalTitle,
} from "@hypeterminal/ui";
import { Trans } from "@lingui/react/macro";
import { Suspense, useState } from "react";




import { formatTransferError } from "@/lib/errors/format";
import { useDeposit } from "@/lib/hyperliquid";
import { createLazyComponent } from "@/lib/lazy";


import { useDepositModalActions, useDepositModalOpen, useDepositModalTab } from "@/stores/use-global-modal-store";
import { DepositForm } from "./deposit/deposit-form";
import { StatusScreen } from "./deposit/shared-ui";

import { WrongNetworkScreen } from "./deposit/wrong-network-screen";

const LazyBridgeTab = createLazyComponent(() => import("./bridge/bridge-tab"), "BridgeTab");



const DEPOSIT_TAB_MIN_HEIGHT = "min-h-72";

export function DepositModal() {
	const open = useDepositModalOpen();
	const activeTab = useDepositModalTab();
	const { close, setTab } = useDepositModalActions();

	const [depositAmount, setDepositAmount] = useState("");


	const {
		isArbitrum,
		switchToArbitrum,
		isSwitching,
		switchError,
		balance: depositBalance,
		status: depositStatus,
		error: depositError,
		hash: depositHash,
		deposit,
		validate: validateDeposit,
		reset: resetDeposit,
	} = useDeposit();

	const depositValidation = validateDeposit(depositAmount);


	function handleClose() {
		resetDeposit();

		setDepositAmount("");

		close();
	}

	function handleDepositSubmit() {
		if (depositValidation.valid) {
			deposit(depositAmount);
		}
	}

 if (!open) return null;
 if (activeTab === "withdraw") return <NativeWithdrawModal onClose={handleClose} />;
 if (activeTab === "deposit") return <NativeDepositModal open={open} onClose={handleClose} />;
 if (activeTab === "wallet") return <WalletDepositModal open={open} onClose={handleClose} />;

	if (!isArbitrum && activeTab === "usdc") {
		return (
			<WrongNetworkScreen
				open={open}
				onClose={handleClose}
				onSwitch={switchToArbitrum}
                onEthDeposit={() => setTab("deposit")}
				isSwitching={isSwitching}
				error={switchError}
			/>
		);
	}

	if (depositStatus === "success") {
		return (
			<StatusScreen
				title={<Trans>Deposit</Trans>}
				icon="success"
				heading={<Trans>Deposit complete</Trans>}
				description={
					<>
						<span className="tabular-nums font-medium text-success">{depositAmount} USDC</span>{" "}
						<Trans>sent to Hyperliquid</Trans>
					</>
				}
				txHash={depositHash}
				onClose={handleClose}
			>
				<Button onClick={handleClose} className="w-full">
					<Trans>Done</Trans>
				</Button>
			</StatusScreen>
		);
	}

	if (depositStatus === "error") {
		return (
			<StatusScreen
				title={<Trans>Deposit</Trans>}
				icon="error"
				heading={<Trans>Deposit failed</Trans>}
				description={formatTransferError(depositError)}
				onClose={handleClose}
			>
				<div className="flex w-full gap-2">
					<Button variant="outline" intent="neutral" onClick={handleClose} className="flex-1">
						<Trans>Cancel</Trans>
					</Button>
					<Button onClick={resetDeposit} className="flex-1">
						<Trans>Retry</Trans>
					</Button>
				</div>
			</StatusScreen>
		);
	}

	if (depositStatus === "pending" || depositStatus === "confirming") {
		return (
			<StatusScreen
				title={<Trans>Deposit</Trans>}
				icon="loading"
				heading={depositStatus === "pending" ? <Trans>Confirm in wallet</Trans> : <Trans>Processing deposit</Trans>}
				description={<span className="tabular-nums">{depositAmount} USDC → Hyperliquid</span>}
				txHash={depositStatus === "confirming" ? depositHash : undefined}
				closable={false}
			/>
		);
	}

 return <Modal open={open} onOpenChange={handleClose}>
  <ModalPopup size="md">
   <ModalHeader><ModalTitle>{activeTab === "bridge" ? "Bridge" : "Deposit USDC"}</ModalTitle></ModalHeader>
   <ModalContent className="space-y-4">
    <div className={`flex flex-col ${DEPOSIT_TAB_MIN_HEIGHT}`}>
     {activeTab === "usdc" && <DepositForm amount={depositAmount} onAmountChange={setDepositAmount} balance={depositBalance} validation={depositValidation} isPending={false} onSubmit={handleDepositSubmit} />}
     {activeTab === "bridge" && <Suspense fallback={null}><LazyBridgeTab /></Suspense>}
    </div>
   </ModalContent>
  </ModalPopup>
 </Modal>;
}
