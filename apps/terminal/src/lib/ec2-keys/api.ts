export const ec2KeysLocalHost=(hostname:string)=>hostname==="127.0.0.1"||hostname==="localhost";
import {isAddress,keccak256,toBytes,type Address,type Hex} from "viem";
export const EC2_KEYS_DOMAIN={name:"X1Ec2KeyCreation",version:"1"} as const;
export const EC2_KEYS_TYPES={Request:[{name:"action",type:"string"},{name:"target",type:"address"},{name:"nonce",type:"string"},{name:"timestamp",type:"uint64"},{name:"bodyHash",type:"bytes32"}]} as const;
export interface Ec2Key {id:string;agent:Address;name:string;createdAt:number;validUntil:number;state:"awaiting_approval"}
export interface Ec2KeysStatus {version:1;supported:true;owner:Address;region:"us-east-2";canCreate:boolean;pending:number;capabilities:{create:true;sign:false;register:false};agents:Ec2Key[];createdAgentId?:string}
export type Ec2CreationSignature={account:Address;domain:typeof EC2_KEYS_DOMAIN;types:typeof EC2_KEYS_TYPES;primaryType:"Request";message:{action:"create";target:Address;nonce:string;timestamp:bigint;bodyHash:Hex}};
async function request(op:string,owner:Address,init:RequestInit={},fetcher=fetch){
 const response=await fetcher(`/api/ec2-keys?${new URLSearchParams({op,owner})}`,{...init,cache:"no-store",redirect:"error",signal:init.signal??AbortSignal.timeout(25000)});
 if(!response.ok){let message="EC2 key service is not connected. Start the local SSH tunnel and refresh.";try{const value=await response.json();if(typeof value.error==="string"&&value.error.length<300&&!/arn:|AKIA|ASIA/.test(value.error))message=value.error;}catch{}throw Error(message);}
 return response.json();
}
export function parseEc2Keys(value:unknown,owner:Address):Ec2KeysStatus {
 const data=value as Ec2KeysStatus;
 if(data?.version!==1||data.supported!==true||data.region!=="us-east-2"||data.owner?.toLowerCase()!==owner.toLowerCase()||typeof data.canCreate!=="boolean"||!Number.isInteger(data.pending)||data.pending<0||data.capabilities?.create!==true||data.capabilities.sign!==false||data.capabilities.register!==false||!Array.isArray(data.agents))throw Error("EC2 key service returned invalid owner or capabilities.");
 const ids=new Set(),addresses=new Set();
 for(const key of data.agents){if(!key||typeof key.id!=="string"||!/^[-\w]{1,128}$/.test(key.id)||!isAddress(key.agent)||typeof key.name!=="string"||!key.name.trim()||key.name.length>16||key.state!=="awaiting_approval"||!Number.isFinite(key.createdAt)||!Number.isFinite(key.validUntil)||key.createdAt<=0||key.validUntil<=key.createdAt||ids.has(key.id)||addresses.has(key.agent.toLowerCase()))throw Error("EC2 key service returned an invalid key record.");ids.add(key.id);addresses.add(key.agent.toLowerCase());}
 // Return only public fields, even if a misconfigured service sends extra fields.
 return {version:1,supported:true,owner:data.owner,region:"us-east-2",canCreate:data.canCreate,pending:data.pending,capabilities:{create:true,sign:false,register:false},agents:data.agents.map(({id,agent,name,state,createdAt,validUntil})=>({id,agent,name,state,createdAt,validUntil})),...(data.createdAgentId?{createdAgentId:data.createdAgentId}:{})};
}
export async function getEc2Keys(owner:Address,signal?:AbortSignal,fetcher=fetch){return parseEc2Keys(await request("status",owner,{signal},fetcher),owner);}
export async function createEc2Key({owner,name,days,sign,assertOwner,fetcher=fetch}:{owner:Address;name:string;days:number;sign:(args:Ec2CreationSignature)=>Promise<Hex>;assertOwner:()=>void;fetcher?:typeof fetch}){
 assertOwner();if(!isAddress(owner)||!/^[-\w ]{1,16}$/.test(name)||name!==name.trim()||![7,30,90].includes(days))throw Error("Choose a key name and a supported expiry.");
 const raw=JSON.stringify({owner:owner.toLowerCase(),name,days}),nonce=await request("nonce",owner,{},fetcher);assertOwner();
 if(typeof nonce.nonce!=="string"||!/^[a-f0-9]{32}$/.test(nonce.nonce)||JSON.stringify(nonce.domain)!==JSON.stringify(EC2_KEYS_DOMAIN)||JSON.stringify(nonce.types)!==JSON.stringify(EC2_KEYS_TYPES))throw Error("EC2 owner authorization configuration does not match this terminal.");
 const timestamp=Date.now(),signature=await sign({account:owner,domain:EC2_KEYS_DOMAIN,types:EC2_KEYS_TYPES,primaryType:"Request",message:{action:"create",target:owner,nonce:nonce.nonce,timestamp:BigInt(timestamp),bodyHash:keccak256(toBytes(raw))}});assertOwner();
 const result=parseEc2Keys(await request("create",owner,{method:"POST",headers:{"content-type":"application/json","x-auth":JSON.stringify({nonce:nonce.nonce,timestamp,signature})},body:raw},fetcher),owner);assertOwner();
 if(!result.agents.some(k=>k.id===result.createdAgentId))throw Error("KMS key creation was not confirmed. Refresh before retrying.");return result;
}
export function ec2AgentName(key:Pick<Ec2Key,"agent"|"validUntil">){return `X1K${key.agent.slice(2,14).toLowerCase()} valid_until ${key.validUntil}`;}
