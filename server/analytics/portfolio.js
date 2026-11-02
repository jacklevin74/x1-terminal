import { formatAmount, userTotals } from "./dashboard-view.js";
export async function info(type,user,extra={}) {
 const response=await fetch("https://api.hyperliquid.xyz/info",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,...(user?{user}:{}),...extra}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`Portfolio request failed (${response.status}).`);
 return response.json();
}
function text(tag,value,cls="") {const node=document.createElement(tag);node.textContent=value;if(cls)node.className=cls;return node;}
function table(panel,title,headers,rows,empty) {
 const section=text("section","","panel portfolio-section");const toolbar=text("div","","toolbar");toolbar.append(text("h2",title));section.append(toolbar);
 const wrap=text("div","","table-wrap");wrap.tabIndex=0;const grid=document.createElement("table"),head=document.createElement("thead"),tr=document.createElement("tr");headers.forEach(h=>tr.append(text("th",h)));head.append(tr);grid.append(head);const body=document.createElement("tbody");
 for(const values of rows){const row=document.createElement("tr");values.forEach(v=>row.append(text("td",v)));body.append(row);}
 if(!rows.length){const row=document.createElement("tr"),cell=text("td",empty,"empty");cell.colSpan=headers.length;row.append(cell);body.append(row);}grid.append(body);wrap.append(grid);section.append(wrap);panel.append(section);
}
export function renderPortfolioStats(user) {
 const root=document.getElementById("portfolio-stats");root.replaceChildren();const totals=userTotals(user);
 for(const [label,value] of [["Fills",String(totals.fills)],["Volume",formatAmount(totals.volume,2)],["Realized PNL",formatAmount(totals.realizedPnl,6,true)],["Fees",totals.missingFeeFills>=totals.fills?"—":formatAmount(totals.knownFeesPaid)+(totals.missingFeeFills?" *":"")]]){const card=document.createElement("article");card.append(text("span",label),text("strong",value));root.append(card);}
}
export async function loadPortfolio(address,panel,request=info) {
 panel.replaceChildren(text("p","Loading current holdings…","notice"));
 const results=await Promise.allSettled([request("perpDexs"),request("spotClearinghouseState",address)]);
 const failures=[];let states=[];
 if(results[0].status==="fulfilled" && Array.isArray(results[0].value)){
  const dexNames=["",...new Set(results[0].value.filter(Boolean).map(d=>d.name).filter(Boolean))];
  // Bounded concurrency avoids flooding the public Info endpoint.
  for(let i=0;i<dexNames.length;i+=3){const batch=await Promise.allSettled(dexNames.slice(i,i+3).map(dex=>request("clearinghouseState",address,{dex})));batch.forEach((result,j)=>{if(result.status==="fulfilled"&&Array.isArray(result.value?.assetPositions))states.push(result.value);else failures.push(dexNames[i+j]||"Main perps");});}
 }else failures.push("Perpetual markets");
 panel.replaceChildren();
 if(failures.length || results[1].status==="rejected")panel.append(text("p",`Some holdings could not be loaded${failures.length?`: ${failures.join(", ")}`:""}. Refresh to retry.`,"notice error"));
 const positions=states.flatMap(s=>s.assetPositions.map(p=>p.position)).filter(p=>Number(p.szi)!==0);
 table(panel,"Positions",["Market","Side","Size","Entry price","Position value","Unrealized PNL","ROE","Liquidation price","Margin"],positions.map(p=>[p.coin,Number(p.szi)<0?"Short":"Long",formatAmount(String(p.szi).replace(/^-/,"")),formatAmount(p.entryPx),formatAmount(p.positionValue,2),formatAmount(p.unrealizedPnl,6,true),p.returnOnEquity!=null && Number.isFinite(Number(p.returnOnEquity))?`${(Number(p.returnOnEquity)*100).toFixed(2)}%`:"—",formatAmount(p.liquidationPx),`${formatAmount(p.marginUsed)} (${p.leverage?.type??"—"}, ${p.leverage?.value??"—"}x)`]),failures.length?"Positions unavailable or incomplete.":"No open positions.");
 const spot=results[1];const balances=spot.status==="fulfilled"&&Array.isArray(spot.value?.balances)?spot.value.balances:null;
 table(panel,"Spot balances",["Asset","Total balance","On hold"],(balances??[]).filter(b=>Number(b.total)!==0).map(b=>[b.coin,formatAmount(b.total,8),formatAmount(b.hold,8)]),balances?"No spot balances.":"Spot balances unavailable.");
 panel.append(text("p",`Holdings refreshed ${new Date().toLocaleString()}. Read-only Hyperliquid account data.`,"table-note"));
}
