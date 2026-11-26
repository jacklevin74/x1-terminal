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
		{ id: "rabby", uid: "r", name: "Rabby Wallet" },
		{ id: "other", uid: "o", name: "Other Wallet" },
	],
	useConnect: () => ({ mutateAsync: state.connect, isPending: false }),
}));
vi.mock("@hypeterminal/ui", async () => (await import("./harness/ui-mock")).createUiMock());
afterEach(() => {
	document.body.innerHTML = "";
	state.connect.mockClear();
});
it("offers Rabby, Phantom and X1, with an explicit derived-account acknowledgment step", async () => {
	const el = document.createElement("div");
	document.body.append(el);
	const root = createRoot(el);
	await act(async () => {
		root.render(createElement(WalletModal, { open: true, onOpenChange: vi.fn() }));
	});
	const buttons = [...el.querySelectorAll("button")];
	expect(buttons).toHaveLength(4);
	expect(buttons[3].textContent).toBe("Connect it through Rabby");
	expect(buttons[0].textContent).toContain("Phantom");
	expect(buttons[1].textContent).toContain("X1 Wallet");
	expect(buttons[2].textContent).toContain("Rabby Wallet");
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

it("connects Rabby without requiring the X1 derived-account acknowledgment", async () => {
	const el = document.createElement("div");
	document.body.append(el);
	const root = createRoot(el);
	const close = vi.fn();
	await act(async () => root.render(createElement(WalletModal, { open: true, onOpenChange: close })));
	const rabby = [...el.querySelectorAll("button")].find((b) =>
		b.textContent?.includes("Rabby Wallet"),
	) as HTMLButtonElement;
	expect(rabby.disabled).toBe(false);
	expect(el.textContent).toContain("Using a Ledger?");
	await act(async () => rabby.click());
	expect(state.connect).toHaveBeenCalledWith({ connector: expect.objectContaining({ id: "rabby" }) });
	expect(close).toHaveBeenCalledWith(false);
	await act(async () => root.unmount());
});
