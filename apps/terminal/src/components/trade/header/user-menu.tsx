import { Popover } from "@base-ui/react/popover";
import { Button } from "@hypeterminal/ui";
import { CaretDownIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { zeroAddress } from "viem";
import { useConnection, useDisconnect } from "wagmi";
import { APP_BAR_BUTTON_HEIGHT_CLASS } from "@/config/layout";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { cn } from "@/lib/cn";
import { exitDemoMode } from "@/lib/demo/demo-mode";
import { removeAgentFromStorage, useInfo } from "@/lib/hyperliquid";
import { getNetwork } from "@/lib/network";
import { useOrderEntryActions } from "@/stores/use-order-entry-store";
import { useTradingAccountStore } from "@/stores/use-trading-account-store";
import { WalletModal } from "../components/wallet-modal";

const menuItemClass =
	"block w-full rounded-6 px-2 py-1.5 text-left transition-colors duration-150 hover:bg-fill-hover focus-visible:outline-2 focus-visible:outline-stroke-focus disabled:opacity-40";

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
	const [walletOpen, setWalletOpen] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: close the picker when the connected owner changes
	useEffect(() => {
		setPickerOpen(false);
	}, [address]);

	if (!isConnected || !address) {
		return (
			<>
				<Button
					variant="filled"
					intent="brand"
					size="sm"
					onClick={() => setWalletOpen(true)}
					className={cn(APP_BAR_BUTTON_HEIGHT_CLASS, "text-sm font-semibold")}
				>
					Connect Wallet
				</Button>
				<WalletModal open={walletOpen} onOpenChange={setWalletOpen} />
			</>
		);
	}

	const owner = address;
	const demo = connector?.type === "mock";
	const rows = (subaccounts.data ?? []).filter((row) => row.master.toLowerCase() === owner.toLowerCase());

	function choose(account: (typeof rows)[number] | null) {
		if (mutating) return;
		select(account ? { owner, network: getNetwork(), address: account.subAccountUser, name: account.name } : null);
		resetForm();
		setPickerOpen(false);
	}

	function handleDisconnect() {
		setPickerOpen(false);
		select(null);
		if (demo) {
			disconnect();
			exitDemoMode();
			return;
		}
		removeAgentFromStorage("Testnet", owner);
		removeAgentFromStorage("Mainnet", owner);
		disconnect();
	}

	return (
		<Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
			<Popover.Trigger
				aria-label="Account and wallet"
				className={cn(
					APP_BAR_BUTTON_HEIGHT_CLASS,
					"inline-flex max-w-64 items-center gap-2 rounded-8 bg-control px-3 text-xs font-medium text-fg tabular-nums transition-colors duration-150 hover:bg-control-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
				)}
			>
				{demo && <span className="rounded-4 bg-control-hover px-1.5 py-0.5 text-2xs text-fg-secondary">Demo</span>}
				<span className="truncate">
					{active.isSubaccount ? `Sub: ${active.subaccount?.name}` : `Main: ${shortAddress(owner)}`}
				</span>
				<CaretDownIcon
					aria-hidden="true"
					className={cn("size-3.5 shrink-0 transition-transform", pickerOpen && "rotate-180")}
				/>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="end" sideOffset={6} collisionPadding={12} className="z-[var(--z-dropdown)]">
					<Popover.Popup
						aria-label="Switch trading account"
						className="flex max-h-[min(70dvh,480px)] w-[248px] max-w-[calc(100vw-24px)] flex-col rounded-8 bg-overlay p-1 text-xs text-fg shadow-menu outline-none"
					>
						<div className="min-h-0 overflow-y-auto">
							<AccountRow
								kind="Master"
								label="Main account"
								address={owner}
								selected={!active.isSubaccount}
								disabled={mutating}
								onSelect={() => choose(null)}
							/>
							{rows.map((row) => (
								<AccountRow
									key={row.subAccountUser}
									kind="Sub"
									label={row.name}
									address={row.subAccountUser}
									selected={active.address?.toLowerCase() === row.subAccountUser.toLowerCase()}
									disabled={mutating || subaccounts.isError}
									onSelect={() => choose(row)}
								/>
							))}
							{subaccounts.isLoading && (
								<output className="block px-2 py-1.5 text-fg-muted">Loading subaccounts…</output>
							)}
							{subaccounts.isError && (
								<button
									type="button"
									onClick={() => void subaccounts.refetch()}
									className={cn(menuItemClass, "text-warning")}
								>
									Could not refresh accounts. Retry
								</button>
							)}
						</div>
						<div className="mt-1 shrink-0 border-t border-stroke-weak pt-1">
							<a
								href="/subAccounts"
								className={cn(menuItemClass, "text-fg-muted hover:text-fg")}
								onClick={() => setPickerOpen(false)}
							>
								Manage subaccounts
							</a>
							<button
								type="button"
								className={cn(menuItemClass, "text-fg")}
								disabled={mutating}
								onClick={handleDisconnect}
							>
								{demo ? "Exit demo mode" : "Disconnect"}
							</button>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

interface AccountRowProps {
	kind: "Master" | "Sub";
	label: string;
	address: string;
	selected: boolean;
	disabled: boolean;
	onSelect: () => void;
}

function AccountRow({ kind, label, address, selected, disabled, onSelect }: AccountRowProps) {
	const { copy, copied } = useCopyToClipboard(1800);
	const short = shortAddress(address);
	return (
		<div className={cn("group flex items-center rounded-6", selected ? "bg-fill-hover" : "hover:bg-fill-weak")}>
			<button
				type="button"
				aria-label={kind === "Master" ? `Select main account ${short}` : `Select subaccount ${label}`}
				aria-pressed={selected}
				disabled={disabled}
				onClick={onSelect}
				className="flex min-w-0 flex-1 items-center gap-1.5 rounded-6 py-1.5 pr-1 pl-1.5 text-left focus-visible:outline-2 focus-visible:outline-stroke-focus disabled:opacity-40"
			>
				<span className="inline-flex size-3 shrink-0 items-center justify-center text-fg">
					{selected && <CheckIcon aria-hidden="true" weight="bold" className="size-3" />}
				</span>
				<span className={cn("min-w-0 flex-1 truncate text-fg", selected && "font-medium")}>{label}</span>
				<span className="shrink-0 font-mono text-2xs text-fg-muted" title={address}>
					{short}
				</span>
			</button>
			<button
				type="button"
				aria-label={`Copy ${kind === "Master" ? "main account" : label} address`}
				title={copied ? "Copied" : "Copy address"}
				onClick={() => void copy(address)}
				className="mr-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-4 text-fg-muted opacity-0 transition-opacity hover:bg-fill-hover hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-stroke-focus [@media(hover:none)]:opacity-100"
			>
				{copied ? (
					<CheckIcon aria-hidden="true" className="size-3.5 text-market-up" />
				) : (
					<CopyIcon aria-hidden="true" className="size-3.5" />
				)}
			</button>
		</div>
	);
}

function shortAddress(address: string) {
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
