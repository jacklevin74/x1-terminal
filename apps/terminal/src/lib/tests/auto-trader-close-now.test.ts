import {it,expect,vi} from "vitest";
import type {InfoClient} from "@nktkas/hyperliquid";
import {closeNow} from "@/lib/auto-trader/close-now";
const master=`0x${"ab".repeat(20)}` as const;
function fixture(){
 let reads=0;
 const info={perpDexs:async()=>[null,{name:"xyz"}],meta:async({dex}:{dex:string})=>({universe:[{name:dex?"xyz:MU":"BTC",szDecimals:3}]}),allMids:async()=>({BTC:"100","xyz:MU":"100"}),clearinghouseState:vi.fn(async({dex}:{dex:string})=>({assetPositions:reads++<2?[{position:{coin:dex?"xyz:MU":"BTC",szi:dex?"-1":"1"}}]:[]}))};
 const submit=vi.fn().mockResolvedValue({ok:true,outcome:"filled"});return {info:info as unknown as InfoClient,submit};
}
it("closes both native and builder venues immediately with reduce-only orders and verifies positions",async()=>{
 const {info,submit}=fixture();expect(await closeNow({info,master,check:()=>{},submit})).toBe(2);
 const orders=submit.mock.calls.flatMap(([plan])=>plan.orders);expect(orders.map(o=>o.a)).toEqual([0,110000]);expect(orders.every(o=>o.r&&o.t.limit.tif==="Ioc")).toBe(true);expect(orders.map(o=>o.b)).toEqual([false,true]);
});
it("stops on exchange rejection without retrying subsequent positions",async()=>{
 const {info,submit}=fixture();submit.mockResolvedValue({ok:false,error:"rejected"});await expect(closeNow({info,master,check:()=>{},submit})).rejects.toThrow("remains paused");expect(submit).toHaveBeenCalledTimes(1);
});
it("sends no orders after an account change",async()=>{
 const {info,submit}=fixture();await expect(closeNow({info,master,check:()=>{throw Error("Wallet changed");},submit})).rejects.toThrow("Wallet changed");expect(submit).not.toHaveBeenCalled();
});
it("does not claim completion when residual positions remain",async()=>{
 const {info,submit}=fixture();vi.mocked(info.clearinghouseState).mockImplementation(async({dex})=>({assetPositions:[{position:{coin:dex?"xyz:MU":"BTC",szi:"1"}}]}) as never);
 await expect(closeNow({info,master,check:()=>{},submit})).rejects.toThrow("positions remain");
});
