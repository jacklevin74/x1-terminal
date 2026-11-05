import {expect,it} from 'vitest';
import {parseExecutorCycle,isRecentExecutorCycle} from '../auto-trader/executor-cycle';
const account='0x123';
const canonical=()=>({account,cycle_ts:Date.now(),equity:40000,target_lev:3,k:1.47,held_neutrals:['SOL'],gross_before_cap:150000,gross_after_cap:120000,rows:[{market:'SOL',score:6,target_usd:1943.23,current_usd:1943.23,gap_usd:7.77,action:'HOLD_NEUTRAL',reason:'Neutral: preserve position'}]});
it('copies executor amounts, explicit gaps and neutral decisions without sizing math',()=>{
 const cycle=parseExecutorCycle(canonical(),account)!;
 expect(cycle.rows[0]).toEqual({market:'SOL',score:6,targetUsd:1943.23,currentUsd:1943.23,gapUsd:7.77,action:'HOLD_NEUTRAL',reason:'Neutral: preserve position'});
 expect(cycle.targetLeverage).toBe(3);expect(cycle.k).toBe(1.47);expect(cycle.grossAfterCap).toBe(120000);
});
it('supports current status plans without deriving missing values from weight or amounts',()=>{
 const cycle=parseExecutorCycle({registered:true,master:account,plan:{ts:Date.now(),rows:[{coin:'BTC',weight:-0.51,curNtl:-12531,tgtNtl:-13100,acts:['REDUCE']}] }},account)!;
 expect(cycle.rows[0]).toEqual({market:'BTC',score:null,currentUsd:-12531,targetUsd:-13100,gapUsd:null,action:'REDUCE',reason:null});
});
it('rejects wrong accounts and incomplete amounts',()=>{
 expect(parseExecutorCycle(canonical(),'other')).toBeNull();
 const response=canonical();delete (response.rows[0] as Partial<typeof response.rows[0]>).target_usd;
 expect(parseExecutorCycle(response,account)).toBeNull();
 expect(parseExecutorCycle({registered:false,...canonical()},account)).toBeNull();
});
it('expires after fifteen minutes and rejects timestamps too far in the future',()=>{
 const cycle=parseExecutorCycle(canonical(),account)!;
 expect(isRecentExecutorCycle(cycle,cycle.cycleTs+900000)).toBe(true);
 expect(isRecentExecutorCycle(cycle,cycle.cycleTs+900001)).toBe(false);
 expect(isRecentExecutorCycle(cycle,cycle.cycleTs-61000)).toBe(false);
});
