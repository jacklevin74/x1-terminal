// @vitest-environment jsdom
import { act, createElement, useContext } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { NewthemePage } from "@/components/newtheme/newtheme-page";
import { TerminalBrandContext } from "@/components/trade/header/terminal-brand";
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children, ...props }: any) => createElement("a", { href: to, ...props }, children) }));
vi.mock("@/components/trade/trade-terminal-page", () => ({ TradeTerminalPage: () => createElement("main", null, useContext(TerminalBrandContext), "Current terminal") }));
afterEach(() => document.documentElement.removeAttribute("data-terminal-theme"));
it("applies the preview only while mounted and keeps the existing terminal", async () => {
 const node = document.createElement("div"); const otherRoot = createRoot(node);
 await act(async () => otherRoot.render(createElement(NewthemePage)));
 expect(document.documentElement.dataset.terminalTheme).toBe("newtheme");
 expect(node.textContent).toContain("Current terminal");
 expect(node.querySelector('a[aria-label="X1 Terminal — return to current theme"]')?.getAttribute("href")).toBe("/");
 await act(async () => { otherRoot.unmount(); });
 expect(document.documentElement.hasAttribute("data-terminal-theme")).toBe(false);
});
it("restores the previous appearance attribute when leaving the preview", async () => {
 document.documentElement.dataset.terminalTheme = "existing";
 const root = createRoot(document.createElement("div"));
 await act(async () => root.render(createElement(NewthemePage)));
 await act(async () => root.unmount());
 expect(document.documentElement.dataset.terminalTheme).toBe("existing");
});
