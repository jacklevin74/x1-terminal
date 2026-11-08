import {hashTypedData,recoverAddress,serializeSignature,type Address,type Hex} from "viem";
import {parseKeysStatus,type RemoteKeysStatus} from "./api";
export type LocalProof={verified:true;provider:"kms";digest:Hex;signature:{r:Hex;s:Hex;v:number};message:{account:Address;challenge:Hex;timestamp:number};recovered:Address;ms:number};
export type DemoStatus=Omit<RemoteKeysStatus,"agents">&{mode:"local-demo";csrf:string;agents:(RemoteKeysStatus["agents"][number]&{provider:"kms"|"mock"})[];proof?:LocalProof};
export const DEMO_OWNER="0x1111111111111111111111111111111111111111" as Address;
export function isLocalKeysHost(){return typeof location!=="undefined"&&["127.0.0.1","localhost"].includes(location.hostname);}
async function call(op:string,owner:Address,account:Address,body?:object,token?:string):Promise<DemoStatus>{
 if(!isLocalKeysHost())throw new Error("The keys demo is available on localhost only.");
 const query=new URLSearchParams({op,...(body?{}:{owner,account})});
 let response;try{response=await fetch(`/api/local-keys?${query}`,{method:body?"POST":"GET",cache:"no-store",redirect:"error",signal:AbortSignal.timeout(30000),...(body?{headers:{"content-type":"application/json","x-local-keys-token":token??""},body:JSON.stringify({owner,account,...body})}:{})});}catch{throw new Error("Local demo bridge is offline. Start npm run demo:keys in tools/remote-keys-demo.");}
 const value=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(typeof value?.error==="string"?value.error:"Local demo bridge is offline. Start npm run demo:keys in tools/remote-keys-demo.");
 parseKeysStatus(value,owner,account);
 if(value.mode!=="local-demo"||typeof value.csrf!=="string"||!/^[a-f\d]{64}$/.test(value.csrf)||value.agents.some((row:{provider:unknown})=>row.provider!=="kms"&&row.provider!=="mock"))throw new Error("Invalid local demo response.");
 return value;
}
export const getDemoKeys=(owner:Address,account:Address)=>call("status",owner,account);
export async function demoKeysMutation(op:"create"|"approve"|"register"|"sign"|"remove",body:object,owner:Address,account:Address,token:string){
 const value=await call(op,owner,account,body,token);
 if(op==="sign"){
  const proof=value.proof;
  if(!proof||proof.verified!==true||proof.provider!=="kms"||proof.message.account.toLowerCase()!==account.toLowerCase()||!Number.isFinite(proof.ms))throw new Error("Invalid KMS proof response.");
  const digest=hashTypedData({domain:{name:"X1RemoteKeysDemo",version:"1",chainId:1337},types:{Proof:[{name:"account",type:"address"},{name:"challenge",type:"bytes32"},{name:"timestamp",type:"uint64"}]},primaryType:"Proof",message:{...proof.message,timestamp:BigInt(proof.message.timestamp)}});
  const recovered=await recoverAddress({hash:digest,signature:serializeSignature({...proof.signature,v:BigInt(proof.signature.v)})});
  const agent=value.agents.find(row=>row.id===(body as {id?:string}).id);
  if(digest!==proof.digest||!agent||agent.provider!=="kms"||recovered.toLowerCase()!==agent.agent.toLowerCase())throw new Error("KMS signature does not match this agent.");
 }
 return value;
}
