import {isAddress,keccak256,toBytes,type Address,type Hex} from "viem";

const API="/api/copybot";
export const KEYS_DOMAIN={name:"X1RemoteKeys",version:"1"} as const;
export const KEYS_TYPES={Request:[{name:"action",type:"string"},{name:"target",type:"address"},{name:"nonce",type:"string"},{name:"timestamp",type:"uint64"},{name:"bodyHash",type:"bytes32"}]} as const;
export type RemoteAgent={id:string;agent:Address;name:string;state:"awaiting_approval"|"approved"|"paused"|"disabled";createdAt:number;validUntil:number|null;lastSignedAt:number|null};
export type RemoteKeysStatus={version:1;supported:true;owner:Address;account:Address;region:"us-east-2";canCreate:boolean;agents:RemoteAgent[];createdAgentId?:string};
export type KeysAuthRequest={account:Address;domain:typeof KEYS_DOMAIN;types:typeof KEYS_TYPES;primaryType:"Request";message:{action:string;target:Address;nonce:string;timestamp:bigint;bodyHash:Hex}};
const same=(a:unknown,b:string)=>typeof a==="string"&&a.toLowerCase()===b.toLowerCase();
const finite=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>0;
function scope(owner:Address,account:Address){if(!isAddress(owner)||!isAddress(account))throw new Error("Connect a valid owner and trading account.");}
export function parseKeysStatus(value:unknown,owner:Address,account:Address):RemoteKeysStatus{
 scope(owner,account);
 const data=value as RemoteKeysStatus;
 if(!data||data.version!==1||data.supported!==true||!same(data.owner,owner)||!same(data.account,account)||data.region!=="us-east-2"||typeof data.canCreate!=="boolean"||!Array.isArray(data.agents))throw new Error("Remote signer returned an invalid account or configuration.");
 const ids=new Set(),addresses=new Set();
 for(const row of data.agents){
  if(!row||typeof row.id!=="string"||!/^[\w-]{1,128}$/.test(row.id)||!isAddress(row.agent)||typeof row.name!=="string"||!row.name.trim()||row.name.length>48||!["awaiting_approval","approved","paused","disabled"].includes(row.state)||!finite(row.createdAt)||(row.validUntil!==null&&!finite(row.validUntil))||(row.lastSignedAt!==null&&!finite(row.lastSignedAt))||ids.has(row.id)||addresses.has(row.agent.toLowerCase()))throw new Error("Remote signer returned invalid agent records.");
  ids.add(row.id);addresses.add(row.agent.toLowerCase());
 }
 return data;
}
async function request(op:string,account:Address,init:RequestInit={},fetcher=fetch){
 const query=new URLSearchParams({op,addr:account});
 const response=await fetcher(`${API}?${query}`,{...init,cache:"no-store",redirect:"error",signal:init.signal??AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(op==="kms-status"?"Remote signing service is not connected.":"Remote signer request could not be confirmed. Refresh before retrying; no automatic retry was sent.");
 const data=await response.json();if(!data||typeof data!=="object")throw new Error("Remote signing service returned an invalid response.");return data;
}
export async function getRemoteKeys(owner:Address,account:Address,signal?:AbortSignal,fetcher=fetch){scope(owner,account);return parseKeysStatus(await request("kms-status",account,{signal},fetcher),owner,account);}
export async function remoteKeysMutation(action:"kms-create"|"kms-register",body:Record<string,unknown>,context:{owner:Address;account:Address;assertAccount:()=>void;sign:(request:KeysAuthRequest)=>Promise<Hex>;fetcher?:typeof fetch}){
 const {owner,account,assertAccount,sign,fetcher=fetch}=context;scope(owner,account);assertAccount();
 if(action!=="kms-create"&&action!=="kms-register")throw new Error("Unsupported remote key operation.");
 if(action==="kms-create"&&(typeof body.name!=="string"||!/^[\w -]{1,24}$/.test(body.name)||![7,30,90].includes(body.days as number)))throw new Error("Choose an agent name and supported expiry.");
 if(action==="kms-register"&&(typeof body.id!=="string"||!/^[\w-]{1,128}$/.test(body.id)||typeof body.agent!=="string"||!isAddress(body.agent)))throw new Error("Select a valid remote agent.");
 const payload=action==="kms-create"?{master:account,owner,name:body.name,days:body.days}:{master:account,owner,id:body.id,agent:body.agent};
 const raw=JSON.stringify(payload); // Explicit allowlist: no private keys, arbitrary actions or AWS fields.
 const nonce=await request("kms-nonce",account,{},fetcher);assertAccount();
 if(typeof nonce.nonce!=="string"||!/^[\da-f]{32}$/i.test(nonce.nonce)||nonce.domain?.name!==KEYS_DOMAIN.name||nonce.domain?.version!==KEYS_DOMAIN.version||Object.keys(nonce.domain).length!==2||JSON.stringify(nonce.types)!==JSON.stringify(KEYS_TYPES))throw new Error("Remote signer authentication configuration does not match this terminal.");
 const timestamp=Date.now();
 const signature=await sign({account:owner,domain:KEYS_DOMAIN,types:KEYS_TYPES,primaryType:"Request",message:{action,target:account,nonce:nonce.nonce,timestamp:BigInt(timestamp),bodyHash:keccak256(toBytes(raw))}});assertAccount();
 const result=parseKeysStatus(await request(action,account,{method:"POST",headers:{"content-type":"application/json","x-auth":JSON.stringify({nonce:nonce.nonce,timestamp,signature})},body:raw},fetcher),owner,account);assertAccount();
 if(action==="kms-create"&&!result.agents.some(row=>row.id===result.createdAgentId&&row.state==="awaiting_approval"))throw new Error("Key creation was submitted but not verified. Refresh before retrying.");
 if(action==="kms-register"&&!result.agents.some(row=>row.id===body.id&&same(row.agent,body.agent as string)&&row.state==="paused"))throw new Error("Registration was submitted but its paused state could not be verified. Refresh before retrying.");
 return result;
}
