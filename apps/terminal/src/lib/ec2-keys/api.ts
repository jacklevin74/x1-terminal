import {isAddress,keccak256,toBytes,type Address,type Hex} from "viem";
export const EC2_KEYS_DOMAIN={name:"X1Ec2KeyCreation",version:"1"} as const;
export const EC2_KEYS_TYPES={Request:[{name:"action",type:"string"},{name:"target",type:"address"},{name:"nonce",type:"string"},{name:"timestamp",type:"uint64"},{name:"bodyHash",type:"bytes32"}]} as const;
export const EC2_KEY_STATES=["awaiting_approval","approved","disabled","pending_deletion"] as const;
export type Ec2KeyState=typeof EC2_KEY_STATES[number];
export interface Ec2Key {id:string;agent:Address;name:string;createdAt:number;validUntil:number;state:Ec2KeyState;deletionDate?:number}
export interface Ec2KeysStatus {version:1;supported:true;owner:Address;region:"us-east-2";canCreate:boolean;pending:number;capabilities:{create:true;manage:boolean;sign:false;register:false};agents:Ec2Key[];createdAgentId?:string;updatedAgentId?:string}
export type Ec2Action="create"|Ec2ManageOp;
export type Ec2ManageOp="rename"|"disable"|"enable"|"delete"|"cancel-delete";
export type Ec2CreationSignature={account:Address;domain:typeof EC2_KEYS_DOMAIN;types:typeof EC2_KEYS_TYPES;primaryType:"Request";message:{action:Ec2Action;target:Address;nonce:string;timestamp:bigint;bodyHash:Hex}};
export const EC2_UNAVAILABLE="EC2 key service unavailable.";
const NAME=/^[-\w ]{1,16}$/,ID=/^[-\w]{1,128}$/;
async function request(op:string,owner:Address,init:RequestInit={},fetcher=fetch){
 const response=await fetcher(`/api/ec2-keys?${new URLSearchParams({op,owner})}`,{...init,cache:"no-store",redirect:"error",signal:init.signal??AbortSignal.timeout(25000)});
 if(!response.ok){let message=EC2_UNAVAILABLE;try{const value=await response.json();if(typeof value.error==="string"&&value.error.length<300&&!/arn:|AKIA|ASIA/.test(value.error))message=value.error;}catch{}throw Error(message);}
 return response.json();
}
export function parseEc2Keys(value:unknown,owner:Address):Ec2KeysStatus {
 const data=value as Ec2KeysStatus;
 if(data?.version!==1||data.supported!==true||data.region!=="us-east-2"||data.owner?.toLowerCase()!==owner.toLowerCase()||typeof data.canCreate!=="boolean"||!Number.isInteger(data.pending)||data.pending<0||data.capabilities?.create!==true||data.capabilities.sign!==false||data.capabilities.register!==false||!Array.isArray(data.agents))throw Error("EC2 key service returned invalid owner or capabilities.");
 const ids=new Set(),addresses=new Set();
 for(const key of data.agents){if(!key||typeof key.id!=="string"||!ID.test(key.id)||!isAddress(key.agent)||typeof key.name!=="string"||!key.name.trim()||key.name.length>16||!EC2_KEY_STATES.includes(key.state)||!Number.isFinite(key.createdAt)||!Number.isFinite(key.validUntil)||key.createdAt<=0||key.validUntil<=key.createdAt||(key.state==="pending_deletion"&&key.deletionDate!==undefined&&!Number.isFinite(key.deletionDate))||ids.has(key.id)||addresses.has(key.agent.toLowerCase()))throw Error("EC2 key service returned an invalid key record.");ids.add(key.id);addresses.add(key.agent.toLowerCase());}
 for(const field of ["createdAgentId","updatedAgentId"] as const)if(data[field]!==undefined&&(typeof data[field]!=="string"||!ids.has(data[field])))throw Error("EC2 key service returned an unknown key id.");
 // Return only public fields, even if a misconfigured service sends extra fields.
 return {version:1,supported:true,owner:data.owner,region:"us-east-2",canCreate:data.canCreate,pending:data.pending,capabilities:{create:true,manage:data.capabilities.manage===true,sign:false,register:false},
  agents:data.agents.map(({id,agent,name,state,createdAt,validUntil,deletionDate})=>({id,agent,name,state,createdAt,validUntil,...(state==="pending_deletion"&&deletionDate!==undefined?{deletionDate}:{})})),
  ...(data.createdAgentId?{createdAgentId:data.createdAgentId}:{}),...(data.updatedAgentId?{updatedAgentId:data.updatedAgentId}:{})};
}
export async function getEc2Keys(owner:Address,signal?:AbortSignal,fetcher=fetch){return parseEc2Keys(await request("status",owner,{signal},fetcher),owner);}
type Signer={owner:Address;sign:(args:Ec2CreationSignature)=>Promise<Hex>;assertOwner:()=>void;fetcher?:typeof fetch};
/** Fetches a single-use nonce, has the owner sign the exact body, and posts it. Never retries a POST. */
async function signedPost(action:Ec2Action,raw:string,{owner,sign,assertOwner,fetcher=fetch}:Signer){
 const nonce=await request("nonce",owner,{},fetcher);assertOwner();
 if(typeof nonce.nonce!=="string"||!/^[a-f0-9]{32}$/.test(nonce.nonce)||JSON.stringify(nonce.domain)!==JSON.stringify(EC2_KEYS_DOMAIN)||JSON.stringify(nonce.types)!==JSON.stringify(EC2_KEYS_TYPES))throw Error("EC2 owner authorization configuration does not match this terminal.");
 const timestamp=Date.now(),signature=await sign({account:owner,domain:EC2_KEYS_DOMAIN,types:EC2_KEYS_TYPES,primaryType:"Request",message:{action,target:owner,nonce:nonce.nonce,timestamp:BigInt(timestamp),bodyHash:keccak256(toBytes(raw))}});assertOwner();
 const result=parseEc2Keys(await request(action,owner,{method:"POST",headers:{"content-type":"application/json","x-auth":JSON.stringify({nonce:nonce.nonce,timestamp,signature})},body:raw},fetcher),owner);assertOwner();
 return result;
}
export async function createEc2Key({owner,name,days,...signer}:Omit<Signer,"owner">&{owner:Address;name:string;days:number}){
 signer.assertOwner();if(!isAddress(owner)||!NAME.test(name)||name!==name.trim()||![7,30,90].includes(days))throw Error("Choose a key name and a supported expiry.");
 const result=await signedPost("create",JSON.stringify({owner:owner.toLowerCase(),name,days}),{owner,...signer});
 if(!result.agents.some(k=>k.id===result.createdAgentId))throw Error("KMS key creation was not confirmed. Refresh before retrying.");return result;
}
/** Owner-signed key management. The signed body names the record id; the service checks the signer owns it. */
export async function manageEc2Key({op,owner,id,name,days,...signer}:Omit<Signer,"owner">&{op:Ec2ManageOp;owner:Address;id:string;name?:string;days?:number}){
 signer.assertOwner();
 if(!isAddress(owner)||!ID.test(id))throw Error("Select a key belonging to this owner.");
 if(op==="rename"&&(!name||!NAME.test(name)||name!==name.trim()))throw Error("Choose a name of 1–16 letters, numbers, spaces, _ or -.");
 if(op==="delete"&&days!==undefined&&(!Number.isInteger(days)||days<7||days>30))throw Error("Choose a deletion window of 7 to 30 days.");
 const body=op==="rename"?{id,name,owner:owner.toLowerCase()}:op==="delete"&&days!==undefined?{days,id,owner:owner.toLowerCase()}:{id,owner:owner.toLowerCase()};
 const result=await signedPost(op,JSON.stringify(body),{owner,...signer});
 if(result.updatedAgentId!==id)throw Error("The key change was not confirmed. Refresh before retrying.");
 const key=result.agents.find(k=>k.id===id);
 const expected:Partial<Record<Ec2ManageOp,Ec2KeyState>>={disable:"disabled",delete:"pending_deletion",enable:"awaiting_approval","cancel-delete":"disabled"};
 if(!key||(expected[op]&&key.state!==expected[op]&&!(op==="enable"&&key.state==="approved"))||(op==="rename"&&key.name!==name))throw Error("The key change was not confirmed. Refresh before retrying.");
 return result;
}
export function ec2AgentName(key:Pick<Ec2Key,"agent"|"validUntil">){return `X1K${key.agent.slice(2,14).toLowerCase()} valid_until ${key.validUntil}`;}
