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
  used.add(auth.nonce); // The live API consumes it before signature/ownership checks.
  if(!await verifyTypedData({...request,address:target,signature:auth.signature}))return Response.json({error:"signer is not the master account"},{status:403});
  return Response.json({registered:true,master:target,owner:target,agent:JSON.parse(options.body as string).agent,hasKey:true,state:"paused"});
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

it("addresses subaccount controls to the selected target but signs with the owner",async()=>{
 const s=server(),owner=privateKeyToAccount(generatePrivateKey()),sub=privateKeyToAccount(generatePrivateKey()).address;
 const requests:{url:URL;options:RequestInit}[]=[];let signed:AuthRequest|undefined;
 const fetcher=(async(url:string,options:RequestInit={})=>{const parsed=new URL(String(url));if(parsed.searchParams.get("op")==="nonce")return Response.json(s.nonce());requests.push({url:parsed,options});return Response.json({state:"paused"});}) as typeof fetch;
 await signedCall("pause",{},{master:sub,owner:owner.address,sign:async request=>{signed=request;return owner.signTypedData(request);},assertAccount:()=>{},fetcher,api:"https://example.com/api/copybot"});
 expect(requests).toHaveLength(1);expect(requests[0].url.searchParams.get("addr")).toBe(sub);expect(signed!.account).toBe(owner.address);expect(signed!.message.target).toBe(sub);
 const auth=JSON.parse((requests[0].options.headers as Record<string,string>)["x-auth"]);
 expect(await verifyTypedData({...signed!,address:owner.address,signature:auth.signature})).toBe(true);
});
it("puts the selected subaccount in the registration body instead of the signing owner",async()=>{
 const s=server(),owner=privateKeyToAccount(generatePrivateKey()),sub=privateKeyToAccount(generatePrivateKey()).address;let posted:Record<string,unknown>|undefined;
 const fetcher=(async(url:string,options:RequestInit={})=>{if(new URL(String(url)).searchParams.get("op")==="nonce")return Response.json(s.nonce());posted=JSON.parse(options.body as string);return Response.json({registered:true,master:sub,owner:owner.address,agent:owner.address,hasKey:true,state:"paused"});}) as typeof fetch;
 await signedCall("register",{master:sub,agent:owner.address},{master:sub,owner:owner.address,sign:request=>owner.signTypedData(request),assertAccount:()=>{},fetcher,api:"https://example.com/api/copybot"});expect(posted?.master).toBe(sub);expect(posted?.master).not.toBe(owner.address);
});

it("explains a master-only API rejection without retrying or falling back to the main account",async()=>{
 const s=server(),owner=privateKeyToAccount(generatePrivateKey()),sub=privateKeyToAccount(generatePrivateKey()).address;
 await expect(signedCall("register",{master:sub},{master:sub,owner:owner.address,sign:request=>owner.signTypedData(request),assertAccount:()=>{},fetcher:s.fetcher,api:"https://example.com/api/copybot"})).rejects.toThrow("The API must verify that this subaccount belongs to the signing owner");
 expect(s.posts).toHaveLength(1);expect(JSON.parse(s.posts[0].body as string).master).toBe(sub);
});

function registrationResponseFixture(overrides:Record<string,unknown>={},statusOverrides:Record<string,unknown>={},minimal=false){
 const s=server(),owner=privateKeyToAccount(generatePrivateKey()),sub=privateKeyToAccount(generatePrivateKey()).address,agent=privateKeyToAccount(generatePrivateKey()).address;
 const record={master:sub,owner:owner.address,isSubaccount:true,agent,state:"paused",hasKey:true};let posts=0,reads=0;
 const fetcher=(async(url:string,options:RequestInit={})=>{
  const op=new URL(String(url)).searchParams.get("op");
  if(op==="nonce")return Response.json(s.nonce());
  if(options.method){posts++;return Response.json(minimal?{registered:true,...overrides}:{...record,...overrides});}
  reads++;return Response.json({registered:true,...record,...statusOverrides});
 }) as typeof fetch;
 const run=()=>signedCall("register",{master:sub,agent},{master:sub,owner:owner.address,sign:r=>owner.signTypedData(r),assertAccount:()=>{},fetcher,api:"https://example.com/api/copybot"});
 return {run,owner,sub,agent,counts:()=>({posts,reads})};
}
it("accepts the documented full registration record without registered:true after matching target, owner and agent",async()=>{
 const fixture=registrationResponseFixture();const result=await fixture.run();expect(result).toMatchObject({registered:true,master:fixture.sub,owner:fixture.owner.address,agent:fixture.agent,state:"paused",hasKey:true});expect(fixture.counts()).toEqual({posts:1,reads:0});
});
it.each(["master","owner","agent"])("rejects a registration response with mismatched %s instead of hiding it with a status fallback",async field=>{
 const fixture=registrationResponseFixture({[field]:privateKeyToAccount(generatePrivateKey()).address});await expect(fixture.run()).rejects.toThrow("different registration account, owner or agent");expect(fixture.counts()).toEqual({posts:1,reads:0});
});
it("verifies a minimal legacy registration acknowledgement with one status read and no repeated mutation",async()=>{
 const fixture=registrationResponseFixture({}, {}, true);expect((await fixture.run()).registered).toBe(true);expect(fixture.counts()).toEqual({posts:1,reads:1});
});
it.each([{hasKey:false},{state:"active"},{owner:undefined},{agent:undefined}])("does not accept an unverified registration record (%j)",async missing=>{
 const fixture=registrationResponseFixture(missing,missing);await expect(fixture.run()).rejects.toThrow("could not be verified");expect(fixture.counts()).toEqual({posts:1,reads:1});
});
it("does not accept an explicit unregistered acknowledgement",async()=>{
 const fixture=registrationResponseFixture({registered:false});await expect(fixture.run()).rejects.toThrow("different registration account, owner or agent");expect(fixture.counts()).toEqual({posts:1,reads:0});
});

it("requests uncached status with a fresh URL while retaining cancellation",async()=>{
 const {getStatus}=await import("@/lib/auto-trader/api");const account=privateKeyToAccount(generatePrivateKey()).address;
 const fetcher=vi.fn(async()=>Response.json({registered:true,master:account}));const controller=new AbortController();
 await getStatus(account,controller.signal,fetcher);
 const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
 expect(new URL(url).searchParams.has("_ts")).toBe(true);expect(new URL(url).searchParams.get("addr")).toBe(account);
 expect(options.cache).toBe("no-store");expect(options.signal).toBe(controller.signal);
});
