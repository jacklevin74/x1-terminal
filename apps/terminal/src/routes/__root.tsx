import { X1Setup } from "@/components/trade/components/x1-setup";
import type { QueryClient } from "@tanstack/react-query";
import { ClientOnly, createRootRouteWithContext, HeadContent, Outlet } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { NotFoundPage } from "@/components/pages/not-found-page";
import { AppShellSkeleton } from "@/components/trade/layout/app-shell-skeleton";
import { MarketsInfoProvider } from "@/lib/hyperliquid/hooks/MarketsInfoProvider";
import { createLazyComponent } from "@/lib/lazy";
import { buildPageHead, mergeHead } from "@/lib/seo";
import { ExchangeScopeProvider } from "@/providers/exchange-scope";
import "@/bones/registry";
import appCss from "../styles.css?url";

const Toaster = createLazyComponent(() => import("@/components/ui/sonner"), "Toaster");

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => {
		const seoHead = buildPageHead();
		return mergeHead(seoHead, {
			links: [{ rel: "stylesheet", href: appCss }],
		});
	},
	component: RootComponent,
	notFoundComponent: NotFoundPage,
});

function RootComponent() {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.register("/sw.js", { scope: "/" });
		}
	}, []);

	return (
		<>
<HeadContent />
<ClientOnly fallback={<AppShellSkeleton />}>
			<ExchangeScopeProvider>
				<MarketsInfoProvider>
					<Outlet />
<X1Setup />
					<Suspense fallback={null}>
						<Toaster />
					</Suspense>
				</MarketsInfoProvider>
			</ExchangeScopeProvider>
		</ClientOnly>
</>
	);
}
