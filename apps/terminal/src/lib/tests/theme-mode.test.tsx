// @vitest-environment jsdom
import { act, createElement, useContext } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	readThemePreference,
	THEME_STORAGE_KEY,
	themeModeFor,
	writeThemePreference,
} from "@/components/newtheme/theme-mode";
import { TerminalThemeRoot } from "@/components/newtheme/theme-root";
import { useNewtheme } from "@/components/newtheme/use-newtheme";
import { TerminalBrandContext } from "@/components/trade/header/terminal-brand";

const loc = { pathname: "/" };
vi.mock("@tanstack/react-router", () => ({
	Link: ({ to, children, ...props }: any) => createElement("a", { href: to, ...props }, children),
	useLocation: () => loc,
	useNavigate: () => () => undefined,
}));
vi.mock("@/components/trade/trade-terminal-page", () => ({ TradeTerminalPage: () => null }));

const attr = () => document.documentElement.getAttribute("data-terminal-theme");
function Probe() {
	return createElement("span", { "data-brand": useContext(TerminalBrandContext) ? "new" : "classic" });
}
function Forcing() {
	useNewtheme();
	return null;
}

async function mount(child = createElement(Probe)) {
	const node = document.createElement("div");
	const root = createRoot(node);
	await act(async () => root.render(createElement(TerminalThemeRoot, null, child)));
	return { node, root };
}

beforeEach(() => {
	loc.pathname = "/";
	window.localStorage.clear();
	document.documentElement.removeAttribute("data-terminal-theme");
});
afterEach(() => {
	window.localStorage.clear();
});

it("defaults to the new theme everywhere, with the new brand", async () => {
	expect(readThemePreference()).toBe("new");
	const { node, root } = await mount();
	expect(attr()).toBe("newtheme");
	expect(node.querySelector("[data-brand]")?.getAttribute("data-brand")).toBe("new");
	await act(async () => root.unmount());
});

it("a saved classic choice keeps the classic look; switching back applies the new theme live", async () => {
	writeThemePreference("classic");
	expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("classic");
	const { node, root } = await mount();
	expect(attr()).toBeNull();
	expect(node.querySelector("[data-brand]")?.getAttribute("data-brand")).toBe("classic");
	await act(async () => writeThemePreference("new"));
	expect(attr()).toBe("newtheme");
	expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
	await act(async () => root.unmount());
});

it("/newtheme and /classic force their look regardless of the saved choice", () => {
	expect(themeModeFor("/newtheme", "classic")).toBe("new");
	expect(themeModeFor("/classic", "new")).toBe("classic");
	expect(themeModeFor("/perp", "classic")).toBe("classic");
	expect(themeModeFor("/perp", "new")).toBe("new");
});

it("pages built for the new theme keep it in classic mode, and classic returns when they unmount", async () => {
	writeThemePreference("classic");
	const { root } = await mount(createElement(Forcing));
	expect(attr()).toBe("newtheme");
	await act(async () => root.render(createElement(TerminalThemeRoot, null, createElement(Probe))));
	expect(attr()).toBeNull();
	await act(async () => root.unmount());
});

it("falls back to the new theme when storage is unavailable", () => {
	const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
		throw new Error("blocked");
	});
	expect(readThemePreference()).toBe("new");
	spy.mockRestore();
});
