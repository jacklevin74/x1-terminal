import { publishAnalytics } from "../server/analytics/publish.js";
import { collectionParams, collectToFiles } from "../server/analytics/collect.js";
const args=process.argv.slice(2),search=new URLSearchParams();let watch=false,publish=false;
try {
 for(let i=0;i<args.length;i++) {
  if(args[i]==="--publish"){publish=true;continue;}
  if(args[i]==="--watch"){watch=true;continue;}
  if(!["--from","--to"].includes(args[i]) || !args[i+1])throw new Error("Usage: npm run analytics:collect -- [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--watch] [--publish]");
  search.set(args[i].slice(2),args[++i]);
 }
 let stopping=false;process.on("SIGINT",()=>{stopping=true;});process.on("SIGTERM",()=>{stopping=true;});
 do {
  let succeeded=false;
  try {const result=await collectToFiles(collectionParams(search),{onProgress:s=>console.log(s.status === "querying" ? `${s.date}: querying QuickNode…` : s.status === "fallback" ? `${s.date}: builder table empty; checking indexed raw fills…` : `${s.date}: saved ${s.fills} fills`)});console.log(`Collected ${result.fills} fills across ${result.days} days. Local JSON API now sees these files.`);succeeded=true;if(publish){const saved=await publishAnalytics();console.log(`Published ${saved.users} traders and ${saved.fills} fills remotely.`);}}
  catch(error){console.error(error instanceof Error?error.message:"Collection failed");if(!watch){process.exitCode=1;break;}}
  if(!watch || stopping)break;
  // After the initial backfill, refresh yesterday and today to catch delayed indexing.
  const now=new Date(),yesterday=new Date(Date.parse(now.toISOString().slice(0,10))-86400000).toISOString().slice(0,10);
  if(succeeded){search.set("from",yesterday);search.delete("to");}
  await new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);process.off("SIGINT",done);process.off("SIGTERM",done);resolve();};timer=setTimeout(done,300000);process.once("SIGINT",done);process.once("SIGTERM",done);});
 }while(!stopping);
}catch(error){console.error(error instanceof Error?error.message:"Collection failed");process.exitCode=1;}
