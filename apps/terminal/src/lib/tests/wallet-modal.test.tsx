// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { WalletModal } from "@/components/trade/components/wallet-modal";

const state = vi.hoisted(() => ({ connect: vi.fn(async () => {}) }));
vi.mock("wagmi", () => ({
	useConnectors: () => [
		{ id: "phantom", uid: "p", name: "Phantom" },
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
it("offers only Phantom and Rabby, with no X1 Wallet or derived-account step", async () => {
	const el = document.createElement("div");
	document.body.append(el);
	const root = createRoot(el);
	await act(async () => {
		root.render(createElement(WalletModal, { open: true, onOpenChange: vi.fn() }));
	});
	const buttons = [...el.querySelectorAll("button")];
	expect(buttons).toHaveLength(2);
	expect(buttons[0].textContent).toContain("Phantom");
	expect(buttons[1].textContent).toContain("Rabby Wallet");
	expect(el.textContent).not.toContain("X1 Wallet");
	expect(el.textContent).not.toContain("I understand, connect");
	expect(buttons[0].disabled).toBe(false);
	await act(async () => {
		buttons[0].click();
	});
	expect(state.connect).toHaveBeenCalledWith({ connector: expect.objectContaining({ id: "phantom" }) });
	await act(async () => root.unmount());
});

it("connects Rabby", async () => {
	const el = document.createElement("div");
	document.body.append(el);
	const root = createRoot(el);
	const close = vi.fn();
	await act(async () => root.render(createElement(WalletModal, { open: true, onOpenChange: close })));
	const rabby = [...el.querySelectorAll("button")].find((b) =>
		b.textContent?.includes("Rabby Wallet"),
	) as HTMLButtonElement;
	expect(rabby.disabled).toBe(false);
	expect(el.textContent).toContain("approve signing requests on the device");
	await act(async () => rabby.click());
	expect(state.connect).toHaveBeenCalledWith({ connector: expect.objectContaining({ id: "rabby" }) });
	expect(close).toHaveBeenCalledWith(false);
	await act(async () => root.unmount());
});
