import type { EIP1193Provider } from "viem";

type PhantomWindow = Window & { phantom?: { ethereum?: EIP1193Provider } };

/** Phantom's injected EVM provider (window.phantom.ethereum), if the extension is present. */
export function getPhantomProvider() {
 return typeof window === "undefined" ? undefined : (window as PhantomWindow).phantom?.ethereum;
}
