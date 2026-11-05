// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {createWalletClient,custom} from "viem";
import {mainnet} from "viem/chains";
beforeEach(()=>{vi.resetModules();vi.stubGlobal("window",new EventTarget());});
afterEach(()=>vi.unstubAllGlobals());
const provider=()=>({isRabby:true,request:vi.fn()});
it("selects Rabby from multiple injected wallets without requesting accounts",async()=>{
 const rabby=provider(),other={request:vi.fn()};Object.assign(window,{ethereum:{...other,providers:[other,rabby]}});
 const {getRabbyProvider}=await import("@/lib/wallet/rabby-provider");expect(getRabbyProvider()).toBe(rabby);expect(rabby.request).not.toHaveBeenCalled();expect(other.request).not.toHaveBeenCalled();
});
it("discovers Rabby using EIP-6963 even when another wallet owns window.ethereum",async()=>{
 const rabby=provider();Object.assign(window,{ethereum:{request:vi.fn()}});
 window.addEventListener("eip6963:requestProvider",()=>window.dispatchEvent(new CustomEvent("eip6963:announceProvider",{detail:{info:{rdns:"io.rabby"},provider:rabby}})));
 const {getRabbyProvider}=await import("@/lib/wallet/rabby-provider");expect(getRabbyProvider()).toBe(rabby);
});
it("ignores other wallets and discovers late Rabby announcements",async()=>{
 const {getRabbyProvider}=await import("@/lib/wallet/rabby-provider");expect(getRabbyProvider()).toBeUndefined();
 window.dispatchEvent(new CustomEvent("eip6963:announceProvider",{detail:{info:{rdns:"io.other"},provider:provider()}}));expect(getRabbyProvider()).toBeUndefined();
 const rabby=provider();window.dispatchEvent(new CustomEvent("eip6963:announceProvider",{detail:{info:{rdns:"io.rabby"},provider:rabby}}));expect(getRabbyProvider()).toBe(rabby);
});
it("forwards EIP-712 v4 signing to Rabby for the selected hardware account",async()=>{
 const rabby=provider();const signature=`0x${"11".repeat(65)}`;rabby.request.mockResolvedValue(signature);Object.assign(window,{ethereum:rabby});
 const {getRabbyProvider}=await import("@/lib/wallet/rabby-provider");
 const account=`0x${"ab".repeat(20)}` as const;
 const client=createWalletClient({account,chain:mainnet,transport:custom(getRabbyProvider()!)});
 const result=await client.signTypedData({domain:{name:"HyperliquidSignTransaction",version:"1",chainId:1},types:{Test:[{name:"message",type:"string"}]},primaryType:"Test",message:{message:"Hardware signing test"}});
 expect(result).toBe(signature);const call=rabby.request.mock.calls[0][0];expect(call.method).toBe("eth_signTypedData_v4");expect(call.params[0].toLowerCase()).toBe(account);expect(JSON.parse(call.params[1]).message.message).toBe("Hardware signing test");
});
