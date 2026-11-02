import { Button, ButtonIcon, Divider, Dropdown } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DownloadSimpleIcon, GearIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { useConnection } from "wagmi";
import { APP_BAR_BUTTON_HEIGHT_CLASS, APP_HEADER_HEIGHT_CLASS } from "@/config/layout";
import { SCOPE_NAV_ITEMS, STATIC_NAV_ITEMS } from "@/config/nav";
import { cn } from "@/lib/cn";
import { createLazyComponent } from "@/lib/lazy";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useDepositModalActions, useSettingsDialogActions } from "@/stores/use-global-modal-store";
import { useIsTestnet } from "@/stores/use-global-settings-store";
import X1TerminalLogo from "./x1-terminal-logo";

const UserMenu = createLazyComponent(() => import("./user-menu"), "UserMenu");

const NAV_LINK_CLASS =
	"relative flex h-7 items-center rounded-8 px-3 text-sm font-normal transition-colors duration-150";

export function TopNav() {
	const { open: openDepositModal } = useDepositModalActions();
	const { open: openSettingsDialog } = useSettingsDialogActions();
	const { isConnected } = useConnection();
	const { scope } = useExchangeScope();
	const isTestnet = useIsTestnet();

	return (
		<header
			className={cn(
				APP_HEADER_HEIGHT_CLASS,
				"fixed left-0 right-0 z-40 flex items-center justify-between border-b border-stroke-weak bg-background px-3",
				isTestnet ? "top-8" : "top-0",
			)}
		>
			<div className="flex min-w-0 items-center gap-4">
				<X1TerminalLogo />
				<nav className="hidden items-center gap-1 lg:flex">
					{SCOPE_NAV_ITEMS.map((item) => {
						const isActive = scope === item.scope;
						return (
							<Link
								key={item.scope}
								to={item.to}
								aria-current={isActive ? "page" : undefined}
								className={cn(NAV_LINK_CLASS, isActive ? item.activeClass : "text-fg-muted hover:text-fg")}
							>
								{isActive && (
									<span aria-hidden className={cn("absolute top-1 right-1 size-1.5 rounded-full", item.accentClass)} />
								)}
								{item.label}
							</Link>
						);
					})}
					<Divider orientation="vertical" className="mx-2 h-4 self-center" />
					{STATIC_NAV_ITEMS.map((item) => (
						<button
							key={item.key}
							type="button"
							disabled
							tabIndex={-1}
							className={cn(NAV_LINK_CLASS, "cursor-not-allowed text-fg-disabled")}
						>
							{item.label}
						</button>
					))}
				</nav>
			</div>

			<div className="flex items-center gap-2">
				{isConnected && (
					<div className="flex items-center gap-px">
						<Button
							variant="secondary"
							intent="neutral"
							size="sm"
							onClick={() => openDepositModal("deposit")}
							iconLeft={<DownloadSimpleIcon className="size-4" />}
							className={cn(APP_BAR_BUTTON_HEIGHT_CLASS, "rounded-r-none")}
						>
							<Trans>Deposit</Trans>
						</Button>
						<Dropdown
							align="end"
							size="sm"
							triggerAriaLabel="More deposit options"
							trigger={<span className="sr-only">More deposit options</span>}
							triggerClassName="h-8 max-md:h-8 rounded-l-none px-2"
							items={[
								{ label: "Deposit from wallet", onSelect: () => openDepositModal("wallet") },
								{ label: "Deposit USDC from Arbitrum", onSelect: () => openDepositModal("usdc") },
								{ label: "Bridge from other chains", onSelect: () => openDepositModal("bridge") },
							]}
						/>
					</div>
				)}
				<Suspense fallback={<UserMenuSkeleton />}>
					<UserMenu />
				</Suspense>
				<ButtonIcon variant="ghost" intent="neutral" size="sm" onClick={openSettingsDialog} aria-label={t`Settings`}>
					<GearIcon className="size-4" />
				</ButtonIcon>
			</div>
		</header>
	);
}

function UserMenuSkeleton() {
	return <div className={cn(APP_BAR_BUTTON_HEIGHT_CLASS, "w-32 shrink-0 animate-pulse rounded-8 bg-control")} />;
}
