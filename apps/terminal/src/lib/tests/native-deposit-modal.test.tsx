// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { NativeDepositModal } from "@/components/trade/tradebox/deposit/native-deposit-modal";
const state = vi.hoisted(() => ({ send: vi.fn(), readBalance: vi.fn(async () => ({ address: "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS", lamports: 1_900_000_000n, feeLamports: 5000n, maxLamports: 1_899_990_000n })), eth: vi.fn(async () => `0x${"cd".repeat(20)}`), sol: vi.fn(async () => "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS") }));
vi.mock("wagmi", () => ({ useConnection: () => ({ address: `0x${"ab".repeat(20)}`, connector: { id: "x1" } }) }));
vi.mock("@/stores/use-global-settings-store", () => ({ useIsTestnet: () => false }));
vi.mock("@/lib/unit/eth-deposit", () => ({ fetchEthDepositAddress: state.eth, fetchEthDepositFees: async () => ({ fee: 0.0005, eta: "3m" }), MIN_ETH_DEPOSIT: "0.007" }));
vi.mock("@/lib/unit/sol-deposit", () => ({ fetchSolDepositAddress: state.sol, fetchSolDepositFees: async () => ({ fee: 0.01, eta: "1m" }), MIN_SOL_DEPOSIT: "0.12", parseSolDepositAmount: vi.fn() }));
vi.mock("@/lib/solana/deposit-balance", () => ({ readSolDepositBalance: state.readBalance }));
vi.mock("@/lib/solana/phantom-deposit", () => ({ sendSolDeposit: state.send }));
vi.mock("@hypeterminal/ui", () => {
 const Wrap = ({ children }: { children: ReactNode }) => createElement("div", null, children);
 return { Modal: Wrap, ModalContent: Wrap, ModalHeader: Wrap, ModalTitle: Wrap, ModalPopup: Wrap,
 Button: ({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) => createElement("button", { onClick, disabled }, children) };
});
it("shows an ETH address and supports entering a SOL amount directly without transfer tabs", async () => {
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); const close = vi.fn();
 await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(NativeDepositModal, { open: true, onClose: close }))));
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
 expect(node.textContent).toContain(`0x${"cd".repeat(20)}`);
 expect(node.querySelectorAll("select")).toHaveLength(1);
 expect(node.textContent).toContain("Deposit Chain"); expect(node.textContent).toContain("Ethereum");
 expect(node.textContent).not.toContain("Withdraw"); expect(node.textContent).not.toContain("Bridge"); expect(node.textContent).not.toContain("Amount");
 expect(node.querySelector("img")).toBeNull();
 await act(async () => [...node.querySelectorAll("button")].find(b => b.textContent === "Done")!.click());
 expect(close).toHaveBeenCalledOnce();
 await act(async () => { const select = node.querySelector("select")!; select.value = "SOL"; select.dispatchEvent(new Event("change", { bubbles: true })); });
 expect(node.textContent).not.toContain(`0x${"cd".repeat(20)}`);
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
 expect(node.querySelector("button[aria-label='Copy SOL deposit address']")?.textContent).toContain("9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS");
 expect(state.readBalance).toHaveBeenCalledOnce();
 expect(node.textContent).toContain("Available: 1.9 SOL"); expect(node.textContent).toContain("0.12 SOL");
 expect(node.querySelector("input[aria-label='SOL deposit amount']")).not.toBeNull();
 expect(node.textContent).not.toContain("Read SOL balance"); expect(node.textContent).not.toContain("Withdraw");
 expect(state.send).not.toHaveBeenCalled();
 await act(async () => [...node.querySelectorAll("button")].find(b => b.textContent === "Max")!.click());
 expect(node.querySelector("input")?.value).toBe("1.89999");
 expect(node.querySelector("button[aria-label='Copy SOL deposit address']")).not.toBeNull();
 await act(async () => [...node.querySelectorAll("button")].find(b => b.textContent === "Deposit")!.click());
 expect(state.send).toHaveBeenCalledWith("9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS", "1.89999", expect.any(Function), expect.any(Function), { kind: "x1", expectedAddress: "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS" });
 await act(async () => root.unmount()); node.remove(); client.clear();
});
it("replaces a wrapped Failed to fetch in the deposit address panel with the restriction message", async () => {
 const { RESTRICTED_JURISDICTION_MESSAGE } = await import("../jurisdiction");
 state.sol.mockRejectedValueOnce(new Error("Request failed", { cause: new TypeError("Failed to fetch") }));
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(NativeDepositModal, { open: true, onClose: vi.fn() }))));
 await act(async () => { const select = node.querySelector("select")!; select.value = "SOL"; select.dispatchEvent(new Event("change", { bubbles: true })); });
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
 expect(node.querySelector('[role="alert"]')?.textContent).toContain(RESTRICTED_JURISDICTION_MESSAGE);
 expect(node.textContent).not.toContain("Failed to fetch");
 await act(async () => root.unmount()); node.remove(); client.clear();
});
