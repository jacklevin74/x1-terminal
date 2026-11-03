import { readFile } from "node:fs/promises";
import { createX1AgentClient } from "./x1-agent-client.mjs";
const args=process.argv.slice(2),command=args.shift();
try{
 if(!["status","order","cancel"].includes(command))throw new Error("Usage: node --env-file=.env.agent apps/terminal/scripts/x1-agent.mjs status | order --file request.json [--execute] | cancel --file request.json [--execute]");
 let filename,execute=false;
 while(args.length){const flag=args.shift();if(flag==="--execute")execute=true;else if(flag==="--file"&&args.length)filename=args.shift();else throw new Error("Unknown or incomplete option.");}
 const client=createX1AgentClient({ownerAddress:process.env.X1_ACCOUNT_ADDRESS,privateKey:process.env.X1_AGENT_PRIVATE_KEY,network:process.env.X1_NETWORK??"mainnet"});
 if(command==="status"){if(execute||filename)throw new Error("status takes no options.");console.log(JSON.stringify(await client.status(),null,2));}
 else{if(!filename)throw new Error("Supply --file request.json. Preview is the default; add --execute to submit.");const input=JSON.parse(await readFile(filename,"utf8"));console.log(JSON.stringify(await client[command](input,{execute}),null,2));}
}catch(error){const key=process.env.X1_AGENT_PRIVATE_KEY;let message=error instanceof Error?error.message:"Agent command failed.";if(key)message=message.replaceAll(key,"[REDACTED]");console.error(message);process.exitCode=1;}
