// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { SolDeposit } from "@/components/trade/tradebox/deposit/sol-deposit";
const state = vi.hoisted(() => ({ address: `0x${"ab".repeat(20)}`, testnet: false, readBalance: vi.fn(async () => ({ address: "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS", lamports: 1_000_000_000n, feeLamports: 5000n, maxLamports: 999_990_000n })), send: vi.fn(), fetchAddress: vi.fn(async (recipient: string) => recipient === `0x${"ab".repeat(20)}` ? "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS" : "So11111111111111111111111111111111111111112") }));
vi.mock("wagmi", () => ({
 useConnection: () => ({ address: state.address, connector: { id: "x1" }, chainId: 1 }),
 useSendTransaction: () => ({ mutateAsync: state.send, isPending: false }),
 useSwitchChain: () => ({ mutateAsync: vi.fn(), isPending: false }),
 useWaitForTransactionReceipt: () => ({}),
}));
vi.mock("@/stores/use-global-settings-store", () => ({ useIsTestnet: () => state.testnet }));
vi.mock("@/lib/unit/sol-deposit", () => ({ fetchSolDepositAddress: (recipient: string) => state.fetchAddress(recipient), fetchSolDepositFees: async () => ({ fee: 0.0005, eta: "3m" }), MIN_SOL_DEPOSIT: "0.12", parseSolDepositAmount: vi.fn() }));
vi.mock("@/lib/solana/deposit-balance", () => ({ readSolDepositBalance: state.readBalance }));
vi.mock("@/lib/solana/phantom-deposit", () => ({ getPhantomSolana: () => undefined, sendSolDeposit: state.send }));
vi.mock("qrcode", () => ({ default: { toDataURL: async () => "data:image/png;base64," } }));
vi.mock("@hypeterminal/ui", () => ({
 Button: ({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) => createElement("button", { onClick, disabled }, children),
 TextInput: (props: Record<string, unknown>) => createElement("input", props),
}));
afterEach(() => { state.testnet = false; state.address = `0x${"ab".repeat(20)}`; state.send.mockClear(); state.fetchAddress.mockClear(); state.readBalance.mockClear(); });
it("clears the previous account's deposit address when the connected account changes", async () => {
 const node = document.createElement("div"); document.body.append(node);
 const root = createRoot(node); const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 const render = () => root.render(createElement(QueryClientProvider, { client }, createElement(SolDeposit)));
 await act(async () => render());
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
 expect(node.textContent).toContain("9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS");
 expect(node.textContent).toContain("spot balance");
 expect(node.querySelector("img")).toBeNull();
 state.address = `0x${"12".repeat(20)}`;
 await act(async () => render());
 expect(node.textContent).not.toContain("9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS");
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
 expect(node.textContent).toContain("So11111111111111111111111111111111111111112");
 expect(state.send).not.toHaveBeenCalled();
 await act(async () => root.unmount()); node.remove(); client.clear();
});
it("does not generate mainnet addresses in testnet mode", async () => {
 state.testnet = true;
 const node = document.createElement("div"); const root = createRoot(node);
 await act(async () => root.render(createElement(SolDeposit)));
 expect(node.textContent).toContain("Switch the terminal to mainnet");
 expect(state.fetchAddress).not.toHaveBeenCalled();
 await act(async () => root.unmount());
});

it("automatically loads X1 balance, then allows Max and Deposit", async () => {
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(SolDeposit))));
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
 const button = (text: string) => [...node.querySelectorAll("button")].find(b => b.textContent === text)!;
 expect(state.readBalance).toHaveBeenCalledOnce(); expect(state.send).not.toHaveBeenCalled();
 expect(node.textContent).toContain("Available: 1 SOL");
 expect(node.textContent).not.toContain("Read SOL balance");
 await act(async () => button("Max").click()); expect(node.querySelector("input")?.value).toBe("0.99999");
 await act(async () => button("Deposit").click());
 expect(state.send).toHaveBeenCalledWith("9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS", "0.99999", expect.any(Function), expect.any(Function), { kind: "x1", expectedAddress: "9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS" });
 await act(async () => root.unmount()); node.remove(); client.clear();
});
