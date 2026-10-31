// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { NativeWithdrawForm } from "@/components/trade/positions/native-withdraw-form";
const state = vi.hoisted(() => ({ feeFailures: 0, feeCalls: 0, usdc: "0", mode: "disabled", assetSend: vi.fn(async () => {}), fee: "0", destination: "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS", route: vi.fn(async () => `0x${"ab".repeat(20)}`), send: vi.fn(async () => {}) }));
vi.mock("wagmi", () => ({ useConnection: () => ({ address: `0x${"cd".repeat(20)}`, isConnected: true, connector: { id: "x1" } }) }));
vi.mock("@/lib/network", () => ({ isTestnet: () => false }));
vi.mock("@/lib/solana/source-wallet", () => ({ getSolSourceWallet: () => wallet, connectSolSource: async () => { wallet.isConnected = true; } }));
const wallet = { isConnected: true, publicKey: { toBase58: () => state.destination }, on: vi.fn(), removeListener: vi.fn() };
vi.mock("@/lib/hyperliquid", () => ({ getInfoClient: () => ({ preTransferCheck: async () => { state.feeCalls++; if (state.feeFailures > 0) { state.feeFailures--; throw new Error("Activation fee unavailable."); } return { fee: state.fee, userExists: true }; } }), useExchange: (method: string) => ({ mutateAsync: method === "sendAsset" ? state.assetSend : state.send, isPending: false }) }));
vi.mock("@/hooks/trade/use-account-balances", () => ({ useDefaultDexBalances: () => ({ spotBalances: [{ coin: "USOL", total: "0.199782040", hold: "0" }, { coin: "USDC", total: state.usdc, hold: "0" }], spotAvailableAfterMaintenance: [], accountAbstraction: state.mode }) }));
vi.mock("@/lib/hyperliquid/markets/use-spot-tokens", () => ({ useSpotTokens: () => ({ getToken: () => ({ name: "USOL", tokenId: `0x${"12".repeat(16)}`, weiDecimals: 9, transferDecimals: 9 }) }) }));
vi.mock("@/lib/unit/sol-withdraw", async importOriginal => ({ ...await importOriginal<object>(), fetchSolWithdrawalAddress: state.route, fetchSolWithdrawalFees: async () => ({ fee: 0.000008, eta: "4m" }) }));
vi.mock("@/components/trade/components/spot-swap-modal", () => ({ SpotSwapModalContent: ({ initialFromToken, initialToToken, reserveFromBalance, onSubmitted, onClose }: { initialFromToken: string; initialToToken: string; reserveFromBalance: number; onSubmitted: () => void; onClose: () => void }) => createElement("div", { "data-swap-pair": `${initialFromToken}:${initialToToken}`, "data-reserve": reserveFromBalance }, createElement("button", { onClick: () => { onSubmitted(); onClose(); } }, "Simulate approved swap")) }));
vi.mock("@hypeterminal/ui", () => {
 const Wrap = ({ children }: { children: ReactNode }) => createElement("div", null, children);
 return { ModalContent: Wrap, ModalHeader: Wrap, ModalTitle: Wrap,
 Button: ({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) => createElement("button", { onClick, disabled }, children) };
});
it("autofills X1 and requires review then confirmation before sending to the verified Unit route", async () => {
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(NativeWithdrawForm, { onBack: vi.fn() }))));
 await act(async () => { await new Promise(r => setTimeout(r, 25)); });
 expect(node.querySelector<HTMLInputElement>("input[aria-label='Solana withdrawal destination']")!.value).toBe(state.destination);
 const button = (text: string) => [...node.querySelectorAll("button")].find(b => b.textContent === text)!;
 expect(state.send).not.toHaveBeenCalled();
 await act(async () => button("Max").click());
 expect(button("Review withdrawal").disabled).toBe(false);
 await act(async () => button("Review withdrawal").click());
 expect(state.send).not.toHaveBeenCalled();
 await act(async () => button("Confirm withdrawal").click());
 expect(state.send).toHaveBeenCalledWith({ destination: `0x${"ab".repeat(20)}`, token: `USOL:0x${"12".repeat(16)}`, amount: "0.199782040" });
 expect(node.textContent).toContain("Delivery to Solana is processing");
 await act(async () => root.unmount()); node.remove(); client.clear();
});

it("blocks signing and offers a swap when the activation fee has no quote balance", async () => {
 state.fee = "1"; state.send.mockClear();
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(NativeWithdrawForm, { onBack: vi.fn() }))));
 await act(async () => { await new Promise(r => setTimeout(r, 35)); });
 const button = (text: string) => [...node.querySelectorAll("button")].find(b => b.textContent === text)!;
 await act(async () => button("Max").click());
 expect(button("Review withdrawal").disabled).toBe(true);
 expect(node.textContent).toContain("Need 1 USDC for activation.");
 expect(button("Swap some SOL for USDC")).toBeDefined();
 expect(state.send).not.toHaveBeenCalled();
 await act(async () => root.unmount()); node.remove(); client.clear(); state.fee = "0";
});

it("clears a locked wallet's destination and restores it only after reconnect", async () => {
 state.send.mockClear();
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(NativeWithdrawForm, { onBack: vi.fn() }))));
 await act(async () => { await new Promise(r => setTimeout(r, 35)); });
 wallet.isConnected = false;
 await act(async () => window.dispatchEvent(new Event("focus")));
 expect(node.querySelector<HTMLInputElement>("input[aria-label='Solana withdrawal destination']")!.value).toBe("");
 expect(node.textContent).toContain("locked or disconnected");
 const button = (text: string) => [...node.querySelectorAll("button")].find(b => b.textContent === text)!;
 expect(button("Review withdrawal").disabled).toBe(true);
 expect(state.send).not.toHaveBeenCalled();
 await act(async () => button("Unlock / reconnect wallet").click());
 await act(async () => { await new Promise(r => setTimeout(r, 25)); });
 expect(node.querySelector<HTMLInputElement>("input[aria-label='Solana withdrawal destination']")!.value).toBe(state.destination);
 await act(async () => root.unmount()); node.remove(); client.clear(); wallet.isConnected = true;
});

it("withdraws from the spot source with sendAsset in unified mode", async () => {
 state.mode = "unifiedAccount"; state.send.mockClear(); state.assetSend.mockClear();
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(NativeWithdrawForm, { onBack: vi.fn() }))));
 await act(async () => { await new Promise(r => setTimeout(r, 40)); });
 const button = (text: string) => [...node.querySelectorAll("button")].find(b => b.textContent === text)!;
 await act(async () => button("Max").click());
 await act(async () => button("Review withdrawal").click());
 await act(async () => button("Confirm withdrawal").click());
 expect(state.send).not.toHaveBeenCalled();
 expect(state.assetSend).toHaveBeenCalledWith(expect.objectContaining({ sourceDex: "spot", destinationDex: "spot", destination: `0x${"ab".repeat(20)}` }));
 await act(async () => root.unmount()); node.remove(); client.clear(); state.mode = "disabled";
});

it("offers a USDC purchase inside Withdraw and returns without automatically withdrawing", async () => {
 state.usdc = "20"; state.send.mockClear(); state.assetSend.mockClear();
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(NativeWithdrawForm, { onBack: vi.fn() }))));
 await act(async () => { await new Promise(r => setTimeout(r, 40)); });
 const button = (text: string) => [...node.querySelectorAll("button")].find(b => b.textContent === text)!;
 await act(async () => button("Swap USDC to SOL").click());
 expect(node.querySelector('[data-swap-pair="USDC:USOL"]')?.getAttribute("data-reserve")).toBe("1");
 expect(node.querySelector('input[aria-label="SOL withdrawal amount"]')).toBeNull();
 await act(async () => button("Simulate approved swap").click());
 expect(node.querySelector("[data-swap-pair]")).toBeNull();
 expect(node.textContent).toContain("Swap submitted. Check your updated balance.");
 expect(state.send).not.toHaveBeenCalled(); expect(state.assetSend).not.toHaveBeenCalled();
 await act(async () => root.unmount()); node.remove(); client.clear(); state.usdc = "0";
});

it("silently retries a transient activation lookup and blocks withdrawal until it succeeds", async () => {
 vi.useFakeTimers(); state.feeFailures = 1; state.feeCalls = 0;
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 try {
  await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(NativeWithdrawForm, { onBack: vi.fn() }))));
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  const button = (text: string) => [...node.querySelectorAll("button")].find(b => b.textContent === text)!;
  await act(async () => button("Max").click());
  expect(state.feeCalls).toBe(1);
  expect(node.textContent).not.toContain("Activation fee unavailable");
  expect(button("Review withdrawal").disabled).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(2200); });
  expect(state.feeCalls).toBeGreaterThanOrEqual(2);
  expect(button("Review withdrawal").disabled).toBe(false);
 } finally {
  await act(async () => root.unmount()); node.remove(); client.clear(); vi.useRealTimers(); state.feeFailures = 0;
 }
});
