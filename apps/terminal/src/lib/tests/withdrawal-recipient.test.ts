// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { readWithdrawalRecipient } from "../wallet/withdrawal-recipient";
const state = vi.hoisted(() => ({ providerAvailable: true, source: { publicKey: { toBase58: () => "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS" }, isConnected: true }, request: vi.fn(), connect: vi.fn() }));
vi.mock("@/lib/solana/source-wallet", () => ({ getSolSourceWallet: () => state.source, connectSolSource: state.connect }));
vi.mock("@/lib/x1/provider", () => ({ getPhantomProvider: () => state.providerAvailable ? ({ request: state.request }) : undefined }));
afterEach(() => { state.source.isConnected = true; state.providerAvailable = true; delete (window as Window & { ethereum?: unknown }).ethereum; vi.clearAllMocks(); });
it("reads the native Solana recipient without requesting a connection or signature", async () => {
 const recipient = await readWithdrawalRecipient("SOL", "x1");
 expect(recipient).toMatchObject({ status: "ready", address: state.source.publicKey.toBase58() });
 expect(state.connect).not.toHaveBeenCalled(); expect(state.request).not.toHaveBeenCalled();
});
it("warns for a disconnected Solana wallet even if a stale public key is present", async () => {
 state.source.isConnected = false;
 expect(await readWithdrawalRecipient("SOL", "x1")).toMatchObject({ status: "locked", address: "" });
 expect((await readWithdrawalRecipient("SOL", "x1")).message).toContain("Unlock");
});
it("reads Ethereum accounts silently and requests access only after an explicit reconnect", async () => {
 const address = `0x${"ab".repeat(20)}`;
 state.request.mockResolvedValue([address]);
 expect((await readWithdrawalRecipient("ETH", "phantom")).address.toLowerCase()).toBe(address);
 expect(state.request).toHaveBeenCalledWith({ method: "eth_accounts" });
 state.request.mockResolvedValueOnce([]).mockResolvedValueOnce([address]);
 await readWithdrawalRecipient("ETH", "phantom", true);
 expect(state.request).toHaveBeenLastCalledWith({ method: "eth_requestAccounts" });
});
it("clears the Ethereum recipient when locked, disconnected, or access is rejected", async () => {
 state.request.mockResolvedValue([]);
 expect(await readWithdrawalRecipient("ETH", "phantom")).toMatchObject({ status: "locked", address: "" });
 state.request.mockRejectedValue(new Error("Wallet locked"));
 expect(await readWithdrawalRecipient("ETH", "phantom")).toMatchObject({ status: "locked", address: "" });
});
it("never substitutes the X1-derived Ethereum account for a native Ethereum recipient", async () => {
 state.providerAvailable = false;
 expect(await readWithdrawalRecipient("ETH", "x1")).toMatchObject({ status: "manual", address: "" });
 expect(state.request).not.toHaveBeenCalled();
 expect(await readWithdrawalRecipient("SOL", undefined)).toMatchObject({ status: "unavailable", address: "" });
});

it("fills ETH from an injected Ethereum wallet even when the trading connector is X1", async () => {
 state.providerAvailable = false;
 const address = `0x${"12".repeat(20)}`;
 const request = vi.fn(async () => [address]);
 Object.assign(window, { ethereum: { request } });
 expect(await readWithdrawalRecipient("ETH", "x1")).toMatchObject({ status: "ready", address });
 expect(request).toHaveBeenCalledWith({ method: "eth_accounts" });
});
