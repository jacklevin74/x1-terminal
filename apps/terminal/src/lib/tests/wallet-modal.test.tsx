// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
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
vi.mock("@hypeterminal/ui", () => {
 const Wrapper = ({ children }: { children: ReactNode }) => createElement("div", null, children);
 return { Modal: Wrapper, ModalContent: Wrapper, ModalPopup: Wrapper };
});
afterEach(() => { document.body.innerHTML = ""; state.connect.mockClear(); });
it("offers only Phantom and X1, with an explicit derived-account acknowledgment", async () => {
 const el = document.createElement("div"); document.body.append(el);
 const root = createRoot(el);
 await act(async () => { root.render(createElement(WalletModal, { open: true, onOpenChange: vi.fn() })); });
 const buttons = [...el.querySelectorAll("button")];
 expect(buttons).toHaveLength(2);
 expect(buttons[0].textContent).toContain("Phantom");
 expect(buttons[1].textContent).toContain("X1 Wallet");
 expect(buttons[1].disabled).toBe(true);
 expect(state.connect).not.toHaveBeenCalled();
 await act(async () => { (el.querySelector("input") as HTMLInputElement).click(); });
 expect(buttons[1].disabled).toBe(false);
 await act(async () => { buttons[1].click(); });
 expect(state.connect).toHaveBeenCalledWith({ connector: expect.objectContaining({ id: "x1" }) });
 await act(async () => root.unmount());
});
