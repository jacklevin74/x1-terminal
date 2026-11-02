import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
try {
 const value=process.argv[2] || process.env.ANALYTICS_REMOTE_URL;
 if(!value)throw new Error("Usage: npm run analytics:remote-setup -- https://your-project.vercel.app");
 const url=new URL(value);if(url.protocol!=="https:" || url.username || url.password)throw new Error("Use your production HTTPS URL without credentials.");
 const secret=process.env.ANALYTICS_PUBLISH_TOKEN || randomBytes(32).toString("hex");if(secret.length<32)throw new Error("Publish token must contain at least 32 characters.");
 let text="";try{text=await readFile(".env","utf8");}catch{}
 for(const [name,val] of [["ANALYTICS_REMOTE_URL",url.origin],["ANALYTICS_PUBLISH_TOKEN",secret]])text=text.split(/\r?\n/).filter(line=>!line.startsWith(name+"=")).join("\n").trimEnd()+`\n${name}=${val}\n`;
 await writeFile(".env",text,{mode:0o600});
 const child=spawnSync("npx",["--yes","vercel@65.8.0","env","add","ANALYTICS_PUBLISH_TOKEN","--environment","production","--sensitive","--force","--project",process.env.VERCEL_PROJECT_ID || "x1-terminal-20261029","--yes"],{input:secret,stdio:["pipe","inherit","inherit"],shell:process.platform==="win32"});
 if(child.error || child.status!==0)throw new Error("Local publish settings were saved, but Vercel could not be configured. Check CLI login/connectivity and rerun setup.");
 console.log("Remote URL saved and publish token synchronized with Vercel. Connect Neon with DATABASE_URL (or a private Blob store), deploy once, then run npm run analytics:sync.");
}catch(error){console.error(error instanceof Error?error.message:"Remote setup failed");process.exitCode=1;}
