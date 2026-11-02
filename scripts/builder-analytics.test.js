import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { decodeLz4 } from "../server/analytics/lz4.js";
import { add, parseFills, aggregateFills } from "../server/analytics/aggregate.js";
import { reportParams, buildReport, parseLocalFile } from "../server/analytics/report.js";
const user=`0x${"ab".repeat(20)}`,other=`0x${"cd".repeat(20)}`;
const header="time,user,coin,px,sz,closed_pnl,builder_fee,tid";
const csv=`${header}\n2026-10-29T00:00:00Z,${user},BTC,100,2,5,0.1,1\n2026-10-29T00:01:00Z,${user.toUpperCase().replace("0X","0x")},BTC,101,1,-2,0.05,2\n2026-10-30T00:02:00Z,${other},@1,10,3,1,0.01,3\n`;
function frame(content,compressed=false) {const block=Buffer.isBuffer(content)?content:Buffer.from(content);const size=Buffer.alloc(4);size.writeUInt32LE(block.length+(compressed?0:0x80000000));return Buffer.concat([Buffer.from([4,34,77,24,96,64,0]),size,block,Buffer.alloc(4)]);}
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),"x1-analytics-"));try{await mkdir(join(dir,"fills"));await run(dir);}finally{await rm(dir,{recursive:true,force:true});}}
const params=query=>reportParams(new URLSearchParams(query));
test("LZ4 literal, compressed, concatenated frames and invalid bounds",()=>{
 assert.equal(decodeLz4(frame("abc")),"abc");assert.equal(decodeLz4(frame(Buffer.from([0x32,97,98,99,3,0,0x60,...Buffer.from("XYZ123")]),true)),"abcabcabcXYZ123");
 assert.equal(decodeLz4(Buffer.concat([frame("abc"),frame("def")])),"abcdef");assert.throws(()=>decodeLz4(frame("abc"),2));assert.throws(()=>decodeLz4(frame(Buffer.from([0,0,0]),true)));
});
test("exact amounts and currency separation",()=>{
 const report=aggregateFills(parseFills(csv),{BTC:"USDC","@1":"SOL"});assert.equal(report.userCount,2);assert.equal(report.users[0].byQuoteToken.USDC.realizedPnl,"3");assert.equal(report.users[0].byQuoteToken.USDC.builderFeesPaid,"0.15");assert.equal(report.totalsByQuoteToken.SOL.builderFeesPaid,"0.01");assert.equal(add("9007199254740993.000000000000000001","0.000000000000000001"),"9007199254740993.000000000000000002");
});
test("local CSV, LZ4 and JSON formats validate required fields",()=>{
 assert.equal(parseLocalFile("fills.csv",Buffer.from(csv)).length,3);assert.equal(parseLocalFile("fills.csv.lz4",frame(csv)).length,3);
 const fills=parseFills(csv);assert.equal(parseLocalFile("fills.json",Buffer.from(JSON.stringify({fills}))).length,3);
 assert.throws(()=>parseLocalFile("bad.json",Buffer.from('{}')));assert.throws(()=>parseFills(csv.replace(",0.1,",",invalid,")));assert.throws(()=>parseFills(csv.replace(user,"invalid")));
});
test("reads local files with no network calls and reflects file changes immediately",async()=>fixture(async dir=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw new Error("Network must not be called");};
 try{await writeFile(join(dir,"fills","fills.csv"),csv);await writeFile(join(dir,"quotes.json"),JSON.stringify({BTC:"USDC","@1":"SOL"}));let report=await buildReport(params("limit=1"),dir);assert.equal(report.source,"local_files");assert.equal(report.userCount,2);assert.equal(report.users.length,1);assert.equal(report.pagination.nextOffset,1);assert.equal(report.dataStatus,"ready");await rm(join(dir,"fills","fills.csv"));report=await buildReport(params(""),dir);assert.equal(report.dataStatus,"missing_local_data");assert.equal(report.userCount,null);}finally{globalThis.fetch=original;}
}));
test("local UTC date and address filters and explicit trade ID deduplication",async()=>fixture(async dir=>{
 await writeFile(join(dir,"fills","one.csv"),csv);await writeFile(join(dir,"fills","duplicate.json"),JSON.stringify(parseFills(csv)));
 const report=await buildReport(params(`from=2026-10-29&to=2026-10-29&address=${user}`),dir);assert.equal(report.fillCount,2);assert.equal(report.coverage.duplicatesSkipped,2);assert.equal(report.users.length,1);assert.equal(report.users[0].byMarket.BTC.volume,"301");
}));
test("invalid files produce partial coverage instead of fake zero users",async()=>fixture(async dir=>{
 await writeFile(join(dir,"fills","bad.csv"),"broken");let report=await buildReport(params(""),dir);assert.equal(report.dataStatus,"invalid_local_data");assert.equal(report.userCount,null);await writeFile(join(dir,"fills","good.csv"),csv);report=await buildReport(params(""),dir);assert.equal(report.dataStatus,"partial");assert.equal(report.userCount,2);
}));
test("imports are idempotent and do not require RPC credentials",async()=>fixture(async dir=>{
 const path=join(dir,"source.csv");await writeFile(path,csv);
 for(let i=0;i<2;i++){const result=spawnSync(process.execPath,["scripts/import-analytics.js",path],{env:{...process.env,BUILDER_ANALYTICS_DATA_DIR:dir},encoding:"utf8"});assert.equal(result.status,0,result.stderr);}
 const report=await buildReport(params(""),dir);assert.equal(report.coverage.files.length,1);assert.equal(report.fillCount,3);
}));
test("JSON handler serves local records and rejects invalid queries",async()=>fixture(async dir=>{
 const original=process.env.BUILDER_ANALYTICS_DATA_DIR;process.env.BUILDER_ANALYTICS_DATA_DIR=dir;
 try{await writeFile(join(dir,"fills","fills.csv"),csv);const {default:handler}=await import("../api/builder-users.js");
 for(const [method,url,status] of [["GET","/api/builder-users",200],["POST","/api/builder-users",405],["GET","/api/builder-users?limit=999",400]]){let body;const res={setHeader:()=>{},end:value=>body=JSON.parse(value)};await handler({method,url},res);assert.equal(res.statusCode,status);if(status===200)assert.equal(body.userCount,2);else assert.equal(typeof body.error,"string");}
 }finally{if(original===undefined)delete process.env.BUILDER_ANALYTICS_DATA_DIR;else process.env.BUILDER_ANALYTICS_DATA_DIR=original;}
}));

test("SQL collector validates dates and generates a bounded builder-specific query",async()=>{
 const {collectionParams,fillsQuery}=await import("../server/analytics/collect.js");
 const p=collectionParams(new URLSearchParams("from=2026-10-29&to=2026-10-30"),new Date("2026-10-31"));assert.equal(p.days.length,2);
 assert.throws(()=>collectionParams(new URLSearchParams("from=2026-01-01&to=2026-10-30"),new Date("2026-10-31")));
 assert.throws(()=>fillsQuery("invalid' OR 1=1","2026-10-29","2026-10-30T00:00:00Z",0));
 const sql=fillsQuery(p.builder,p.from,"2026-10-30T00:00:00Z",1000);assert.match(sql,/hyperliquid_builder_fills/);assert.match(sql,/LIMIT 1000 OFFSET 1000/);assert.match(sql,/toString\(f\.builder_fee\)/);
});
test("SQL collector paginates to local snapshots and refreshes without duplicating fills",async()=>fixture(async dir=>{
 const {collectionParams,collectToFiles}=await import("../server/analytics/collect.js");
 const p=collectionParams(new URLSearchParams("from=2026-10-29&to=2026-10-29"),new Date("2026-10-31"));let calls=0;
 const makeRow=i=>({time:String(Date.parse("2026-10-29T00:00:00Z")+i),user,coin:"BTC",px:"100",sz:"1",closedPnl:"0",builderFee:"0.05",tid:String(i),builder:p.builder});
 const fetcher=async(url,options)=>{calls++;assert.equal(url,"https://api.quicknode.com/sql/rest/v1/query");assert.equal(options.headers["x-api-key"],"test-key");assert.equal(options.body.includes("test-key"),false);const offset=Number(JSON.parse(options.body).query.match(/OFFSET (\d+)/)[1]);const data=offset===0?Array.from({length:1000},(_,i)=>makeRow(i)):[makeRow(1000)];return Response.json({data,rows:data.length});};
 const result=await collectToFiles(p,{directory:dir,fetcher,key:"test-key"});assert.equal(calls,2);assert.equal(result.fills,1001);
 let report=await buildReport(params(""),dir);assert.equal(report.fillCount,1001);assert.equal(report.collection.source,"quicknode_sql");
 await collectToFiles(p,{directory:dir,fetcher,key:"test-key"});report=await buildReport(params(""),dir);assert.equal(report.coverage.files.length,1);assert.equal(report.fillCount,1001);
 assert.equal(JSON.stringify(report).includes("test-key"),false);
}));
test("SQL collector preserves an existing snapshot when later pages fail",async()=>fixture(async dir=>{
 const {collectionParams,collectToFiles}=await import("../server/analytics/collect.js");const {readFile}=await import("node:fs/promises");
 const p=collectionParams(new URLSearchParams("from=2026-10-29&to=2026-10-29"),new Date("2026-10-31"));
 const file=join(dir,"fills",`quicknode-${p.builder}-2026-10-29.json`);await writeFile(file,"[]\n");let calls=0;
 const fetcher=async()=>{if(calls++)return new Response(null,{status:503});return Response.json({data:Array.from({length:1000},(_,i)=>({time:String(Date.parse("2026-10-29")),user,coin:"BTC",px:"100",sz:"1",closedPnl:"0",builderFee:"0.01",tid:String(i),builder:p.builder}))});};
 await assert.rejects(collectToFiles(p,{directory:dir,fetcher,key:"test-key"}),/HTTP 503/);assert.equal(await readFile(file,"utf8"),"[]\n");
 await assert.rejects(collectToFiles(p,{directory:dir,key:""}),/QUICKNODE_SQL_API_KEY/);
}));

test("empty builder table falls back to attributed raw fills and saves provenance",async()=>fixture(async dir=>{
 const {collectionParams,collectToFiles}=await import("../server/analytics/collect.js");
 const p=collectionParams(new URLSearchParams("from=2026-10-30&to=2026-10-30"),new Date("2026-10-31"));
 const fetcher=async(_url,options)=>{const query=JSON.parse(options.body).query;return Response.json({data:query.includes("FROM hyperliquid_builder_fills")?[]:[{time:String(Date.parse("2026-10-30T04:38:17Z")),user,coin:"HYPE",px:"92.326",sz:"1.95",closedPnl:"0",builderFee:null,tid:"123",builder:p.builder}]});};
 await collectToFiles(p,{directory:dir,fetcher,key:"test-key"});const report=await buildReport(params(""),dir);
 assert.equal(report.userCount,1);assert.equal(report.collection.snapshots[0].dataset,"hyperliquid_fills");assert.equal(report.users[0].byMarket.HYPE.builderFeesPaid,null);
}));
test("an interrupted multi-day run cannot report complete zero-user coverage",async()=>fixture(async dir=>{
 const {collectionParams,collectToFiles}=await import("../server/analytics/collect.js");
 const p=collectionParams(new URLSearchParams("from=2026-10-29&to=2026-10-30"),new Date("2026-10-31"));
 const fetcher=async(_url,options)=>JSON.parse(options.body).query.includes("2026-10-29 00:00:00")?Response.json({data:[]}):new Response(null,{status:503});
 await assert.rejects(collectToFiles(p,{directory:dir,fetcher,key:"test-key"}),/HTTP 503/);
 const report=await buildReport(params(""),dir);assert.equal(report.dataStatus,"collection_incomplete");assert.equal(report.coverage.complete,false);assert.equal(report.userCount,null);assert.equal(report.collection.run.failedDay,"2026-10-30");
}));
test("SQL failures redact credentials and reject error envelopes",async()=>{
 const {sqlRows}=await import("../server/analytics/collect.js");
 await assert.rejects(sqlRows("SELECT 1",{key:"QN_test_secret",fetcher:async()=>Response.json({message:"Rejected QN_test_secret"},{status:401})}),error=>/HTTP 401/.test(error.message)&&!error.message.includes("QN_test_secret"));
 await assert.rejects(sqlRows("SELECT 1",{key:"test-key",fetcher:async()=>Response.json({data:[],error:"Query error"})}),/query error/);
});

test("legacy empty collector files without a run manifest do not establish zero users",async()=>fixture(async dir=>{
 await writeFile(join(dir,"fills","quicknode-legacy-2026-10-29.json"),"[]");
 const report=await buildReport(params(""),dir);assert.equal(report.dataStatus,"collection_incomplete");assert.equal(report.coverage.complete,false);assert.equal(report.userCount,null);assert.match(report.message,/metadata is missing/);
}));

test("raw-fill WHERE/ORDER BY use source columns instead of the string time alias",async()=>{
 const {fillsQuery}=await import("../server/analytics/collect.js");
 const sql=fillsQuery(`0x${"ab".repeat(20)}`,"2026-10-29","2026-10-30T00:00:00Z",0,"hyperliquid_fills");
 assert.match(sql,/toUnixTimestamp64Milli\(f\.time\)\) AS time/);
 assert.match(sql,/FROM hyperliquid_fills AS f WHERE f\.builder/);
 assert.match(sql,/AND f\.time >= toDateTime/);
 assert.match(sql,/ORDER BY f\.time, f\.tid, f\.user/);
 assert.doesNotMatch(sql,/AND time >=/);
});

test("analytics HTTP routes serve the table and only whitelisted assets",async()=>{
 const {serveAnalytics}=await import("../server/analytics/http.js");
 for(const [url,status,type] of [["/analytics",200,"text/html"],["/",200,"text/html"],["/analytics.js",200,"text/javascript"],["/analytics.css",200,"text/css"],["/.env",404,null]]) {
  let body;const headers={};const res={setHeader:(k,v)=>headers[k]=v,end:bytes=>body=bytes?.toString()};
  await serveAnalytics({method:"GET",url},res);assert.equal(res.statusCode,status);if(type)assert.ok(headers["Content-Type"].startsWith(type));if(url==="/analytics")assert.match(body,/Leaderboard/);
 }
});
