import {expect,it,vi} from "vitest";
import {createEc2Key,parseEc2Keys,ec2KeysLocalHost,EC2_KEYS_DOMAIN,EC2_KEYS_TYPES} from "@/lib/ec2-keys/api";
import {keccak256,toBytes} from "viem";
const owner=`0x${"ab".repeat(20)}` as const,agent=`0x${"cd".repeat(20)}` as const;
const status={version:1,supported:true,region:"us-east-2",owner,canCreate:true,pending:0,capabilities:{create:true,sign:false,register:false},agents:[{id:"key-id",name:"X1 KMS",agent,state:"awaiting_approval",createdAt:1,validUntil:9999999999999}],createdAgentId:"key-id"};
it("checks owner/capabilities and strips server-only metadata",()=>{
 expect(()=>parseEc2Keys({...status,owner:agent},owner)).toThrow("owner");expect(()=>parseEc2Keys({...status,capabilities:{create:true,sign:true,register:false}},owner)).toThrow("capabilities");
 const result=parseEc2Keys({...status,awsSecret:"test-only",agents:[{...status.agents[0],kmsKeyId:"server-only"}]},owner);expect(result).not.toHaveProperty("awsSecret");expect(result.agents[0]).not.toHaveProperty("kmsKeyId");
});
it("signs the exact creation body and does not retry a failed POST",async()=>{
 const calls:{url:string;init?:RequestInit}[]=[],sign=vi.fn().mockResolvedValue(`0x${"11".repeat(65)}`),assertOwner=vi.fn();
 const fetcher=vi.fn(async(url,init)=>{calls.push({url:String(url),init});return new Response(JSON.stringify(calls.length===1?{nonce:"a".repeat(32),domain:EC2_KEYS_DOMAIN,types:EC2_KEYS_TYPES}:status));}) as typeof fetch;
 const result=await createEc2Key({owner,name:"X1 KMS",days:30,sign,assertOwner,fetcher});expect(result.agents[0].agent).toBe(agent);
 const raw=calls[1].init!.body as string;expect(sign.mock.calls[0][0].message).toMatchObject({action:"create",target:owner,bodyHash:keccak256(toBytes(raw))});expect(calls[1].init?.method).toBe("POST");expect(JSON.parse(raw)).toEqual({owner,name:"X1 KMS",days:30});
 const failed=vi.fn(async(_url,init)=>new Response(JSON.stringify(init?.method==="POST"?{error:"KMS creation was not confirmed"}:{nonce:"a".repeat(32),domain:EC2_KEYS_DOMAIN,types:EC2_KEYS_TYPES}),{status:init?.method==="POST"?503:200})) as typeof fetch;
 await expect(createEc2Key({owner,name:"X1 KMS",days:30,sign,assertOwner,fetcher:failed})).rejects.toThrow("not confirmed");expect(failed).toHaveBeenCalledTimes(2);
});
it("refuses a mismatched nonce domain before requesting a signature",async()=>{
 const sign=vi.fn(),fetcher=vi.fn(async()=>new Response(JSON.stringify({nonce:"a".repeat(32),domain:{name:"Other",version:"1"},types:EC2_KEYS_TYPES}))) as typeof fetch;
 await expect(createEc2Key({owner,name:"X1 KMS",days:30,sign,assertOwner:()=>{},fetcher})).rejects.toThrow("authorization configuration");expect(sign).not.toHaveBeenCalled();
});

it("keeps the workstation tunnel limited to localhost hosts",()=>{expect(ec2KeysLocalHost("localhost")).toBe(true);expect(ec2KeysLocalHost("127.0.0.1")).toBe(true);expect(ec2KeysLocalHost("x1-terminal-20261029.vercel.app")).toBe(false);expect(ec2KeysLocalHost("localhost.example.com")).toBe(false);});
