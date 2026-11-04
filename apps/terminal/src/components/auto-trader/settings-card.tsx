import {AutoTraderMarketLabel} from "./market-label";
import { Trans } from "@lingui/react/macro";
import { allowedMarkets, EXECUTOR_MARKETS } from "@/lib/auto-trader/targets";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";
export const autoField="w-full rounded-lg border border-stroke-weak bg-background px-3 py-2 text-sm text-fg outline-none focus:border-brand";
export const autoButton="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-fg-inverse disabled:opacity-40";
export function SettingsCard({value,onChange,disabled,markets}:{value:AutoTraderSettings;onChange:(value:AutoTraderSettings)=>void;disabled:boolean;markets:readonly string[]}){
 const selected=allowedMarkets(value,markets);
 return <fieldset disabled={disabled} className="space-y-4"><legend className="mb-3 text-sm font-semibold"><Trans>Auto Trader settings</Trans></legend>
  <div className="grid gap-4 sm:grid-cols-3"><label className="text-xs text-fg-muted"><Trans>Leverage</Trans><span className="ml-2 text-brand">{value.leverage}x</span><input aria-label="Auto Trader leverage" type="range" min={1} max={5} step={1} value={value.leverage} onChange={e=>onChange({...value,leverage:Number(e.target.value)})} className="mt-3 w-full accent-brand" /></label>
   <label className="text-xs text-fg-muted"><Trans>Daily loss stop (%)</Trans><input aria-label="Daily loss stop percent" type="number" min={0.1} max={50} step={0.1} value={Number((value.killPct*100).toFixed(4))} onChange={e=>onChange({...value,killPct:Number(e.target.value)/100})} className={`mt-2 ${autoField}`} /></label>
   <label className="text-xs text-fg-muted"><Trans>Minimum order (USD)</Trans><input aria-label="Minimum Auto Trader order USD" type="number" min={10} step={1} value={value.minOrderUsd} onChange={e=>onChange({...value,minOrderUsd:Number(e.target.value)})} className={`mt-2 ${autoField}`} /></label>
  </div>
  <div><p className="mb-2 text-xs text-fg-muted"><Trans>Markets</Trans></p><div className="flex flex-wrap gap-3">{markets.map(coin=><label key={coin} className="inline-flex items-center gap-2 rounded-lg border border-stroke-weak px-3 py-2 text-xs"><input type="checkbox" disabled={!(EXECUTOR_MARKETS as readonly string[]).includes(coin)} title={(EXECUTOR_MARKETS as readonly string[]).includes(coin)?undefined:"Tracked by the signal API; not traded by the current executor"} checked={selected.includes(coin)} onChange={e=>onChange({...value,include:e.target.checked?[...selected,coin]:selected.filter(c=>c!==coin),exclude:[]})} className="accent-brand" /><AutoTraderMarketLabel coin={coin} /></label>)}</div></div>
 </fieldset>;
}
