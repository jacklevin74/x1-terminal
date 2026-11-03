import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { privateKeyToAccount } from "viem/accounts";
import { isAddress } from "viem";
export const X1_BUILDER={b:"0x95e1642b6c06e06e6ad9412a90e908dcb09f6c1a",f:50};
export function createX1AgentClient({ownerAddress,privateKey,network="mainnet",clients}={}){
 if(!isAddress(ownerAddress)||!/^0x[\da-f]{64}$/i.test(privateKey??""))throw new Error("Set X1_ACCOUNT_ADDRESS and X1_AGENT_PRIVATE_KEY in your private .env.agent file.");
 if(!["mainnet","testnet"].includes(network))throw new Error("X1_NETWORK must be mainnet or testnet.");
 const account=privateKeyToAccount(privateKey);
 if(account.address.toLowerCase()===ownerAddress.toLowerCase())throw new Error("Use a separate trading-only agent key, not your account private key.");
 const transport=new HttpTransport({isTestnet:network==="testnet"});
 const info=clients?.info??new InfoClient({transport});
 const exchange=clients?.exchange??new ExchangeClient({transport,wallet:account,isTestnet:network==="testnet"});
 async function status(){
  const [agents,maxFee,perps,spot,orders]=await Promise.all([info.extraAgents({user:ownerAddress}),info.maxBuilderFee({user:ownerAddress,builder:X1_BUILDER.b}),info.clearinghouseState({user:ownerAddress}),info.spotClearinghouseState({user:ownerAddress}),info.frontendOpenOrders({user:ownerAddress})]);
  const agent=agents.find(a=>a.address.toLowerCase()===account.address.toLowerCase());
  return {owner:ownerAddress,agent:account.address,network,agentApproved:!!agent&&agent.validUntil>Date.now(),validUntil:agent?.validUntil??null,builderFeeApproved:maxFee>=X1_BUILDER.f,builderFeePercent:"0.05%",builder:X1_BUILDER,approvedMaxBuilderFeeUnits:maxFee,perps,spot,orders};
 }
 async function assertApproved(requireFee){
  const [agents,maxFee]=await Promise.all([info.extraAgents({user:ownerAddress}),requireFee?info.maxBuilderFee({user:ownerAddress,builder:X1_BUILDER.b}):Promise.resolve(0)]);
  if(!agents.some(a=>a.address.toLowerCase()===account.address.toLowerCase()&&a.validUntil>Date.now()))throw new Error("Agent is not authorized or has expired. Authorize a fresh API key on the terminal's /API page.");
  if(requireFee&&maxFee<X1_BUILDER.f)throw new Error("Approve X1's 0.05% builder fee with the owner wallet on /API first.");
 }
 async function order(input,{execute=false}={}){
  if(!Array.isArray(input?.orders)||!input.orders.length||!["na","normalTpsl","positionTpsl"].includes(input.grouping??"na"))throw new Error("Provide orders and a valid grouping in the request JSON.");
  if(input.vaultAddress||input.subAccountAddress)throw new Error("This client supports the configured owner account only.");
  const request={orders:input.orders,grouping:input.grouping??"na",builder:X1_BUILDER};
  await assertApproved(true);
  if(!execute)return {dryRun:true,owner:ownerAddress,agent:account.address,network,request};
  const result=await exchange.order(request);checkStatuses(result);return result;
 }
 async function cancel(input,{execute=false}={}){
  if(!Array.isArray(input?.cancels)||!input.cancels.length)throw new Error("Provide cancels: [{a: assetId, o: orderId}] in the request JSON.");
  await assertApproved(false);const request={cancels:input.cancels};
  if(!execute)return {dryRun:true,owner:ownerAddress,agent:account.address,network,request};
  const result=await exchange.cancel(request);checkStatuses(result);return result;
 }
 return {owner:ownerAddress,agent:account.address,status,order,cancel};
}
function checkStatuses(result){
 if(result.status!=="ok")throw new Error("Exchange rejected the request.");
 const statuses=result.response?.data?.statuses;
 if(!Array.isArray(statuses)||!statuses.length)throw new Error("Exchange did not confirm the request. Check current orders before retrying.");
 const errors=statuses.filter(s=>s&&typeof s==="object"&&s.error).map(s=>s.error);
 if(errors.length)throw new Error(`${errors.join("; ")} Some requests may have completed; check current orders before retrying.`);
}
