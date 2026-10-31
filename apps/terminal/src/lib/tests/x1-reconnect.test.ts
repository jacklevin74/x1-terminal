// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const signature = btoa(String.fromCharCode(...Array.from({ length: 64 }, (_, i) => i + 1)));
function wallet() {
 const events = new Map<string, () => void>();
 const provider = { publicKey: { toBase58: () => "native-owner-a" }, connect: vi.fn(async () => {}), signMessage: vi.fn(async () => ({ signature })), on: vi.fn((event: string, cb: () => void) => events.set(event, cb)) };
 Object.assign(window, { x1_wallet: provider, x1Wallet: undefined }); return { provider, events };
}
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); vi.resetModules(); });
afterEach(() => { sessionStorage.clear(); localStorage.clear(); Object.assign(window, { x1_wallet: undefined, x1Wallet: undefined }); });
it("restores the same derived account after a page reload without connecting or signing again", async () => {
 const { provider } = wallet(); const first = await import("../x1/provider");
 const addresses = await first.getX1Provider()!.request({ method: "eth_requestAccounts" });
 const key = sessionStorage.getItem(first.DERIVED_KEY_STORAGE);
 provider.connect.mockClear(); provider.signMessage.mockClear();
 vi.resetModules(); const reloaded = await import("../x1/provider");
 expect(await reloaded.getX1Provider()!.request({ method: "eth_accounts" })).toEqual(addresses);
 expect(provider.connect).not.toHaveBeenCalled(); expect(provider.signMessage).not.toHaveBeenCalled();
 expect(sessionStorage.getItem(first.DERIVED_KEY_STORAGE)).toBe(key); expect(localStorage.length).toBe(0);
});
it("keeps an explicit disconnect disconnected after a reload", async () => {
 wallet(); const first = await import("../x1/provider");
 await first.getX1Provider()!.request({ method: "eth_requestAccounts" });
 await first.getX1Provider()!.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
 vi.resetModules(); const reloaded = await import("../x1/provider");
 expect(await reloaded.getX1Provider()!.request({ method: "eth_accounts" })).toEqual([]);
 expect(sessionStorage.getItem(first.DERIVED_KEY_STORAGE)).toBeNull();
 expect(sessionStorage.getItem(first.X1_SESSION_OWNER)).toBeNull();
});
it("discards a cached session when a different native wallet account is selected", async () => {
 const { provider } = wallet(); const first = await import("../x1/provider");
 await first.getX1Provider()!.request({ method: "eth_requestAccounts" });
 provider.publicKey = { toBase58: () => "native-owner-b" };
 vi.resetModules(); const reloaded = await import("../x1/provider");
 expect(await reloaded.getX1Provider()!.request({ method: "eth_accounts" })).toEqual([]);
 expect(sessionStorage.getItem(first.DERIVED_KEY_STORAGE)).toBeNull();
});
it("clears corrupted cached key data instead of exposing an account", async () => {
 wallet(); const first = await import("../x1/provider");
 sessionStorage.setItem(first.DERIVED_KEY_STORAGE, "not a key");
 expect(await first.getX1Provider()!.request({ method: "eth_accounts" })).toEqual([]);
 expect(sessionStorage.getItem(first.DERIVED_KEY_STORAGE)).toBeNull();
});
it("restores when X1 injects late, without a signature prompt", async () => {
 const { provider } = wallet(); const first = await import("../x1/provider");
 const addresses = await first.getX1Provider()!.request({ method: "eth_requestAccounts" });
 vi.resetModules(); Object.assign(window, { x1_wallet: undefined });
 const reloaded = await import("../x1/provider"); expect(reloaded.getX1Provider()).toBeUndefined();
 Object.assign(window, { x1_wallet: provider }); provider.connect.mockClear(); provider.signMessage.mockClear();
 expect(await reloaded.getX1Provider()!.request({ method: "eth_accounts" })).toEqual(addresses);
 expect(provider.connect).not.toHaveBeenCalled(); expect(provider.signMessage).not.toHaveBeenCalled();
});
it("exports only the connected derived account key", async () => {
 wallet(); const module = await import("../x1/provider");
 const addresses = await module.getX1Provider()!.request({ method: "eth_requestAccounts" }) as string[];
 expect(module.exportX1PrivateKey(addresses[0])).toBe(sessionStorage.getItem(module.DERIVED_KEY_STORAGE));
 expect(() => module.exportX1PrivateKey(`0x${"12".repeat(20)}`)).toThrow("No matching derived key");
 module.clearX1Session();
 expect(() => module.exportX1PrivateKey(addresses[0])).toThrow("No matching derived key");
});
it("refuses export after the native wallet changes or cached key is replaced", async () => {
 const { provider } = wallet(); const module = await import("../x1/provider");
 const addresses = await module.getX1Provider()!.request({ method: "eth_requestAccounts" }) as string[];
 sessionStorage.setItem(module.DERIVED_KEY_STORAGE, `0x${"ab".repeat(32)}`);
 expect(() => module.exportX1PrivateKey(addresses[0])).toThrow("No matching derived key");
 provider.publicKey = { toBase58: () => "another-owner" };
 expect(() => module.exportX1PrivateKey(addresses[0])).toThrow("No matching derived key");
 expect(sessionStorage.getItem(module.DERIVED_KEY_STORAGE)).toBeNull();
});
