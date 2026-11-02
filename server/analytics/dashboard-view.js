export function formatAmount(value,decimals=6,signed=false) {
 if(value===null || value===undefined)return "—";
 const match=String(value).match(/^(-?)(\d+)(?:\.(\d+))?$/);if(!match)return "—";
 const [,minus,whole,fraction=""]=match;const nonzero=BigInt(whole)!==0n || /[1-9]/.test(fraction);
 const sign=nonzero?(minus?"−":signed?"+":""):"";
 const head=BigInt(whole).toLocaleString("en-US");const tail=fraction.slice(0,decimals).replace(/0+$/,"");
 if(nonzero && BigInt(whole)===0n && !/[1-9]/.test(tail))return `${sign}0.${fraction.replace(/0+$/,"")}`;
 return `${sign}${head}${tail?"."+tail:""}`;
}
function fixed(value) {const s=String(value);if(!/^-?\d+(\.\d{1,30})?$/.test(s))throw new Error("Invalid leaderboard amount");const [whole,fraction=""]=s.split(".");return BigInt(whole+fraction)*10n**BigInt(30-fraction.length);}
function sumValues(values) {const n=values.reduce((sum,value)=>sum+fixed(value),0n);const sign=n<0n?"-":"";const s=(n<0n?-n:n).toString().padStart(31,"0");return sign+(s.slice(0,-30)+"."+s.slice(-30)).replace(/\.?0+$/,"");}
export function userTotals(user) {
 if(user.totals)return user.totals;
 const values=Object.values(user.byMarket??{});const missing=values.reduce((n,v)=>n+(v.missingFeeFills??(v.builderFeesPaid===null?v.fills:0)),0);
 return {fills:user.fills,volume:sumValues(values.map(v=>v.volume)),realizedPnl:sumValues(values.map(v=>v.realizedPnl)),knownFeesPaid:sumValues(values.map(v=>v.knownFeesPaid??v.builderFeesPaid??"0")),missingFeeFills:missing};
}
export function rankedUsers(users) {return users.map(user=>({...user,totals:userTotals(user)})).sort((a,b)=>{const left=fixed(a.totals.realizedPnl),right=fixed(b.totals.realizedPnl);return left===right?a.address.localeCompare(b.address):left>right?-1:1;}).map((user,index)=>({...user,rank:index+1}));}
function cell(row,text,className="") {const node=document.createElement("td");node.textContent=text;if(className)node.className=className;row.append(node);return node;}
function number(row,value,decimals=6,pnl=false) {const node=cell(row,formatAmount(value,decimals,pnl),"number");if(value!==null&&value!==undefined){node.title=String(value);if(pnl && /[1-9]/.test(String(value)))node.classList.add(String(value).startsWith("-")?"negative":"positive");}else node.title="Not available in local records";return node;}
export function renderTraderTable(users,{search=""}={}) {
 const body=document.getElementById("traders");body.replaceChildren();const query=search.trim().toLowerCase();const rows=rankedUsers(users).filter(user=>!query || user.address.toLowerCase().includes(query));
 for(const user of rows) {
  const row=document.createElement("tr");row.className="group-start";cell(row,String(user.rank),"muted");
  const address=cell(row,"","address-cell");const text=document.createElement("a");text.className="address";text.href=`/analytics?address=${encodeURIComponent(user.address)}`;text.textContent=user.address;address.append(text);
  const copy=document.createElement("button");copy.type="button";copy.className="copy";copy.textContent="Copy";copy.setAttribute("aria-label",`Copy address ${user.address}`);copy.onclick=async()=>{try{await navigator.clipboard.writeText(user.address);copy.textContent="Copied";}catch{copy.textContent="Select address to copy";}};address.append(copy);
  const stats=user.totals;cell(row,String(stats.fills),"number");number(row,stats.volume,2);number(row,stats.realizedPnl,6,true);
  const fees=number(row,stats.missingFeeFills>=stats.fills?null:stats.knownFeesPaid,6);if(stats.missingFeeFills && stats.missingFeeFills<stats.fills){fees.textContent+=" *";fees.title=`${stats.knownFeesPaid} recorded; ${stats.missingFeeFills} fills have no fee amount.`;}
  body.append(row);
 }
 if(!rows.length){const row=document.createElement("tr");const node=cell(row,query?"No traders match your search.":"No local trading records to display.","empty");node.colSpan=6;body.append(row);}
 document.getElementById("result-count").textContent=`${rows.length.toLocaleString()} traders`;
 return {shownUsers:rows.length};
}
export function renderReport(report,options) {
 const collected=report.collection?.collectedAt;document.getElementById("updated").textContent=collected?`Collected ${new Date(collected).toLocaleString()}`:"No collection timestamp";
 document.getElementById("user-count").textContent=report.userCount?.toLocaleString()??"—";document.getElementById("fill-count").textContent=report.fillCount?.toLocaleString()??"—";
 const totals=report.users.map(userTotals);const fees=totals.length?sumValues(totals.map(t=>t.knownFeesPaid)):null;const allMissing=totals.reduce((n,t)=>n+t.missingFeeFills,0)>=totals.reduce((n,t)=>n+t.fills,0);document.getElementById("fee-total").textContent=formatAmount(allMissing?null:fees)+(!allMissing&&totals.some(t=>t.missingFeeFills)?" *":"");
 const run=report.collection?.run;const status=document.getElementById("collection-status");status.textContent=run?.status==="succeeded"?"Collected":run?.status==="running"?"Collecting":run?.status==="failed"?"Needs attention":report.dataStatus==="ready"?"Local files":"No collection";status.className=`status-value ${run?.status==="succeeded"?"positive":run?.status==="failed"?"negative":""}`;
 document.getElementById("period").textContent=run?`${run.from} → ${run.to} UTC`:"Imported records";
 const notice=document.getElementById("notice");const provisional=report.collection?.snapshots?.some(s=>s.includesCurrentDay);
 const incomplete=!["ready","empty"].includes(report.dataStatus);notice.hidden=!incomplete&&!provisional;notice.textContent=incomplete?report.message:"Today’s records are provisional and may change as the source index updates.";
 const files=document.getElementById("files");files.replaceChildren();for(const file of report.coverage.files){const row=document.createElement("tr");const name=cell(row,file.name);name.title=file.name;cell(row,String(file.fills??"—"),"number");cell(row,String(file.included??"—"),"number");cell(row,file.status);files.append(row);}
 document.getElementById("coverage-summary").textContent=`${report.coverage.files.length} files · ${report.coverage.complete?"all local files read":"incomplete"}`;
 document.getElementById("coverage-note").textContent=[report.collection?.coverageNote,...(report.coverage.warnings??[]),"Coverage describes local files, not guaranteed complete network history."].filter(Boolean).join(" ");
 return renderTraderTable(report.users,options);
}
