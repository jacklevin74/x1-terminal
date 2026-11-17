import {expect,it,vi} from "vitest";
import {createWalletClient,custom,type TypedDataDefinition} from "viem";
import {generatePrivateKey,privateKeyToAccount} from "viem/accounts";
import {ExchangeClient,type HttpTransport} from "@nktkas/hyperliquid";
import {toHyperliquidWallet} from "../../../../../packages/hl-react/src/wallet";
import {subaccountActionError} from "@/lib/trade/subaccounts";
function fixture(reject=false){
 const owner=privateKeyToAccount(generatePrivateKey()),sub=`0x${"cd".repeat(20)}` as const;
 const signing=vi.fn(async({method,params}:{method:string;params?:readonly unknown[]})=>{
  if(method==="eth_chainId")return "0x1";
  if(method==="eth_accounts")return [owner.address];
  if(method!=="eth_signTypedData_v4")throw Error("Unexpected RPC method");
  expect(String(params?.[0]).toLowerCase()).toBe(owner.address.toLowerCase());
  if(reject)throw Object.assign(new Error("Ledger device is locked"),{code:4100});
  return owner.signTypedData(JSON.parse(String(params?.[1])) as TypedDataDefinition);
 });
 const transport={isTestnet:false,request:vi.fn(async()=>({status:"ok",response:{type:"default"}}))};
 const wallet=createWalletClient({account:owner.address,transport:custom({request:signing})});
 return {client:new ExchangeClient({wallet:toHyperliquidWallet(wallet,owner.address)!,transport:transport as unknown as HttpTransport}),signing,transport,sub};
}
it("signs SDK subaccount and spot transfer actions using the owner RPC wallet",async()=>{
 const {client,signing,transport,sub}=fixture();
 await client.subAccountModify({subAccountUser:sub,name:"Renamed"});
 await client.subAccountTransfer({subAccountUser:sub,isDeposit:true,usd:12345678});
 await client.sendAsset({destination:sub,sourceDex:"spot",destinationDex:"spot",fromSubAccount:"",token:"USDC:0x6d1e7cde53ba9467b783cb7c530ce054",amount:"12.345678"});
 expect(transport.request).toHaveBeenCalledTimes(3);
 const calls=signing.mock.calls.filter(([r])=>r.method==="eth_signTypedData_v4");expect(calls).toHaveLength(3);
 const typed=calls.map(([r])=>JSON.parse(String(r.params?.[1])));
 expect(typed[0].domain.name).toBe("Exchange");expect(Number(typed[0].domain.chainId)).toBe(1337);
 expect(typed[2].domain.name).toBe("HyperliquidSignTransaction");
});
it("preserves the provider error and sends nothing on signing failure",async()=>{
 const {client,transport,sub}=fixture(true);let error:unknown;
 try{await client.subAccountTransfer({subAccountUser:sub,isDeposit:true,usd:1000000});}catch(e){error=e;}
 expect(subaccountActionError(error)).toContain("Ledger device is locked");expect(subaccountActionError(error)).toContain("No action was submitted");expect(transport.request).not.toHaveBeenCalled();
});

it("creates and renames through the local trading agent without requesting owner RPC signing",async()=>{
 const agent=privateKeyToAccount(generatePrivateKey());
 const request=vi.fn(async()=>({status:"ok",response:{type:"createSubAccount",data:`0x${"cd".repeat(20)}`}}));
 const client=new ExchangeClient({wallet:agent,transport:{isTestnet:false,request} as unknown as HttpTransport});
 await client.createSubAccount({name:"Strategy"});await client.subAccountModify({subAccountUser:`0x${"cd".repeat(20)}`,name:"Renamed"});
 expect(request).toHaveBeenCalledTimes(2);
});
