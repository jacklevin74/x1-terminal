/** Reconcile live chart candles without rebuilding the widget or its viewport. */
export function startChartRefresh(refresh:()=>Promise<unknown>,period=15000){
 if(typeof window==="undefined"||typeof document==="undefined")return()=>{};
 let stopped=false,pending=false,lastStarted=-Infinity;
 const run=()=>{
  if(stopped||pending||document.visibilityState==="hidden"||Date.now()-lastStarted<1000)return;
  pending=true;lastStarted=Date.now();
  void Promise.resolve().then(()=>{if(!stopped)return refresh();}).catch(()=>{/* Keep the last chart data; retry on the next tick. */}).finally(()=>{pending=false;});
 };
 const timer=window.setInterval(run,period);
 window.addEventListener("focus",run);window.addEventListener("online",run);document.addEventListener("visibilitychange",run);
 return()=>{stopped=true;window.clearInterval(timer);window.removeEventListener("focus",run);window.removeEventListener("online",run);document.removeEventListener("visibilitychange",run);};
}
