import { neonDatabaseUrl, readNeonSnapshot, writeNeonSnapshot } from "./neon.js";
import { timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { aggregateFills, validateFill } from "./aggregate.js";
import { buildReport, dataDirectory, parseLocalFile } from "./report.js";
export const MAX_SNAPSHOT_BYTES=3*1024*1024;
export class RemoteError extends Error {constructor(message,status=503){super(message);this.status=status;}}
export function authorizedPublish(header,secret=process.env.ANALYTICS_PUBLISH_TOKEN) {
 if(!secret || secret.length<32)return false;
 const candidate=typeof header==="string" && header.startsWith("Bearer ")?header.slice(7):"";
 if(!candidate || candidate.length>512)return false;
 const digest=value=>createHash("sha256").update(value).digest();return timingSafeEqual(digest(candidate),digest(secret));
}
function validDate(value){return typeof value==="string" && Number.isFinite(Date.parse(value));}
export function validateSnapshot(input,builder) {
 if(!input || input.schemaVersion!==1 || input.builder!==builder || !validDate(input.createdAt) || !Array.isArray(input.fills) || input.fills.length>20000 || input.fills.length===0)throw new RemoteError("Invalid analytics snapshot.",400);
 const seen=new Set();const fills=[];
 for(const row of input.fills){
  let value;try{value=validateFill(row);}catch{throw new RemoteError("Snapshot contains an invalid fill.",400);}
  if(value.builder && String(value.builder).toLowerCase()!==builder)throw new RemoteError("Snapshot belongs to another account.",400);
  if(value.tid!==undefined){const id=`${value.user}:${value.tid}`;if(seen.has(id))continue;seen.add(id);}
  const safe={};for(const key of ["time","user","coin","px","sz","closedPnl","builderFee","tid"])if(value[key]!==undefined)safe[key]=value[key];safe.builder=builder;fills.push(safe);
 }
 const quotes=Object.create(null);
 if(input.quotes && typeof input.quotes==="object" && !Array.isArray(input.quotes))for(const [market,token] of Object.entries(input.quotes)){if(market.length>100 || typeof token!=="string" || !/^[a-zA-Z0-9._-]{1,32}$/.test(token))throw new RemoteError("Invalid snapshot metadata.",400);quotes[market]=token;}
 let collection=null;
 if(input.collection){
  const c=input.collection,r=c.run;
  if(c.builder!==builder || !Array.isArray(c.snapshots??[]) || !validDate(c.collectedAt) || r?.status!=="succeeded" || !/^\d{4}-\d{2}-\d{2}$/.test(r.from) || !/^\d{4}-\d{2}-\d{2}$/.test(r.to))throw new RemoteError("Publish a completed collection.",400);
  collection={source:c.source==="quicknode_sql"?"quicknode_sql":"local_import",builder,collectedAt:c.collectedAt,coverageNote:"Remote snapshot; source indexing may lag.",run:{from:r.from,to:r.to,status:"succeeded"},snapshots:(c.snapshots??[]).slice(0,500).map(s=>({date:String(s.date).slice(0,10),fills:Number.isSafeInteger(s.fills)?s.fills:0,includesCurrentDay:Boolean(s.includesCurrentDay)}))};
 }
 return {schemaVersion:1,builder,createdAt:input.createdAt,publishedAt:input.publishedAt&&validDate(input.publishedAt)?input.publishedAt:null,fills,quotes,collection};
}
export async function localSnapshot(params,directory=dataDirectory()) {
 const report=await buildReport(params,directory);if(!report.coverage.complete)throw new RemoteError("Finish the local collection before publishing.",400);
 const fills=[];for(const file of report.coverage.files)fills.push(...parseLocalFile(file.name,await readFile(resolve(directory,"fills",file.name))));
 let quotes={};try{quotes=JSON.parse(await readFile(resolve(directory,"quotes.json"),"utf8"));}catch{}
 return validateSnapshot({schemaVersion:1,builder:params.builder,createdAt:new Date().toISOString(),fills,quotes,collection:report.collection},params.builder);
}
function blobSettings(builder,token) {
 const store=token?.startsWith("vercel_blob_rw_")?token.split("_")[3]:"";
 if(!/^[a-zA-Z0-9-]{1,64}$/.test(store))throw new RemoteError("Connect a private Vercel Blob store to enable updates.");
 const pathname=`x1-analytics/${builder}.json`;
 return {store,pathname,url:`https://${store}.private.blob.vercel-storage.com/${pathname}?cache=0`};
}
async function boundedJson(response) {
 if(Number(response.headers.get("content-length"))>MAX_SNAPSHOT_BYTES)throw new RemoteError("Snapshot exceeds size limit.",413);
 const chunks=[];let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;if(bytes>MAX_SNAPSHOT_BYTES)throw new RemoteError("Snapshot exceeds size limit.",413);chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new RemoteError("Stored analytics snapshot is invalid.");}
}
// Token-based HTTP protocol used by @vercel/blob 2.8 (API version 12).
// Private downloads use cache=0, matching the SDK's useCache:false behavior.
export async function readRemoteSnapshot(builder,{fetcher=fetch,token=process.env.BLOB_READ_WRITE_TOKEN,databaseUrl=neonDatabaseUrl()}={}) {
 if(databaseUrl){try{const snapshot=await readNeonSnapshot(builder,{fetcher,databaseUrl});return snapshot?{snapshot:validateSnapshot(snapshot,builder),etag:null}:null;}catch{throw new RemoteError("Neon analytics storage is unavailable.");}}
 const {url}=blobSettings(builder,token);let response;
 try{response=await fetcher(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)});}catch{throw new RemoteError("Remote analytics storage is unavailable.");}
 if(response.status===404)return null;if(!response.ok)throw new RemoteError("Cannot read remote analytics storage.");
 return {snapshot:validateSnapshot(await boundedJson(response),builder),etag:response.headers.get("etag")};
}
export async function writeRemoteSnapshot(snapshot,{fetcher=fetch,token=process.env.BLOB_READ_WRITE_TOKEN,databaseUrl=neonDatabaseUrl()}={}) {
 if(databaseUrl){
  const saved={...validateSnapshot(snapshot,snapshot.builder),publishedAt:new Date().toISOString()};
  if(Buffer.byteLength(JSON.stringify(saved))>MAX_SNAPSHOT_BYTES)throw new RemoteError("Snapshot is too large to publish.",413);
  let result;try{result=await writeNeonSnapshot(saved,{fetcher,databaseUrl});}catch{throw new RemoteError("Could not publish to Neon. Check DATABASE_URL and database permissions.");}
  if(!result)throw new RemoteError("A newer collection is already published.",409);
  return validateSnapshot(result,snapshot.builder);
 }
 const {store,pathname}=blobSettings(snapshot.builder,token);const current=await readRemoteSnapshot(snapshot.builder,{fetcher,token});
 const stamp=s=>s.collection?.collectedAt || s.createdAt;
 if(current && Date.parse(stamp(snapshot))<Date.parse(stamp(current.snapshot)))throw new RemoteError("A newer collection is already published.",409);
 if(current && !current.etag)throw new RemoteError("Storage did not provide a version for safe publishing.");
 const saved={...snapshot,publishedAt:new Date().toISOString()};const body=JSON.stringify(saved);if(Buffer.byteLength(body)>MAX_SNAPSHOT_BYTES)throw new RemoteError("Snapshot is too large to publish.",413);
 const headers={Authorization:`Bearer ${token}`,"Content-Type":"application/json","x-api-version":"12","x-api-blob-request-id":`${store}:${Date.now()}:${randomUUID()}`,"x-api-blob-request-attempt":"0","x-vercel-blob-store-id":store,"x-vercel-blob-access":"private","x-content-type":"application/json","x-content-length":String(Buffer.byteLength(body)),"x-add-random-suffix":"0","x-allow-overwrite":current?"1":"0","x-cache-control-max-age":"60"};if(current)headers["x-if-match"]=current.etag;
 let response;try{response=await fetcher(`https://vercel.com/api/blob/?${new URLSearchParams({pathname})}`,{method:"PUT",headers,body,redirect:"error",signal:AbortSignal.timeout(20000)});}catch{throw new RemoteError("Could not publish snapshot. Existing data remains available.");}
 if(response.status===409 || response.status===412)throw new RemoteError("Another update completed first. Retry publishing.",409);
 if(!response.ok)throw new RemoteError("Remote storage rejected the snapshot. Existing data is unchanged.");
 return saved;
}
export function snapshotReport(snapshot,params) {
 const seen=new Set();const fills=snapshot.fills.filter(fill=>{
  if((params.from&&fill.time<Date.parse(params.from))||(params.to&&fill.time>=Date.parse(params.to)+86400000))return false;
  if(fill.tid!==undefined){const id=`${fill.user}:${fill.tid}`;if(seen.has(id))return false;seen.add(id);}return true;
 });
 const report=aggregateFills(fills,snapshot.quotes);const selected=params.address?report.users.filter(user=>user.address===params.address):report.users;const users=selected.slice(params.offset,params.offset+params.limit);
 return {schemaVersion:3,source:"remote_snapshot",publishedAt:snapshot.publishedAt,generatedAt:new Date().toISOString(),dataStatus:report.userCount?"ready":"empty",message:"Serving the remotely published snapshot.",network:"mainnet",builder:params.builder,collection:snapshot.collection,window:{from:params.from,to:params.to,timeZone:"UTC"},coverage:{complete:true,scope:"published_snapshot",metadataAvailable:!!Object.keys(snapshot.quotes).length,files:[{name:"Published snapshot",status:"loaded",fills:snapshot.fills.length,included:fills.length}],warnings:[]},...report,users,pagination:{offset:params.offset,limit:params.limit,matchedUsers:selected.length,nextOffset:params.offset+users.length<selected.length?params.offset+users.length:null}};
}
