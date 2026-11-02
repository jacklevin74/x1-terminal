import { readRemoteSnapshot, snapshotReport } from "../server/analytics/remote.js";
import { buildReport, reportParams } from "../server/analytics/report.js";
export default async function builderUsers(req,res) {
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET"){res.setHeader("Allow","GET");res.statusCode=405;res.end(JSON.stringify({error:"Method not allowed"}));return;}
 let params;
 try {params=reportParams(new URL(req.url,"http://localhost").searchParams);}catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message}));return;}
 try {
  if((process.env.ANALYTICS_DATABASE_URL || process.env.DATABASE_URL || process.env.BLOB_READ_WRITE_TOKEN) && (process.env.VERCEL === "1" || process.env.ANALYTICS_USE_REMOTE === "true")) {
   const remote=await readRemoteSnapshot(params.builder);
   if(remote){res.statusCode=200;res.end(JSON.stringify(snapshotReport(remote.snapshot,params),null,2));return;}
  }
  const report=await buildReport(params);res.statusCode=report.dataStatus==="invalid_local_data"?422:200;res.end(JSON.stringify(report,null,2));}
 catch {res.statusCode=503;res.end(JSON.stringify({error:"Analytics data is temporarily unavailable. Retry later."}));}
}
