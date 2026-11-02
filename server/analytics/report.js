import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { decodeLz4 } from "./lz4.js";
import { aggregateFills, parseFills, validateFill } from "./aggregate.js";
const DEFAULT_BUILDER="0x95e1642b6c06e06e6ad9412a90e908dcb09f6c1a";
export function dataDirectory() {return resolve(process.env.BUILDER_ANALYTICS_DATA_DIR || (process.env.VERCEL === "1" ? "server/analytics/published" : "data/analytics"));}
export function reportParams(search) {
 const from=search.get("from"),to=search.get("to");
 const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 if((from&&!valid(from))||(to&&!valid(to))||(from&&to&&from>to))throw new Error("Use valid inclusive UTC from/to dates.");
 const limit=Number(search.get("limit")??100),offset=Number(search.get("offset")??0);
 if(!Number.isSafeInteger(limit)||limit<1||limit>500||!Number.isSafeInteger(offset)||offset<0)throw new Error("limit must be 1–500 and offset must be nonnegative.");
 const address=search.get("address")?.toLowerCase();if(address&&!/^0x[\da-f]{40}$/.test(address))throw new Error("Invalid Hyperliquid address.");
 const builder=(process.env.BUILDER_ANALYTICS_ADDRESS||process.env.VITE_BUILDER_ADDRESS||DEFAULT_BUILDER).toLowerCase();
 if(!/^0x[\da-f]{40}$/.test(builder)||/^0x0{40}$/.test(builder))throw new Error("Invalid builder analytics address.");
 return {from,to,builder,limit,offset,address};
}
export function parseLocalFile(name,bytes) {
 if(name.endsWith(".csv.lz4"))return parseFills(decodeLz4(bytes));
 if(name.endsWith(".csv"))return parseFills(bytes.toString("utf8"));
 const data=JSON.parse(bytes.toString("utf8"));const rows=Array.isArray(data)?data:data?.fills;
 if(!Array.isArray(rows))throw new Error("JSON must contain a fills array");
 return rows.map(row=>validateFill({...row,user:row.user??row.address,closedPnl:row.closedPnl??row.closed_pnl,builderFee:Object.hasOwn(row,"builderFee")?row.builderFee:row.builder_fee}));
}
export async function buildReport(params,directory=dataDirectory()) {
 const folder=resolve(directory,"fills");let names=[];
 try {names=(await readdir(folder,{withFileTypes:true})).filter(file=>file.isFile() && /\.(csv|csv\.lz4|json)$/.test(file.name)).map(file=>file.name).sort();}
 catch(error) {if(error.code!=="ENOENT")throw new Error("Cannot read local analytics files");}
 if(names.length>500)throw new Error("Too many local files; consolidate them before reading");
 let quotes=Object.create(null),metadataAvailable=false;const warnings=[];
 try {const bytes=await readFile(resolve(directory,"quotes.json"));if(bytes.length>1024*1024)throw new Error();quotes=JSON.parse(bytes);if(!quotes || typeof quotes!=="object" || Array.isArray(quotes) || Object.values(quotes).some(v=>typeof v!=="string"))throw new Error();metadataAvailable=true;}
 catch(error) {if(error.code!=="ENOENT")warnings.push("Local quotes.json is invalid; values remain grouped by market.");quotes=Object.create(null);}
 const fills=[],files=[],seen=new Set();let duplicates=0,totalBytes=0;
 for(const name of names) {
  try {
   const path=resolve(folder,name);const size=(await stat(path)).size;totalBytes+=size;
   if(size>32*1024*1024 || totalBytes>64*1024*1024)throw new Error("Local file size limit exceeded");
   const rows=parseLocalFile(name,await readFile(path));if(fills.length+rows.length>200000)throw new Error("Local fill count limit exceeded");
   let included=0;
   for(const fill of rows) {
    if(fill.builder && String(fill.builder).toLowerCase()!==params.builder)continue;
    if((params.from && fill.time<Date.parse(params.from)) || (params.to && fill.time>=Date.parse(params.to)+86400000))continue;
    if(fill.tid!==undefined){const id=`${fill.user}:${fill.tid}`;if(seen.has(id)){duplicates++;continue;}seen.add(id);}
    fills.push(fill);included++;
   }
   files.push({name:basename(name),status:"loaded",fills:rows.length,included});
  }catch(error){files.push({name:basename(name),status:"invalid",reason:error instanceof Error ? error.message.slice(0,160) : "Cannot read file"});}
 }
 let collection=null;
 try {const saved=JSON.parse(await readFile(resolve(directory,"collection.json"),"utf8"));if(saved.source==="quicknode_sql" && saved.builder===params.builder)collection=saved;}catch{}
 const loaded=files.filter(f=>f.status==="loaded").length;
 const report=aggregateFills(fills,quotes);const selected=params.address?report.users.filter(u=>u.address===params.address):report.users;
 const users=selected.slice(params.offset,params.offset+params.limit);
 const missingCollectionState=!collection && files.some(file=>file.name.startsWith("quicknode-"));
 const collectionIncomplete=missingCollectionState || collection?.run && collection.run.status!=="succeeded";
 const dataStatus=collectionIncomplete?"collection_incomplete":!files.length?"missing_local_data":!loaded?"invalid_local_data":files.some(f=>f.status==="invalid")?"partial":report.userCount?"ready":"empty";
 const message={collection_incomplete:missingCollectionState?"Collector snapshot metadata is missing. The last collection cannot be verified; rerun analytics:collect.":collection?.run?.status==="failed"?`Collection failed on ${collection.run.failedDay}: ${collection.run.error}`:"Collection is still running; shown records are incomplete.",missing_local_data:"No local fill files have been imported. Add CSV or JSON files with analytics:import.",invalid_local_data:"Local files could not be read. Inspect coverage.files.",partial:"Some local files are invalid; totals cover readable files only.",empty:"Local files contain no fills matching this request.",ready:"Serving imported local fill files. No network requests were made."}[dataStatus];
 return {schemaVersion:3,source:"local_files",collection,dataStatus,message,generatedAt:new Date().toISOString(),network:"mainnet",builder:params.builder,scope:"imported local fills; builder attribution is supplied by the files",window:{from:params.from,to:params.to,timeZone:"UTC"},coverage:{complete:loaded>0&&!collectionIncomplete&&files.every(f=>f.status==="loaded"),scope:"local_files_only",metadataAvailable,files,duplicatesSkipped:duplicates,deduplication:"Only records with a trader address and trade ID are deduplicated; other records are retained.",warnings},definitions:{realizedPnl:"Sum of imported closedPnl, before fees; excludes funding and unrealized PNL. Per-user totals are sums of recorded nominal values, without conversion.",builderFeesPaid:"Sum of imported builderFee. Exchange and total fees are unknown.",currencies:"quotes.json maps market names to quote tokens. Unknown currencies stay grouped by market.",users:"All addresses present in the matching local fill records; not independently discovered network users."},userCount:loaded&&(!collectionIncomplete||report.userCount>0)?report.userCount:null,fillCount:loaded&&(!collectionIncomplete||report.fillCount>0)?report.fillCount:null,totalsByQuoteToken:loaded?report.totalsByQuoteToken:null,pagination:{offset:params.offset,limit:params.limit,matchedUsers:loaded?selected.length:null,nextOffset:params.offset+users.length<selected.length?params.offset+users.length:null},users};
}
