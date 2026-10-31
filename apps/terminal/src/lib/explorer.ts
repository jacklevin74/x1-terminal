import { getExplorerTxUrl as getHyperliquidExplorerTxUrl } from "@hypeterminal/hl-react";
import { isTestnet } from "@/lib/network";
import type { Chain } from "viem";
import { arbitrum } from "viem/chains";

function getExplorerBaseUrl(chain: Chain): string | null {
	return chain.blockExplorers?.default?.url ?? null;
}

export function getExplorerTxUrl(hash: string, chain: Chain = arbitrum): string | null {
	const baseUrl = getExplorerBaseUrl(chain);
	if (!baseUrl) return null;
	return `${baseUrl}/tx/${hash}`;
}

export function getHyperliquidTxUrl(hash: string | null | undefined, testnet = isTestnet()): string | undefined {
 const value = hash?.trim();
 if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value) || /^0x0{64}$/.test(value)) return undefined;
 return getHyperliquidExplorerTxUrl(value, testnet);
}
