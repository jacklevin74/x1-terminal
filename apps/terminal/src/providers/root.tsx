import { HyperliquidProvider, PERSISTED_QUERY_PREFIX } from "@hypeterminal/hl-react";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { connect, reconnect } from "@wagmi/core";
import { Fragment, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { JurisdictionGate } from "@/components/trade/components/jurisdiction-gate";
import { APP_NAME, RQ_CACHE_BUSTER, STORAGE_KEYS } from "@/config/app";
import { DEFAULT_BUILDER_CONFIG } from "@/config/hyperliquid";
import { RQ_CACHE_MAX_AGE_MS } from "@/config/time";
import { config, DEMO_ADDRESS } from "@/config/wagmi";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { MarketsProvider } from "@/lib/hyperliquid/markets";
import { getNetwork } from "@/lib/network";
import "@/lib/i18n";

const network = getNetwork();
const env = network === "testnet" ? "Testnet" : "Mainnet";

const isServer = typeof document === "undefined";

if (!isServer) {
	try {
		localStorage.removeItem(STORAGE_KEYS.LEGACY_METADATA);
		// The v1 cache was shared by mainnet and testnet: a testnet allPerpMetas/perpDexs kept serving a mainnet session
		// (no xyz markets, mismatched names/prices, blank trade view). Drop it; the cache is now per network.
		localStorage.removeItem(STORAGE_KEYS.RQ_CACHE);
	} catch {}
}

const persister = isServer
	? null
	: createSyncStoragePersister({
			storage: window.localStorage,
			key: `${STORAGE_KEYS.RQ_CACHE}-${network}`,
			throttleTime: 1000,
		});

export function getRootProviderContext() {
	const queryClient = new QueryClient();
	return { queryClient };
}

function HyperliquidBridge({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (!DEMO_ADDRESS) return;
		const demo = config.connectors.find((c) => c.type === "mock");
		if (demo) void connect(config, { connector: demo }).catch(() => {});
	}, []);
	useEffect(() => {
		const resume = () => {
			void reconnect(config);
		};
		const events = ["ethereum#initialized", "solana#initialized"];
		for (const event of events) window.addEventListener(event, resume);
		return () => {
			for (const event of events) window.removeEventListener(event, resume);
		};
	}, []);
	const { ownerAddress: address, subaccount } = useTradingAccount();

	return (
		<HyperliquidProvider
			env={env}
			userAddress={address}
			vaultAddress={subaccount?.address}
			builderConfig={DEFAULT_BUILDER_CONFIG}
			agentName={APP_NAME}
		>
			<MarketsProvider>
				<Fragment key={`${address ?? "disconnected"}:${subaccount?.address ?? "main"}`}>{children}</Fragment>
			</MarketsProvider>
		</HyperliquidProvider>
	);
}

export function RootProvider({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) {
	if (isServer || !persister) {
		return (
			<WagmiProvider config={config}>
				<QueryClientProvider client={queryClient}>
					<I18nProvider i18n={i18n}>
						<JurisdictionGate>
							<HyperliquidBridge>{children}</HyperliquidBridge>
						</JurisdictionGate>
					</I18nProvider>
				</QueryClientProvider>
			</WagmiProvider>
		);
	}

	return (
		<WagmiProvider config={config}>
			<PersistQueryClientProvider
				client={queryClient}
				persistOptions={{
					persister,
					maxAge: RQ_CACHE_MAX_AGE_MS,
					buster: RQ_CACHE_BUSTER,
					dehydrateOptions: {
						shouldDehydrateQuery: (query) => query.queryKey[0] === PERSISTED_QUERY_PREFIX,
					},
				}}
			>
				<I18nProvider i18n={i18n}>
					<JurisdictionGate>
						<HyperliquidBridge>{children}</HyperliquidBridge>
					</JurisdictionGate>
				</I18nProvider>
			</PersistQueryClientProvider>
		</WagmiProvider>
	);
}
