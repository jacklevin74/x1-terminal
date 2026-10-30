// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { EthDeposit } from "@/components/trade/tradebox/deposit/eth-deposit";
const state = vi.hoisted(() => ({ address: `0x${"ab".repeat(20)}`, testnet: false, send: vi.fn(), fetchAddress: vi.fn(async (recipient: string) => recipient === `0x${"ab".repeat(20)}` ? `0x${"cd".repeat(20)}` : `0x${"ef".repeat(20)}`) }));
vi.mock("wagmi", () => ({
 useConnection: () => ({ address: state.address, connector: { id: "x1" }, chainId: 1 }),
 useSendTransaction: () => ({ mutateAsync: state.send, isPending: false }),
 useSwitchChain: () => ({ mutateAsync: vi.fn(), isPending: false }),
 useWaitForTransactionReceipt: () => ({}),
}));
vi.mock("@/stores/use-global-settings-store", () => ({ useIsTestnet: () => state.testnet }));
vi.mock("@/lib/unit/eth-deposit", () => ({ fetchEthDepositAddress: (recipient: string) => state.fetchAddress(recipient), fetchEthDepositFees: async () => ({ fee: 0.0005, eta: "3m" }), MIN_ETH_DEPOSIT: "0.007", parseEthDepositAmount: vi.fn() }));
vi.mock("qrcode", () => ({ default: { toDataURL: async () => "data:image/png;base64," } }));
vi.mock("@hypeterminal/ui", () => ({
 Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => createElement("button", { onClick }, children),
 TextInput: () => createElement("input"),
}));
afterEach(() => { state.testnet = false; state.address = `0x${"ab".repeat(20)}`; state.send.mockClear(); state.fetchAddress.mockClear(); });
it("clears the previous account's deposit address when the connected account changes", async () => {
 const node = document.createElement("div"); document.body.append(node);
 const root = createRoot(node); const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 const render = () => root.render(createElement(QueryClientProvider, { client }, createElement(EthDeposit)));
 await act(async () => render());
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
 expect(node.textContent).toContain(`0x${"cd".repeat(20)}`);
 expect(node.textContent).toContain("spot balance");
 expect(node.querySelector("img")).toBeNull();
 state.address = `0x${"12".repeat(20)}`;
 await act(async () => render());
 expect(node.textContent).not.toContain(`0x${"cd".repeat(20)}`);
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
 expect(node.textContent).toContain(`0x${"ef".repeat(20)}`);
 expect(state.send).not.toHaveBeenCalled();
 await act(async () => root.unmount()); node.remove(); client.clear();
});
it("does not generate mainnet addresses in testnet mode", async () => {
 state.testnet = true;
 const node = document.createElement("div"); const root = createRoot(node);
 await act(async () => root.render(createElement(EthDeposit)));
 expect(node.textContent).toContain("Switch the terminal to mainnet");
 expect(state.fetchAddress).not.toHaveBeenCalled();
 await act(async () => root.unmount());
});
