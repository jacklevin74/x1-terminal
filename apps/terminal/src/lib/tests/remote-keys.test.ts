import {expect,it,vi} from "vitest";
import {keccak256,toBytes,type Address,type Hex} from "viem";
import {getRemoteKeys,parseKeysStatus,remoteAgentApprovalName,remoteKeysMutation,KEYS_DOMAIN,KEYS_TYPES,type KeysAuthRequest} from "@/lib/remote-keys/api";
import {agentApprovalCurrent} from "@/lib/trade/api-wallets";
const owner=`0x${"11".repeat(20)}` as Address,account=`0x${"22".repeat(20)}` as Address,agent=`0x${"33".repeat(20)}` as Address;
const signature=`0x${"44".repeat(65)}` as Hex;
const row=()=>({id:"test-agent",agent,name:"Remote test",state:"awaiting_approval",createdAt:Date.now(),validUntil:Date.now()+86400000,lastSignedAt:null});
const status=()=>({version:1,supported:true,owner,account,region:"us-east-2",canCreate:true,agents:[row()]});
const nonce={nonce:"a".repeat(32),domain:KEYS_DOMAIN,types:KEYS_TYPES};
const response=(body:unknown,ok=true)=>({ok,json:async()=>body}) as Response;
it("validates owner, selected subaccount and region without reusing another account",()=>{
 expect(parseKeysStatus(status(),owner,account).account).toBe(account);
 expect(()=>parseKeysStatus(status(),owner,owner)).toThrow("account");
 expect(()=>parseKeysStatus({...status(),region:"us-east-1"},owner,account)).toThrow();
 expect(()=>parseKeysStatus({...status(),agents:[row(),row()]},owner,account)).toThrow("records");
});
it("uses the same-origin proxy and refuses an unsupported backend",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response({},false));await expect(getRemoteKeys(owner,account,undefined,fetcher)).rejects.toThrow("not connected");
 expect(fetcher).toHaveBeenCalledOnce();expect(fetcher.mock.calls[0]?.[0]).toContain(`/api/copybot?op=kms-status&addr=${account}`);
});
it("owner signs a body bound to the selected account, without passing secret fields",async()=>{
 const result={...status(),createdAgentId:"test-agent"};
 const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(response(nonce)).mockResolvedValueOnce(response(result));
 const sign=vi.fn(async(_request:KeysAuthRequest)=>signature),assertAccount=vi.fn();
 await remoteKeysMutation("kms-create",{name:"Remote test",days:30,privateKey:"must-never-send",awsSecretAccessKey:"must-never-send"},{owner,account,sign,assertAccount,fetcher});
 const raw=fetcher.mock.calls[1][1]!.body as string;
 expect(JSON.parse(raw)).toEqual({master:account,owner,name:"Remote test",days:30});
 const auth=sign.mock.calls[0][0];expect(auth.account).toBe(owner);expect(auth.message.target).toBe(account);expect(auth.message.bodyHash).toBe(keccak256(toBytes(raw)));
 expect(fetcher.mock.calls[1][0]).toContain("op=kms-create");expect(assertAccount.mock.calls.length).toBeGreaterThan(2);
});
it("never posts after account change or an unexpected signing domain",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response(nonce));
 const sign=vi.fn(async()=>signature);let checks=0;
 await expect(remoteKeysMutation("kms-create",{name:"Remote test",days:30},{owner,account,fetcher,sign,assertAccount:()=>{if(++checks===3)throw Error("account changed");}})).rejects.toThrow("account changed");
 expect(fetcher).toHaveBeenCalledOnce();
 fetcher.mockClear();fetcher.mockResolvedValue(response({...nonce,domain:{name:"Other",version:"1"}}));sign.mockClear();
 await expect(remoteKeysMutation("kms-create",{name:"Remote test",days:30},{owner,account,fetcher,sign,assertAccount:()=>{}})).rejects.toThrow("authentication");expect(sign).not.toHaveBeenCalled();
});
it("registration confirms exactly the requested agent in paused state",async()=>{
 const result=status();result.agents[0].state="paused";
 const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(response(nonce)).mockResolvedValueOnce(response(result));
 await expect(remoteKeysMutation("kms-register",{id:"test-agent",agent},{owner,account,fetcher,sign:async()=>signature,assertAccount:()=>{}})).resolves.toMatchObject({account});
 result.agents[0].state="approved";fetcher.mockResolvedValueOnce(response(nonce)).mockResolvedValueOnce(response(result));
 await expect(remoteKeysMutation("kms-register",{id:"test-agent",agent},{owner,account,fetcher,sign:async()=>signature,assertAccount:()=>{}})).rejects.toThrow("paused state");
});
it("treats a null expiry as a current non-expiring approval and keeps disabled signing closed",()=>{
 expect(parseKeysStatus({...status(),agents:[{...row(),validUntil:null,state:"awaiting_approval"}]},owner,account).agents[0].validUntil).toBeNull();
 expect(agentApprovalCurrent(null)).toBe(true);expect(agentApprovalCurrent(Date.now()-1)).toBe(false);
 const name=remoteAgentApprovalName(agent,null);expect(name).toBe(`X1K${agent.slice(2,14).toLowerCase()}`);expect(name.length).toBeLessThanOrEqual(16);expect(name).not.toContain("valid_until");
 const expiring=remoteAgentApprovalName(agent,Date.now()+86400000);expect(expiring.replace(/ valid_until \d+$/,"")).toHaveLength(name.length);expect(expiring).toContain("valid_until");
 expect(()=>parseKeysStatus({...status(),supported:false},owner,account)).toThrow();
});
it("keeps setup closed when the service explicitly disables KMS",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response({version:1,supported:false,owner,account}));
 await expect(getRemoteKeys(owner,account,undefined,fetcher)).rejects.toThrow("Remote signing is disabled.");
});
it("does not retry ambiguous creation or disclose backend errors",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(response(nonce)).mockResolvedValueOnce(response({error:"sensitive backend internals"},false));
 await expect(remoteKeysMutation("kms-create",{name:"Remote test",days:30},{owner,account,fetcher,sign:async()=>signature,assertAccount:()=>{}})).rejects.toThrow("no automatic retry");expect(fetcher).toHaveBeenCalledTimes(2);
});
