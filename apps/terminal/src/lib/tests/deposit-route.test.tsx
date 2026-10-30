// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { WrongNetworkScreen } from "@/components/trade/tradebox/deposit/wrong-network-screen";
vi.mock("@lingui/react/macro", () => ({ Trans: ({ children }: { children: ReactNode }) => children }));
vi.mock("@hypeterminal/ui", () => {
 const Wrapper = ({ children }: { children: ReactNode }) => createElement("div", null, children);
 return { Modal: Wrapper, ModalPopup: Wrapper, ModalHeader: Wrapper, ModalTitle: Wrapper, ModalContent: Wrapper,
 Button: ({ children, onClick, disabled }: {children: ReactNode; onClick: () => void; disabled?: boolean}) => createElement("button", {onClick, disabled}, children) };
});
it("offers native ETH deposits without requiring an Arbitrum switch", async () => {
 const node = document.createElement("div"); document.body.append(node);
 const root = createRoot(node);
 const onEthDeposit = vi.fn(); const onSwitch = vi.fn();
 await act(async () => root.render(createElement(WrongNetworkScreen, { open: true, onClose: vi.fn(), onSwitch, onEthDeposit, isSwitching: false })));
 const buttons = [...node.querySelectorAll("button")];
 expect(buttons.map(b => b.textContent)).toEqual(["Deposit native ETH", "Switch to Arbitrum"]);
 await act(async () => buttons[0].click());
 expect(onEthDeposit).toHaveBeenCalledOnce();
 expect(onSwitch).not.toHaveBeenCalled();
 await act(async () => buttons[1].click());
 expect(onSwitch).toHaveBeenCalledOnce();
 await act(async () => root.unmount()); node.remove();
});
