import {AUTO_TRADER_DEADBAND} from "@/config/auto-trader";
import type {targetRows} from "./targets";
export type TargetPreviewRow=ReturnType<typeof targetRows>[number];
const usd=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Math.abs(value));
const side=(value:number)=>value<0?"short":"long";

export function explainTargetAction(row:TargetPreviewRow,action:string,minOrderUsd:number):{why:string;next:string}{
 const neutral=row.neutral;
 const targetReason=row.score===null?"No usable score is available, so this preview holds existing exposure.":neutral?`Score ${row.score} is inside the neutral band (−${AUTO_TRADER_DEADBAND} < score < ${AUTO_TRADER_DEADBAND}). Neutral signals leave existing exposure unchanged.`:`Score ${row.score} sets a ${side(row.target)} target of ${usd(row.target)}.`;
 const maker=" The executor tries a post-only order at the best bid/ask, waits 60 seconds for resting orders, then cancels and sends an IOC remainder of at least $1. A rejected maker order or missing book falls back to IOC.";
 const current=`The current ${side(row.current)} position is ${usd(row.current)}.`;
 switch(action){
  case "HOLD":return {why:targetReason,next:row.current===0?"Stay flat. Send no order for this market.":`Keep the existing ${usd(row.current)} ${side(row.current)} position unchanged. Send no opening, adding, reducing or closing order.`};
  case "OPEN":return {why:`${targetReason} No position is currently open.`,next:`Open a ${side(row.target)} position of approximately ${usd(row.target)}.${maker}`};
  case "ADD":return {why:`${targetReason} ${current} Exposure is below target.`,next:`Add approximately ${usd(row.gap)} to the ${side(row.target)} position.${maker}`};
  case "REDUCE":return {why:`${targetReason} ${current} Exposure is above target.`,next:`Reduce the ${side(row.current)} position by approximately ${usd(row.gap)} with a reduce-only order.${maker}`};
  case "CLOSE":return {why:`${targetReason} ${current}`,next:`Close the entire ${side(row.current)} position using a reduce-only IOC within 1% of mid. The daily loss stop can force an opposite-side target to zero. Full closes are exempt from the ${usd(minOrderUsd)} minimum.`};
  case "FLIP-CLOSE":return {why:`${targetReason} ${current} The position is on the opposite side of the target.`,next:`Send a full reduce-only IOC close within 1% of mid first.${row.actions.includes("FLIP-OPEN")?" The opening leg is submitted afterward; the executor does not verify the close filled before sending it.":Math.abs(row.target)<minOrderUsd?` Do not reopen: the ${usd(row.target)} target is below the ${usd(minOrderUsd)} minimum.`:" Do not reopen while the daily loss stop blocks increased exposure."}`};
  case "FLIP-OPEN":return {why:`${targetReason} The current position is on the opposite side.`,next:`After submitting the close leg, submit a ${side(row.target)} opening leg of approximately ${usd(row.target)}. A successful close is not checked before the opening leg.${maker}`};
  case "LOSS STOP":return {why:`${targetReason} The daily loss stop blocks new positions and increases in exposure.`,next:"Do not send an opening or adding order. Reductions and closes remain permitted; the daily stop resets at the UTC day boundary."};
  case "SKIP":return {why:row.gap===0?`${targetReason} ${row.current===0?"There is no open position to change.":"The current position is already at target."}`:`${targetReason} The ${usd(row.gap)} adjustment is below the ${usd(minOrderUsd)} minimum order.`,next:"Send no order for this market. Re-evaluate the target and minimum size next cycle."};
  default:return {why:targetReason,next:"The executor will re-evaluate this market next cycle."};
 }
}
