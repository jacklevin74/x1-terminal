import { getAddress, isAddress, zeroAddress, type EIP1193Provider } from "viem";
import { getPhantomProvider } from "@/lib/x1/provider";
import type { WithdrawalRecipient } from "./withdrawal-recipient";
let observing = false;
const announced = new Set<EIP1193Provider>();
export function getNativeEthereumProviders(): EIP1193Provider[] {
 if (typeof window === "undefined") return [];
 if (!observing) {
  observing = true;
  window.addEventListener("eip6963:announceProvider", event => {
   const provider = (event as CustomEvent<{ provider?: EIP1193Provider }>).detail?.provider;
   if (provider && typeof provider.request === "function") announced.add(provider);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
 }
 const injected = (window as Window & { ethereum?: EIP1193Provider & { providers?: EIP1193Provider[] } }).ethereum;
 return [...new Set([injected, getPhantomProvider(), ...(injected?.providers ?? []), ...announced])].filter((provider): provider is EIP1193Provider => !!provider && typeof provider.request === "function");
}
export async function readNativeEthereumRecipient(requestAccess = false): Promise<WithdrawalRecipient> {
 const providers = getNativeEthereumProviders();
 if (!providers.length) return { address: "", status: "unavailable", message: "Open your Ethereum wallet to load its address." };
 const account = async (provider: EIP1193Provider, method: "eth_accounts" | "eth_requestAccounts") => {
  const accounts = await provider.request({ method });
  const address = Array.isArray(accounts) ? accounts[0] : undefined;
  return typeof address === "string" && isAddress(address) && address.toLowerCase() !== zeroAddress ? getAddress(address) : undefined;
 };
 for (const provider of providers) {
  try { const address = await account(provider, "eth_accounts"); if (address) return { address, status: "ready" }; } catch { /* Check other injected wallets. */ }
 }
 if (requestAccess) {
  try { const address = await account(providers[0], "eth_requestAccounts"); if (address) return { address, status: "ready" }; } catch { /* User can unlock and retry. */ }
 }
 return { address: "", status: "locked", message: "Your Ethereum wallet is locked or disconnected. Unlock it, then reconnect to load your withdrawal address." };
}
