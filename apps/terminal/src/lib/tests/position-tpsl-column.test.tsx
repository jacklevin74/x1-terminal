// @vitest-environment jsdom
import {act,createElement,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {expect,it,vi} from "vitest";
import {PositionRow} from "@/components/trade/positions/position-row";
import type {Position} from "@/lib/hyperliquid";
import type {Markets} from "@/lib/hyperliquid/markets";
vi.mock("@/stores/use-global-settings-store",()=>({getResolvedFormatLocale:()=>"en-US"}));
vi.mock("@/components/trade/positions/position-pnl-share",()=>({PositionPnlShare:()=>null}));
vi.mock("@lingui/core/macro",()=>({t:(strings:TemplateStringsArray,...values:unknown[])=>strings.reduce((s,p,i)=>s+p+(values[i]??""),"")}));
vi.mock("@hypeterminal/ui",()=>({TableRow:({children}:{children:ReactNode})=>createElement("tr",null,children),TableCell:({children}:{children:ReactNode})=>createElement("td",null,children),Tooltip:({children}:{children:ReactNode})=>children}));
it("shows persistent TP/SL prices and opens the editor with current order IDs",async()=>{
 const open=vi.fn();const position={coin:"xyz:SILVER",szi:"2.75",entryPx:"49.329",unrealizedPnl:"1.83",returnOnEquity:"0.135",positionValue:"137.48",marginUsed:"13.75",liquidationPx:"45.3178",leverage:{type:"cross",value:10},cumFunding:{sinceOpen:"0.04"}} as Position;
 const markets={getMarket:()=>({assetId:110000,shortName:"SILVER",szDecimals:2})} as unknown as Markets;
 const props={position,markets,markPx:"49.987",tpSlInfo:{tpPrice:55,slPrice:47,tpOrderId:101,slOrderId:102},isRowClosing:false,onClose:vi.fn(),onLimitClose:vi.fn(),onReverse:vi.fn(),onOpenTpSl:open,onSelectMarket:vi.fn()};
 const node=document.createElement("table"),root=createRoot(node);const render=()=>root.render(createElement("tbody",null,createElement(PositionRow,props)));
 await act(async()=>render());expect(node.querySelectorAll("td")).toHaveLength(11);const button=node.querySelector<HTMLButtonElement>('[aria-label="Edit TP/SL for SILVER"]')!;expect(button.closest("td")?.textContent).toContain("55 / 47");expect(button.className).not.toContain("opacity-0");
 await act(async()=>button.click());expect(open).toHaveBeenCalledWith(expect.objectContaining({coin:"xyz:SILVER",existingTpOrderId:101,existingSlOrderId:102,existingTpPrice:55,existingSlPrice:47}));
 await act(async()=>root.unmount());
});
