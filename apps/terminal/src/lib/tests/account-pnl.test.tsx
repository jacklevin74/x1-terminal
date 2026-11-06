// @vitest-environment jsdom
import {act,createElement,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {beforeEach,expect,it,vi} from "vitest";
import {AccountPanel} from "@/components/trade/tradebox/account-panel";
import {MobileAccountView} from "@/components/trade/mobile/mobile-account-view";
const state=vi.hoisted(()=>({native:"-8.103336",builder:"20.83139"}));
vi.mock("wagmi",()=>({useConnection:()=>({isConnected:true,address:`0x${"ab".repeat(20)}`}),useDisconnect:()=>({mutate:vi.fn()})}));
vi.mock("@lingui/core/macro",()=>({t:(s:TemplateStringsArray)=>s.join("")}));
vi.mock("@/stores/use-global-settings-store",()=>({getResolvedFormatLocale:()=>"en-US"}));
vi.mock("@/stores/use-global-modal-store",()=>({useDepositModalActions:()=>({open:vi.fn()})}));
vi.mock("@/hooks/ui/use-copy-to-clipboard",()=>({useCopyToClipboard:()=>({copy:vi.fn(),copied:false})}));
vi.mock("@/components/trade/components/wallet-modal",()=>({WalletModal:()=>null}));
vi.mock("@hypeterminal/ui",()=>({Button:({children}:{children:ReactNode})=>createElement("button",null,children),ButtonIcon:()=>null,Badge:({children}:{children:ReactNode})=>children}));
vi.mock("boneyard-js/react",()=>({Skeleton:({children}:{children:ReactNode})=>children}));
vi.mock("@/lib/hyperliquid",()=>({useInfo:()=>({data:undefined}),useSubscription:(method:string)=>{
 const summary={accountValue:"218.063997",totalNtlPos:"1105.760757",totalRawUsd:"-391.600504",totalMarginUsed:"221.15215"};
 const data=method==="allDexsClearinghouseState"?{clearinghouseStates:[["",{marginSummary:summary,crossMarginSummary:summary,assetPositions:[{position:{szi:"1",unrealizedPnl:state.native}}],withdrawable:"0",crossMaintenanceMarginUsed:"43.148251"}],["xyz",{assetPositions:[{position:{szi:"-1",unrealizedPnl:state.builder}}]}]]}:method==="spotState"?{spotState:{balances:[]}}:{userState:{abstraction:"unifiedAccount"}};
 return {data,status:"active"};
}}));
beforeEach(()=>{state.native="-8.103336";state.builder="20.83139";});
it("shows the combined account PNL on desktop and updates when the builder venue changes",async()=>{
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(AccountPanel)));
 const pnl=()=>[...node.querySelectorAll('[data-slot="info-row"]')].find(el=>el.querySelector('[data-slot="info-row-label"]')?.textContent==="Unrealized PNL")!.querySelector('[data-slot="info-row-value"]')!.textContent;
 expect(pnl()).toBe("$12.73");state.builder="5";await act(async()=>root.render(createElement(AccountPanel)));expect(pnl()).toBe("-$3.10");
 state.builder="invalid";await act(async()=>root.render(createElement(AccountPanel)));expect(pnl()).not.toContain("8.10");expect(pnl()).not.toContain("0.00");await act(async()=>root.unmount());
});
it("uses the same combined PNL on mobile",async()=>{
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(MobileAccountView)));expect(node.textContent).toContain("+$12.73");expect(node.textContent).not.toContain("-$8.10");await act(async()=>root.unmount());
});
