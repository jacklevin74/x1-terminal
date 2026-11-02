import { Button, Dropdown } from "@hypeterminal/ui";
import { CopyIcon, KeyIcon, SignOutIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useConnection, useDisconnect } from "wagmi";
import { APP_BAR_BUTTON_HEIGHT_CLASS } from "@/config/layout";
import { cn } from "@/lib/cn";
import { removeAgentFromStorage } from "@/lib/hyperliquid";
import { clearX1Session } from "@/lib/x1/provider";
import { ExportKeyModal } from "../components/export-key-modal";
import { WalletModal } from "../components/wallet-modal";
import { X1Tile } from "./x1-terminal-logo";

export function UserMenu() {
	const { address, isConnected, connector } = useConnection();
	const { mutate: disconnect } = useDisconnect();
	const [open, setOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);

	if (!isConnected || !address) {
		return (
			<>
				<Button
					variant="filled"
					intent="brand"
					size="sm"
					onClick={() => setOpen(true)}
					className={cn(APP_BAR_BUTTON_HEIGHT_CLASS, "text-sm font-semibold max-md:h-10 max-md:min-h-10")}
				>
					Connect Wallet
				</Button>
				<WalletModal open={open} onOpenChange={setOpen} />
			</>
		);
	}

	const derived = connector?.id === "x1";

	function handleDisconnect() {
		if (!address) return;
		removeAgentFromStorage("Testnet", address);
		removeAgentFromStorage("Mainnet", address);
		clearX1Session();
		disconnect();
	}

	const accountItems = [
		{
			label: `Copy ${address}`,
			icon: <CopyIcon className="size-4" />,
			onSelect: () => {
				void navigator.clipboard.writeText(address);
			},
		},
		{
			label: "Trading setup · 0.05% fee",
			icon: <SlidersHorizontalIcon className="size-4" />,
			onSelect: () => window.dispatchEvent(new Event("x1:setup")),
		},
		...(derived
			? [
					{
						label: "Export derived private key",
						icon: <KeyIcon className="size-4" />,
						onSelect: () => setExportOpen(true),
					},
				]
			: []),
	];

	return (
		<>
			<Dropdown
				align="end"
				size="sm"
				triggerAriaLabel="Account and wallet"
				triggerClassName="tabular-nums"
				trigger={
					<span className="inline-flex items-center gap-2">
						{derived ? <X1Tile size={18} /> : <span className="text-fg-muted">Phantom</span>}
						<span>
							{address.slice(0, 6)}…{address.slice(-4)}
						</span>
					</span>
				}
				popupClassName="max-h-none"
				groups={[
					{
						label: derived ? "Derived from your X1 signature" : "Phantom Ethereum account",
						items: accountItems,
					},
					{
						items: [
							{
								label: "Disconnect",
								icon: <SignOutIcon className="size-4" />,
								danger: true,
								onSelect: handleDisconnect,
							},
						],
					},
				]}
			/>
			{derived && exportOpen && <ExportKeyModal key={address} address={address} onClose={() => setExportOpen(false)} />}
		</>
	);
}
