import { Suspense } from "react";
import { APP_HEADER_OFFSET_CLASS, APP_HEADER_PLUS_BANNER_OFFSET_CLASS } from "@/config/layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/cn";
import { createLazyComponent } from "@/lib/lazy";
import { useIsTestnet } from "@/stores/use-global-settings-store";
import { TopNav } from "../trade/header/top-nav";
import { MobileHeader } from "../trade/mobile/mobile-header";
import { TestnetBanner } from "../trade/testnet-banner";
import { TournamentBoard } from "./tournament-board";
import { TournamentBoardMobile } from "./tournament-board-mobile";

const GlobalModals = createLazyComponent(() => import("../trade/components/global-modals"), "GlobalModals");

export function TournamentPage() {
	const isMobile = useIsMobile();
	const isTestnet = useIsTestnet();

	return (
		<>
			{isMobile ? (
				<div className="min-h-dvh w-full bg-background font-sans text-fg">
					<MobileHeader />
					<TournamentBoardMobile />
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
					<TournamentBoard />
				</div>
			)}
			<Suspense fallback={null}>
				<GlobalModals />
			</Suspense>
		</>
	);
}
