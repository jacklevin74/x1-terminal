import { createServer } from "node:http";
import { serveAnalytics } from "../server/analytics/http.js";
const port=Number(process.env.ANALYTICS_PORT||8788);
createServer((req,res)=>{void serveAnalytics(req,res).catch(()=>{res.statusCode=500;res.end(JSON.stringify({error:"Request failed"}));});})
 .listen(port,"127.0.0.1",()=>console.log(`Analytics table: http://localhost:${port}/analytics\nAnalytics JSON: http://localhost:${port}/api/builder-users`));
