import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { authorizedPublish, validateSnapshot, writeRemoteSnapshot, readRemoteSnapshot, snapshotReport } from "../server/analytics/remote.js";
import { publishAnalytics } from "../server/analytics/publish.js";
import { reportParams } from "../server/analytics/report.js";
import update from "../api/analytics-update.js";
import users from "../api/builder-users.js";
const builder=reportParams(new URLSearchParams()).builder,user=`0x${"ab".repeat(20)}`;
const secret="a".repeat(64),token="vercel_blob_rw_teststore_private-token";
const snapshot=()=>({schemaVersion:1,builder,createdAt:new Date().toISOString(),fills:[{time:1793318400000,user,coin:"HYPE",px:"100",sz:"1",closedPnl:"2",builderFee:"0.05",tid:"1",builder}],quotes:{},collection:null});
function storeMock() {
 let stored=null,version=0;const calls=[];
 const fetcher=async(url,options={})=>{
  const address=new URL(url);calls.push({url:String(url),method:options.method??"GET"});
  assert.equal(options.headers.Authorization,`Bearer ${token}`);
  if(address.hostname.endsWith(".private.blob.vercel-storage.com")) {assert.equal(address.searchParams.get("cache"),"0");return stored?Response.json(stored,{headers:{etag:`"${version}"`}}):new Response(null,{status:404});}
  assert.equal(address.origin+address.pathname,"https://vercel.com/api/blob/");assert.equal(options.method,"PUT");assert.equal(options.headers["x-vercel-blob-access"],"private");assert.equal(options.headers["x-api-version"],"12");
  if(stored && options.headers["x-if-match"]!==`"${version}"`)return new Response(null,{status:412});
  stored=JSON.parse(options.body);version++;return Response.json({url:"https://teststore.private.blob.vercel-storage.com/file"});
 };
 return {fetcher,calls,get:()=>stored};
}
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(raw){this.body=JSON.parse(raw);}};}
async function environment(run){const names=["ANALYTICS_PUBLISH_TOKEN","BLOB_READ_WRITE_TOKEN","VERCEL"];const original=Object.fromEntries(names.map(n=>[n,process.env[n]]));const fetch=globalThis.fetch;
 try{process.env.ANALYTICS_PUBLISH_TOKEN=secret;process.env.BLOB_READ_WRITE_TOKEN=token;process.env.VERCEL="1";await run();}finally{globalThis.fetch=fetch;for(const name of names)if(original[name]===undefined)delete process.env[name];else process.env[name]=original[name];}
}
test("publish authorization never accepts missing or incorrect credentials",()=>{assert.equal(authorizedPublish(undefined,secret),false);assert.equal(authorizedPublish("Bearer wrong",secret),false);assert.equal(authorizedPublish(`Bearer ${secret}`,secret),true);assert.equal(authorizedPublish(`Bearer ${secret}`,"short"),false);});
test("snapshot validation strips extra fields and rejects wrong builders or invalid fills",()=>{
 const input=snapshot();input.secret="must-not-persist";input.fills[0].privateKey="must-not-persist";const safe=validateSnapshot(input,builder);assert.equal(JSON.stringify(safe).includes("must-not-persist"),false);
 assert.throws(()=>validateSnapshot({...snapshot(),builder:user},builder));assert.throws(()=>validateSnapshot({...snapshot(),fills:[]},builder));assert.throws(()=>validateSnapshot({...snapshot(),fills:[{...snapshot().fills[0],builder:user}]},builder));
});
test("Blob publishing persists across reads and prevents older snapshots overwriting newer data",async()=>{
 const store=storeMock();const first=await writeRemoteSnapshot(validateSnapshot(snapshot(),builder),{fetcher:store.fetcher,token});assert.ok(first.publishedAt);const read=await readRemoteSnapshot(builder,{fetcher:store.fetcher,token});assert.equal(read.snapshot.fills.length,1);
 const next={...snapshot(),createdAt:new Date(Date.now()+1000).toISOString(),fills:[{...snapshot().fills[0],closedPnl:"3"}]};await writeRemoteSnapshot(validateSnapshot(next,builder),{fetcher:store.fetcher,token});assert.equal(store.get().fills[0].closedPnl,"3");
 await assert.rejects(writeRemoteSnapshot({...snapshot(),createdAt:"2020-01-01T00:00:00Z"},{fetcher:store.fetcher,token}),error=>error.status===409);assert.equal(store.get().fills[0].closedPnl,"3");
});
test("protected endpoint rejects unauthorized/oversized requests before storage",async()=>environment(async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error();};
 let res=response();await update({method:"POST",headers:{},body:snapshot()},res);assert.equal(res.statusCode,401);assert.equal(calls,0);
 res=response();await update({method:"GET",headers:{}},res);assert.equal(res.statusCode,405);
 res=response();await update({method:"POST",headers:{authorization:`Bearer ${secret}`,"content-type":"application/json","content-length":"99999999"},body:snapshot()},res);assert.equal(res.statusCode,413);assert.equal(calls,0);
}));
test("uploaded data is served by a fresh API handler without exposing storage/publish tokens",async()=>environment(async()=>{
 const store=storeMock();globalThis.fetch=store.fetcher;
 let res=response();await update({method:"POST",headers:{authorization:`Bearer ${secret}`,"content-type":"application/json"},body:snapshot()},res);assert.equal(res.statusCode,200);assert.equal(res.body.users,1);
 res=response();await users({method:"GET",url:"/api/builder-users"},res);assert.equal(res.statusCode,200);assert.equal(res.body.source,"remote_snapshot");assert.equal(res.body.users[0].totals.realizedPnl,"2");assert.equal(JSON.stringify(res.body).includes(secret),false);assert.equal(JSON.stringify(res.body).includes(token),false);
 const fresh=(await import(`../api/builder-users.js?fresh=${Date.now()}`)).default;res=response();await fresh({method:"GET",url:"/api/builder-users"},res);assert.equal(res.body.fillCount,1);
}));
test("storage failure leaves the prior snapshot intact and does not claim success",async()=>{
 const store=storeMock();await writeRemoteSnapshot(validateSnapshot(snapshot(),builder),{fetcher:store.fetcher,token});
 await assert.rejects(writeRemoteSnapshot(validateSnapshot(snapshot(),builder),{fetcher:async(url,options)=>options?.method==="PUT"?new Response(null,{status:500}):store.fetcher(url,options),token}));assert.equal(store.get().fills[0].closedPnl,"2");
});
test("remote report applies UTC window/address filters and pagination",()=>{
 const s=validateSnapshot(snapshot(),builder);assert.equal(snapshotReport(s,reportParams(new URLSearchParams(`address=${user}`))).users.length,1);assert.equal(snapshotReport(s,reportParams(new URLSearchParams("from=2030-01-01"))).fillCount,0);
});
test("publish command sends only sanitized snapshot data over authenticated HTTPS",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"x1-publish-"));try{await mkdir(join(dir,"fills"));await writeFile(join(dir,"fills","test.json"),JSON.stringify(snapshot().fills));let called=false;
 const result=await publishAnalytics({target:"https://example.vercel.app/analytics",secret,directory:dir,fetcher:async(url,options)=>{called=true;assert.equal(url,"https://example.vercel.app/api/analytics-update");assert.equal(options.headers.Authorization,`Bearer ${secret}`);assert.equal(options.body.includes(secret),false);return Response.json({ok:true,users:1,fills:1,publishedAt:new Date().toISOString()});}});assert.equal(called,true);assert.equal(result.fills,1);
 await assert.rejects(publishAnalytics({target:"http://example.com",secret,directory:dir}),/HTTPS/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test("Neon stores parameterized snapshots, reads fresh data and rejects stale updates",async()=>{
 const databaseUrl="postgresql://user:secret@ep-example.us-east-2.aws.neon.tech/analytics?sslmode=require";
 let stored=null,created=false;
 const fetcher=async(url,options)=>{
  assert.equal(url,"https://api.us-east-2.aws.neon.tech/sql");assert.equal(options.headers["Neon-Connection-String"],databaseUrl);assert.equal(options.headers["Neon-Array-Mode"],"true");
  const {query,params}=JSON.parse(options.body);assert.equal(query.includes("user:secret"),false);
  if(query.startsWith("CREATE TABLE")){created=true;return Response.json({rows:[]});}
  if(query.startsWith("SELECT"))return Response.json({rows:stored?[[JSON.stringify(stored)]]:[]});
  assert.equal(created,true);assert.ok(query.includes("$3::jsonb"));assert.ok(query.includes("collected_at <= EXCLUDED.collected_at"));
  const incoming=JSON.parse(params[2]);if(stored&&Date.parse(params[1])<Date.parse(stored.createdAt))return Response.json({rows:[]});stored=incoming;return Response.json({rows:[[JSON.stringify(stored)]]});
 };
 const saved=await writeRemoteSnapshot(validateSnapshot(snapshot(),builder),{databaseUrl,fetcher});assert.ok(saved.publishedAt);
 const read=await readRemoteSnapshot(builder,{databaseUrl,fetcher});assert.equal(read.snapshot.fills.length,1);
 await assert.rejects(writeRemoteSnapshot({...snapshot(),createdAt:"2020-01-01T00:00:00Z"},{databaseUrl,fetcher}),error=>error.status===409);
});
test("Neon credentials and database errors are never exposed in failures",async()=>{
 const databaseUrl="postgresql://user:private-password@ep-example.us-east-2.aws.neon.tech/db";
 await assert.rejects(writeRemoteSnapshot(snapshot(),{databaseUrl,fetcher:async()=>Response.json({code:"42501",message:databaseUrl},{status:400})}),error=>!error.message.includes("private-password")&&error.status===503);
 await assert.rejects(readRemoteSnapshot(builder,{databaseUrl:"postgresql://u:p@attacker.example/db",fetcher:()=>{throw new Error("must not request");}}),/unavailable/);
});
