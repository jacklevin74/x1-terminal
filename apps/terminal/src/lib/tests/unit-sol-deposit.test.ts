import { afterEach, expect, it, vi } from "vitest";
import { fetchSolDepositAddress, fetchSolDepositFees, isSolDepositAddress, parseSolDepositAmount } from "../unit/sol-deposit";
import { verifyUnitGuardianForAddress } from "../unit/eth-deposit";
const recipient = `0x${"ab".repeat(20)}` as const;
const deposit = "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS";
const signature = btoa(String.fromCharCode(...new Uint8Array(64)));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("parses SOL exactly in lamports and enforces the minimum and nine decimals", () => {
 expect(parseSolDepositAmount("0.12")).toBe(120_000_000n);
 expect(parseSolDepositAmount("0.120000001")).toBe(120_000_001n);
 for (const amount of ["0", "0.119999999", "-1", "1e3", "0.1200000001", "1000000000"]) expect(() => parseSolDepositAmount(amount)).toThrow();
});
it("accepts Solana addresses but rejects EVM addresses, malformed strings, and the system program", () => {
 expect(isSolDepositAddress(deposit)).toBe(true);
 for (const value of [recipient, "invalid0", "11111111111111111111111111111111", null]) expect(isSolDepositAddress(value)).toBe(false);
});
it("verifies real SOL attestations without lowercasing the deposit address", async () => {
 const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
 const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
 const key = [...raw].map(b => b.toString(16).padStart(2, "0")).join("");
 for (const payload of [`unit-node:${recipient}-hyperliquid-sol-${deposit}-solana-deposit`, `unit-node:user-solana-hyperliquid-${recipient}-${deposit}`]) {
  const bytes = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, new TextEncoder().encode(payload)));
  const sig = btoa(String.fromCharCode(...bytes));
  expect(await verifyUnitGuardianForAddress(key, sig, "unit-node", recipient, deposit, "sol")).toBe(true);
  expect(await verifyUnitGuardianForAddress(key, sig, "unit-node", recipient, deposit.toLowerCase(), "sol")).toBe(false);
  expect(await verifyUnitGuardianForAddress(key, sig, "unit-node", `0x${"cd".repeat(20)}`, deposit, "sol")).toBe(false);
 }
});
it("fetches a verified SOL address for the Hyperliquid account, rather than the sending wallet", async () => {
 const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: "OK", address: deposit, signatures: { "unit-node": signature, "hl-node": signature } })));
 vi.stubGlobal("fetch", fetcher); vi.spyOn(crypto.subtle, "verify").mockResolvedValue(true);
 expect(await fetchSolDepositAddress(recipient)).toBe(deposit);
 expect(fetcher).toHaveBeenCalledWith(`https://api.hyperunit.xyz/gen/solana/hyperliquid/sol/${recipient}`, { signal: undefined });
});
it("rejects unverified, malformed, and failed API responses", async () => {
 for (const response of [{ status: "OK", address: recipient, signatures: {} }, { status: "ERROR", address: deposit, signatures: {} }, { status: "OK", address: deposit, signatures: { "unit-node": signature } }]) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response))));
  await expect(fetchSolDepositAddress(recipient)).rejects.toThrow();
 }
 vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
 await expect(fetchSolDepositAddress(recipient)).rejects.toThrow("could not generate");
});
it("uses Solana processing fees and ETA", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ethereum: { "deposit-fee-in-units": 1, depositEta: "3m" }, solana: { "deposit-fee-in-units": 0.015, depositEta: "13s" } }))));
 expect(await fetchSolDepositFees()).toEqual({ fee: 0.015, eta: "13s" });
});
