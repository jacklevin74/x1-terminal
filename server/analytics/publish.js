import { localSnapshot, MAX_SNAPSHOT_BYTES } from "./remote.js";
import { reportParams } from "./report.js";
export async function publishAnalytics({target=process.env.ANALYTICS_REMOTE_URL,secret=process.env.ANALYTICS_PUBLISH_TOKEN,fetcher=fetch,directory}={}) {
 if(!target)throw new Error("Set ANALYTICS_REMOTE_URL to your production Vercel URL in .env.");
 let url;try{url=new URL("/api/analytics-update",target);}catch{throw new Error("Invalid ANALYTICS_REMOTE_URL.");}
 if(url.protocol!=="https:" && !(url.protocol==="http:" && ["localhost","127.0.0.1"].includes(url.hostname)))throw new Error("Use HTTPS for remote publishing.");
 if(url.username || url.password)throw new Error("Do not embed credentials in the remote URL.");
 if(!secret || secret.length<32)throw new Error("Set a publish token of at least 32 characters in local and Vercel environments.");
 const snapshot=await localSnapshot(reportParams(new URLSearchParams()),directory);const body=JSON.stringify(snapshot);if(Buffer.byteLength(body)>MAX_SNAPSHOT_BYTES)throw new Error("Snapshot exceeds remote publishing size limit.");
 let response;try{response=await fetcher(url.href,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${secret}`},body,redirect:"error",signal:AbortSignal.timeout(45000)});}catch{throw new Error("Cannot reach the remote publish endpoint. Local files are unchanged.");}
 const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`Publish failed (HTTP ${response.status}): ${result.error || "check remote configuration"}`);
 if(result.ok!==true)throw new Error("Remote endpoint did not confirm publishing.");return result;
}
