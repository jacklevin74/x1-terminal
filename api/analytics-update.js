import { authorizedPublish, MAX_SNAPSHOT_BYTES, validateSnapshot, writeRemoteSnapshot } from "../server/analytics/remote.js";
import { reportParams } from "../server/analytics/report.js";
async function requestJson(req) {
 if(Number(req.headers["content-length"])>MAX_SNAPSHOT_BYTES)throw Object.assign(new Error("Snapshot is too large."),{status:413});
 let raw;
 if(req.body!==undefined)raw=typeof req.body==="string"?req.body:JSON.stringify(req.body);
 else{const parts=[];let size=0;for await(const part of req){const bytes=Buffer.from(part);size+=bytes.length;if(size>MAX_SNAPSHOT_BYTES)throw Object.assign(new Error("Snapshot is too large."),{status:413});parts.push(bytes);}raw=Buffer.concat(parts).toString("utf8");}
 if(Buffer.byteLength(raw)>MAX_SNAPSHOT_BYTES)throw Object.assign(new Error("Snapshot is too large."),{status:413});
 try{return JSON.parse(raw);}catch{throw Object.assign(new Error("Invalid JSON snapshot."),{status:400});}
}
export default async function analyticsUpdate(req,res) {
 res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");
 const reply=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
 if(req.method!=="POST"){res.setHeader("Allow","POST");reply(405,{error:"Method not allowed"});return;}
 if(!process.env.ANALYTICS_PUBLISH_TOKEN || process.env.ANALYTICS_PUBLISH_TOKEN.length<32){reply(503,{error:"Remote publishing is not configured."});return;}
 if(!authorizedPublish(req.headers.authorization)){reply(401,{error:"Unauthorized"});return;}
 if(!String(req.headers["content-type"]??"").toLowerCase().startsWith("application/json")){reply(415,{error:"Send an application/json snapshot."});return;}
 try {
  const {builder}=reportParams(new URLSearchParams());const snapshot=validateSnapshot(await requestJson(req),builder);const saved=await writeRemoteSnapshot(snapshot);
  reply(200,{ok:true,publishedAt:saved.publishedAt,fills:saved.fills.length,users:new Set(saved.fills.map(fill=>fill.user)).size});
 }catch(error){reply(error.status || 503,{error:error.status?error.message:"Unable to publish analytics. Existing data was preserved."});}
}
