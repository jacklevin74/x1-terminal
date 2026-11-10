import {renderToStaticMarkup} from "react-dom/server";
import {expect,it} from "vitest";
import {ForecastAction,ScoreChange} from "@/components/auto-trader/forecast-presentation";
it("shows signed score changes and the actual previous score",()=>{
 const rising=renderToStaticMarkup(<ScoreChange score={-21} previous={-30}/>);
 expect(rising).toContain("▲ +9");expect(rising).toContain("Previous signal score: -30");expect(rising).toContain("text-success");
 expect(renderToStaticMarkup(<ScoreChange score={-32} previous={-30}/>)).toContain("▼ -2");
 expect(renderToStaticMarkup(<ScoreChange score={4} previous={4}/>)).toContain("→ 0");
 expect(renderToStaticMarkup(<ScoreChange score={4}/>)).toContain("unavailable");
});
it("distinguishes buy, sell, hold and skipped actions",()=>{
 expect(renderToStaticMarkup(<ForecastAction label="Reduce short (buy)"/>)).toContain("↑ ");
 const sell=renderToStaticMarkup(<ForecastAction label="Reduce long (sell)"/>);
 expect(sell).toContain("SELL");expect(sell).toContain("text-error");
 const hold=renderToStaticMarkup(<ForecastAction label="Hold short (neutral)"/>);
 expect(hold).toContain("HOLD");expect(hold).toContain("text-warning");
 const skip=renderToStaticMarkup(<ForecastAction label="Skip reduce short (buy) · $423"/>);
 expect(skip).toContain("SKIP ");expect(skip).toContain("bg-success-soft");expect(skip).toContain("text-success");
});
