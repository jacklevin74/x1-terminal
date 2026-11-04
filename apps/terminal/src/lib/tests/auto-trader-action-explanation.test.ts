import {expect,it} from "vitest";
import {explainTargetAction,type TargetPreviewRow} from "@/lib/auto-trader/action-explanation";
const row:TargetPreviewRow={coin:"HYPE",score:31,weight:0.31,target:407.81,current:445.60,gap:-37.79,actions:["SKIP"],neutral:false,signalLabel:undefined};
it("explains why an adjustment below the user's minimum is skipped",()=>{
 const result=explainTargetAction(row,"SKIP",50);expect(result.why).toContain("$37.79");expect(result.why).toContain("$50.00 minimum");expect(result.why).not.toContain("neutral band");expect(result.next).toContain("no order");
});
it("explains neutral HOLD without suggesting a closing order",()=>{
 const result=explainTargetAction({...row,score:3,current:-50,target:-50,gap:0,neutral:true,signalLabel:"Neutral",actions:["HOLD"]},"HOLD",50);expect(result.why).toContain("Neutral");expect(result.next).toContain("unchanged");expect(result.next).toContain("no opening, adding, reducing or closing order");
});
it("explains both flip steps and why a flip may not reopen",()=>{
 const flip={...row,current:-100,target:200,gap:300,actions:["FLIP-CLOSE","FLIP-OPEN"]};expect(explainTargetAction(flip,"FLIP-OPEN",50).next).toContain("successful close is not checked");
 expect(explainTargetAction({...flip,actions:["FLIP-CLOSE"]},"FLIP-CLOSE",50).next).toContain("daily loss stop");
 expect(explainTargetAction({...flip,target:20,actions:["FLIP-CLOSE"]},"FLIP-CLOSE",50).next).toContain("below the $50.00 minimum");
});
it("explains opening, adding, reducing and daily-stop blocking with row-specific sizes",()=>{
 expect(explainTargetAction({...row,current:0},"OPEN",10).next).toContain("$407.81");expect(explainTargetAction(row,"REDUCE",10).next).toContain("reduce-only");expect(explainTargetAction({...row,current:350,gap:57.81},"ADD",10).next).toContain("$57.81");expect(explainTargetAction(row,"LOSS STOP",10).next).toContain("UTC");
});
