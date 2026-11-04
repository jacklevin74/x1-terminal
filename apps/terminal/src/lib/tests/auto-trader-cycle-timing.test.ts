import {expect,it} from "vitest";
import {cycleTiming} from "@/lib/auto-trader/cycle-timing";
it("counts down from the reported cycle without inventing repeated cycles",()=>{
 const status={registered:true,state:"active" as const,lastCycle:1000000};
 expect(cycleTiming(status,1000000).label).toBe("~5:00");
 expect(cycleTiming(status,1121000).label).toBe("~2:59");
 expect(cycleTiming(status,1300000).label).toBe("Due · waiting for executor");
 expect(cycleTiming(status,2000000).at).toBe(1300000);
});
it("shows no running countdown for paused or unregistered accounts",()=>{
 expect(cycleTiming({registered:false},1000000).at).toBeNull();
 expect(cycleTiming({registered:true,state:"paused",lastCycle:1000000},1000001).label).toBe("Paused");
});
it("waits for a valid timestamp and supports queued closes",()=>{
 expect(cycleTiming({registered:true,state:"active"},1000000).label).toBe("Waiting for first cycle");
 expect(cycleTiming({registered:true,state:"flatten-requested",plan:{ts:1000000}},1000001).label).toBe("~5:00");
});
