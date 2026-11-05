export interface ExecutorTargetRow {market:string;score:number|null;targetUsd:number;currentUsd:number;gapUsd:number|null;action:string|null;reason:string|null}
export interface ExecutorCycle {account:string;cycleTs:number;equity:number|null;targetLeverage:number|null;k:number|null;scale:number|null;heldNeutrals:string|number|null;grossBeforeCap:number|null;grossAfterCap:number|null;rows:ExecutorTargetRow[]}
export const EXECUTOR_CYCLE_MAX_AGE_MS=15*60*1000;
const object=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const number=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value))?Number(value):null;
const first=(row:Record<string,unknown>,...keys:string[])=>{for(const key of keys)if(row[key]!==undefined)return row[key];return undefined;};
/** Map API fields only. Never synthesize scores, gaps, sizing or actions. */
export function parseExecutorCycle(value:unknown,expectedAccount:string):ExecutorCycle|null{
 const response=object(value);if(!response||response.registered===false)return null;
 const payload=object(response.cycle_targets)??object(response.plan)??response;
 const account=first(payload,'account','vault')??first(response,'master','account');
 if(typeof account!=='string'||account.toLowerCase()!==expectedAccount.toLowerCase())return null;
 const rawTs=first(payload,'cycle_ts','ts')??first(response,'cycle_ts','lastCycle');
 const cycleTs=number(rawTs)??(typeof rawTs==='string'?Date.parse(rawTs):NaN);
 const entries=first(payload,'rows','targets');
 if(!Number.isFinite(cycleTs)||!cycleTs||!Array.isArray(entries)||!entries.length)return null;
 const rows:ExecutorTargetRow[]=[];
 for(const entry of entries){
  const row=object(entry);if(!row)return null;
  if(row.account!==undefined&&(typeof row.account!=='string'||row.account.toLowerCase()!==expectedAccount.toLowerCase()))return null;
  const market=first(row,'market','coin'),targetUsd=number(first(row,'target_usd','tgtNtl')),currentUsd=number(first(row,'current_usd','curNtl'));
  if(typeof market!=='string'||!market.trim()||targetUsd===null||currentUsd===null)return null;
  const acts=first(row,'action','actions','acts');
  const action=typeof acts==='string'?acts:Array.isArray(acts)&&acts.every(a=>typeof a==='string')?acts.join(' / ')||null:null;
  const reason=first(row,'reason','note');
  rows.push({market,score:number(row.score),targetUsd,currentUsd,gapUsd:number(first(row,'gap_usd','gapNtl')),action,reason:typeof reason==='string'?reason:null});
 }
 const held=first(payload,'held_neutrals','heldNeutrals');
 return {account,cycleTs,equity:number(payload.equity),targetLeverage:number(first(payload,'target_lev','targetLev')),k:number(payload.k),scale:number(payload.scale),heldNeutrals:typeof held==='number'?held:Array.isArray(held)&&held.every(v=>typeof v==='string')?held.join(', '):typeof held==='string'?held:null,grossBeforeCap:number(first(payload,'gross_before_cap','grossBeforeCap')),grossAfterCap:number(first(payload,'gross_after_cap','grossAfterCap')),rows};
}
export function isRecentExecutorCycle(cycle:ExecutorCycle|null,now:number){return !!cycle&&cycle.cycleTs<=now+60000&&now-cycle.cycleTs<=EXECUTOR_CYCLE_MAX_AGE_MS;}
