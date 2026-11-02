// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { useExchange } from "@hypeterminal/hl-react/hooks/useExchange";
const state=vi.hoisted(()=>({trading:null as null|{order:ReturnType<typeof vi.fn>}}));
vi.mock("@tanstack/react-query",()=>({useMutation:(options:unknown)=>options}));
vi.mock("@hypeterminal/hl-react/provider",()=>({useHyperliquid:()=>({builderConfig:{b:`0x${"ab".repeat(20)}`,f:5},clientKey:"test"})}));
vi.mock("@hypeterminal/hl-react/hooks/useClients",()=>({useHyperliquidClients:()=>({trading:state.trading,user:null})}));
it("opens approval rather than sending a trade without a signer",()=>{
 state.trading=null;const show=vi.fn();window.addEventListener("x1:setup",show);
 try {const mutation=useExchange("order") as unknown as {mutationFn:(p:unknown)=>unknown};expect(()=>mutation.mutationFn({orders:[]})).toThrow("Trading approval required");expect(show).toHaveBeenCalledTimes(1);}finally{window.removeEventListener("x1:setup",show);}
});
it("uses the approved signer directly without asking again",async()=>{
 const order=vi.fn().mockResolvedValue({status:"ok"});state.trading={order};const show=vi.fn();window.addEventListener("x1:setup",show);
 try{const mutation=useExchange("order") as unknown as {mutationFn:(p:unknown)=>unknown};await mutation.mutationFn({orders:[]});expect(order).toHaveBeenCalledTimes(1);expect(show).not.toHaveBeenCalled();}finally{window.removeEventListener("x1:setup",show);}
});
