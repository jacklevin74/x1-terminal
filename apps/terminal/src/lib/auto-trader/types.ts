import type { Address } from "viem";
export interface AutoTraderSettings {targetLev?:number;flowPct?:number;leverage:number;killPct:number;include:string[]|null;exclude:string[]|null;minOrderUsd:number}
export interface PlanRow {coin:string;weight?:number;curNtl:number;tgtNtl:number;acts:string[]}
export interface PlanOrder {coin:string;asset?:number;tag:string;isBuy:boolean;sz:number;px:number;ntl:number;reduceOnly:boolean;tif?:string}
export interface PlanFill {coin:string;tag:string;side:string;sz:number;filled?:number;avgPx?:number;error?:string|null}
export interface AutoTraderPlan {ts:number;live?:boolean;dryRun?:boolean;state?:string;label?:string;signalTs?:number;equity?:number;dayStart?:number;dayPnl?:number;agentApproved?:boolean;builderFeeOk?:boolean;skip?:string|null;killed?:boolean;leverage?:number;perCoin?:number;rows?:PlanRow[];orders?:PlanOrder[];fills?:PlanFill[];sendNote?:string|null}
export interface AutoTraderStatus {registered:boolean;master?:Address;owner?:Address;isSubaccount?:boolean;agent?:Address;validUntil?:number;renewSoon?:boolean;settings?:AutoTraderSettings;state?:"paused"|"active"|"flatten-requested";hasKey?:boolean;created?:number;updated?:number;lastCycle?:number;source?:string;plan?:AutoTraderPlan|null;dryRun?:boolean}
export interface SealedAgentKey {epk:string;nonce:string;ct:string}
export type AutoTraderAction="register"|"settings"|"pause"|"resume"|"flatten"|"remove";
export interface SignalCoin {coin:string;score:number|null;label?:string;posScore?:number;flowScore?:number;flowPct?:number;tradersLong?:number;tradersShort?:number;activeWallets?:number;breadthFullWallets?:number;flowScoreShare?:number;flowScoreOi?:number;flow24h?:number;flowNorm?:string}
export interface Signal {coins:SignalCoin[];timestamp:number|null}
