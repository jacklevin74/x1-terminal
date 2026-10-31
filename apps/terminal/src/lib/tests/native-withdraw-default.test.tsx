// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { NativeWithdrawModal } from "@/components/trade/tradebox/deposit/native-withdraw-modal";
const native = vi.hoisted(() => vi.fn(async () => ({ status: "ready", address: `0x${"12".repeat(20)}` })));
vi.mock("@/lib/wallet/native-ethereum", () => ({ readNativeEthereumRecipient: native }));
vi.mock("wagmi", () => ({ useConnection: () => ({ address: `0x${"cd".repeat(20)}`, connector: { id: "x1" } }) }));
vi.mock("@/components/trade/positions/native-withdraw-form", () => ({ NativeWithdrawForm: ({ asset }: { asset: string }) => createElement("p", null, `Recipient for ${asset}`) }));
vi.mock("@hypeterminal/ui", () => {
 const Wrap = ({ children }: { children: ReactNode }) => createElement("div", null, children);
 return { Modal: Wrap, ModalPopup: Wrap };
});
it("switches to ETH when a native Ethereum wallet is connected and respects a later manual choice", async () => {
 const node = document.createElement("div"); const root = createRoot(node);
 await act(async () => root.render(createElement(NativeWithdrawModal, { initialAsset: "SOL", onClose: vi.fn() })));
 const select = node.querySelector("select")!;
 expect(select.value).toBe("ETH"); expect(node.textContent).toContain("Recipient for ETH");
 await act(async () => { select.value = "SOL"; select.dispatchEvent(new Event("change", { bubbles: true })); });
 await act(async () => window.dispatchEvent(new Event("focus")));
 expect(select.value).toBe("SOL");
 await act(async () => root.unmount());
});
