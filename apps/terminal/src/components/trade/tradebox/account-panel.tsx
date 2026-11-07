import {t} from "@lingui/core/macro";
import {Button} from "@hypeterminal/ui";
import {useConnection} from "wagmi";
import {InfoRow,InfoRowGroup} from "@/components/ui/info-row";
import {useAllDexsAccountState} from "@/hooks/trade/use-account-balances";
import {useInfo} from "@/lib/hyperliquid";
import {spotUsdPrices,summarizeAccount} from "@/lib/positions/account-summary";
import {formatPercent,formatUSD} from "@/lib/format";
import {getValueColorClass} from "@/lib/ui/value-color";
import {useDepositModalActions} from "@/stores/use-global-modal-store";
import {FALLBACK_VALUE_PLACEHOLDER} from "@/config/app";

function RiskGauge({ratio}:{ratio:number}){
 const progress=Math.max(0,Math.min(1,ratio));
 return <svg aria-hidden="true" viewBox="0 0 32 18" className="h-3.5 w-6"><path d="M3 16a13 13 0 0 1 26 0" fill="none" stroke="currentColor" strokeWidth="6" className="text-fill-strong"/><path d="M3 16a13 13 0 0 1 26 0" fill="none" stroke="currentColor" strokeWidth="6" pathLength="1" strokeDasharray="0.75 0.25" className="text-success"/><path d="M3 16a13 13 0 0 1 26 0" fill="none" stroke="currentColor" strokeWidth="6" pathLength="1" strokeDasharray="0.25 0.75" strokeDashoffset="-0.75" className="text-error"/><path d="M16 16v-9" stroke="currentColor" strokeWidth="2" transform={`rotate(${-90+180*progress} 16 16)`}/></svg>;
}
function Hint({label,text}:{label:string;text:string}){return <span title={text} tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-4">{label}</span>;}
export function AccountPanel(){
 const {isConnected}=useConnection(),{open}=useDepositModalActions();
 const state=useAllDexsAccountState();
 const options={enabled:isConnected,staleTime:300000};
 const metas=useInfo("allPerpMetas",undefined,options),dexs=useInfo("perpDexs",undefined,options);
 const spot=useInfo("spotMetaAndAssetCtxs",undefined,{enabled:isConnected,refetchInterval:30000});
 const collateral:Record<string,number>={};
 const prices=spot.data?spotUsdPrices(spot.data[0].universe,spot.data[1]):{0:1};
 if(metas.data&&dexs.data&&!metas.isError&&!dexs.isError)metas.data.forEach((meta,index)=>{const name=index===0?"":dexs.data?.[index]?.name;if(name!==undefined)collateral[name]=meta.collateralToken;});

 const summary=summarizeAccount({states:state.clearinghouseStates,balances:state.spotBalances,mode:state.accountAbstraction,collateral,prices,ready:!state.isLoading&&!state.hasError});
 const unified=state.accountAbstraction==="unifiedAccount",portfolio=state.accountAbstraction==="portfolioMargin";
 const ratioColor=summary.ratio===null?"text-fg-muted":summary.ratio>=0.95?"text-error":summary.ratio>=0.75?"text-warning":"text-success";
 const ratioLabel=unified?t`Unified Account Ratio`:portfolio?t`Portfolio Margin Ratio`:t`Cross Margin Ratio`;
 return <section aria-label={t`Account summary`} className="shrink-0 bg-surface px-2 pb-8 pt-3">
  <div className="grid grid-cols-2 gap-2"><Button variant="filled" intent="brand" onClick={()=>open("deposit")} aria-label={t`Deposit`}>{t`Deposit`}</Button><Button variant="outline" intent="neutral" onClick={()=>open("withdraw")} aria-label={t`Withdraw`}>{t`Withdraw`}</Button></div>
  <div className="mt-3 border-t border-stroke-weak pt-3"><h3 className="mb-2 text-sm font-semibold">{unified?t`Unified Account Summary`:portfolio?t`Portfolio Margin Summary`:t`Account Summary`}</h3>
   {!isConnected?<p className="py-3 text-xs text-fg-muted">{t`Connect wallet to view account`}</p>:<InfoRowGroup className="divide-y-0 tracking-normal [&>[data-slot=info-row]]:px-0 [&>[data-slot=info-row]]:py-1.5">
    <InfoRow label={<Hint label={ratioLabel} text={unified?t`Highest collateral-token maintenance ratio across perpetual DEXs. Isolated margin is deducted from that token’s available balance. A higher ratio means less margin headroom.`:portfolio?t`Portfolio margin risk requires portfolio-specific collateral and borrowing data. It is unavailable in this summary.`:t`Highest cross maintenance margin divided by cross account equity across perpetual DEXs.`}/>} value={summary.ratio===null?FALLBACK_VALUE_PLACEHOLDER:<span className="inline-flex items-center gap-1.5"><RiskGauge ratio={summary.ratio}/>{summary.ratio===Infinity?">100%":formatPercent(summary.ratio,{maximumFractionDigits:2,signDisplay:"never"})}</span>} valueClassName={ratioColor}/>
    <InfoRow label={t`Portfolio Value`} value={formatUSD(summary.portfolioValue,{compact:false})}/>
    <InfoRow label={t`Unrealized PNL`} value={formatUSD(summary.unrealizedPnl,{compact:false})} valueClassName={summary.unrealizedPnl===null?"text-fg-muted":getValueColorClass(summary.unrealizedPnl)}/>
    <InfoRow label={<Hint label={t`Perps Maintenance Margin`} text={t`Cross maintenance margin reported by Hyperliquid, summed across perpetual DEXs for the selected account.`}/>} value={formatUSD(summary.maintenance,{compact:false})}/>
    <InfoRow label={<Hint label={unified?t`Unified Account Leverage`:t`Account Leverage`} text={unified?t`Cross-perpetual exposure divided by the value of balances used as perpetual collateral. Other spot holdings are excluded.`:t`Total absolute perpetual position value across DEXs divided by portfolio value. This is account exposure, not an individual order’s leverage setting.`}/>} value={summary.leverage===null?FALLBACK_VALUE_PLACEHOLDER:`${summary.leverage.toFixed(2)}x`}/>
   </InfoRowGroup>}
  </div>
 </section>;
}
