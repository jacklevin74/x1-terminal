import { afterEach, expect, it, vi } from "vitest";
import { fetchSolWithdrawalAddress, fetchSolWithdrawalFees, parseSolWithdrawalAmount, verifySolWithdrawalAddress } from "../unit/sol-withdraw";
import { UNIT_GUARDIANS } from "../unit/eth-deposit";
const destination = "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS";
const bridge = `0x${"ab".repeat(20)}` as const;
const signature = btoa(String.fromCharCode(...new Uint8Array(64)));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("generates the reverse route and requires two guardians", async () => {
 const fetcher = vi.fn(async (_url: unknown, _options?: unknown) => new Response(JSON.stringify({ status: "OK", address: bridge, signatures: { "unit-node": signature, "hl-node": signature } })));
 vi.stubGlobal("fetch", fetcher); vi.spyOn(crypto.subtle, "verify").mockResolvedValue(true);
 expect(await fetchSolWithdrawalAddress(destination)).toBe(bridge);
 expect(fetcher).toHaveBeenCalledWith(`https://api.hyperunit.xyz/gen/hyperliquid/solana/sol/${destination}`, { signal: undefined });
 vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "OK", address: bridge, signatures: { "unit-node": signature } }))));
 await expect(fetchSolWithdrawalAddress(destination)).rejects.toThrow("Could not verify");
});
it("validates destination and rejects unsafe protocol addresses", async () => {
 const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
 await expect(fetchSolWithdrawalAddress(bridge)).rejects.toThrow("valid Solana"); expect(fetcher).not.toHaveBeenCalled();
 for (const address of [destination, "0x0000000000000000000000000000000000000000", null]) {
  fetcher.mockResolvedValue(new Response(JSON.stringify({ status: "OK", address, signatures: {} })));
  await expect(fetchSolWithdrawalAddress(destination)).rejects.toThrow("Could not verify");
 }
});
it("binds real signatures to the Solana recipient, reverse direction, and generated address", async () => {
 const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
 const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
 const publicKey = [...raw].map(b => b.toString(16).padStart(2, "0")).join("");
 // Use generated test guardian keys; crypto verifies real signatures, not a mocked success.
 const spies = UNIT_GUARDIANS.map(g => vi.spyOn(g, "key", "get").mockReturnValue(publicKey as typeof g.key));
 for (const modern of [false, true]) {
  const signatures: Record<string, string> = {};
  for (const g of UNIT_GUARDIANS.slice(0, 2)) {
   const payload = modern ? `${g.id}:user-ethereum-solana-${destination}-${bridge}` : `${g.id}:${destination}-solana-sol-${bridge}-hyperliquid-deposit`;
   const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, new TextEncoder().encode(payload)));
   signatures[g.id] = btoa(String.fromCharCode(...sig));
  }
  expect(await verifySolWithdrawalAddress(bridge, destination, signatures)).toBe(true);
  expect(await verifySolWithdrawalAddress(bridge, destination.toLowerCase(), signatures)).toBe(false);
  expect(await verifySolWithdrawalAddress(`0x${"cd".repeat(20)}`, destination, signatures)).toBe(false);
 }
 spies.forEach(s => s.mockRestore());
});
it("uses withdrawal fees rather than deposit fees", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ solana: { "deposit-fee-in-units": 0.015, "withdrawal-fee-in-units": 0.000008, withdrawalEta: "4m" } }))));
 expect(await fetchSolWithdrawalFees()).toEqual({ fee: 0.000008, eta: "4m" });
 expect(parseSolWithdrawalAmount("0.199782040")).toBe(199782040n);
 for (const amount of ["0.119", "0", "-1", "1e-1", "0.1200000001"]) expect(() => parseSolWithdrawalAmount(amount)).toThrow();
});
it("supports verified ETH withdrawals exclusively to an Ethereum route", async () => {
 const { fetchEthWithdrawalAddress, fetchEthWithdrawalFees } = await import("../unit/sol-withdraw");
 const recipient = `0x${"cd".repeat(20)}`;
 const fetcher = vi.fn(async (_url: unknown, _options?: unknown) => new Response(JSON.stringify({ status: "OK", address: bridge, signatures: { "unit-node": signature, "hl-node": signature } })));
 vi.stubGlobal("fetch", fetcher); vi.spyOn(crypto.subtle, "verify").mockResolvedValue(true);
 expect(await fetchEthWithdrawalAddress(recipient)).toBe(bridge);
 expect(fetcher.mock.calls[0][0]).toContain("/gen/hyperliquid/ethereum/eth/");
 await expect(fetchEthWithdrawalAddress(destination)).rejects.toThrow("Ethereum mainnet");
 vi.mocked(crypto.subtle.verify).mockResolvedValue(false);
 await expect(fetchEthWithdrawalAddress(recipient)).rejects.toThrow("Could not verify");
 vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ethereum: { "withdrawal-fee-in-units": 0.0001, withdrawalEta: "7m" }, solana: { "withdrawal-fee-in-units": 1, withdrawalEta: "1m" } }))));
 expect(await fetchEthWithdrawalFees()).toEqual({ fee: 0.0001, eta: "7m" });
});
