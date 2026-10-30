import type { Chain } from "viem";
import { createConfig, http } from "wagmi";
import {
	arbitrum,
	aurora,
	avalanche,
	base,
	blast,
	bsc,
	celo,
	fantom,
	gnosis,
	linea,
	mainnet,
	mantle,
	mode,
	moonbeam,
	optimism,
	polygon,
	polygonZkEvm,
	scroll,
	zkSync,
} from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { getPhantomProvider, getX1Provider } from "@/lib/x1/provider";
import type { MockWalletConfig } from "@/lib/wallet-utils";

// All chains supported for LiFi bridging — wagmi requires these upfront
const BRIDGE_CHAINS = [
	arbitrum,
	mainnet,
	polygon,
	optimism,
	base,
	bsc,
	avalanche,
	fantom,
	gnosis,
	zkSync,
	scroll,
	linea,
	mode,
	blast,
	mantle,
	celo,
	moonbeam,
	aurora,
	polygonZkEvm,
] as const satisfies readonly [Chain, ...Chain[]];

const DEFAULT_ETHEREUM_RPC_URL = "https://ethereum-rpc.publicnode.com";

export function getBridgeRpcUrl(
	chain: Pick<Chain, "id">,
	env: Record<string, string | undefined> = import.meta.env,
): string | undefined {
	if (chain.id === mainnet.id) return env.VITE_ETHEREUM_RPC_URL || DEFAULT_ETHEREUM_RPC_URL;
	return undefined;
}

const BRIDGE_TRANSPORTS = Object.fromEntries(
	BRIDGE_CHAINS.map((chain) => [chain.id, http(getBridgeRpcUrl(chain))]),
) as Record<(typeof BRIDGE_CHAINS)[number]["id"], ReturnType<typeof http>>;

export function createWagmiConfig(_options: { mockWallets?: MockWalletConfig[]; env?: Record<string, string | undefined> } = {}) {
 return createConfig({
  chains: BRIDGE_CHAINS,
  multiInjectedProviderDiscovery: false,
  connectors: [
   injected({ target: () => ({ id: "phantom", name: "Phantom", provider: () => getPhantomProvider() }), shimDisconnect: true }),
   injected({ target: () => ({ id: "x1", name: "X1 Wallet", provider: () => getX1Provider() }), shimDisconnect: true }),
  ],
  transports: BRIDGE_TRANSPORTS,
  ssr: true,
 });
}
export const MOCK_WALLETS: MockWalletConfig[] = [];
export const config = createWagmiConfig();
