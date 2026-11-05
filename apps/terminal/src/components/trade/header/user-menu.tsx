import { Button, Dropdown } from "@hypeterminal/ui";
import { CopyIcon, KeyIcon, SignOutIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useConnection, useDisconnect } from "wagmi";
import { APP_BAR_BUTTON_HEIGHT_CLASS } from "@/config/layout";
import { cn } from "@/lib/cn";
import { exitDemoMode } from "@/lib/demo/demo-mode";
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
					className={cn(APP_BAR_BUTTON_HEIGHT_CLASS, "text-sm font-semibold")}
				>
					Connect Wallet
				</Button>
				<WalletModal open={open} onOpenChange={setOpen} />
			</>
		);
	}

	const derived = connector?.id === "x1";
	const demo = connector?.type === "mock";

	function handleDisconnect() {
		if (!address) return;
		if (demo) {
			disconnect();
			exitDemoMode();
			return;
		}
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
				triggerClassName="tabular-nums max-md:h-8 max-md:px-2.5 max-md:[&>svg:last-child]:hidden"
				trigger={
					<span className="inline-flex items-center gap-2 whitespace-nowrap">
						<WalletLabel derived={derived} demo={demo} />
						<span>
							{address.slice(0, 4)}
							<span className="max-md:hidden">{address.slice(4, 6)}</span>…{address.slice(-4)}
						</span>
					</span>
				}
				popupClassName="max-h-none"
				groups={[
					{
						label: getAccountLabel(derived, demo),
						items: accountItems,
					},
					{
						items: [
							{
								label: demo ? "Exit demo mode" : "Disconnect",
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

function WalletLabel({ derived, demo }: { derived: boolean; demo: boolean }) {
	if (demo) return <span className="text-warning">Demo</span>;
	if (derived) return <X1Tile size={18} />;
	return <span className="text-fg-muted max-md:hidden">Phantom</span>;
}

function getAccountLabel(derived: boolean, demo: boolean) {
	if (demo) return "Demo · read-only public account";
	if (derived) return "Derived from your X1 signature";
	return "Phantom Ethereum account";
}
