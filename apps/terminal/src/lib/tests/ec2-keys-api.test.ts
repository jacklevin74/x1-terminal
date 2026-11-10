import {expect,it,vi} from "vitest";
import {createEc2Key,getEc2Keys,manageEc2Key,parseEc2Keys,EC2_KEYS_DOMAIN,EC2_KEYS_TYPES} from "@/lib/ec2-keys/api";
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
const disabledStatus=(over:Record<string,unknown>={})=>({...status,createdAgentId:undefined,updatedAgentId:"key-id",capabilities:{create:true,manage:true,sign:false,register:false},agents:[{...status.agents[0],state:"disabled"}],...over});
const nonceReply={nonce:"b".repeat(32),domain:EC2_KEYS_DOMAIN,types:EC2_KEYS_TYPES};
it("parses management states, deletion dates and update ids strictly",()=>{
 const parsed=parseEc2Keys(disabledStatus({agents:[{...status.agents[0],state:"pending_deletion",deletionDate:5,arn:"arn:aws:kms:x"}]}),owner);
 expect(parsed.agents[0]).toEqual({id:"key-id",name:"X1 KMS",agent,state:"pending_deletion",createdAt:1,validUntil:9999999999999,deletionDate:5});expect(parsed.capabilities.manage).toBe(true);expect(JSON.stringify(parsed)).not.toContain("arn:");
 expect(()=>parseEc2Keys(disabledStatus({agents:[{...status.agents[0],state:"signing"}]}),owner)).toThrow("invalid key record");
 expect(()=>parseEc2Keys(disabledStatus({updatedAgentId:"other-id"}),owner)).toThrow("unknown key id");
 expect(()=>parseEc2Keys(disabledStatus({agents:[{...status.agents[0],state:"pending_deletion",deletionDate:"soon"}]}),owner)).toThrow("invalid key record");
 expect(parseEc2Keys({...status,capabilities:{create:true,sign:false,register:false}},owner).capabilities.manage).toBe(false);
});
it("signs management bodies with the op as action and the record id in the body",async()=>{
 const calls:{url:string;init?:RequestInit}[]=[],sign=vi.fn().mockResolvedValue(`0x${"11".repeat(65)}`);
 const fetcher=vi.fn(async(url,init)=>{calls.push({url:String(url),init});return new Response(JSON.stringify(calls.length===1?nonceReply:disabledStatus()));}) as typeof fetch;
 const result=await manageEc2Key({op:"disable",owner,id:"key-id",sign,assertOwner:()=>{},fetcher});expect(result.agents[0].state).toBe("disabled");
 expect(calls[1].url).toContain("op=disable");expect(calls[1].init?.method).toBe("POST");const raw=calls[1].init!.body as string;expect(JSON.parse(raw)).toEqual({id:"key-id",owner});
 expect(sign.mock.calls[0][0].message).toMatchObject({action:"disable",target:owner,bodyHash:keccak256(toBytes(raw))});
 const renamed=vi.fn(async(_u,init)=>new Response(JSON.stringify(init?.method==="POST"?disabledStatus({agents:[{...status.agents[0],name:"New",state:"awaiting_approval"}]}):nonceReply))) as typeof fetch;
 await manageEc2Key({op:"rename",owner,id:"key-id",name:"New",sign,assertOwner:()=>{},fetcher:renamed});expect(sign.mock.calls[1][0].message.action).toBe("rename");expect(JSON.parse((renamed as any).mock.calls[1][1].body)).toEqual({id:"key-id",name:"New",owner});
});
it("refuses unconfirmed management results and invalid inputs without retrying",async()=>{
 const sign=vi.fn().mockResolvedValue(`0x${"11".repeat(65)}`);
 const stale=vi.fn(async(_u,init)=>new Response(JSON.stringify(init?.method==="POST"?disabledStatus({agents:[{...status.agents[0],state:"awaiting_approval"}]}):nonceReply))) as typeof fetch;
 await expect(manageEc2Key({op:"disable",owner,id:"key-id",sign,assertOwner:()=>{},fetcher:stale})).rejects.toThrow("not confirmed");expect(stale).toHaveBeenCalledTimes(2);
 const denied=vi.fn(async(_u,init)=>new Response(JSON.stringify(init?.method==="POST"?{error:"Only the key owner can change this key."}:nonceReply),{status:init?.method==="POST"?403:200})) as typeof fetch;
 await expect(manageEc2Key({op:"delete",owner,id:"key-id",sign,assertOwner:()=>{},fetcher:denied})).rejects.toThrow("Only the key owner");expect(denied).toHaveBeenCalledTimes(2);
 const unused=vi.fn() as unknown as typeof fetch;
 await expect(manageEc2Key({op:"rename",owner,id:"key-id",name:" bad name!",sign,assertOwner:()=>{},fetcher:unused})).rejects.toThrow("Choose a name");
 await expect(manageEc2Key({op:"delete",owner,id:"key-id",days:3,sign,assertOwner:()=>{},fetcher:unused})).rejects.toThrow("7 to 30");expect(unused).not.toHaveBeenCalled();
});
it("reports the EC2 service as unavailable without mentioning SSH",async()=>{
 const down=vi.fn(async()=>new Response("<html>bad gateway</html>",{status:502})) as typeof fetch;
 await expect(getEc2Keys(owner,undefined,down)).rejects.toThrow("EC2 key service unavailable.");
 const leaky=vi.fn(async()=>new Response(JSON.stringify({error:"arn:aws:kms:us-east-2:1:key/x denied"}),{status:403})) as typeof fetch;
 await expect(getEc2Keys(owner,undefined,leaky)).rejects.toThrow("EC2 key service unavailable.");
});
