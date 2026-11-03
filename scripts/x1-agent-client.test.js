import {test} from "node:test";
import assert from "node:assert/strict";
import {createX1AgentClient,X1_BUILDER} from "../apps/terminal/scripts/x1-agent-client.mjs";
const privateKey=`0x${"11".repeat(32)}`,ownerAddress=`0x${"ab".repeat(20)}`,agent="0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a";
function setup({approved=true,fee=50,response={status:"ok",response:{data:{statuses:[{resting:{oid:1}}]}}}}={}){
 const queries=[],writes=[];const info={extraAgents:async p=>{queries.push(p);return approved?[{address:agent,validUntil:Date.now()+60000}]:[];},maxBuilderFee:async p=>{queries.push(p);return fee;},clearinghouseState:async p=>{queries.push(p);return {};},spotClearinghouseState:async p=>{queries.push(p);return {};},frontendOpenOrders:async p=>{queries.push(p);return [];}};
 const exchange={order:async p=>{writes.push(p);return response;},cancel:async p=>{writes.push(p);return response;}};
 return {client:createX1AgentClient({ownerAddress,privateKey,clients:{info,exchange}}),queries,writes};
}
const input={orders:[{a:0,b:true,p:"60000",s:"0.0002",r:false,t:{limit:{tif:"Alo"}}}],grouping:"na"};
test("uses owner for all Info requests; status never signs",async()=>{const s=setup();const status=await s.client.status();assert.equal(status.agentApproved,true);assert.equal(s.writes.length,0);assert.ok(s.queries.every(q=>q.user===ownerAddress));assert.equal(status.builderFeePercent,"0.05%");assert.equal(JSON.stringify(status).includes(privateKey),false);});
test("previews by default and forces the terminal builder on executed orders",async()=>{const s=setup();const preview=await s.client.order({...input,builder:{b:ownerAddress,f:0}});assert.equal(preview.dryRun,true);assert.equal(s.writes.length,0);await s.client.order(input,{execute:true});assert.deepEqual(s.writes[0].builder,X1_BUILDER);});
test("requires current agent and fee approval before any signed order",async()=>{for(const options of [{approved:false},{fee:0}]){const s=setup(options);await assert.rejects(s.client.order(input,{execute:true}));assert.equal(s.writes.length,0);}});
test("cancelling needs agent approval but does not need an order fee approval",async()=>{const s=setup({fee:0});await s.client.cancel({cancels:[{a:0,o:123}]});assert.equal(s.writes.length,0);await s.client.cancel({cancels:[{a:0,o:123}]},{execute:true});assert.equal(s.writes.length,1);});
test("does not retry partial or rejected exchange responses",async()=>{const s=setup({response:{status:"ok",response:{data:{statuses:[{error:"Insufficient margin"}]}}}});await assert.rejects(s.client.order(input,{execute:true}),/Insufficient margin/);assert.equal(s.writes.length,1);});
test("rejects owner keys and unsupported networks",()=>{assert.throws(()=>createX1AgentClient({ownerAddress:agent,privateKey}));assert.throws(()=>createX1AgentClient({ownerAddress,privateKey,network:"other"}));});
