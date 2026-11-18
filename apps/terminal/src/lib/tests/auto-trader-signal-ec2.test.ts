import {expect,it,vi} from "vitest";
import fixture from "./fixtures/mood-api-daytraders-sent.json";
import {getSignal} from "@/lib/auto-trader/api";
import {AUTO_TRADER_SIGNAL} from "@/config/auto-trader";

// Payload captured from EC2 mood-api (GET /api/daytraders?view=sent via CloudFront), trimmed to three coins.
it("parses the EC2 mood-api sentiment payload served at the same-origin signal path",async()=>{
 const fetcher=vi.fn(async()=>new Response(JSON.stringify(fixture),{status:200,headers:{"content-type":"application/json"}}));
 const signal=await getSignal(undefined,fetcher as unknown as typeof fetch);
 expect(fetcher).toHaveBeenCalledOnce();
 expect(String((fetcher.mock.calls[0] as unknown[])[0])).toBe(AUTO_TRADER_SIGNAL);
 expect(AUTO_TRADER_SIGNAL).toBe("/api/auto-trader-signal?view=sent");
 expect(signal.timestamp).toBe(fixture.now);
 expect(signal.coins.map(c=>[c.coin,c.score,c.label])).toEqual([["BTC",-17,"Neutral"],["ETH",51,"Bullish"],["SOL",-42,"Bearish"]]);
 expect(signal.coins[0]).toHaveProperty("posScore");expect(signal.coins[0]).toHaveProperty("flowScore");
});

it("surfaces the node01 404 page as an error rather than a sentiment",async()=>{
 const fetcher=vi.fn(async()=>new Response("<html><head><title>404 Not Found</title></head></html>",{status:404,headers:{"content-type":"text/html"}}));
 await expect(getSignal(undefined,fetcher as unknown as typeof fetch)).rejects.toThrow();
});
