// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { WalletModal } from "@/components/trade/components/wallet-modal";

const state = vi.hoisted(() => ({ connect: vi.fn(async () => {}) }));
vi.mock("wagmi", () => ({
	useConnectors: () => [
		{ id: "phantom", uid: "p", name: "Phantom" },
		{ id: "x1", uid: "x", name: "X1 Wallet" },
		{ id: "other", uid: "o", name: "Other Wallet" },
	],
	useConnect: () => ({ mutateAsync: state.connect, isPending: false }),
}));
vi.mock("@hypeterminal/ui", async () => (await import("./harness/ui-mock")).createUiMock());
afterEach(() => {
	document.body.innerHTML = "";
	state.connect.mockClear();
});
it("offers only Phantom and X1, with an explicit derived-account acknowledgment step", async () => {
	const el = document.createElement("div");
	document.body.append(el);
	const root = createRoot(el);
	await act(async () => {
		root.render(createElement(WalletModal, { open: true, onOpenChange: vi.fn() }));
	});
	const buttons = [...el.querySelectorAll("button")];
	expect(buttons).toHaveLength(2);
	expect(buttons[0].textContent).toContain("Phantom");
	expect(buttons[1].textContent).toContain("X1 Wallet");
	expect(state.connect).not.toHaveBeenCalled();
	await act(async () => {
		buttons[1].click();
	});
	expect(state.connect).not.toHaveBeenCalled();
	const agree = [...el.querySelectorAll("button")].find((b) => b.textContent?.includes("I understand, connect"));
	expect(agree).toBeDefined();
	await act(async () => {
		agree?.click();
	});
	expect(state.connect).toHaveBeenCalledWith({ connector: expect.objectContaining({ id: "x1" }) });
	await act(async () => root.unmount());
});
