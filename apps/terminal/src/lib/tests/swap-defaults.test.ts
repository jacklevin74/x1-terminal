import {expect,it} from "vitest";
import {getAvailablePairTokens} from "@/domain/trade/swap";
type Markets=Parameters<typeof getAvailablePairTokens>[1];
const pair=(name:string,displayName:string)=>({tokensInfo:[{name,displayName},{name:"USDC",displayName:"USDC"}]});
it("prioritizes SOL and ETH over alphabetically earlier assets without hiding other pairs",()=>{
 const markets=[pair("AAPL","AAPL"),pair("UETH","ETH"),pair("USOL","SOL")] as Markets;
 expect(getAvailablePairTokens("USDC",markets).map(t=>t.name)).toEqual(["USOL","UETH","AAPL"]);
 expect(getAvailablePairTokens("USOL",markets)[0].name).toBe("USDC");expect(getAvailablePairTokens("UETH",markets)[0].name).toBe("USDC");
});
it("falls back to ETH when no SOL pair exists",()=>{expect(getAvailablePairTokens("USDC",[pair("AAPL","AAPL"),pair("UETH","ETH")] as Markets)[0].name).toBe("UETH");});
