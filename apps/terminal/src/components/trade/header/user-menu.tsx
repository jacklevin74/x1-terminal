import { Button, dropdownTriggerVariants } from "@hypeterminal/ui";
import { CaretDownIcon, CodeIcon, KeyIcon, SignOutIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useIsMutating } from "@tanstack/react-query";
import { useState } from "react";
import { zeroAddress } from "viem";
import { useConnection, useDisconnect } from "wagmi";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { APP_BAR_BUTTON_HEIGHT_CLASS } from "@/config/layout";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { cn } from "@/lib/cn";
import { exitDemoMode } from "@/lib/demo/demo-mode";
import { removeAgentFromStorage, useInfo } from "@/lib/hyperliquid";
import { getNetwork } from "@/lib/network";
import { clearX1Session } from "@/lib/x1/provider";
import { useOrderEntryActions } from "@/stores/use-order-entry-store";
import { useTradingAccountStore } from "@/stores/use-trading-account-store";
import { ExportKeyModal } from "../components/export-key-modal";
import { WalletLogo } from "../components/wallet-logo";
import { WalletModal } from "../components/wallet-modal";
import { AccountMenu } from "./account-menu";
import type { MenuAccount } from "./account-menu-types";

export function UserMenu() {
	const { address, isConnected, connector } = useConnection();
	const { mutate: disconnect } = useDisconnect();
	const active = useTradingAccount();
	const mutating = useIsMutating() > 0;
	const select = useTradingAccountStore((s) => s.select);
	const { resetForm } = useOrderEntryActions();
	const subaccounts = useInfo(
		"subAccounts",
		{ user: address ?? zeroAddress },
		{ enabled: isConnected && !!address, refetchOnWindowFocus: true, refetchInterval: 30000 },
	);
	const main = useInfo(
		"clearinghouseState",
		{ user: address ?? zeroAddress },
		{ enabled: isConnected && !!address, refetchOnWindowFocus: true, refetchInterval: 30000 },
	);
	const [open, setOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
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

	const owner = address;
	const derived = connector?.id === "x1";
	const demo = connector?.type === "mock";
	const walletName = getWalletName(derived, connector);
	const activeAddress = active.address ?? owner;
	const rows = (subaccounts.data ?? []).filter((row) => row.master.toLowerCase() === owner.toLowerCase());

	const accounts: MenuAccount[] = [
		{
			address: owner,
			name: "Main account",
			master: true,
			value: main.data?.marginSummary?.accountValue,
			withdrawable: main.data?.withdrawable,
		},
		...rows.map((row) => ({
			address: row.subAccountUser,
			name: row.name,
			master: false,
			value: row.clearinghouseState?.marginSummary.accountValue,
			withdrawable: row.clearinghouseState?.withdrawable,
		})),
	];

	function choose(account: MenuAccount) {
		select(account.master ? null : { owner, network: getNetwork(), address: account.address, name: account.name });
		resetForm();
	}

	function refresh() {
		void subaccounts.refetch();
		void main.refetch();
	}

	function handleDisconnect() {
		select(null);
		if (demo) {
			disconnect();
			exitDemoMode();
			return;
		}
		removeAgentFromStorage("Testnet", owner);
		removeAgentFromStorage("Mainnet", owner);
		clearX1Session();
		disconnect();
	}

	const actionItems = [
		{
			label: "API wallets",
			icon: <CodeIcon className="size-4" />,
			onSelect: () => window.location.assign("/API"),
		},
		{
			label: "Trading setup",
			icon: <SlidersHorizontalIcon className="size-4" />,
			detail: "0.05% fee",
			onSelect: () => window.dispatchEvent(new Event("x1:setup")),
		},
		...(derived
			? [
					{
						label: "Export private key",
						icon: <KeyIcon className="size-4" />,
						onSelect: () => setExportOpen(true),
					},
				]
			: []),
	];

	return (
		<>
			<Popover open={menuOpen} onOpenChange={setMenuOpen}>
				<PopoverTrigger
					aria-label="Account and wallet"
					className={cn(
						dropdownTriggerVariants({ size: "sm" }),
						"tabular-nums max-md:h-8 max-md:px-2.5 max-md:[&>svg:last-child]:hidden",
					)}
				>
					<span data-trigger className="inline-flex max-w-56 items-center gap-2 whitespace-nowrap">
						<WalletLabel connector={connector} demo={demo} name={active.subaccount?.name} />
						<span>
							{activeAddress.slice(0, 4)}
							<span className="max-md:hidden">{activeAddress.slice(4, 6)}</span>…{activeAddress.slice(-4)}
						</span>
					</span>
					<CaretDownIcon
						size={12}
						weight="bold"
						className="shrink-0 text-fg-muted transition-transform duration-150 motion-reduce:transition-none [[data-popup-open]>&]:rotate-180"
					/>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-auto p-0">
					<AccountMenu
						accounts={accounts}
						activeAddress={activeAddress}
						walletLabel={getAccountLabel(derived, demo, walletName)}
						canManage={!demo}
						switchDisabled={mutating}
						loadError={!!subaccounts.isError}
						more={actionItems}
						groups={[
							[
								{
									label: demo ? "Exit demo mode" : "Disconnect",
									icon: <SignOutIcon className="size-4" />,
									onSelect: handleDisconnect,
								},
							],
						]}
						onSwitch={choose}
						onRefresh={refresh}
						onClose={() => setMenuOpen(false)}
					/>
				</PopoverContent>
			</Popover>
			{derived && exportOpen && <ExportKeyModal key={owner} address={owner} onClose={() => setExportOpen(false)} />}
		</>
	);
}

function getWalletName(derived: boolean, connector: { id: string; name: string } | undefined) {
	if (derived) return "X1";
	if (connector?.id === "rabby") return "Rabby";
	return connector?.name ?? "Wallet";
}

interface WalletLabelProps {
	connector: { id: string; icon?: string } | undefined;
	demo: boolean;
	name: string | undefined;
}

function WalletLabel({ connector, demo, name }: WalletLabelProps) {
	if (demo) return <span className="rounded-4 bg-control-hover px-1.5 py-0.5 text-2xs text-fg-secondary">Demo</span>;
	return (
		<>
			<WalletLogo connector={connector} size={18} />
			{name && <span className="truncate text-fg-muted max-md:hidden">{name}</span>}
		</>
	);
}

function getAccountLabel(derived: boolean, demo: boolean, walletName: string) {
	if (demo) return "Read-only demo account";
	if (derived) return "X1 Wallet derived key";
	return walletName;
}
