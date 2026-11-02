import { Modal, ModalPopup, Select } from "@hypeterminal/ui";
import { useEffect, useRef, useState } from "react";
import { useConnection } from "wagmi";
import { readNativeEthereumRecipient } from "@/lib/wallet/native-ethereum";
import { NativeWithdrawForm } from "../../positions/native-withdraw-form";

const WITHDRAW_ASSET_OPTIONS = [
	{ value: "SOL", label: "SOL · Solana" },
	{ value: "ETH", label: "ETH · Ethereum" },
];

export function NativeWithdrawModal({ onClose, initialAsset }: { onClose: () => void; initialAsset?: "SOL" | "ETH" }) {
	const { address, connector } = useConnection();
	const manualSelection = useRef(false);
	const busyRef = useRef(false);
	const [busy, setBusy] = useState(false);
	busyRef.current = busy;
	const [asset, setAsset] = useState<"SOL" | "ETH">(initialAsset ?? (connector?.id === "phantom" ? "ETH" : "SOL"));
	useEffect(() => {
		let active = true;
		const detect = async () => {
			if (manualSelection.current || busyRef.current) return;
			const native = await readNativeEthereumRecipient();
			if (active && !manualSelection.current && !busyRef.current && native.status === "ready") setAsset("ETH");
		};
		void detect();
		const update = () => {
			void detect();
		};
		window.addEventListener("focus", update);
		window.addEventListener("eip6963:announceProvider", update);
		const interval = window.setInterval(update, 2000);
		return () => {
			active = false;
			window.clearInterval(interval);
			window.removeEventListener("focus", update);
			window.removeEventListener("eip6963:announceProvider", update);
		};
	}, [connector?.id]);
	useEffect(() => {
		if (busy) manualSelection.current = true;
	}, [busy]);
	return (
		<Modal
			open
			onOpenChange={(open) => {
				if (!open && !busy) onClose();
			}}
		>
			<ModalPopup size="md" showClose={!busy}>
				<div className="flex flex-col gap-3 p-4 pb-0">
					<span className="pr-10 text-base font-medium text-fg">Withdraw</span>
					<Select
						aria-label="Withdrawal asset"
						inlineLabel="Asset"
						disabled={busy}
						value={asset}
						onValueChange={(value) => {
							if (value !== "SOL" && value !== "ETH") return;
							manualSelection.current = true;
							setAsset(value);
						}}
						options={WITHDRAW_ASSET_OPTIONS}
					/>
				</div>
				<NativeWithdrawForm
					key={`${asset}:${address}:${connector?.id}`}
					asset={asset}
					onBusyChange={setBusy}
					onBack={onClose}
				/>
			</ModalPopup>
		</Modal>
	);
}
