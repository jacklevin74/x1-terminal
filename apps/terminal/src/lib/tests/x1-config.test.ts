// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { getNetwork } from "../network";
import { STORAGE_KEYS } from "@/config/app";
afterEach(() => { localStorage.clear(); vi.unstubAllEnvs(); vi.resetModules(); });
it("defaults to testnet and respects an explicit saved mainnet selection", () => {
 vi.stubEnv("VITE_HYPERLIQUID_TESTNET", "");
 expect(getNetwork()).toBe("testnet");
 localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify({state: { network: "mainnet" }}));
 expect(getNetwork()).toBe("mainnet");
});
it.each([undefined,"","   "])("uses the public X1 builder when the build override is absent (%s)", async value => {
 vi.stubEnv("VITE_BUILDER_ADDRESS", value);
 const {BUILDER_CONFIGURED,DEFAULT_BUILDER_CONFIG}=await import("@/config/hyperliquid");
 expect(BUILDER_CONFIGURED).toBe(true);
 expect(DEFAULT_BUILDER_CONFIG).toEqual({b:"0x95e1642b6c06e06e6ad9412a90e908dcb09f6c1a",f:50});
});
it.each([`0x${"0".repeat(40)}`,"invalid-builder"])("disables trading for an explicit invalid override (%s)",async value=>{
 vi.stubEnv("VITE_BUILDER_ADDRESS",value);
 expect((await import("@/config/hyperliquid")).BUILDER_CONFIGURED).toBe(false);
});
it("sets the specified builder fee to 50 tenths of a basis point", async () => {
 vi.stubEnv("VITE_BUILDER_ADDRESS", `0x${"ab".repeat(20)}`);
 const { BUILDER_CONFIGURED, DEFAULT_BUILDER_CONFIG } = await import("@/config/hyperliquid");
 expect(BUILDER_CONFIGURED).toBe(true);
 expect(DEFAULT_BUILDER_CONFIG).toEqual({ b: `0x${"ab".repeat(20)}`, f: 50 });
});
