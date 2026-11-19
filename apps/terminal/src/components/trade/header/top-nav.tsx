import { Button, ButtonIcon, Divider, Dropdown } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DownloadSimpleIcon, GearIcon, QuestionIcon, TerminalIcon } from "@phosphor-icons/react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { useConnection } from "wagmi";
import { writeThemePreference } from "@/components/newtheme/theme-mode";
import { APP_BAR_BUTTON_HEIGHT_CLASS, APP_HEADER_HEIGHT_CLASS } from "@/config/layout";
import { SCOPE_NAV_ITEMS, STATIC_NAV_ITEMS } from "@/config/nav";
import { cn } from "@/lib/cn";
import { createLazyComponent } from "@/lib/lazy";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useDepositModalActions, useSettingsDialogActions } from "@/stores/use-global-modal-store";
import { useIsTestnet } from "@/stores/use-global-settings-store";
import { useTerminalBrand } from "./terminal-brand";

const UserMenu = createLazyComponent(() => import("./user-menu"), "UserMenu");

function getScopeAccentClass(scope: string): string {
	switch (scope) {
		case "perp":
			return "border-scope-perp/40";
		case "spot":
			return "border-scope-spot/40";
		case "builders-perp":
			return "border-scope-builders/40";
		default:
			return "border-stroke-weak";
	}
}

export function TopNav() {
	const brand = useTerminalBrand();
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const preview = pathname === "/newtheme";
	const { open: openDepositModal } = useDepositModalActions();
	const { open: openSettingsDialog } = useSettingsDialogActions();
	const { isConnected } = useConnection();
	const { scope } = useExchangeScope();
	const isTestnet = useIsTestnet();

	const accentClass = getScopeAccentClass(scope);

	return (
		<header
			className={cn(
				APP_HEADER_HEIGHT_CLASS,
				"fixed left-0 right-0 z-40 border-b border-stroke-weak px-3 flex items-center justify-between bg-background transition-colors duration-300 ease-in-out",
				isTestnet ? "top-8" : "top-0",
				accentClass,
			)}
		>
			<div className="flex items-center gap-3 min-w-0">
				{brand ?? (
					<div className="flex items-center gap-1.5">
						<div className="size-5 rounded-8 bg-brand/10 border border-stroke-brand-strong/30 flex items-center justify-center">
							<TerminalIcon className="size-3 text-brand" />
						</div>
						<span className="text-xs font-bold tracking-tight">
							<span className="text-brand">X1 </span>
							<span className="text-fg">TERMINAL</span>
						</span>
						<button
							type="button"
							className="ml-1 rounded-4 border border-stroke-weak px-1.5 py-0.5 text-2xs text-fg-muted hover:text-fg"
							title="Switch to the new theme (saved in this browser)"
							onClick={() => {
								writeThemePreference("new");
								if (pathname === "/classic") void navigate({ to: "/" });
							}}
						>
							New theme
						</button>
					</div>
				)}
				<Divider orientation="vertical" className="my-2 hidden lg:block" />
				<nav className="hidden lg:flex min-w-0 items-center overflow-x-auto whitespace-nowrap text-xs tracking-wide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					{SCOPE_NAV_ITEMS.map((item) => (
						<Link
							key={item.scope}
							to={preview ? "/newtheme" : item.to}
							search={preview ? { scope: item.scope } : {}}
							className={cn(
								"shrink-0 whitespace-nowrap px-2 py-1 rounded-8 transition-colors duration-150",
								scope === item.scope ? item.activeClass : "text-fg-muted hover:text-fg",
							)}
						>
							{item.label}
						</Link>
					))}
					<Divider orientation="vertical" className="my-2 mx-1" />
					{STATIC_NAV_ITEMS.map((item) => (
						<button
							key={item.key}
							type="button"
							disabled
							className="shrink-0 whitespace-nowrap px-2 py-1.5 text-fg-disabled cursor-not-allowed"
							tabIndex={-1}
						>
							{item.label}
						</button>
					))}
				</nav>
			</div>

			<div className="flex items-center gap-2 min-h-8">
				{isConnected && (
					<div className="flex items-center gap-0.5">
						<Button
							variant="filled"
							intent="brand"
							size="sm"
							onClick={() => openDepositModal("deposit")}
							iconLeft={<DownloadSimpleIcon className="size-3.5" />}
							className={cn(APP_BAR_BUTTON_HEIGHT_CLASS, "shrink-0 px-3")}
						>
							<Trans>Deposit</Trans>
						</Button>
						<Dropdown
							align="end"
							size="sm"
							triggerAriaLabel="More deposit options"
							trigger={<span className="sr-only">More deposit options</span>}
							triggerClassName="h-8 !px-2"
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
				<Link
					to="/guide"
					aria-label={t`Guide`}
					title={t`Guide`}
					className="inline-flex size-8 shrink-0 items-center justify-center rounded-8 text-fg-muted transition-colors hover:bg-fill-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
				>
					<QuestionIcon className="size-4" />
				</Link>
				<ButtonIcon
					variant="ghost"
					intent="neutral"
					className="size-8 shrink-0"
					onClick={openSettingsDialog}
					aria-label={t`Settings`}
				>
					<GearIcon className="size-4" />
				</ButtonIcon>
			</div>
		</header>
	);
}

function UserMenuSkeleton() {
	return <div className={cn(APP_BAR_BUTTON_HEIGHT_CLASS, "h-8 w-32 shrink-0 rounded-8 bg-surface animate-pulse")} />;
}
