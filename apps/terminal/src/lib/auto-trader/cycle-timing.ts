import type {AutoTraderStatus} from "./types";
export function cycleTiming(status:AutoTraderStatus,now:number){
 if(!status.registered)return {label:"Not scheduled",at:null};
 if(status.state==="paused")return {label:"Paused",at:null};
 if(status.state!=="active"&&status.state!=="flatten-requested")return {label:"Schedule unavailable",at:null};
 const last=status.lastCycle??status.plan?.ts;
 if(typeof last!=="number"||!Number.isFinite(last)||last<=0||last>now)return {label:"Waiting for first cycle",at:null};
 const at=last+5*60*1000;
 const seconds=Math.ceil((at-now)/1000);
 if(seconds<=0)return {label:"Due · waiting for executor",at};
 return {label:`~${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`,at};
}
