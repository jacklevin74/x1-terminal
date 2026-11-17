// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { JurisdictionGate } from "@/components/trade/components/jurisdiction-gate";
import { RESTRICTED_JURISDICTION_MESSAGE } from "../jurisdiction";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); document.body.innerHTML = ""; });
async function mount(props: { failOpen?: boolean } = {}) {
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const trading = vi.fn(() => createElement("div", null, "Trading interface"));
 await act(async () => root.render(createElement(JurisdictionGate, { ...props, children: createElement(trading) })));
 return { node, root, trading };
}
it("restricted response: blocks the app and shows the exact message", async () => {
 const fetcher = vi.fn(async () => new Response(JSON.stringify({ country: "US", restricted: true })));
 vi.stubGlobal("fetch", fetcher);
 const { node, root, trading } = await mount({ failOpen: false });
 expect(trading).not.toHaveBeenCalled(); expect(node.textContent).toContain(RESTRICTED_JURISDICTION_MESSAGE);
 expect(fetcher).toHaveBeenCalledWith("/api/jurisdiction", { cache: "no-store", signal: expect.any(AbortSignal) });
 await act(async () => root.unmount());
});
it("allowed response: loads the app", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ country: "DE", restricted: false }))));
 const { node, root } = await mount({ failOpen: false });
 expect(node.textContent).toBe("Trading interface");
 await act(async () => root.unmount());
});
it("production: a failed check blocks the app and offers a retry that can succeed", async () => {
 const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"))
  .mockResolvedValueOnce(new Response(JSON.stringify({ country: "DE", restricted: false })));
 vi.stubGlobal("fetch", fetcher);
 const { node, root, trading } = await mount({ failOpen: false });
 expect(trading).not.toHaveBeenCalled();
 expect(node.textContent).toContain("Location check unavailable");
 expect(node.textContent).not.toContain(RESTRICTED_JURISDICTION_MESSAGE);
 const retry = [...node.querySelectorAll("button")].find(b => b.textContent?.includes("Try again"))!;
 await act(async () => retry.click());
 expect(fetcher).toHaveBeenCalledTimes(2); expect(node.textContent).toBe("Trading interface");
 await act(async () => root.unmount());
});
it("production: a malformed response blocks the app", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>not json</html>", { status: 200 })));
 const { node, root, trading } = await mount({ failOpen: false });
 expect(trading).not.toHaveBeenCalled(); expect(node.textContent).toContain("Location check unavailable");
 await act(async () => root.unmount());
});
it("production: a 404 (endpoint missing) blocks the app", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
 const { node, root, trading } = await mount({ failOpen: false });
 expect(trading).not.toHaveBeenCalled(); expect(node.textContent).toContain("Location check unavailable");
 await act(async () => root.unmount());
});
it("production: the 4 s timeout blocks the app", async () => {
 vi.useFakeTimers();
 vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
  init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
 })));
 const { node, root, trading } = await mount({ failOpen: false });
 expect(node.textContent).toContain("Checking availability");
 await act(async () => { vi.advanceTimersByTime(4000); });
 expect(trading).not.toHaveBeenCalled(); expect(node.textContent).toContain("Location check unavailable");
 await act(async () => root.unmount());
});
it("dev: a failed check still loads the app", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
 const { node, root } = await mount({ failOpen: true });
 expect(node.textContent).toBe("Trading interface");
 await act(async () => root.unmount());
});
