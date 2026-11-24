import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { APP_HEADER_OFFSET_CLASS, APP_HEADER_PLUS_BANNER_OFFSET_CLASS } from "@/config/layout";
import { TOURNAMENT_PATH } from "@/config/nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePortfolio } from "@/hooks/use-portfolio";
import { cn } from "@/lib/cn";
import { createLazyComponent } from "@/lib/lazy";
import { useIsTestnet } from "@/stores/use-global-settings-store";
import { PortfolioBoard, PortfolioBoardMobile } from "../portfolio/portfolio-board";
import { TopNav } from "../trade/header/top-nav";
import { MobileHeader } from "../trade/mobile/mobile-header";
import { TestnetBanner } from "../trade/testnet-banner";
import { tierIds, tiers, traderName } from "./data";
import { Identicon } from "./parts";

const GlobalModals = createLazyComponent(() => import("../trade/components/global-modals"), "GlobalModals");

function findTrader(address: string) {
	for (const id of tierIds) {
		const t = tiers[id].traders.find((r) => r.address === address);
		if (t) return { trader: t, tier: tiers[id] };
	}
	return null;
}

interface HeaderProps {
	address: string;
	mobile?: boolean;
}

function TraderHeader({ address, mobile }: HeaderProps) {
	const found = findTrader(address);
	const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
	return (
		<div className={cn("flex flex-col gap-4", mobile && "px-4 pt-6")}>
			<Link
				to={TOURNAMENT_PATH}
				className="inline-flex w-fit items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
			>
				<ArrowLeftIcon className="size-3.5" />
				Tournament
			</Link>
			<div className="flex items-center gap-3">
				<Identicon id={address} className="size-9 rounded-full" />
				<div className="flex min-w-0 flex-col">
					<h1 className="truncate text-lg font-semibold">{found ? traderName(found.trader) : short}</h1>
					<span className="truncate text-xs text-fg-muted tabular-nums">
						{found ? `Rank ${found.trader.rank}, ${found.tier.label.toLowerCase()}` : "Not in the standings"}
					</span>
				</div>
			</div>
		</div>
	);
}

interface Props {
	address: `0x${string}`;
}

export function TraderAccountPage({ address }: Props) {
	const isMobile = useIsMobile();
	const isTestnet = useIsTestnet();
	const { data } = usePortfolio(address);

	return (
		<>
			{isMobile ? (
				<div className="min-h-dvh w-full bg-background font-sans text-fg">
					<MobileHeader />
					<PortfolioBoardMobile data={data} connected readOnly header={<TraderHeader address={address} mobile />} />
				</div>
			) : (
				<div
					className={cn(
						"min-h-dvh w-full bg-background font-sans text-fg",
						isTestnet ? APP_HEADER_PLUS_BANNER_OFFSET_CLASS : APP_HEADER_OFFSET_CLASS,
					)}
				>
					<TestnetBanner />
					<TopNav />
					<PortfolioBoard data={data} connected readOnly header={<TraderHeader address={address} />} />
				</div>
			)}
			<Suspense fallback={null}>
				<GlobalModals />
			</Suspense>
		</>
	);
}
