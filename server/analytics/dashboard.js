import { renderPortfolioStats, loadPortfolio } from "/analytics-portfolio.js";
import { renderReport, renderTraderTable } from "/analytics-view.js";
let report=null,pending=false;
const selected=new URLSearchParams(location.search).get("address");
const validSelected=selected && /^0x[0-9a-f]{40}$/i.test(selected);
if(selected){document.querySelector("h1").textContent="Portfolio";document.querySelector(".subtitle").textContent=selected;document.querySelector(".subtitle").style.overflowWrap="anywhere";document.getElementById("leaderboard-panel").hidden=true;document.getElementById("leaderboard-summary").hidden=true;document.querySelector(".coverage").hidden=true;document.getElementById("portfolio").hidden=false;}
const refresh=document.getElementById("refresh"),search=document.getElementById("search");
const options=()=>({search:search.value});
async function load() {
 if(pending)return;pending=true;refresh.disabled=true;refresh.textContent="Refreshing…";
 const error=document.getElementById("error");
 try {
  let first=null,users=[],offset=0;
  while(true) {
   const response=await fetch(`/api/builder-users?limit=500&offset=${offset}`,{cache:"no-store",signal:AbortSignal.timeout(15000)});const data=await response.json();
   if(!response.ok && !Array.isArray(data.users))throw new Error(data.error || "Could not read local analytics files.");
   if(!Array.isArray(data.users))throw new Error("Invalid analytics response.");
   if(first?.publishedAt && data.publishedAt!==first.publishedAt)throw new Error("The leaderboard updated while loading. Refresh again.");
   first??=data;users.push(...data.users);const next=data.pagination?.nextOffset;if(next===null || next===undefined)break;
   if(!Number.isSafeInteger(next)||next<=offset)throw new Error("Invalid analytics pagination.");offset=next;
  }
  report={...first,users};renderReport(report,options());error.hidden=true;
  if(selected){
   if(!validSelected)throw new Error("Invalid trader address.");
   const user=users.find(u=>u.address.toLowerCase()===selected.toLowerCase());
   if(!user)throw new Error("This trader is not in the leaderboard records.");
   renderPortfolioStats(user);await loadPortfolio(selected,document.getElementById("portfolio-holdings"));
  }
 }catch(cause){error.textContent=`${cause instanceof Error?cause.message:"Could not load records."}${report?" Showing the last loaded records.":" Start the local analytics server and retry."}`;error.hidden=false;if(!report)renderTraderTable([],options());}
 finally{pending=false;refresh.disabled=false;refresh.textContent="Refresh";}
}
refresh.onclick=load;search.oninput=()=>{if(report)renderTraderTable(report.users,options());};
setInterval(()=>{if(!document.hidden)void load();},30000);void load();
