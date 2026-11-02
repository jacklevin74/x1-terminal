import { Badge, Button, ButtonIcon, Drawer, DrawerContent } from "@hypeterminal/ui";
import { Trans } from "@lingui/react/macro";
import {
	DownloadSimpleIcon,
	GearIcon,
	HammerIcon,
	ListIcon,
	TerminalIcon,
	TrendUpIcon,
	WalletIcon,
	XIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useConnection } from "wagmi";
import { SCOPE_NAV_ITEMS, STATIC_NAV_ITEMS } from "@/config/nav";
import { cn } from "@/lib/cn";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useDepositModalActions, useSettingsDialogActions } from "@/stores/use-global-modal-store";
import { WalletModal } from "../components/wallet-modal";
import X1TerminalLogo from "../header/x1-terminal-logo";

function ScopeIcon({ scope }: { scope: string }) {
	switch (scope) {
		case "perp":
			return <TrendUpIcon className="size-4 shrink-0" />;
		case "spot":
			return <WalletIcon className="size-4 shrink-0" />;
		case "builders-perp":
			return <HammerIcon className="size-4 shrink-0" />;
		default:
			return <TerminalIcon className="size-4 shrink-0" />;
	}
}

export function MobileNavDrawer() {
	const [open, setOpen] = useState(false);
	const [walletOpen, setWalletOpen] = useState(false);
	const { scope } = useExchangeScope();
	const { isConnected } = useConnection();
	const { open: openDepositModal } = useDepositModalActions();
	const { open: openSettingsDialog } = useSettingsDialogActions();

	function close() {
		setOpen(false);
	}

	return (
		<>
			<ButtonIcon variant="ghost" intent="neutral" size="sm" aria-label="Open navigation" onClick={() => setOpen(true)}>
				<ListIcon className="size-4" />
			</ButtonIcon>

			<Drawer side="left" open={open} onOpenChange={setOpen}>
				<DrawerContent className="w-4/5 max-w-72 flex flex-col p-0">
					<div className="h-12 px-3 flex items-center justify-between border-b border-stroke-weak shrink-0">
						<X1TerminalLogo />
						<ButtonIcon variant="ghost" intent="neutral" size="sm" aria-label="Close navigation" onClick={close}>
							<XIcon className="size-4" />
						</ButtonIcon>
					</div>

					<div className="flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden py-2">
						<nav className="px-1 flex flex-col gap-1" aria-label="Markets">
							<p className="h-6 px-2 flex items-center text-2xs font-normal uppercase tracking-micro text-fg-muted">
								<Trans>Markets</Trans>
							</p>
							{SCOPE_NAV_ITEMS.map((item) => {
								const isActive = scope === item.scope;
								return (
									<Link
										key={item.scope}
										to={item.to}
										onClick={close}
										aria-current={isActive ? "page" : undefined}
										className={cn(
											"h-10 flex items-center gap-3 px-2 rounded-8 text-sm transition-colors duration-150 motion-reduce:transition-none",
											isActive ? cn(item.activeClass, "font-medium") : "text-fg-muted hover:text-fg hover:bg-control",
										)}
									>
										<ScopeIcon scope={item.scope} />
										<span className="flex-1 truncate">{item.label}</span>
									</Link>
								);
							})}
						</nav>

						<div className="mx-3 border-t border-stroke-weak" />

						<nav className="px-1 flex flex-col gap-1" aria-label="Platform">
							<p className="h-6 px-2 flex items-center text-2xs font-normal uppercase tracking-micro text-fg-muted">
								<Trans>Platform</Trans>
							</p>
							{STATIC_NAV_ITEMS.map((item) => (
								<div
									key={item.key}
									className="h-10 flex items-center justify-between px-2 rounded-8 text-sm text-fg-disabled"
								>
									<span>{item.label}</span>
									<Badge tone="neutral" size="xs" className="font-normal text-fg-disabled">
										<Trans>Soon</Trans>
									</Badge>
								</div>
							))}
						</nav>
					</div>

					<div className="shrink-0 p-3 border-t border-stroke-weak flex flex-col gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
						{isConnected ? (
							<Button
								variant="secondary"
								intent="neutral"
								size="sm"
								onClick={() => {
									openDepositModal("deposit");
									close();
								}}
								iconLeft={<DownloadSimpleIcon className="size-4" />}
								className="w-full"
							>
								<Trans>Deposit</Trans>
							</Button>
						) : (
							<Button
								variant="filled"
								intent="brand"
								size="md"
								onClick={() => setWalletOpen(true)}
								iconLeft={<WalletIcon className="size-4" />}
								className="w-full"
							>
								<Trans>Connect Wallet</Trans>
							</Button>
						)}
						<div className="flex items-center justify-between">
							<ButtonIcon
								variant="ghost"
								intent="neutral"
								size="sm"
								aria-label="Settings"
								onClick={() => {
									openSettingsDialog();
									close();
								}}
							>
								<GearIcon className="size-4" />
							</ButtonIcon>
						</div>
					</div>
				</DrawerContent>
			</Drawer>

			<WalletModal open={walletOpen} onOpenChange={setWalletOpen} />
		</>
	);
}
