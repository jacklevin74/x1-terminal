// Read-only account audit. No wallet connection, signing or credentials required.
import { add } from "../server/analytics/aggregate.js";
const address=process.argv[2] || "0x95Df02809abd0594E122773DeaB9a72033FeBcD9";
if(!/^0x[\da-f]{40}$/i.test(address))throw new Error("Provide a valid Hyperliquid account address.");
async function info(type){const response=await fetch("https://api.hyperliquid.xyz/info",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,user:address}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();}
const types=["userFills","historicalOrders","frontendOpenOrders","clearinghouseState"];
const results=await Promise.allSettled(types.map(info));
const data=Object.fromEntries(types.map((type,i)=>[type,results[i].status==="fulfilled"?results[i].value:null]));
const failures=Object.fromEntries(types.flatMap((type,i)=>results[i].status==="rejected"?[[type,"Could not fetch account data"]]:[]));
const fills=Array.isArray(data.userFills)?data.userFills.filter(f=>f.coin==="BTC").sort((a,b)=>b.time-a.time).slice(0,30).map(f=>({time:new Date(f.time).toISOString(),direction:f.dir,side:f.side==="B"?"Buy":"Sell",price:f.px,sizeBTC:f.sz,valueAtFillUSD:Number(f.px)*Number(f.sz),positionBeforeBTC:f.startPosition,positionAfterBTC:f.startPosition!==undefined?add(String(f.startPosition),f.side==="B"?f.sz:`-${f.sz}`):null,closedPnl:f.closedPnl,fee:f.fee,orderId:f.oid,tradeId:f.tid,transaction:`https://app.hyperliquid.xyz/explorer/tx/${f.hash}`})):null;
const history=Array.isArray(data.historicalOrders)?data.historicalOrders.filter(row=>row.order?.coin==="BTC").sort((a,b)=>b.statusTimestamp-a.statusTimestamp).slice(0,20).map(row=>({time:new Date(row.statusTimestamp).toISOString(),status:row.status,...row.order})):null;
const position=data.clearinghouseState?.assetPositions?.find(row=>row.position.coin==="BTC")?.position??null;
console.log(JSON.stringify({address,checkedAt:new Date().toISOString(),failures,currentBTC: data.clearinghouseState ? position : "Unavailable",recentBTCFills:fills,recentBTCOrders:history,openBTCOrders:Array.isArray(data.frontendOpenOrders)?data.frontendOpenOrders.filter(o=>o.coin==="BTC"):null,coverage:"Recent account history from Hyperliquid Info; filled USD values use execution prices. Position size is signed: negative is short."},null,2));
if(results.every(r=>r.status==="rejected"))process.exitCode=1;
