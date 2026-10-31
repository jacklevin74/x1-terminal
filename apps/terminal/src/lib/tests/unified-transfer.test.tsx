// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { TransferModal } from "@/components/trade/positions/transfer-modal";
import { hasUnifiedSpotBalance } from "../trade/account-mode";
const send = vi.hoisted(() => vi.fn());
vi.mock("@lingui/core/macro", () => ({ t: (s: TemplateStringsArray) => s.join("") }));
vi.mock("wagmi", () => ({ useConnection: () => ({ address: `0x${"ab".repeat(20)}` }) }));
vi.mock("@/hooks/trade/use-account-balances", () => ({ useDefaultDexBalances: () => ({ accountAbstraction: "unifiedAccount", withdrawable: "0", spotBalances: [{ coin: "USDC", total: "10", hold: "0" }], spotAvailableAfterMaintenance: [] }) }));
vi.mock("@/lib/hyperliquid", () => ({ useExchange: () => ({ mutateAsync: send, isPending: false }) }));
vi.mock("@/lib/hyperliquid/markets/use-spot-tokens", () => ({ useSpotTokens: () => ({ getToken: () => ({ name: "USDC", tokenId: `0x${"12".repeat(16)}`, transferDecimals: 6 }) }) }));
vi.mock("@hypeterminal/ui", () => {
 const Wrap = ({ children }: { children: ReactNode }) => createElement("div", null, children);
 return { Modal: Wrap, ModalContent: Wrap, ModalDescription: Wrap, ModalHeader: Wrap, ModalPopup: Wrap, ModalTitle: Wrap, Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => createElement("button", { onClick }, children) };
});
it("explains the shared balance instead of offering a transfer that the protocol rejects", async () => {
 const node = document.createElement("div"); const root = createRoot(node); const close = vi.fn();
 await act(async () => root.render(createElement(TransferModal, { open: true, onOpenChange: close, initialDirection: "toSpot" })));
 expect(node.textContent).toContain("no transfer to spot is needed"); expect(node.querySelector("input")).toBeNull(); expect(send).not.toHaveBeenCalled();
 await act(async () => node.querySelector("button")!.click()); expect(close).toHaveBeenCalledWith(false);
 await act(async () => root.unmount());
});
it("keeps standard and legacy DEX abstraction transfers separate from unified modes", () => {
 expect(hasUnifiedSpotBalance("unifiedAccount")).toBe(true); expect(hasUnifiedSpotBalance("portfolioMargin")).toBe(true);
 for (const mode of ["disabled", "default", "dexAbstraction", undefined]) expect(hasUnifiedSpotBalance(mode)).toBe(false);
});
