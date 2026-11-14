// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { type UseDepositResult, useDeposit } from "@/lib/hyperliquid/use-deposit";

const state = vi.hoisted(() => ({ testnet: true, write: vi.fn() }));
vi.mock("@lingui/core/macro", () => ({
	t: (strings: TemplateStringsArray, ...values: unknown[]) =>
		strings.reduce((out, part, i) => out + part + (values[i] ?? ""), ""),
}));
vi.mock("@/lib/network", () => ({ isTestnet: () => state.testnet }));
vi.mock("wagmi", () => ({
	useChainId: () => 42161,
	useConnection: () => ({ address: `0x${"cd".repeat(20)}` }),
	useReadContract: () => ({ data: 100_000_000n, refetch: vi.fn() }),
	useSwitchChain: () => ({ mutate: vi.fn(), isPending: false, error: null }),
	useWriteContract: () => ({ mutate: state.write, data: undefined, isPending: false, error: null, reset: vi.fn() }),
	useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false, error: null }),
}));

async function hook() {
	let result!: UseDepositResult;
	const Probe = () => {
		result = useDeposit();
		return null;
	};
	const root = createRoot(document.createElement("div"));
	await act(async () => root.render(createElement(Probe)));
	return { result, root };
}

it("blocks USDC deposits to the mainnet bridge while the terminal is on testnet", async () => {
	state.testnet = true;
	const { result, root } = await hook();
	expect(result.validate("10")).toEqual({
		valid: false,
		error: "USDC deposits use the mainnet bridge. Switch to mainnet to deposit.",
	});
	result.deposit("10");
	expect(state.write).not.toHaveBeenCalled();
	await act(async () => root.unmount());
});

it("still allows USDC deposits on mainnet", async () => {
	state.testnet = false;
	const { result, root } = await hook();
	expect(result.validate("10")).toEqual({ valid: true, error: null });
	result.deposit("10");
	expect(state.write).toHaveBeenCalledOnce();
	await act(async () => root.unmount());
});
