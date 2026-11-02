import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createHash } from "node:crypto";
import { dataDirectory, parseLocalFile } from "../server/analytics/report.js";
const files=process.argv.slice(2);
if(!files.length){console.error("Usage: npm run analytics:import -- /path/to/fills.csv [more.csv|fills.json|fills.csv.lz4]");process.exitCode=1;}
else {
 try {
  // Validate every input before adding any files.
  const imports=[];
  for(const path of files){const bytes=await readFile(resolve(path));if(bytes.length>32*1024*1024)throw new Error("Input exceeds 32MB");const fills=parseLocalFile(basename(path),bytes);const content=JSON.stringify(fills,null,2)+"\n";const hash=createHash("sha256").update(content).digest("hex");imports.push({fills,content,hash});}
  const folder=resolve(dataDirectory(),"fills");await mkdir(folder,{recursive:true});
  for(const item of imports){const dest=resolve(folder,`${item.hash}.json`);const temp=`${dest}.${process.pid}.tmp`;await writeFile(temp,item.content);await rename(temp,dest);console.log(`Imported ${item.fills.length} fills into ${basename(dest)} (reimporting identical data does not duplicate it).`);}
 }catch(error){console.error(error instanceof Error?error.message:"Import failed");process.exitCode=1;}
}
