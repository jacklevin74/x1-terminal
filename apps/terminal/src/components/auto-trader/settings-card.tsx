import {HelpTip} from "./help-tip";
import {AutoTraderMarketLabel} from "./market-label";
import { Trans } from "@lingui/react/macro";
import { allowedMarkets, selectableMarkets, EXECUTOR_MARKETS } from "@/lib/auto-trader/targets";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";
export const autoField="w-full rounded-lg border border-stroke-weak bg-background px-3 py-2 text-sm text-fg outline-none focus:border-brand";
export const autoButton="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-fg-inverse disabled:opacity-40";
export function SettingsCard({value,onChange,disabled,markets}:{value:AutoTraderSettings;onChange:(value:AutoTraderSettings)=>void;disabled:boolean;markets:readonly string[]}){
 const selected=allowedMarkets(value,markets);
 const displayMarkets=selectableMarkets(markets,value);
 return <fieldset disabled={disabled} className="space-y-4"><legend className="mb-3 text-sm font-semibold"><Trans>Auto Trader settings</Trans></legend>
  <div className="grid gap-4 sm:grid-cols-3"><div className="text-xs text-fg-muted"><Trans>Leverage</Trans><HelpTip label="Leverage" /><span className="ml-2 text-brand">{value.leverage}x</span><input aria-label="Auto Trader leverage" type="range" min={1} max={5} step={1} value={value.leverage} onChange={e=>onChange({...value,leverage:Number(e.target.value)})} className="mt-3 w-full accent-brand" /></div>
   <div className="text-xs text-fg-muted"><Trans>Daily loss stop (%)</Trans><HelpTip label="Daily loss stop (%)" /><input aria-label="Daily loss stop percent" type="number" min={0.1} max={50} step={0.1} value={Number((value.killPct*100).toFixed(4))} onChange={e=>onChange({...value,killPct:Number(e.target.value)/100})} className={`mt-2 ${autoField}`} /></div>
   <div className="text-xs text-fg-muted"><Trans>Minimum order (USD)</Trans><HelpTip label="Minimum order (USD)" /><input aria-label="Minimum Auto Trader order USD" type="number" min={10} step={1} value={value.minOrderUsd} onChange={e=>onChange({...value,minOrderUsd:Number(e.target.value)})} className={`mt-2 ${autoField}`} /></div>
  </div>
  <div><p className="mb-2 text-xs text-fg-muted"><Trans>Markets</Trans><HelpTip label="Markets" /></p><div className="flex flex-wrap gap-3">{displayMarkets.map(coin=><label key={coin} className="inline-flex items-center gap-2 rounded-lg border border-stroke-weak px-3 py-2 text-xs"><input type="checkbox" title={!markets.includes(coin)?"Selection is retained. Trading requires a usable signal and executor support.":(EXECUTOR_MARKETS as readonly string[]).includes(coin)?undefined:"You can select this market. Trading still requires support in the executor."} checked={selected.includes(coin)} onChange={e=>onChange({...value,include:e.target.checked?[...selected,coin]:selected.filter(c=>c!==coin),exclude:[]})} className="accent-brand" /><AutoTraderMarketLabel coin={coin} />{!markets.includes(coin)?<span className="text-fg-muted">Awaiting signal API</span>:!(EXECUTOR_MARKETS as readonly string[]).includes(coin)&&<span className="text-fg-muted">Executor support pending</span>}</label>)}</div></div>
 </fieldset>;
}
