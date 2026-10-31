// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { BalancesTab } from "@/components/trade/positions/balances-tab";
vi.mock("@lingui/core/macro", () => ({ t: (strings: TemplateStringsArray, ...values: unknown[]) => strings.reduce((s, part, i) => s + part + (values[i] ?? ""), "") }));
vi.mock("wagmi", () => ({ useConnection: () => ({ isConnected: true }) }));
vi.mock("@/hooks/trade/use-account-balances", () => ({ useDefaultDexBalances: () => ({ perpSummary: null, spotBalances: [{ coin: "USDC", total: "5", hold: "0", entryNtl: "5", token: 0 }, { coin: "HYPE", total: "2", hold: "0.5", entryNtl: "10", token: 1 }], spotAvailableAfterMaintenance: [], accountAbstraction: "disabled", isLoading: false, hasError: false }) }));
vi.mock("@/lib/hyperliquid", () => ({ useSubscription: () => ({ data: { mids: { HYPE: "6" } } }) }));
vi.mock("@/lib/hyperliquid/markets/use-spot-tokens", () => ({ useSpotTokens: () => ({ getToken: (coin: string) => ({ displayName: coin, weiDecimals: 8, szDecimals: 3, evmContract: coin === "HYPE" ? { address: `0x${"ab".repeat(20)}` } : null }) }) }));
vi.mock("@/stores/use-global-modal-store", () => ({ useSwapModalActions: () => ({ open: vi.fn() }) }));
vi.mock("@/stores/use-global-settings-store", () => ({ getResolvedFormatLocale: () => "en-US", useHideSmallBalances: () => false, useGlobalSettingsActions: () => ({ setHideSmallBalances: vi.fn() }) }));
vi.mock("@/components/trade/components/asset-display", () => ({ AssetDisplay: ({ coin }: { coin: string }) => createElement("span", null, coin) }));
vi.mock("@/components/trade/tradebox/deposit/native-withdraw-modal", () => ({ NativeWithdrawModal: ({ initialAsset }: { initialAsset: string }) => createElement("div", { role: "dialog" }, `Withdraw ${initialAsset}`) }));
vi.mock("@/components/trade/positions/transfer-modal", () => ({ TransferModal: () => null }));
vi.mock("@/components/ui/scroll-area", () => ({ ScrollArea: ({ children }: { children: ReactNode }) => createElement("div", null, children), ScrollBar: () => null }));
vi.mock("@hypeterminal/ui", () => {
 const tag = (name: string) => ({ children, ...props }: { children: ReactNode }) => createElement(name, props, children);
 return { Table: tag("table"), TableBody: tag("tbody"), TableHeader: tag("thead"), TableRow: tag("tr"), TableHead: tag("th"), TableCell: tag("td"), Checkbox: () => createElement("input", { type: "checkbox" }) };
});
it("shows totals before available units, sorts values, filters assets and links token contracts", async () => {
 const node = document.createElement("div"); const root = createRoot(node);
 await act(async () => root.render(createElement(BalancesTab)));
 expect([...node.querySelectorAll("th")].map(n => n.textContent?.replace(/[⌄⌃]/g, ""))).toEqual(["Asset", "Total Balance", "Available Balance", "USDC Value", "PNL (ROE %)", "Withdraw", "Transfer", "Contract", "Swap"]);
 const cells = node.querySelectorAll("tbody tr:first-child td");
 expect(cells[0].textContent).toBe("HYPE"); expect(cells[1].textContent).toBe("2 HYPE"); expect(cells[2].textContent).toBe("1.5 HYPE");
 expect(node.querySelector('a[title]')?.getAttribute('href')).toContain(`/address/0x${"ab".repeat(20)}`);
 await act(async () => node.querySelector<HTMLButtonElement>("th button")!.click());
 expect(node.querySelector("tbody tr td")?.textContent).toBe("USDC");
 await act(async () => { const select = node.querySelector<HTMLSelectElement>("select")!; select.value = "HYPE"; select.dispatchEvent(new Event("change", { bubbles: true })); });
 expect(node.querySelectorAll("tbody tr")).toHaveLength(1);
 await act(async () => [...node.querySelectorAll("button")].find(button => button.textContent === "Withdraw")!.click());
 expect(node.querySelector('[role="dialog"]')?.textContent).toBe("Withdraw SOL");
 await act(async () => root.unmount());
});
