import { keccak256, type EIP1193Provider, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const DERIVATION_MESSAGE = "x1-terminal-hyperliquid-key-v1";
export const DERIVED_KEY_STORAGE = "x1-terminal:derived-key:v1";
export const X1_SESSION_OWNER = "x1-terminal:session-owner:v1";
interface X1Wallet {
 publicKey?: { toBase58(): string } | null;
 connect(): Promise<unknown>;
 disconnect?(): Promise<unknown>;
 signMessage(message: Uint8Array): Promise<{ signature: string | Uint8Array } | string | Uint8Array>;
 on?(event: string, callback: () => void): void;
}
type WalletWindow = Window & {
 x1_wallet?: X1Wallet;
 x1Wallet?: X1Wallet;
 phantom?: { ethereum?: EIP1193Provider };
};
export function getPhantomProvider() {
 return typeof window === "undefined" ? undefined : (window as WalletWindow).phantom?.ethereum;
}
export function getX1Wallet() {
 if (typeof window === "undefined") return undefined;
 const w = window as WalletWindow;
 return w.x1_wallet ?? w.x1Wallet;
}
export function deriveX1PrivateKey(result: unknown): Hex {
 // Desktop extensions return bytes; mobile providers may return base64 directly
 // or wrapped in { signature }. Hash the same raw bytes in every case.
 const signature = result && typeof result === "object" && "signature" in result
  ? result.signature : result;
 let bytes: Uint8Array;
 if (signature instanceof Uint8Array) {
  bytes = new Uint8Array(signature);
 } else if (typeof signature === "string") {
  try {
   bytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  } catch {
   throw new Error("X1 returned an invalid signature. Expected 64 signature bytes or base64.");
  }
 } else {
  throw new Error("X1 returned an invalid signature. Expected 64 signature bytes or base64.");
 }
 if (bytes.length !== 64) throw new Error("X1 returned an invalid signature.");
 const key = keccak256(bytes);
 // Reject the negligible invalid secp256k1 scalar case; never change derivation silently.
 privateKeyToAccount(key);
 return key;
}
const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
let account: ReturnType<typeof privateKeyToAccount> | undefined;
let chainId = 1;
const observedWallets = new WeakSet<X1Wallet>();
function emit(event: string, ...args: unknown[]) {
 for (const listener of listeners.get(event) ?? []) listener(...args);
}
export function clearX1Session() {
 account = undefined;
 if (typeof window !== "undefined") {
  sessionStorage.removeItem(DERIVED_KEY_STORAGE);
  sessionStorage.removeItem(X1_SESSION_OWNER);
 }
 emit("accountsChanged", []);
}
function observeWallet(wallet: X1Wallet) {
 if (observedWallets.has(wallet)) return;
 wallet.on?.("disconnect", clearX1Session);
 wallet.on?.("accountChanged", () => {
  const owner = sessionStorage.getItem(X1_SESSION_OWNER);
  if (!owner || wallet.publicKey?.toBase58() !== owner) clearX1Session();
 });
 observedWallets.add(wallet);
}
function restoreSession(wallet: X1Wallet) {
 observeWallet(wallet);
 const owner = sessionStorage.getItem(X1_SESSION_OWNER);
 const nativeAddress = wallet.publicKey?.toBase58();
 if (owner && nativeAddress && owner !== nativeAddress) { clearX1Session(); return; }
 if (account) return;
 const key = sessionStorage.getItem(DERIVED_KEY_STORAGE);
 if (!key) return;
 try {
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("Invalid cached session");
  account = privateKeyToAccount(key as Hex);
 } catch { clearX1Session(); }
}

const provider = {
 async request({ method, params }: { method: string; params?: readonly unknown[] | object }) {
  const args = Array.isArray(params) ? params : [];
  if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
  if (method === "eth_accounts") {
   const wallet = getX1Wallet();
   if (wallet) restoreSession(wallet);
   return account ? [account.address] : [];
  }
  if (method === "eth_requestAccounts") {
   const wallet = getX1Wallet();
   if (!wallet) throw new Error("Install the X1 wallet to connect.");
   observeWallet(wallet);
   await wallet.connect();
   const result = await wallet.signMessage(new TextEncoder().encode(DERIVATION_MESSAGE));
   const key = deriveX1PrivateKey(result);
   const next = privateKeyToAccount(key);
   sessionStorage.setItem(DERIVED_KEY_STORAGE, key);
   const owner = wallet.publicKey?.toBase58();
   if (owner) sessionStorage.setItem(X1_SESSION_OWNER, owner);
   else sessionStorage.removeItem(X1_SESSION_OWNER);
   account = next;
   emit("accountsChanged", [account.address]);
   return [account.address];
  }
  if (method === "wallet_switchEthereumChain") {
   chainId = Number((args[0] as { chainId: string }).chainId);
   emit("chainChanged", `0x${chainId.toString(16)}`);
   return null;
  }
  if (method === "eth_signTypedData_v4") {
   if (!account) throw new Error("Reconnect X1 to sign.");
   if (String(args[0]).toLowerCase() !== account.address.toLowerCase()) throw new Error("Account mismatch.");
   const typed = JSON.parse(String(args[1]));
   return account.signTypedData(typed);
  }
  if (method === "wallet_revokePermissions") { clearX1Session(); return null; }
  if (method === "wallet_getPermissions") return [];
  throw new Error(`X1 derived account does not support ${method}.`);
 },
 on(event: string, listener: (...args: unknown[]) => void) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(listener);
 },
 removeListener(event: string, listener: (...args: unknown[]) => void) {
  listeners.get(event)?.delete(listener);
 },
};
export function getX1Provider(): EIP1193Provider | undefined {
 const wallet = getX1Wallet();
 if (!wallet) return undefined;
 restoreSession(wallet);
 return provider as EIP1193Provider;
}

/** Read only on explicit export; never return a key for a different account. */
export function exportX1PrivateKey(expectedAddress: string): Hex {
 const wallet = getX1Wallet();
 if (!wallet) throw new Error("X1 wallet is unavailable. Keep this session open and reconnect your original wallet.");
 restoreSession(wallet);
 const key = sessionStorage.getItem(DERIVED_KEY_STORAGE);
 if (!account || !key || !/^0x[0-9a-fA-F]{64}$/.test(key)
  || account.address.toLowerCase() !== expectedAddress.toLowerCase()
  || privateKeyToAccount(key as Hex).address.toLowerCase() !== expectedAddress.toLowerCase()) {
  throw new Error("No matching derived key is available for this account. Reconnect your original X1 wallet.");
 }
 return key as Hex;
}
