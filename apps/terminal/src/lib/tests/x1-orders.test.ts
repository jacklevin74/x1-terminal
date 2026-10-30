import { beforeEach, expect, it, vi } from "vitest";
import { useExchange } from "@hypeterminal/hl-react/hooks/useExchange";
const state = vi.hoisted(() => ({
 builder: { b: `0x${"ab".repeat(20)}`, f: 50 },
 order: vi.fn(async (_params: unknown) => ({ status: "ok" })),
 approve: vi.fn(async (_params: unknown) => ({ status: "ok" })),
}));
vi.mock("@tanstack/react-query", () => ({
 useMutation: (options: { mutationFn: unknown }) => ({ mutateAsync: options.mutationFn }),
}));
vi.mock("@hypeterminal/hl-react/provider", () => ({
 useHyperliquid: () => ({ builderConfig: state.builder, clientKey: "test" }),
}));
vi.mock("@hypeterminal/hl-react/hooks/useClients", () => ({
 useHyperliquidClients: () => ({ trading: { order: state.order }, user: { approveBuilderFee: state.approve } }),
}));
beforeEach(() => { state.builder = { b: `0x${"ab".repeat(20)}`, f: 50 }; state.order.mockClear(); state.approve.mockClear(); });
it("attaches the operator's builder and fee to orders, overriding caller input", async () => {
 const order = useExchange("order");
 await order.mutateAsync({ orders: [], grouping: "na", builder: { b: `0x${"cd".repeat(20)}`, f: 1 } });
 expect(state.order).toHaveBeenCalledWith({ orders: [], grouping: "na", builder: state.builder });
});
it("blocks orders and approvals if the builder is unconfigured", () => {
 state.builder.b = `0x${"0".repeat(40)}`;
 expect(() => useExchange("order").mutateAsync({ orders: [], grouping: "na" })).toThrow("VITE_BUILDER_ADDRESS");
 expect(() => useExchange("approveBuilderFee").mutateAsync({ builder: state.builder.b as `0x${string}`, maxFeeRate: "0.05%" })).toThrow("VITE_BUILDER_ADDRESS");
 expect(state.order).not.toHaveBeenCalled();
 expect(state.approve).not.toHaveBeenCalled();
});
