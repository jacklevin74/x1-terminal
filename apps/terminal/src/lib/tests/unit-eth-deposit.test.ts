import { afterEach, expect, it, vi } from "vitest";
import { fetchEthDepositAddress, fetchEthDepositFees, parseEthDepositAmount, verifyUnitAddress, verifyUnitGuardianForAddress, verifyUnitGuardian } from "../unit/eth-deposit";
const recipient = `0x${"ab".repeat(20)}` as const;
const deposit = `0x${"cd".repeat(20)}` as const;
const signature = btoa(String.fromCharCode(...new Uint8Array(64)));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("accepts the ETH minimum and rejects invalid, tiny, or overprecision amounts", () => {
 expect(parseEthDepositAmount("0.007")).toBe(7_000_000_000_000_000n);
 for (const amount of ["0", "0.006999", "-1", "NaN", "1e3", "0.0070000000000000001"]) expect(() => parseEthDepositAmount(amount)).toThrow();
});
it("verifies actual P-256 signatures and rejects a changed destination payload", async () => {
 const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
 const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
 const key = [...raw].map(b => b.toString(16).padStart(2, "0")).join("");
 const payload = `unit-node:user-ethereum-hyperliquid-${recipient}-${deposit}`;
 const signed = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, new TextEncoder().encode(payload)));
 const encoded = btoa(String.fromCharCode(...signed));
 expect(await verifyUnitGuardian(key, encoded, payload)).toBe(true);
 expect(await verifyUnitGuardian(key, encoded, payload + "changed")).toBe(false);
 expect(await verifyUnitGuardian(key, "bad!", payload)).toBe(false);
});
it("requires at least two distinct trusted guardians", async () => {
 vi.spyOn(crypto.subtle, "verify").mockResolvedValue(true);
 expect(await verifyUnitAddress(deposit, recipient, { "unit-node": signature })).toBe(false);
 expect(await verifyUnitAddress(deposit, recipient, { unknown: signature, attacker: signature })).toBe(false);
 expect(await verifyUnitAddress(deposit, recipient, { "unit-node": signature, "hl-node": signature })).toBe(true);
});
it("requests an address for the connected recipient and verifies the binding", async () => {
 const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: "OK", address: deposit, signatures: { "unit-node": signature, "hl-node": signature } })));
 vi.stubGlobal("fetch", fetcher);
 vi.spyOn(crypto.subtle, "verify").mockImplementation(async (_algorithm, _key, _sig, payload) => new TextDecoder().decode(payload as ArrayBuffer).endsWith(`${recipient}-${deposit}`));
 expect(await fetchEthDepositAddress(recipient)).toBe(deposit);
 expect(fetcher).toHaveBeenCalledWith(`https://api.hyperunit.xyz/gen/ethereum/hyperliquid/eth/${recipient}`, { signal: undefined });
});
it("does not expose malformed or unverified API addresses", async () => {
 for (const response of [
  { status: "OK", address: "not an address", signatures: {} },
  { status: "ERROR", address: deposit, signatures: {} },
  { status: "OK", address: deposit, signatures: {} },
  { status: "OK", address: deposit, signatures: { "unit-node": signature, "hl-node": signature } },
 ]) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response))));
  await expect(fetchEthDepositAddress(recipient)).rejects.toThrow();
 }
});
it("surfaces address service failures", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
 await expect(fetchEthDepositAddress(recipient)).rejects.toThrow("could not generate");
});
it("validates fee estimates rather than inventing a fee", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ethereum: { "deposit-fee-in-units": 0.0005, depositEta: "3m" } }))));
 expect(await fetchEthDepositFees()).toEqual({ fee: 0.0005, eta: "3m" });
 vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ethereum: { "deposit-fee-in-units": -1, depositEta: "3m" } }))));
 await expect(fetchEthDepositFees()).rejects.toThrow("unavailable");
});

it("verifies Unit's published attestation even when request addresses are lowercase", async () => {
 // Public signed fixture from https://docs.hyperunit.xyz/developers/api/operations
 const key = "04e674a796ff01d6b74f4ee4079640729797538cdb4926ec333ce1bd18414ef7f22c1a142fd76dca120614045273f30338cd07d79bc99872c76151756aaec0f8e8";
 const signature = "6DTX4nLPd8+hYb2aJNowdu3R3J6nsXmGnhOYnaKIiSC7h6w3evgUzWI6rKG3CmjrjA5s3+X2cqNmlSfGMo+z2w==";
 const recipient = "0xa6f1ef42d335ec7cbfc39f57269c851568300132";
 const address = "0xf040d1e1e7bcdc9947e5f7871c7f205786ccc494";
 expect(await verifyUnitGuardian(key, signature, `field-node:user-ethereum-hyperliquid-${recipient}-${address}`)).toBe(false);
 expect(await verifyUnitGuardianForAddress(key, signature, "field-node", recipient, address)).toBe(true);
 expect(await verifyUnitGuardianForAddress(key, signature, "field-node", `0x${"ab".repeat(20)}`, address)).toBe(false);
 expect(await verifyUnitGuardianForAddress(key, signature, "field-node", recipient, `0x${"cd".repeat(20)}`)).toBe(false);
});
