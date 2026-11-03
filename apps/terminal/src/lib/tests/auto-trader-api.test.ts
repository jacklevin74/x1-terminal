import {describe,it,expect,vi,afterEach} from "vitest";
import nacl from "tweetnacl";
import {generatePrivateKey,privateKeyToAccount} from "viem/accounts";
import {keccak256,toBytes,verifyTypedData} from "viem";
import {AUTH_DOMAIN,AUTH_TYPES,base64Decode,base64Encode,getNonce,getSignal,sealAgentKey,signedCall,type AuthRequest} from "@/lib/auto-trader/api";
import {AUTO_TRADER_BUILDER} from "@/config/auto-trader";
afterEach(()=>vi.restoreAllMocks());
function server(){
 const box=nacl.box.keyPair();let id=0;const issued=new Set<string>(),used=new Set<string>();const posts:RequestInit[]=[];
 const nonce=()=>{const value=(++id).toString(16).padStart(32,"0");issued.add(value);return {nonce:value,serverPubKey:base64Encode(box.publicKey),domain:AUTH_DOMAIN,types:AUTH_TYPES,builder:AUTO_TRADER_BUILDER,minFee:50};};
 const fetcher=vi.fn(async(url:string|URL|Request,options:RequestInit={})=>{
  if(!options.method)return Response.json(nonce());posts.push(options);
  const auth=JSON.parse((options.headers as Record<string,string>)["x-auth"]),target=new URL(String(url)).searchParams.get("addr")??JSON.parse(options.body as string).master;
  if(!issued.has(auth.nonce)||used.has(auth.nonce))return Response.json({error:"bad or replayed nonce"},{status:401});
  if(Math.abs(Date.now()-auth.timestamp)>120000)return Response.json({error:"timestamp skew"},{status:401});
  const request={domain:AUTH_DOMAIN,types:AUTH_TYPES,primaryType:"Request" as const,message:{action:new URL(String(url)).searchParams.get("op")!,target,nonce:auth.nonce,timestamp:BigInt(auth.timestamp),bodyHash:keccak256(toBytes(options.body as string))}};
  if(!await verifyTypedData({...request,address:target,signature:auth.signature}))return Response.json({error:"signer is not the master account"},{status:403});used.add(auth.nonce);
  return Response.json({registered:true,master:target,state:"paused"});
 }) as unknown as typeof fetch;
 return {box,fetcher,posts,nonce};
}
describe("Auto Trader signed control API (DEV-ONLY generated keys)",()=>{
 it("hashes the exact body, sends owner signatures and never sends the plaintext agent key",async()=>{
  const s=server(),owner=privateKeyToAccount(generatePrivateKey()),agentKey=generatePrivateKey();
  await signedCall("register",pub=>({master:owner.address,agent:privateKeyToAccount(agentKey).address,sealedKey:sealAgentKey(agentKey,pub),settings:{leverage:3}}),{master:owner.address,sign:request=>owner.signTypedData(request),assertAccount:()=>{},fetcher:s.fetcher,api:"https://example.com/api/copybot"});
  expect(s.posts).toHaveLength(1);expect(s.posts[0].body).not.toContain(agentKey);
  const body=JSON.parse(s.posts[0].body as string),sealed=body.sealedKey;
  const opened=nacl.box.open(base64Decode(sealed.ct),base64Decode(sealed.nonce),base64Decode(sealed.epk),s.box.secretKey);expect(opened).not.toBeNull();expect([...opened!]).toEqual([...toBytes(agentKey)]);opened!.fill(0);
 });
 it("rejects replay, old timestamps and a different signing account",async()=>{
  const s=server(),owner=privateKeyToAccount(generatePrivateKey()),other=privateKeyToAccount(generatePrivateKey());
  const context={master:owner.address,sign:(r:AuthRequest)=>owner.signTypedData(r),assertAccount:()=>{},fetcher:s.fetcher,api:"https://example.com/api/copybot"};
  await signedCall("pause",{},context);const first=s.posts[0];expect((await s.fetcher(`https://example.com/api/copybot?op=pause&addr=${owner.address}`,first)).status).toBe(401);
  await expect(signedCall("pause",{},{...context,sign:r=>other.signTypedData(r)})).rejects.toThrow("signer is not the master");
  const n=s.nonce(),timestamp=Date.now()-121000,raw="{}",signature=await owner.signTypedData({domain:AUTH_DOMAIN,types:AUTH_TYPES,primaryType:"Request",message:{action:"pause",target:owner.address,nonce:n.nonce,timestamp:BigInt(timestamp),bodyHash:keccak256(toBytes(raw))}});
  expect((await s.fetcher(`https://example.com/api/copybot?op=pause&addr=${owner.address}`,{method:"POST",headers:{"x-auth":JSON.stringify({nonce:n.nonce,timestamp,signature})},body:raw})).status).toBe(401);
 });
 it("does not POST after the connected owner changes while signing",async()=>{
  const s=server(),owner=privateKeyToAccount(generatePrivateKey());let changed=false;
  await expect(signedCall("resume",{},{master:owner.address,assertAccount:()=>{if(changed)throw new Error("Wallet changed");},sign:async r=>{const sig=await owner.signTypedData(r);changed=true;return sig;},fetcher:s.fetcher,api:"https://example.com/api/copybot"})).rejects.toThrow("Wallet changed");expect(s.posts).toHaveLength(0);
 });
 it("refuses mismatched service configuration before requesting a signature",async()=>{
  const s=server();const n=s.nonce();await expect(getNonce({fetcher:async()=>Response.json({...n,domain:{...n.domain,chainId:1}})})).rejects.toThrow("configuration");expect(()=>sealAgentKey(generatePrivateKey(),"bad")).toThrow();
 });
 it("does not automatically retry server failures",async()=>{
  const s=server(),owner=privateKeyToAccount(generatePrivateKey());let attempts=0;
  const fetcher:typeof fetch=async(url,options)=>{if(options?.method){attempts++;return Response.json({error:"rate limited"},{status:429});}return s.fetcher(url,options);};
  await expect(signedCall("pause",{},{master:owner.address,assertAccount:()=>{},sign:r=>owner.signTypedData(r),fetcher,api:"https://example.com/api/copybot"})).rejects.toThrow("rate limited");expect(attempts).toBe(1);
 });
});

it("allows the fixed same-origin proxy on local HTTP without weakening remote HTTPS",async()=>{
 vi.stubGlobal("location",new URL("http://127.0.0.1:4173/API"));
 try{
  const s=server();await getNonce({api:"/api/copybot",fetcher:s.fetcher});
  expect(String((s.fetcher as ReturnType<typeof vi.fn>).mock.calls[0][0])).toBe("http://127.0.0.1:4173/api/copybot?op=nonce");
  await expect(getNonce({api:"http://example.com/api/copybot",fetcher:s.fetcher})).rejects.toThrow("HTTPS");
  await expect(getNonce({api:"http://127.0.0.1:4173/other",fetcher:s.fetcher})).rejects.toThrow("HTTPS");
 }finally{vi.unstubAllGlobals();}
});

it("receives new markets and timestamp from the API and removes duplicate symbols",async()=>{
 const fetcher=vi.fn(async()=>Response.json({now:123,coins:[{coin:"BTC",score:10},{coin:"xyz:MU",score:20},{coin:"xyz:MU",score:30,label:"Bullish"},{coin:"xyz:INTC",score:null},{coin:"bad symbol",score:20}]}));
 const signal=await getSignal(undefined,fetcher);
 expect(signal.coins[1].label).toBe("Bullish");expect(signal.timestamp).toBe(123);expect(signal.coins.map(c=>c.coin)).toEqual(["BTC","xyz:MU","xyz:INTC"]);
 await expect(getSignal(undefined,async()=>Response.json({coins:[]}))).rejects.toThrow("market list unavailable");
});

it("accepts a close acknowledgement without a registered field",async()=>{
 const s=server(),owner=privateKeyToAccount(generatePrivateKey());let posts=0;
 const fetcher:typeof fetch=async(url,options)=>{if(options?.method){posts++;return Response.json({state:"flatten-requested"});}return s.fetcher(url,options);};
 const result=await signedCall("flatten",{},{master:owner.address,assertAccount:()=>{},sign:r=>owner.signTypedData(r),fetcher,api:"https://example.com/api/copybot"});
 expect(result.state).toBe("flatten-requested");expect(posts).toBe(1);
});
it("verifies a minimal close acknowledgement through status without repeating the close",async()=>{
 const s=server(),owner=privateKeyToAccount(generatePrivateKey());let posts=0,reads=0;
 const fetcher:typeof fetch=async(url,options)=>{
  if(options?.method){posts++;return Response.json({ok:true});}
  if(new URL(String(url)).searchParams.get("op")==="status"){reads++;return Response.json({registered:true,master:owner.address,state:"flatten-requested"});}
  return s.fetcher(url,options);
 };
 expect((await signedCall("flatten",{},{master:owner.address,assertAccount:()=>{},sign:r=>owner.signTypedData(r),fetcher,api:"https://example.com/api/copybot"})).state).toBe("flatten-requested");
 expect(posts).toBe(1);expect(reads).toBe(1);
});
it("does not report an unverified close as accepted or automatically retry it",async()=>{
 const s=server(),owner=privateKeyToAccount(generatePrivateKey());let posts=0;
 const fetcher:typeof fetch=async(url,options)=>{
  if(options?.method){posts++;return Response.json({ok:true});}
  if(new URL(String(url)).searchParams.get("op")==="status")return Response.json({registered:true,master:owner.address,state:"active"});
  return s.fetcher(url,options);
 };
 await expect(signedCall("flatten",{},{master:owner.address,assertAccount:()=>{},sign:r=>owner.signTypedData(r),fetcher,api:"https://example.com/api/copybot"})).rejects.toThrow("state could not be verified");expect(posts).toBe(1);
});
