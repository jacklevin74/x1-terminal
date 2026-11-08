// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {privateKeyToAccount} from "viem/accounts";
import {hashTypedData,parseSignature,type Hex} from "viem";
import {getDemoKeys,demoKeysMutation,DEMO_OWNER} from "@/lib/remote-keys/demo";
const signer=privateKeyToAccount(`0x${"01".repeat(32)}`);
const row={id:"demo",agent:signer.address,name:"Demo",state:"awaiting_approval",createdAt:Date.now(),validUntil:Date.now()+86400000,lastSignedAt:null,provider:"kms"};
const status=()=>({version:1,supported:true,mode:"local-demo",owner:DEMO_OWNER,account:DEMO_OWNER,region:"us-east-2",canCreate:true,csrf:"a".repeat(64),agents:[row]});
afterEach(()=>vi.unstubAllGlobals());
it("uses only the local proxy with a demo session token and no wallet signature",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(status())));vi.stubGlobal("fetch",fetcher);
 const result=await getDemoKeys(DEMO_OWNER,DEMO_OWNER);expect(result.mode).toBe("local-demo");
 fetcher.mockResolvedValue(new Response(JSON.stringify(status())));
 await demoKeysMutation("create",{name:"Demo",days:30,provider:"mock"},DEMO_OWNER,DEMO_OWNER,result.csrf);
 expect(String(fetcher.mock.calls[1][0])).toContain("/api/local-keys?op=create");
 expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({"x-local-keys-token":"a".repeat(64)});
});
it("independently verifies the KMS proof and rejects another agent's signature",async()=>{
 const domain={name:"X1RemoteKeysDemo",version:"1",chainId:1337};
 const types={Proof:[{name:"account",type:"address"},{name:"challenge",type:"bytes32"},{name:"timestamp",type:"uint64"}]} as const;
 const message={account:DEMO_OWNER,challenge:`0x${"ab".repeat(32)}` as Hex,timestamp:BigInt(Date.now())};
 const signed=await signer.signTypedData({domain,types,primaryType:"Proof",message}),sig=parseSignature(signed);
 const proof={verified:true,provider:"kms",message:{...message,timestamp:Number(message.timestamp)},digest:hashTypedData({domain,types,primaryType:"Proof",message}),signature:{r:sig.r,s:sig.s,v:Number(sig.v)},recovered:signer.address,ms:150};
 const result={...status(),proof};const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(result)));vi.stubGlobal("fetch",fetcher);
 await expect(demoKeysMutation("sign",{id:"demo"},DEMO_OWNER,DEMO_OWNER,"a".repeat(64))).resolves.toHaveProperty("proof.verified",true);
 result.agents=[{...row,agent:DEMO_OWNER}];fetcher.mockResolvedValue(new Response(JSON.stringify(result)));
 await expect(demoKeysMutation("sign",{id:"demo"},DEMO_OWNER,DEMO_OWNER,"a".repeat(64))).rejects.toThrow("does not match");
});
