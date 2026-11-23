// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { UserMenu } from "@/components/trade/header/user-menu";
import { useTradingAccountStore } from "@/stores/use-trading-account-store";

const state = vi.hoisted(() => ({
	owner: `0x${"ab".repeat(20)}` as `0x${string}`,
	sub: `0x${"12".repeat(20)}` as `0x${string}`,
	reset: vi.fn(),
	mutating: 0,
}));
vi.mock("wagmi", () => ({
	useConnection: () => ({ address: state.owner, isConnected: true, connector: { id: "rabby", name: "Rabby Wallet" } }),
	useDisconnect: () => ({ mutate: vi.fn() }),
}));
vi.mock("@tanstack/react-query", () => ({ useIsMutating: () => state.mutating }));
vi.mock("@/stores/use-order-entry-store", () => ({ useOrderEntryActions: () => ({ resetForm: state.reset }) }));
vi.mock("@/lib/hyperliquid", () => ({
	removeAgentFromStorage: vi.fn(),
	useInfo: () => ({
		data: [
			{ master: state.owner, name: "Ledger bot", subAccountUser: state.sub },
			{ master: state.sub, name: "Other owner", subAccountUser: `0x${"34".repeat(20)}` },
		],
		refetch: vi.fn(),
	}),
}));
vi.mock("@/components/trade/components/account-mode-control", () => ({ AccountModeControl: () => null }));
vi.mock("@/components/trade/components/wallet-modal", () => ({ WalletModal: () => null }));
vi.mock("@/components/trade/components/export-key-modal", () => ({ ExportKeyModal: () => null }));
vi.mock("@hypeterminal/ui", () => ({ Button: () => null, dropdownTriggerVariants: () => "" }));
vi.mock("@/components/ui/popover", () => ({
	Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	PopoverTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/auto-trader/hooks", () => ({ useAutoTraderStatus: () => ({ data: undefined }) }));
vi.mock("@/hooks/use-subaccount-actions", () => ({
	useSubaccountActions: () => ({ busy: false, create: vi.fn(), transfer: vi.fn() }),
}));
const copied = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/ui/use-copy-to-clipboard", () => ({ useCopyToClipboard: () => ({ copy: copied, copied: false }) }));
afterEach(() => {
	useTradingAccountStore.getState().select(null);
	state.mutating = 0;
	state.reset.mockClear();
});
it("selects the owner's subaccount from the top-right menu and returns to main", async () => {
	const host = document.createElement("div");
	document.body.append(host);
	const root = createRoot(host);
	await act(async () => root.render(<UserMenu />));
	expect(host.textContent).not.toContain("Other owner");
	expect(host.querySelector("[data-trigger] svg")).not.toBeNull();
	await act(async () =>
		[...host.querySelectorAll("button")].find((b) => b.textContent?.includes("Ledger bot"))!.click(),
	);
	expect(host.querySelector("[data-trigger]")?.textContent).toContain("Ledger bot");
	expect(useTradingAccountStore.getState().selection?.address).toBe(state.sub);
	expect(state.reset).toHaveBeenCalledOnce();
	await act(async () =>
		[...host.querySelectorAll("button")].find((b) => b.textContent?.includes("Main account"))!.click(),
	);
	expect(useTradingAccountStore.getState().selection).toBeNull();
	expect(host.querySelector("[data-trigger]")?.textContent).toContain("Rabby");
	await act(async () => root.unmount());
	host.remove();
});
it("disables account switching while an operation is pending", async () => {
	state.mutating = 1;
	const host = document.createElement("div");
	const root = createRoot(host);
	await act(async () => root.render(<UserMenu />));
	const buttons = [...host.querySelectorAll("button")].filter(
		(b) => b.textContent?.includes("Main account") || b.textContent?.includes("Ledger bot"),
	);
	expect(buttons).toHaveLength(2);
	expect(buttons.every((b) => b.disabled)).toBe(true);
	await act(async () => root.unmount());
});
it("copies a subaccount address without switching accounts", async () => {
	const host = document.createElement("div");
	const root = createRoot(host);
	await act(async () => root.render(<UserMenu />));
	await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Open Ledger bot"]')!.click());
	expect(host.querySelector('input[aria-label="Amount in USDC"]')).toBeNull();
	await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Copy Ledger bot address"]')!.click());
	expect(copied).toHaveBeenCalledWith(state.sub);
	expect(useTradingAccountStore.getState().selection).toBeNull();
	expect(state.reset).not.toHaveBeenCalled();
	await act(async () => root.unmount());
});
it("shows the transfer form only after a direction is picked on the account page", async () => {
	const host = document.createElement("div");
	const root = createRoot(host);
	await act(async () => root.render(<UserMenu />));
	expect(host.textContent).not.toContain("Add from Main");
	await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Open Ledger bot"]')!.click());
	expect(host.querySelector('input[aria-label="Amount in USDC"]')).toBeNull();
	await act(async () => [...host.querySelectorAll("button")].find((b) => b.textContent === "Add from Main")!.click());
	expect(host.querySelector('input[aria-label="Amount in USDC"]')).not.toBeNull();
	await act(async () => root.unmount());
});
it("keeps API wallets and Trading setup inside a collapsed More section and has no XNT rewards item", async () => {
	const host = document.createElement("div");
	const root = createRoot(host);
	await act(async () => root.render(<UserMenu />));
	expect(host.textContent).not.toContain("XNT rewards");
	expect(host.textContent).not.toContain("API wallets");
	await act(async () => [...host.querySelectorAll("button")].find((b) => b.textContent === "More")!.click());
	expect(host.textContent).toContain("API wallets");
	expect(host.textContent).toContain("Trading setup");
	await act(async () => root.unmount());
});
