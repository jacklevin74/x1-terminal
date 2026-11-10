import nacl from "tweetnacl";
import { hexToBytes, isAddress, keccak256, toBytes, type Address, type Hex } from "viem";
import { AUTO_TRADER_API, AUTO_TRADER_BUILDER, AUTO_TRADER_SIGNAL } from "@/config/auto-trader";
import type { AutoTraderAction, AutoTraderStatus, SealedAgentKey, Signal } from "./types";
export const AUTH_DOMAIN={name:"X1CopyBot",version:"1"} as const;
export const AUTH_TYPES={Request:[{name:"action",type:"string"},{name:"target",type:"address"},{name:"nonce",type:"string"},{name:"timestamp",type:"uint64"},{name:"bodyHash",type:"bytes32"}]} as const;
export type AuthRequest={account:Address;domain:typeof AUTH_DOMAIN;types:typeof AUTH_TYPES;primaryType:"Request";message:{action:AutoTraderAction;target:Address;nonce:string;timestamp:bigint;bodyHash:Hex}};
export type AuthSigner=(request:AuthRequest)=>Promise<Hex>;
type Context={master:Address;owner?:Address;sign:AuthSigner;assertAccount:()=>void;signal?:AbortSignal;fetcher?:typeof fetch;api?:string};
function endpoint(api:string,op:string,master?:Address){const url=new URL(api,typeof location!=="undefined"?location.origin:"https://localhost");const localProxy=typeof location!=="undefined"&&url.origin===location.origin&&["/api/copybot","/api/auto-trader-signal"].includes(url.pathname);if((url.protocol!=="https:"&&!(localProxy&&url.protocol==="http:"&&["127.0.0.1","localhost","[::1]"].includes(url.hostname)))||url.username||url.password)throw new Error("Auto Trader requires an HTTPS API endpoint.");url.searchParams.set("op",op);if(master)url.searchParams.set("addr",master);return url.href;}
async function json(url:string,options:RequestInit,fetcher=fetch){
 let response;try{response=await fetcher(url,{...options,cache:"no-store",redirect:"error",signal:options.signal??AbortSignal.timeout(20000)});}catch(cause){if(cause instanceof Error&&cause.name==="AbortError")throw cause;throw new Error("Auto Trader service is unavailable. No automatic retry was sent.");}
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(typeof data?.error==="string"?data.error.replace(/0x[\da-f]{64}/gi,"[redacted]").slice(0,300):`Auto Trader request failed (${response.status}).`);
 if(!data||typeof data!=="object")throw new Error("Invalid Auto Trader response.");return data;
}
export function base64Encode(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes));}
export function base64Decode(value:string){if(typeof value!=="string")throw new Error("Invalid sealing key.");try{return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}catch{throw new Error("Invalid sealing key.");}}
export function sealAgentKey(privateKey:Hex,serverPublicKey:string):SealedAgentKey{
 const publicKey=base64Decode(serverPublicKey);if(publicKey.length!==32)throw new Error("Invalid server sealing key.");
 const key=hexToBytes(privateKey);if(key.length!==32)throw new Error("Invalid agent key.");
 const ephemeral=nacl.box.keyPair(),nonce=nacl.randomBytes(24);
 try{return {epk:base64Encode(ephemeral.publicKey),nonce:base64Encode(nonce),ct:base64Encode(nacl.box(key,nonce,publicKey,ephemeral.secretKey))};}finally{key.fill(0);ephemeral.secretKey.fill(0);}
}
export async function getNonce({api=AUTO_TRADER_API,signal,fetcher=fetch}:{api?:string;signal?:AbortSignal;fetcher?:typeof fetch}={}){
 const n=await json(endpoint(api,"nonce"),{signal},fetcher);
 if(!/^[\da-f]{32}$/i.test(n.nonce)||n.domain?.name!==AUTH_DOMAIN.name||n.domain?.version!==AUTH_DOMAIN.version||Object.keys(n.domain??{}).length!==2||!Array.isArray(n.types?.Request)||n.types.Request.length!==AUTH_TYPES.Request.length||!AUTH_TYPES.Request.every((field,i)=>n.types.Request[i]?.name===field.name&&n.types.Request[i]?.type===field.type)||n.builder?.toLowerCase()!==AUTO_TRADER_BUILDER||n.minFee!==50||base64Decode(n.serverPubKey).length!==32)throw new Error("Auto Trader service configuration does not match this terminal.");
 return {nonce:n.nonce as string,serverPubKey:n.serverPubKey as string};
}
// Construct and hash the body exactly once. Registration seals inside this callback,
// after fetching the nonce/public key; raw private keys never enter mutation variables.
export async function signedCall(action:AutoTraderAction,body:object|((serverPublicKey:string)=>object),context:Context){
 if(!["register","settings","pause","resume","flatten","remove"].includes(action)||!isAddress(context.master)||context.owner!==undefined&&!isAddress(context.owner))throw new Error("Invalid Auto Trader action.");
 const {master,sign,assertAccount,signal,fetcher=fetch,api=AUTO_TRADER_API}=context;
 assertAccount();const n=await getNonce({api,signal,fetcher});assertAccount();
 const raw=JSON.stringify(typeof body==="function"?body(n.serverPubKey):body);
 if(new TextEncoder().encode(raw).length>32768)throw new Error("Auto Trader request is too large.");
 const timestamp=Date.now();const signature=await sign({account:context.owner??master,domain:AUTH_DOMAIN,types:AUTH_TYPES,primaryType:"Request",message:{action,target:master,nonce:n.nonce,timestamp:BigInt(timestamp),bodyHash:keccak256(toBytes(raw))}});assertAccount();
 let result;
 try{result=await json(endpoint(api,action,action==="register"?undefined:master),{method:"POST",headers:{"content-type":"application/json","x-auth":JSON.stringify({nonce:n.nonce,timestamp,signature})},body:raw,signal},fetcher);}
 catch(error){
  if(context.owner&&context.owner.toLowerCase()!==master.toLowerCase()&&error instanceof Error&&/signer is not the master account/i.test(error.message))throw new Error(`The Auto Trader API rejected your owner wallet’s signature for subaccount ${master}. The API must verify that this subaccount belongs to the signing owner. No retry or main-account fallback was sent.`);
  throw error;
 }
 assertAccount();
 if(action==="pause"||action==="resume"||action==="flatten"){
  const expected=action==="pause"?"paused":action==="resume"?"active":"flatten-requested";
  if(result.state===expected)return result;
  // Control endpoints need not return the full registration/status object.
  // Confirm via a read; never retry an ambiguous mutation.
  const current=await json(endpoint(api,"status",master),{signal},fetcher);assertAccount();
  const completedClose=action==="flatten"&&current.state==="paused"&&current.lastCycle>=timestamp;
  if(current.registered===true&&current.master?.toLowerCase()===master.toLowerCase()&&(current.state===expected||completedClose))return current;
  throw new Error("Request submitted, but its state could not be verified. Refresh status before retrying.");
 }
 if(action==="register"){
  const requested=JSON.parse(raw),owner=context.owner??master;
  const same=(value:unknown,address:Address)=>typeof value==="string"&&value.toLowerCase()===address.toLowerCase();
  if(!same(requested.master,master)||typeof requested.agent!=="string"||!isAddress(requested.agent))throw new Error("Invalid Auto Trader registration account or agent.");
  const agent=requested.agent as Address,isMain=same(owner,master);
  const mismatched=(record:Record<string,unknown>)=>record.registered===false||record.master!==undefined&&!same(record.master,master)||record.owner!==undefined&&!same(record.owner,owner)||record.agent!==undefined&&!same(record.agent,agent);
  const confirmed=(record:Record<string,unknown>)=>!mismatched(record)&&same(record.master,master)&&same(record.owner??(isMain?record.master:undefined),owner)&&same(record.agent,agent)&&record.hasKey===true&&record.state==="paused";
  if(mismatched(result))throw new Error("Auto Trader returned a different registration account, owner or agent. Refresh status before retrying.");
  // Registration returns a full record without registered:true. A minimal legacy
  // acknowledgement must be verified by one read, never by a repeated POST.
  if(confirmed(result))return {...result,registered:true};
  const current=await json(endpoint(api,"status",master),{signal},fetcher);assertAccount();
  if(current.registered===true&&confirmed(current))return current;
  throw new Error("Registration submitted, but the selected account, owner, agent and paused key could not be verified. Refresh status before retrying.");
 }
 if(action==="remove"&&result.removed!==true)throw new Error("Auto Trader did not confirm this action. Refresh status before retrying.");
 return result;
}
export async function getStatus(master:Address,signal?:AbortSignal,fetcher=fetch):Promise<AutoTraderStatus>{const statusUrl=new URL(endpoint(AUTO_TRADER_API,"status",master));statusUrl.searchParams.set("_ts",String(Date.now()));const result=await json(statusUrl.href,{signal},fetcher);if(typeof result.registered!=="boolean"||result.registered&&result.master?.toLowerCase()!==master.toLowerCase())throw new Error("Invalid Auto Trader account response.");return result;}
export async function getSignal(signal?:AbortSignal,fetcher=fetch):Promise<Signal>{
 const data=await json(AUTO_TRADER_SIGNAL,{signal},fetcher);if(!Array.isArray(data.coins))throw new Error("Signal data unavailable.");
 const coins:{coin:string;score:number|null;label?:string}[]=data.coins.filter((c:unknown):c is {coin:string;score:number|null}=>!!c&&typeof c==="object"&&"coin" in c&&typeof c.coin==="string"&&/^(?:[a-zA-Z0-9_-]+:)?[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(c.coin)&&"score" in c&&(c.score===null||typeof c.score==="number"&&Number.isFinite(c.score)&&Math.abs(c.score)<=100));
 const metrics=["posScore","flowScore","flowPct","tradersLong","tradersShort","activeWallets","breadthFullWallets","flowScoreShare","flowScoreOi","flow24h"];
 const unique=[...new Map(coins.map(c=>{const raw=c as unknown as Record<string,unknown>;return [c.coin,{coin:c.coin,score:c.score,...Object.fromEntries(metrics.filter(key=>typeof raw[key]==="number"&&Number.isFinite(raw[key])).map(key=>[key,raw[key]])),...(typeof raw.flowNorm==="string"?{flowNorm:raw.flowNorm}:{}),...(typeof c.label==="string"&&c.label.trim()?{label:c.label.trim().slice(0,48)}:{})}] as const;})).values()];if(!unique.length)throw new Error("Signal market list unavailable.");
 const stamp=data.ts??data.timestamp??data.now;return {coins:unique,timestamp:typeof stamp==="number"?stamp:null};
}
