import { readdir, readFile, mkdir, writeFile, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { buildReport, reportParams, dataDirectory, parseLocalFile } from "../server/analytics/report.js";
const directory=dataDirectory();const report=await buildReport(reportParams(new URLSearchParams()),directory);
if(!report.coverage.complete || !report.userCount)throw new Error("Collect valid analytics data before deploying the leaderboard. Run npm run analytics:collect.");
const fills=[];
for(const file of report.coverage.files){const rows=parseLocalFile(file.name,await readFile(resolve(directory,"fills",file.name)));for(const row of rows){const safe={};for(const key of ["time","user","coin","px","sz","closedPnl","builderFee","tid","builder"])if(row[key]!==undefined)safe[key]=row[key];fills.push(safe);}}
const output=new URL("../server/analytics/published/",import.meta.url);const stage=new URL("../server/analytics/published-stage/",import.meta.url);
await rm(stage,{recursive:true,force:true});await mkdir(new URL("fills/",stage),{recursive:true});
await writeFile(new URL("fills/snapshot.json",stage),JSON.stringify(fills,null,2)+"\n");
if(report.collection)await writeFile(new URL("collection.json",stage),JSON.stringify(report.collection,null,2)+"\n");
try{const quotes=JSON.parse(await readFile(resolve(directory,"quotes.json"),"utf8"));if(quotes && !Array.isArray(quotes) && Object.values(quotes).every(value=>typeof value==="string"))await writeFile(new URL("quotes.json",stage),JSON.stringify(quotes,null,2)+"\n");}catch{}
await rm(output,{recursive:true,force:true});await rename(stage,output);
console.log(`Prepared public leaderboard snapshot: ${report.userCount} traders, ${report.fillCount} fills. No credentials included.`);
