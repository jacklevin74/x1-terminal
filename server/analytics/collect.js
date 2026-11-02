import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { reportParams, dataDirectory } from "./report.js";
import { validateFill } from "./aggregate.js";
const DAY=86400000;
export function collectionParams(search,now=new Date()) {
 const base=reportParams(search);const today=now.toISOString().slice(0,10);
 const from=base.from || process.env.BUILDER_ANALYTICS_START_DATE || "2026-10-29",to=base.to || today;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!Number.isFinite(Date.parse(from))||new Date(from).toISOString().slice(0,10)!==from || from>to || to>today || (Date.parse(to)-Date.parse(from))/DAY>=31)throw new Error("Collect 1–31 valid UTC days, no later than today. Use --from and --to.");
 return {...base,from,to,asOf:now.toISOString(),days:Array.from({length:(Date.parse(to)-Date.parse(from))/DAY+1},(_,i)=>new Date(Date.parse(from)+i*DAY).toISOString().slice(0,10))};
}
export function fillsQuery(builder,day,end,offset,dataset="hyperliquid_builder_fills") {
 if(!["hyperliquid_builder_fills","hyperliquid_fills"].includes(dataset))throw new Error("Invalid collector dataset");
 const builderColumn=dataset==="hyperliquid_fills"?"builder":"builder_address";
 const timeColumn=dataset==="hyperliquid_fills"?"time":"timestamp";
 if(!/^0x[\da-f]{40}$/.test(builder)||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(end)||!Number.isSafeInteger(offset)||offset<0)throw new Error("Invalid collector query parameters");
 const configured=process.env.BUILDER_ANALYTICS_ADDRESS || process.env.VITE_BUILDER_ADDRESS;
 const variants=[builder,...(configured && /^0x[\da-f]{40}$/i.test(configured) && configured.toLowerCase()===builder ? [configured] : [])];
 const addresses=[...new Set(variants)].map(address=>`'${address}'`).join(", ");
 return `SELECT toString(toUnixTimestamp64Milli(f.${timeColumn})) AS time, lower(f.user) AS user, f.coin AS coin, toString(f.price) AS px, toString(f.size) AS sz, toString(f.closed_pnl) AS closedPnl, toString(f.builder_fee) AS builderFee, toString(f.tid) AS tid, lower(f.${builderColumn}) AS builder FROM ${dataset} AS f WHERE f.${builderColumn} IN (${addresses}) AND f.${timeColumn} >= toDateTime('${day} 00:00:00', 'UTC') AND f.${timeColumn} < parseDateTime64BestEffort('${end}', 3, 'UTC') AND f.block_time >= toDateTime('${day} 00:00:00', 'UTC') - INTERVAL 1 DAY AND f.block_time < toDateTime('${day} 00:00:00', 'UTC') + INTERVAL 2 DAY ORDER BY f.${timeColumn}, f.tid, f.user LIMIT 1000 OFFSET ${offset}`;
}
export async function sqlRows(query,{fetcher=fetch,key=process.env.QUICKNODE_SQL_API_KEY}={}) {
 if(!key)throw new Error("Set QUICKNODE_SQL_API_KEY in your ignored .env before collecting.");
 let response;
 try{response=await fetcher("https://api.quicknode.com/sql/rest/v1/query",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json","x-api-key":key},body:JSON.stringify({clusterId:"hyperliquid-core-mainnet",query}),signal:AbortSignal.timeout(30000)});}
 catch{throw new Error("Cannot reach QuickNode SQL Explorer. Check network access and retry.");}
 if(!response.ok) {
  const hint={401:"API key rejected",403:"SQL Explorer access denied",429:"rate or credit limit reached"}[response.status] || "query failed";
  let detail="";
  try {const body=await response.json();const message=body.error?.message || body.message || (typeof body.error==="string"?body.error:"");if(typeof message==="string")detail=message.split(key).join("[redacted]").replace(/QN_[a-zA-Z0-9_-]+/g,"[redacted]").replace(/https?:\/\/\S+/g,"[provider URL]").slice(0,240);}catch{}
  throw new Error(`QuickNode SQL HTTP ${response.status}: ${hint}${detail?` — ${detail}`:""}. No snapshot was replaced.`);
 }
 const payload=await response.json();
 if(payload?.error || payload?.exception)throw new Error("QuickNode SQL returned a query error; existing snapshot preserved.");
 if(!Array.isArray(payload?.data)||payload.data.length>1000 || payload.rows!==undefined && Number(payload.rows)!==payload.data.length)throw new Error("Invalid SQL response; no snapshot was replaced.");
 return payload.data;
}
async function atomicJson(path,value) {
 const temp=`${path}.${process.pid}.tmp`;await writeFile(temp,JSON.stringify(value,null,2)+"\n",{mode:0o600});await rename(temp,path);
}
export async function collectToFiles(params,{directory=dataDirectory(),fetcher=fetch,key=process.env.QUICKNODE_SQL_API_KEY,onProgress=()=>{}}={}) {
 if(!key)throw new Error("Set QUICKNODE_SQL_API_KEY in your ignored .env before collecting.");

 const folder=resolve(directory,"fills");await mkdir(folder,{recursive:true});const snapshots=[];
 let previous={snapshots:[]};try{previous=JSON.parse(await readFile(resolve(directory,"collection.json"),"utf8"));}catch{}
 const merged=new Map((Array.isArray(previous.snapshots)?previous.snapshots:[]).filter(s=>s.file?.startsWith(`quicknode-${params.builder}-`)).map(s=>[s.file,s]));
 const collection={source:"quicknode_sql",builder:params.builder,collectedAt:previous.collectedAt??null,coverageNote:"SQL index freshness is provider-dependent. Current-day snapshots are provisional; rerun to refresh.",snapshots:[],run:{from:params.from,to:params.to,startedAt:params.asOf,status:"running",completedDays:[],failedDay:null,error:null}};
 async function saveState(){collection.snapshots=[...merged.values()].sort((a,b)=>a.date.localeCompare(b.date));await atomicJson(resolve(directory,"collection.json"),collection);}
 await saveState();
 for(const day of params.days) {
  try {
   onProgress({date:day,status:"querying"});
   const nextDay=new Date(Date.parse(day)+DAY).toISOString();const end=nextDay<params.asOf?nextDay:params.asOf;
   async function readDataset(dataset) {
    const records=new Map();let offset=0;
    while(true) {
     const rows=await sqlRows(fillsQuery(params.builder,day,end,offset,dataset),{fetcher,key});
     for(const raw of rows) {
      if(raw.builder!==params.builder)throw new Error("SQL returned records for another builder; existing snapshot preserved.");
      const fill=validateFill(raw);if(fill.time<Date.parse(day)||fill.time>=Date.parse(end))throw new Error("SQL returned an out-of-window record; existing snapshot preserved.");
      if(fill.tid===undefined)throw new Error("SQL fill is missing its trade ID; existing snapshot preserved.");
      records.set(`${fill.user}:${fill.tid}`,fill);
     }
     if(rows.length<1000)break;
     offset+=rows.length;if(offset>=200000)throw new Error("Day exceeds collector page limit. Existing snapshot preserved.");
    }
    return records;
   }
   let dataset="hyperliquid_builder_fills";let records=await readDataset(dataset);
   if(!records.size){dataset="hyperliquid_fills";onProgress({date:day,status:"fallback",dataset});records=await readDataset(dataset);}
   const file=`quicknode-${params.builder}-${day}.json`;await atomicJson(resolve(folder,file),[...records.values()]);
   const snapshot={date:day,file,fills:records.size,asOf:params.asOf,includesCurrentDay:day===params.asOf.slice(0,10),source:"quicknode_sql",dataset};snapshots.push(snapshot);merged.set(file,snapshot);collection.run.completedDays.push(day);collection.collectedAt=new Date().toISOString();await saveState();onProgress({...snapshot,status:"saved"});
  }catch(error){collection.run.status="failed";collection.run.failedDay=day;collection.run.error=error instanceof Error?error.message:"Collection failed";await saveState();throw error;}
 }
 collection.run.status="succeeded";collection.run.finishedAt=new Date().toISOString();await saveState();
 return {days:snapshots.length,fills:snapshots.reduce((total,s)=>total+s.fills,0),collection};
}
