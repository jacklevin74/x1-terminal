// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ExportKeyModal } from "@/components/trade/components/export-key-modal";
const state = vi.hoisted(() => ({ read: vi.fn(() => `0x${"ab".repeat(32)}`) }));
vi.mock("@/lib/x1/provider", () => ({ exportX1PrivateKey: state.read }));
vi.mock("@hypeterminal/ui", () => {
 const Wrap = ({ children }: { children: ReactNode }) => createElement("div", null, children);
 return { Modal: Wrap, ModalContent: Wrap, ModalPopup: Wrap, ModalTitle: Wrap,
 Button: ({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) => createElement("button", { onClick, disabled }, children) };
});
it("requires acknowledgement before reading the key and removes it when leaving the window", async () => {
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const address = `0x${"12".repeat(20)}`;
 await act(async () => root.render(createElement(ExportKeyModal, { address, onClose: vi.fn() })));
 const reveal = () => [...node.querySelectorAll("button")].find(b => b.textContent === "Reveal private key")!;
 expect(reveal().disabled).toBe(true); expect(state.read).not.toHaveBeenCalled(); expect(node.querySelector("textarea")).toBeNull();
 await act(async () => node.querySelector("input")!.click());
 await act(async () => reveal().click());
 expect(state.read).toHaveBeenCalledWith(address); expect(node.querySelector("textarea")!.value).toBe(`0x${"ab".repeat(32)}`);
 await act(async () => window.dispatchEvent(new Event("blur")));
 expect(node.querySelector("textarea")).toBeNull(); expect(reveal().disabled).toBe(true);
 await act(async () => root.unmount()); node.remove();
});
