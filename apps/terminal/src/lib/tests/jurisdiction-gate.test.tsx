// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { JurisdictionGate } from "@/components/trade/components/jurisdiction-gate";
import { RESTRICTED_JURISDICTION_MESSAGE } from "../jurisdiction";
vi.mock("wagmi", () => ({ useConnection: () => ({ isConnected: false }) }));
vi.mock("@/components/trade/components/export-key-modal", () => ({ ExportKeyModal: () => null }));
afterEach(() => vi.unstubAllGlobals());
it("shows the exact requested message and never mounts trading for a restricted response", async () => {
 const fetcher = vi.fn(async () => new Response(JSON.stringify({ country: "US", restricted: true })));
 vi.stubGlobal("fetch", fetcher);
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const trading = vi.fn(() => createElement("div", null, "Trading interface"));
 await act(async () => root.render(createElement(JurisdictionGate, { children: createElement(trading) })));
 expect(trading).not.toHaveBeenCalled(); expect(node.textContent).toContain(RESTRICTED_JURISDICTION_MESSAGE);
 expect(fetcher).toHaveBeenCalledWith("/api/jurisdiction", { cache: "no-store", signal: expect.any(AbortSignal) });
 await act(async () => root.unmount()); node.remove();
});
it("does not label ordinary fetch failures as a location restriction", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 await act(async () => root.render(createElement(JurisdictionGate, { children: "Trading interface" })));
 expect(node.textContent).toContain("Trading interface"); expect(node.textContent).not.toContain(RESTRICTED_JURISDICTION_MESSAGE);
 await act(async () => root.unmount()); node.remove();
});
it("loads trading for an unrestricted response", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ country: "DE", restricted: false }))));
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 await act(async () => root.render(createElement(JurisdictionGate, { children: "Trading interface" })));
 expect(node.textContent).toBe("Trading interface");
 await act(async () => root.unmount()); node.remove();
});
