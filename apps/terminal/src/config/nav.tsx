import { Trans } from "@lingui/react/macro";
import type { Icon } from "@phosphor-icons/react";
import { BookOpenIcon, ChartBarIcon, CurrencyCircleDollarIcon, ListIcon, TrendUpIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export type MobileTab = "chart" | "book" | "trade" | "positions" | "account";

export interface MobileNavItem {
	id: MobileTab;
	label: string;
	icon: Icon;
}

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
	{ id: "chart", label: "Chart", icon: ChartBarIcon },
	{ id: "book", label: "Book", icon: BookOpenIcon },
	{ id: "trade", label: "Trade", icon: TrendUpIcon },
	{ id: "positions", label: "Positions", icon: ListIcon },
	{ id: "account", label: "Account", icon: CurrencyCircleDollarIcon },
];

export type ScopeNavKey = "all" | "perp" | "spot" | "builders-perp";

export interface ScopeNavItem {
	scope: ScopeNavKey;
	label: ReactNode;
	to: string;
	activeClass: string;
	accentClass: string;
}

export const SCOPE_NAV_ITEMS: readonly ScopeNavItem[] = [
	{
		scope: "all",
		label: <Trans>All</Trans>,
		to: "/",
		activeClass: "bg-control text-fg",
		accentClass: "bg-fg-muted",
	},
	{
		scope: "perp",
		label: <Trans>Perp</Trans>,
		to: "/perp",
		activeClass: "bg-control text-fg",
		accentClass: "bg-scope-perp",
	},
	{
		scope: "spot",
		label: <Trans>Spot</Trans>,
		to: "/spot",
		activeClass: "bg-control text-fg",
		accentClass: "bg-scope-spot",
	},
	{
		scope: "builders-perp",
		label: <Trans>Builders</Trans>,
		to: "/builders-perp",
		activeClass: "bg-control text-fg",
		accentClass: "bg-scope-builders",
	},
] as const;

export interface StaticNavItem {
	key: string;
	label: ReactNode;
}

export const STATIC_NAV_ITEMS: readonly StaticNavItem[] = [
	{ key: "vaults", label: <Trans>Vaults</Trans> },
	{ key: "portfolio", label: <Trans>Portfolio</Trans> },
	{ key: "staking", label: <Trans>Staking</Trans> },
	{ key: "leaderboard", label: <Trans>Leaderboard</Trans> },
] as const;
