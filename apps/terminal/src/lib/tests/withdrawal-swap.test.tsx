// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { SpotSwapModalContent } from "@/components/trade/components/spot-swap-modal";
const state = vi.hoisted(() => ({ submit: vi.fn(async () => ({ ok: true })), markets: null as unknown[]|null }));
vi.mock("@lingui/core/macro", () => ({ t: (strings: TemplateStringsArray, ...values: unknown[]) => strings.reduce((s, part, i) => s + part + (values[i] ?? ""), "") }));
vi.mock("@lingui/react/macro", () => ({ Trans: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/lib/hyperliquid/hooks/useMarketsInfo", () => ({ useMarketsInfo: () => ({ spotMarkets: state.markets??[{ kind: "spot", name: "@1", pairName: "SOL/USDC", assetId: 10001, markPx: "100", szDecimals: 3, tokensInfo: [{ name: "USOL", displayName: "SOL" }, { name: "USDC", displayName: "USDC" }] }] }) }));
vi.mock("@/hooks/trade/use-account-balances", () => ({ useDefaultDexBalances: () => ({ spotBalances: [{ coin: "USDC", total: "100", hold: "0" }], spotAvailableAfterMaintenance: [] }) }));
vi.mock("@/hooks/trade/use-submit-plan", () => ({ useSubmitPlan: () => ({ submitPlan: state.submit, isSubmitting: false }) }));
vi.mock("@/stores/use-global-settings-store", () => ({ getResolvedFormatLocale: () => "en-US" }));
vi.mock("@/components/trade/components/asset-display", () => ({ AssetDisplay: ({ coin }: { coin: string }) => createElement("span", null, coin) }));
vi.mock("@/components/trade/components/token-selector-dropdown", () => ({ TokenSelectorDropdown: ({ disabled, selectedToken, tokens, onSelect }: { disabled: boolean; selectedToken: string; tokens:{name:string}[];onSelect:(name:string)=>void }) => createElement("button", { disabled, "data-token-selector": true, onClick:()=>{const eth=tokens.find(t=>t.name==="UETH");if(eth)onSelect(eth.name);} }, selectedToken) }));
vi.mock("@/components/trade/components/trading-action-button", () => ({ TradingActionButton: ({ children, ...props }: { children: ReactNode }) => createElement("button", props, children) }));
vi.mock("@/components/ui/number-input", () => ({ NumberInput: (props: object) => createElement("input", props) }));
vi.mock("@hypeterminal/ui", () => {
 const Wrap = ({ children }: { children: ReactNode }) => createElement("div", null, children);
 return { Modal: ({ children }: { children: ReactNode }) => createElement("div", { "data-modal-shell": true }, children), ModalContent: Wrap, ModalDescription: Wrap, ModalHeader: Wrap, ModalPopup: Wrap, ModalTitle: Wrap, Button: ({ children, ...props }: { children: ReactNode }) => createElement("button", props, children) };
});
it("locks the requested pair, reserves quote gas at max slippage, and submits only on approval", async () => {
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node); const submitted = vi.fn(); const close = vi.fn();
 await act(async () => root.render(createElement(SpotSwapModalContent, { initialFromToken: "USDC", initialToToken: "USOL", fixedPair: true, reserveFromBalance: 1, onSubmitted: submitted, onClose: close })));
 expect(state.submit).not.toHaveBeenCalled();
 expect([...node.querySelectorAll<HTMLButtonElement>('[data-token-selector]')].every(b => b.disabled)).toBe(true);
 expect(node.querySelector<HTMLButtonElement>('button[aria-label="Swap direction"]')!.disabled).toBe(true);
 await act(async () => [...node.querySelectorAll("button")].find(b => b.textContent === "Max")!.click());
 const budget = Number(node.querySelector<HTMLInputElement>("input")!.value);
 expect(budget * 1.01).toBeCloseTo(99);
 await act(async () => [...node.querySelectorAll("button")].find(b => b.textContent === "Swap")!.click());
 expect(state.submit).toHaveBeenCalledOnce();
 const plan = (state.submit.mock.calls as unknown as [{ orders: { p: string; s: string }[] }][])[0][0];
 expect(Number(plan.orders[0].p) * Number(plan.orders[0].s)).toBeLessThanOrEqual(99);
 expect(submitted).toHaveBeenCalledOnce(); expect(close).not.toHaveBeenCalled();
 await act(async () => root.unmount()); node.remove();
});

it("renders the consolidated swap step without creating a second modal", async () => {
 state.submit.mockClear();
 const node = document.createElement("div"); const root = createRoot(node); const close = vi.fn();
 await act(async () => root.render(createElement(SpotSwapModalContent, { embedded: true, initialFromToken: "USDC", initialToToken: "USOL", fixedPair: true, reserveFromBalance: 1, onClose: close })));
 expect(node.querySelector("[data-modal-shell]")).toBeNull();
 expect(node.querySelector('input[aria-label="Swap amount"]')).not.toBeNull();
 expect(node.textContent).toContain("Estimated receive");
 expect(node.textContent).not.toContain("Select tokens to swap");
 await act(async () => [...node.querySelectorAll("button")].find(b => b.textContent === "Back to withdrawal")!.click());
 expect(close).toHaveBeenCalledOnce(); expect(state.submit).not.toHaveBeenCalled();
 await act(async () => root.unmount());
});

it("fills half the spendable balance and clears the amount when reversing direction", async () => {
 state.submit.mockClear();
 const node = document.createElement("div"); const root = createRoot(node);
 await act(async () => root.render(createElement(SpotSwapModalContent, { initialFromToken: "USDC", initialToToken: "USOL", onClose: vi.fn() })));
 expect(node.textContent).toContain("You pay"); expect(node.textContent).toContain("You receive");
 expect(node.querySelector("details summary")?.textContent).toContain("1% slippage");
 expect(node.textContent).toContain("Enter an amount");
 await act(async () => [...node.querySelectorAll("button")].find(b => b.textContent === "Half")!.click());
 expect(node.querySelector<HTMLInputElement>('input[aria-label="Swap amount"]')!.value).toBe("50");
 expect(node.querySelector('[aria-label="Estimated receive"]')?.textContent).toContain("0.5");
 expect(state.submit).not.toHaveBeenCalled();
 await act(async () => node.querySelector<HTMLButtonElement>('button[aria-label="Swap direction"]')!.click());
 expect(node.querySelector<HTMLInputElement>('input[aria-label="Swap amount"]')!.value).toBe("");
 expect(node.querySelector('[data-token-selector]')?.textContent).toBe("USOL");
 expect(state.submit).not.toHaveBeenCalled();
 await act(async () => root.unmount());
});

it("defaults USDC to SOL after metadata loads, permits ETH, and flips ETH back to USDC",async()=>{
 state.submit.mockClear();state.markets=[];const node=document.createElement("div"),root=createRoot(node);
 const props={initialFromToken:"USDC",onClose:vi.fn()};
 try{
  await act(async()=>root.render(createElement(SpotSwapModalContent,props)));
  const market=(name:string,displayName:string)=>({kind:"spot",name:`@${name}`,assetId:10001,markPx:"100",szDecimals:3,tokensInfo:[{name,displayName},{name:"USDC",displayName:"USDC"}]});
  state.markets=[market("AAPL","AAPL"),market("UETH","ETH"),market("USOL","SOL")];
  await act(async()=>root.render(createElement(SpotSwapModalContent,props)));
  expect(node.querySelectorAll('[data-token-selector]')[0]?.textContent).toBe("USDC");expect(node.querySelectorAll('[data-token-selector]')[1]?.textContent).toBe("USOL");
  await act(async()=>node.querySelectorAll<HTMLButtonElement>('[data-token-selector]')[1].click());expect(node.querySelectorAll('[data-token-selector]')[1]?.textContent).toBe("UETH");
  await act(async()=>node.querySelector<HTMLButtonElement>('[aria-label="Swap direction"]')!.click());
  expect(node.querySelectorAll('[data-token-selector]')[0]?.textContent).toBe("UETH");expect(node.querySelectorAll('[data-token-selector]')[1]?.textContent).toBe("USDC");expect(state.submit).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());state.markets=null;}
});
