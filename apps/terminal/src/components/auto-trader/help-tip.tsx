import {Tooltip} from "@hypeterminal/ui";
import {useId,useState} from "react";

export const autoTraderHelp:Record<string,string>={
 "Signal blend":"Controls how much six-hour trading flow contributes to this bot’s signal: 0–40% flow, with the remaining 60–100% from positions. Default: 60% positions / 40% flow. At 0%, only position data contributes. The API controls flow normalization (normally net six-hour flow divided by tracked open interest). Breadth discounts, neutral bands and risk controls still apply. Save settings to affect the next eligible cycle; public Mood Ring scores are unchanged.",
 "Leverage":"Sets target exposure from 1× to 5× equity, divided across selected markets and scaled by each score. Higher leverage increases exposure and liquidation risk. The exchange may impose a lower leverage cap for an asset.",
 "Daily loss stop (%)":"When equity falls below the flow-adjusted UTC day starting equity by this percentage, the executor blocks opens and adds. It can still reduce or close positions; an opposite-side signal closes without reopening. This is not a guaranteed loss limit or an immediate stop-loss order.",
 "Minimum order (USD)":"Minimum dollar value of each opening, adding or partial reduction order; at least $10. Smaller adjustments are skipped. Full reduce-only closes are exempt. After the maker wait, an IOC fallback can execute a remaining amount of at least $1. This is order value, not margin deposited.",
 "Markets":"Choose any listed market. Selection is retained when a market is missing from the signal API. Trading and allocation still depend on executor support and usable signals. Scores strictly between −15 and +15, or missing scores, hold existing exposure; flat neutral markets stay flat. Unchecking a market excludes it from rebalancing and does not close its position. SOXL is tracked but not traded by the current executor.",
 "API wallet":"Do not send funds to this address. Fund the owner’s Hyperliquid account; API wallets only sign trades using the selected trading account’s balance. Chooses the trading-only API wallet for this owner. The selected main account or subaccount determines the Auto Trader registration. Registering another wallet replaces the registration and starts paused; selecting it alone does not change the running bot.",
 "Owner wallet":"Signs setup and control requests locally. The executor trades with the separately authorized API wallet, not the owner's private key.",
 "Account equity":"The executor requires at least $15. Unified accounts use spot USDC total, which already includes unrealized PNL; other supported account modes sum perpetual account values.",
 "Auto Trader API wallet":"Do not fund the API wallet address; it signs trades for the selected main account or subaccount. A separate trading key must be authorized and unexpired. Registration encrypts its private key for the execution service so the bot can trade while this page is closed.",
 "Builder fee":"Account-wide approval for a 0.05% builder fee per fill, in addition to Hyperliquid exchange fees. Shared across the owner's API wallets.",
 "Service registration":"Stores the bot's settings and encrypted trading key with the execution service. Registration begins paused; Start Auto Trader separately enables it.",
 "Start Auto Trader":"Enables the saved configuration for the next eligible executor cycle. It can rebalance manual positions on selected markets. Approvals, equity, signal freshness and live execution checks must pass; starting does not guarantee an immediate trade.",
 "Stop Auto Trader":"Pauses future bot rebalancing. It does not close positions or cancel orders already submitted, which may still fill.",
 "Close & pause":"Pauses the bot, then immediately submits reduce-only IOC closes through the browser for all perpetual positions, including manual positions. Prices allow up to 1% slippage. Partial fills or errors can leave positions open; review the result.",
 "Remove Auto Trader":"Deletes the service registration and encrypted key. It does not close positions or revoke the API wallet's exchange permission. Revoke that separately under API wallets.",
 "Save settings":"Saves this form to the execution service. An active bot uses the saved settings on its next cycle. The live forecast uses the saved settings; unsaved edits do not change it.",
 "Renew API wallet":"Creates and authorizes a replacement trading key. Register the replacement before leaving the page, then enable again; registration pauses execution.",
 "Next cycle":"Estimated from the last reported cycle plus five minutes. The executor waits five minutes after finishing a cycle, so execution time can delay this estimate. Due means waiting for a fresh status, not proof that an order has been sent.",
 "Market":"The asset being evaluated by the executor. xyz: assets are traded on the xyz perpetual venue.",
 "Score":"The score reported for this market in the recorded executor cycle. If the API omits it, the page shows —; it never reconstructs a score from a weight or a newer signal.",
 "Target":"Signed dollar exposure decided by the executor for this cycle, including its sizing, neutral holds and caps. Positive is long; negative is short. The terminal displays the API value without recalculating it.",
 "Current":"Signed position value recorded by the executor for this same cycle. This is a cycle snapshot, not the latest browser market price.",
 "Gap":"Adjustment reported by the executor for this cycle. If the API does not provide a gap, the page shows — instead of subtracting or guessing.",
 "Action":"The executor’s recorded action, labeled with the position side and buy/sell direction. Increase short means sell more; reduce short means buy back part of the short. Increase long means buy more; reduce long means sell part of the long. Skip means no order for that adjustment. Original executor tags are available on hover. These are cycle decisions, not confirmation of a fill.",
 "Reason":"The explanation returned by the executor, including any neutral, minimum-order or cap decision. Missing reasons are shown as — without inventing an explanation.",
 "Last cycle":"Timestamp of the last cycle reported by the service. It does not confirm a fill; inspect Cycle orders and fills for execution results.",
 "Equity":"Account equity reported by the last executor cycle, used for that cycle's target sizing. It can differ from the latest browser snapshot.",
 "Day PNL":"The executor's daily profit/loss measure against its flow-adjusted UTC day baseline. Deposits, withdrawals and transfers adjust the baseline.",
 "Agent expires":"When the registered API wallet's authorization expires. Renew and register a replacement before expiry to avoid interrupted execution.",
 "Agent approval":"The trading API wallet must be approved on Hyperliquid and unexpired. Unknown means approval has not been verified.",
 "Daily loss stop":"OK means the last cycle did not report a triggered daily loss stop. Blocked means new exposure is restricted; reduce-only closes and reductions remain permitted.",
 "Signal freshness":"Signals older than ten minutes abort execution. The executor also verifies signal authenticity and requires usable scores; a fresh timestamp alone is not sufficient.",
 "Minimum equity":"Trading requires at least $15 of supported account equity. Below this threshold the executor skips orders.",
};
export function HelpTip({label}:{label:string}){
 const [open,setOpen]=useState(false);const id=useId();const text=autoTraderHelp[label];
 if(!text)return null;
 return <Tooltip open={open} onOpenChange={setOpen} content={<div role="tooltip" id={id} className="max-w-xs whitespace-normal leading-relaxed"><p className="mb-1 font-semibold">{label}</p><p>{text}</p></div>}><button type="button" aria-label={`Help: ${label}`} aria-describedby={open?id:undefined} onClick={()=>requestAnimationFrame(()=>setOpen(true))} className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded text-xs font-normal text-fg-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"><span aria-hidden="true">ⓘ</span></button></Tooltip>;
}
