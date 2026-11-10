import { describe, expect, it, vi } from "vitest";
import { getMaxSizeForOrderEntry, getSizeForPercent, getSizeValueFromInput, getSizeValueForModeToggle } from "@/domain/trade/order/size";
import { deriveOrderEntry } from "@/domain/trade/order/derive";
import { validatePerpOrder, type PerpOrderContext } from "@/lib/errors/stacks/perp-order";
import type { UnifiedMarketInfo } from "@/lib/hyperliquid";
vi.mock("@lingui/core/macro", () => ({ t: (parts: TemplateStringsArray, ...values: unknown[]) => parts.reduce((text, part, i) => text + part + (values[i] ?? ""), "") }));
const spotBalance = { baseAvailable: 7, quoteAvailable: 1000 } as any;
const inputs = { isConnected:true, isSpotMarket:false, side:"sell" as const, price:100, spotBalance, szDecimals:3, maxTradeSzs:[100,200] as [number,number], reduceOnly:true, positionSize:"2.345" };
describe("Reduce Only held-position sizing",()=>{
 it("uses the held long instead of the margin-based short maximum",()=>expect(getMaxSizeForOrderEntry(inputs)).toBe(2.345));
 it("uses the absolute held short only on the buy side",()=>{
  expect(getMaxSizeForOrderEntry({...inputs,positionSize:"-3.456",side:"buy"})).toBe(3.456);
  expect(getMaxSizeForOrderEntry({...inputs,positionSize:"-3.456"})).toBe(0);
  expect(getMaxSizeForOrderEntry({...inputs,side:"buy"})).toBe(0);
 });
 it("fails closed without a held position or connection and floors to size increments",()=>{
  expect(getMaxSizeForOrderEntry({...inputs,positionSize:undefined})).toBe(0);
  expect(getMaxSizeForOrderEntry({...inputs,isConnected:false})).toBe(0);
  expect(getMaxSizeForOrderEntry({...inputs,positionSize:"2.3459"})).toBe(2.345);
 });
 it("keeps ordinary opening capacity and spot availability unchanged",()=>{
  expect(getMaxSizeForOrderEntry({...inputs,reduceOnly:false})).toBe(200);
  expect(getMaxSizeForOrderEntry({...inputs,isSpotMarket:true})).toBe(7);
 });
 it("shows reducible base units and still sizes with zero free margin",()=>{
  const result=deriveOrderEntry({isConnected:true,market:{kind:"perp",name:"BTC",pairName:"BTC-USDC",szDecimals:3} as UnifiedMarketInfo,side:"sell",conversionPrice:100,sizeMode:"base",sizeInput:"2",spotBalances:[],maxTradeSzs:[0,0],availableToTrade:[0,0],reduceOnly:true,positionSize:"2.345"});
  expect(result).toMatchObject({isReducing:true,maxSize:2.345,availableBalance:2.345,availableBalanceToken:"BTC"});
 });
 it("makes 100% quote sizing exactly match a held amount without cent-rounding overshoot",()=>{
  const quote=getSizeForPercent({pct:100,isSpotMarket:false,side:"sell",sizeMode:"quote",price:1.2345,maxSize:0.12345,spotBalance,szDecimals:5,reduceOnly:true});
  expect(getSizeValueFromInput({sizeInput:quote,sizeMode:"quote",price:1.2345,szDecimals:5})).toBe(0.12345);
 });
});
const context:PerpOrderContext={isConnected:true,isWalletLoading:false,isReadyToTrade:true,needsAgentApproval:false,availableBalance:0,hasMarket:true,hasAssetIndex:true,orderType:"market",usesLimitPrice:false,usesTriggerPrice:false,price:100,markPx:100,triggerPriceNum:null,sizeValue:1,orderValue:100,maxSize:2,reduceOnly:true,side:"sell",tpSlEnabled:false,canUseTpSl:false,tpPriceNum:null,slPriceNum:null,stopOrder:false,takeProfitOrder:false,scaleOrder:false,twapOrder:false,scaleStartPriceNum:null,scaleEndPriceNum:null,scaleLevelsNum:null,twapMinutesNum:null};
it("allows reduction without free margin, rejects over-reduction and wrong-side zero capacity",()=>{
 expect(validatePerpOrder(context).canSubmit).toBe(true);
 expect(validatePerpOrder({...context,maxSize:0}).errors.some(e=>e.message.includes("No position to reduce"))).toBe(true);
 expect(validatePerpOrder({...context,sizeValue:3}).errors.some(e=>e.message.includes("Exceeds held position"))).toBe(true);
 expect(validatePerpOrder({...context,reduceOnly:false}).canSubmit).toBe(false);
});

it("preserves held quantity when toggling reducing input between base and quote",()=>{
 const quote=getSizeValueForModeToggle({sizeValue:0.12345,sizeMode:"base",price:1.2345,szDecimals:5,reduceOnly:true});
 expect(getSizeValueFromInput({sizeInput:quote,sizeMode:"quote",price:1.2345,szDecimals:5})).toBe(0.12345);
});
