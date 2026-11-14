// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { SendModal } from "@/components/trade/positions/send-modal";

const state = vi.hoisted(() => ({
	address: `0x${"cd".repeat(20)}`,
	spotSend: vi.fn(async () => {}),
	sendAsset: vi.fn(async () => {}),
}));
const DEST = `0x${"ab".repeat(20)}`;

vi.mock("@lingui/core/macro", () => ({
	t: (strings: TemplateStringsArray, ...values: unknown[]) =>
		strings.reduce((out, part, i) => out + part + (values[i] ?? ""), ""),
}));
vi.mock("wagmi", () => ({ useConnection: () => ({ address: state.address, connector: { id: "injected" } }) }));
vi.mock("@/lib/hyperliquid", () => ({
	useExchange: (method: string) => ({
		mutateAsync: method === "sendAsset" ? state.sendAsset : state.spotSend,
		isPending: false,
	}),
}));
vi.mock("@/hooks/trade/use-account-balances", () => ({
	useDefaultDexBalances: () => ({
		perpSummary: { accountValue: "0", totalMarginUsed: "0" },
		spotBalances: [{ coin: "USDC", total: "50", hold: "0", entryNtl: "50" }],
		spotAvailableAfterMaintenance: [],
	}),
}));
vi.mock("@/lib/hyperliquid/markets/use-spot-tokens", () => ({
	useSpotTokens: () => ({
		getToken: () => ({ name: "USDC", tokenId: `0x${"12".repeat(16)}`, weiDecimals: 8, transferDecimals: 8 }),
	}),
}));
vi.mock("@/components/trade/positions/native-withdraw-form", () => ({ NativeWithdrawForm: () => null }));
vi.mock("@/components/ui/number-input", () => ({
	NumberInput: ({ value, onChange }: { value: string; onChange: (e: unknown) => void }) =>
		createElement("input", { "aria-label": "amount", value, onChange }),
}));
vi.mock("@hypeterminal/ui", () => {
	const Wrap = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
	return {
		Modal: Wrap,
		ModalPopup: Wrap,
		ModalContent: Wrap,
		ModalHeader: Wrap,
		ModalTitle: Wrap,
		ModalDescription: Wrap,
		Select: () => null,
		TextInput: ({ value, onChange }: { value: string; onChange: (e: unknown) => void }) =>
			createElement("input", { "aria-label": "destination", value, onChange }),
		Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick: () => void; disabled?: boolean }) =>
			createElement("button", { type: "button", onClick, disabled }, children),
	};
});

function setInput(input: HTMLInputElement, value: string) {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
	setter.call(input, value);
	input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function renderFilled() {
	const node = document.createElement("div");
	document.body.append(node);
	const root = createRoot(node);
	await act(async () => root.render(createElement(SendModal, { open: true, onOpenChange: vi.fn() })));
	await act(async () => setInput(node.querySelector<HTMLInputElement>("input[aria-label='destination']")!, DEST));
	await act(async () => setInput(node.querySelector<HTMLInputElement>("input[aria-label='amount']")!, "10"));
	const button = (text: string) => [...node.querySelectorAll("button")].find((b) => b.textContent?.includes(text));
	return { node, root, button };
}

afterEach(() => {
	state.spotSend.mockClear();
	state.address = `0x${"cd".repeat(20)}`;
	document.body.innerHTML = "";
});

it("shows the destination and amount for review before signing a send", async () => {
	const { node, root, button } = await renderFilled();
	await act(async () => button("Review send")!.click());
	expect(state.spotSend).not.toHaveBeenCalled();
	expect(node.textContent).toContain(DEST);
	expect(node.textContent).toContain("10 USDC");
	await act(async () => button("Confirm send")!.click());
	expect(state.spotSend).toHaveBeenCalledWith({ destination: DEST, token: `USDC:0x${"12".repeat(16)}`, amount: "10" });
	await act(async () => root.unmount());
});

it("drops the review when the amount changes after reviewing", async () => {
	const { node, root, button } = await renderFilled();
	await act(async () => button("Review send")!.click());
	await act(async () => setInput(node.querySelector<HTMLInputElement>("input[aria-label='amount']")!, "20"));
	expect(button("Confirm send")).toBeUndefined();
	await act(async () => button("Review send")!.click());
	expect(state.spotSend).not.toHaveBeenCalled();
	await act(async () => root.unmount());
});

it("refuses to sign when the connected account changed after review", async () => {
	const { node, root, button } = await renderFilled();
	await act(async () => button("Review send")!.click());
	state.address = `0x${"ef".repeat(20)}`;
	await act(async () => root.render(createElement(SendModal, { open: true, onOpenChange: vi.fn() })));
	await act(async () => button("Confirm send")!.click());
	expect(state.spotSend).not.toHaveBeenCalled();
	expect(node.textContent).toContain("Account changed");
	await act(async () => root.unmount());
});
