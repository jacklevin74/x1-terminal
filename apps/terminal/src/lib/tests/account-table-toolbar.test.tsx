// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { AccountTableToolbar, AccountToolbarContext } from "@/components/trade/positions/account-table-toolbar";
it("places active controls beside the tabs and keeps inactive controls out of the header", async () => {
 const node = document.createElement("div"); const target = document.createElement("div"); document.body.append(node, target); const root = createRoot(node);
 function Controls() { const [count, setCount] = useState(0); return createElement(AccountTableToolbar, { tab: "history", children: createElement("button", { onClick: () => setCount(v => v + 1) }, `Filter ${count}`) }); }
 await act(async () => root.render(createElement(AccountToolbarContext.Provider, { value: { target, activeTab: "history" } }, createElement(Controls))));
 expect(node.textContent).toBe(""); expect(target.textContent).toBe("Filter 0");
 await act(async () => target.querySelector("button")!.click()); expect(target.textContent).toBe("Filter 1");
 await act(async () => root.render(createElement(AccountToolbarContext.Provider, { value: { target, activeTab: "funding" } }, createElement(Controls))));
 expect(target.textContent).toBe("");
 await act(async () => root.unmount()); node.remove(); target.remove();
});
