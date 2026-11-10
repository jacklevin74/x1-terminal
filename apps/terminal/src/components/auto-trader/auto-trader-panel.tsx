import { ForecastPreview } from "./forecast-preview";
import {useTradingAccount} from "@/hooks/use-trading-account";
import {HelpTip} from "./help-tip";
import { closeNow } from "@/lib/auto-trader/close-now";
import { useSubmitPlan } from "@/hooks/trade/use-submit-plan";
import { Trans } from "@lingui/react/macro";
import { Modal, ModalPopup, ModalHeader, ModalTitle, ModalContent } from "@hypeterminal/ui";
import { useEffect, useRef, useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { zeroAddress, type Address, type Hex } from "viem";
import { useConnection, useWalletClient } from "wagmi";
import { AUTO_TRADER_AGENT_NAME, AUTO_TRADER_BUILDER, AUTO_TRADER_DEFAULTS, AUTO_TRADER_MIN_EQUITY } from "@/config/auto-trader";
import { BUILDER_CONFIGURED, DEFAULT_BUILDER_CONFIG } from "@/config/hyperliquid";
import { useExchange, useHyperliquid, useInfo, useAgentWallet, readAgentFromStorage } from "@/lib/hyperliquid";
import { sealAgentKey } from "@/lib/auto-trader/api";
import { useAutoTraderMutation, useAutoTraderSignal, useAutoTraderStatus } from "@/lib/auto-trader/hooks";
import { accountEquity, validateSettings } from "@/lib/auto-trader/targets";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";
import { SettingsCard, autoButton } from "./settings-card";
import { StatusCard, money } from "./status-card";

function normalize(settings:AutoTraderSettings):AutoTraderSettings{return {...settings,exclude:settings.exclude??[]};}
function Check({label,ok,detail}:{label:string;ok:boolean;detail:string}){return <li className="flex items-start gap-2 text-xs"><span className={ok?"text-success":"text-fg-muted"} aria-label={ok?"Ready":"Not ready"}>{ok?"✓":"○"}</span><span><strong className="font-medium">{label}</strong><HelpTip label={label} /><span className="mt-0.5 block break-all text-fg-muted">{detail}</span></span></li>;}
export function AutoTraderPanel(){
 const {address,isConnected}=useTradingAccount(),{env}=useHyperliquid();
 return <section id="auto-trader" className="space-y-4 scroll-mt-4" aria-label="Auto Trader">
  <div><h2 className="text-2xl font-semibold"><Trans>Auto Trader</Trans></h2><p className="mt-2 max-w-4xl text-sm text-fg-muted"><Trans>Follow the Mood Ring signal with a trading-only API wallet. You control leverage, markets, minimum order size and the daily loss stop. Loss controls do not guarantee a maximum loss. No returns are promised.</Trans></p></div>
  <p className="rounded-lg border border-stroke-weak bg-surface p-3 text-xs text-fg-muted"><Trans>Your funds stay in your Hyperliquid account. A separate agent can trade but cannot withdraw. Its key is sealed in your browser and stored encrypted by the existing execution service. Your owner key stays in your wallet. Auto Trader manages positions in the selected trading account, including markets you also trade manually there.</Trans></p>
  {env!=="Mainnet"?<p role="status" className="text-sm text-warning"><Trans>The hosted Auto Trader service supports Mainnet only. Switch the terminal to Mainnet to configure it.</Trans></p>:!isConnected||!address?<p className="rounded-xl border border-stroke-weak bg-surface p-4 text-sm"><Trans>Connect Rabby, X1 Wallet or Phantom above to configure Auto Trader.</Trans></p>:<AutoTraderAccount key={address.toLowerCase()} master={address} />}
 </section>;
}
function AutoTraderAccount({master}:{master:Address}){
 const {address}=useConnection(),{env,info}=useHyperliquid(),{data:wallet}=useWalletClient();
 const {address:target,subaccount}=useTradingAccount();
 const {submitPlan}=useSubmitPlan();
 const tradingAgent=useAgentWallet();
 const identity=useRef({address,target,env});identity.current={address,target,env};
 const alive=useRef(true),locked=useRef(false),pending=useRef<{key:Hex;address:Address;validUntil:number}|null>(null);
 const [pendingAddress,setPendingAddress]=useState<Address|null>(null),[busy,setBusy]=useState(false),[progress,setProgress]=useState("");
 const [error,setError]=useState<string|null>(null),[message,setMessage]=useState<string|null>(null),[confirm,setConfirm]=useState<"resume"|"flatten"|"remove"|"renew"|null>(null);
 const [selectedAgent,setSelectedAgent]=useState(""),[importKey,setImportKey]=useState("");
 const [settings,setSettings]=useState<AutoTraderSettings>(AUTO_TRADER_DEFAULTS),initialized=useRef(false);
 const status=useAutoTraderStatus(master),signal=useAutoTraderSignal(),control=useAutoTraderMutation(master);
 const markets=signal.isError?[]:[...new Set(signal.data?.coins.map(c=>c.coin)??[])];
 const opts={refetchInterval:30000,refetchOnWindowFocus:true};
 const main=useInfo("clearinghouseState",{user:master},opts),xyz=useInfo("clearinghouseState",{user:master,dex:"xyz"},opts),spot=useInfo("spotClearinghouseState",{user:master},opts),mode=useInfo("userAbstraction",{user:master},opts);
 const agents=useInfo("extraAgents",{user:address??zeroAddress},opts),fee=useInfo("maxBuilderFee",{user:address??zeroAddress,builder:AUTO_TRADER_BUILDER},opts);
 const approveAgent=useExchange("approveAgent"),approveFee=useExchange("approveBuilderFee");
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(pending.current)pending.current.key="0x";pending.current=null;};},[]);
 useEffect(()=>{if(!initialized.current&&status.data){if(status.data.settings)setSettings(normalize(status.data.settings));initialized.current=true;}},[status.data]);
 useEffect(()=>{if(status.data?.registered&&status.data.hasKey&&pending.current&&status.data.agent?.toLowerCase()===pending.current.address.toLowerCase()){pending.current.key="0x";pending.current=null;setPendingAddress(null);}},[status.data]);
 const configured=BUILDER_CONFIGURED&&DEFAULT_BUILDER_CONFIG?.b.toLowerCase()===AUTO_TRADER_BUILDER;
 const infoError=main.isError||xyz.isError||spot.isError||mode.isError;
 const equity=infoError?null:accountEquity(mode.data,main.data,xyz.data,spot.data);
 const funded=equity!==null&&equity>=AUTO_TRADER_MIN_EQUITY;
 const selectedMatches=!selectedAgent||selectedAgent.toLowerCase()===status.data?.agent?.toLowerCase();
 const targetAgent=selectedAgent||pendingAddress||status.data?.agent;
 const agentApproved=!agents.isError&&!!targetAgent&&!!agents.data?.some(row=>row.address.toLowerCase()===targetAgent.toLowerCase()&&row.validUntil>Date.now());
 const feeApproved=!fee.isError&&fee.data!==undefined&&fee.data>=50;
 const hasChanges=!!status.data?.settings&&JSON.stringify(normalize(settings))!==JSON.stringify(normalize(status.data.settings));
 let validationError:string|null=null;try{validateSettings(settings,markets);}catch(e){validationError=e instanceof Error?e.message:"Invalid settings.";}
 function check(){if(!alive.current||identity.current.address?.toLowerCase()!==address?.toLowerCase()||identity.current.target?.toLowerCase()!==master.toLowerCase()||identity.current.env!=="Mainnet")throw new Error("Wallet or network changed. Reconnect the intended owner account.");if(!wallet)throw new Error("Unlock and connect your owner wallet to continue.");}
 async function run(job:()=>Promise<void>){if(locked.current)return;locked.current=true;setBusy(true);setError(null);setMessage(null);try{check();await job();}catch(e){if(alive.current)setError(e instanceof Error?e.message:"Auto Trader request failed. Refresh status before retrying.");}finally{locked.current=false;if(alive.current){setBusy(false);setProgress("");}}}
 async function refreshChecks(){
  const [a,f,m,x,s,ab]=await Promise.all([agents.refetch(),fee.refetch(),main.refetch(),xyz.refetch(),spot.refetch(),mode.refetch()]);check();
  if([a,f,m,x,s,ab].some(q=>q.isError))throw new Error("Could not verify account readiness. Refresh checks and retry.");
  const eq=accountEquity(ab.data,m.data,x.data,s.data);if(eq===null||eq<15)throw new Error("Auto Trader requires at least $15 in verified account equity.");
  if(f.data===undefined||f.data<50)throw new Error("Approve the 0.05% X1 builder fee first.");
  return a.data??[];
 }
 async function createAgent(){
  if(!configured)throw new Error("This terminal's builder does not match the Auto Trader service.");
  const existing=await agents.refetch();check();if(existing.isError||!existing.data)throw new Error("Could not verify existing API wallets.");
  if(!pending.current){const key=generatePrivateKey();pending.current={key,address:privateKeyToAccount(key).address,validUntil:Date.now()+90*86400000};setPendingAddress(pending.current.address);}
  const fresh=pending.current;
  if(!existing.data.some(row=>row.address.toLowerCase()===fresh.address.toLowerCase()&&row.validUntil>Date.now())){
   setProgress("Approve the dedicated Auto Trader API wallet.");await approveAgent.mutateAsync({agentAddress:fresh.address,agentName:`${AUTO_TRADER_AGENT_NAME} valid_until ${fresh.validUntil}`});check();
  }
  const verified=await agents.refetch();check();if(verified.isError||!verified.data?.some(row=>row.address.toLowerCase()===fresh.address.toLowerCase()&&row.validUntil>Date.now()))throw new Error("API approval was submitted but is not verified yet. Retry this step to check it.");
  setMessage("Auto Trader API wallet approved. Register the sealed key next; registration starts paused.");
 }
 async function useExisting(){
  const row=agents.data?.find(a=>a.address.toLowerCase()===selectedAgent.toLowerCase());
  if(!row||row.validUntil<=Date.now())throw new Error("Select a valid API wallet.");
  const stored=readAgentFromStorage(env,address!);
  const key=stored?.publicKey.toLowerCase()===selectedAgent.toLowerCase()?stored.privateKey:importKey.trim() as Hex;
  if(!/^0x[\da-f]{64}$/i.test(key)||privateKeyToAccount(key).address.toLowerCase()!==selectedAgent.toLowerCase())throw new Error("Enter the private key matching the selected API wallet.");
  if(pending.current)pending.current.key="0x";
  pending.current={key,address:row.address,validUntil:row.validUntil};setPendingAddress(row.address);setImportKey("");
  await register();
 }
 async function register(){
  const fresh=pending.current;if(!fresh)throw new Error("Create a fresh Auto Trader API wallet first.");
  validateSettings(settings,markets);const list=await refreshChecks();if(!list.some(row=>row.address.toLowerCase()===fresh.address.toLowerCase()&&row.validUntil>Date.now()))throw new Error("The new Auto Trader API wallet is not approved for this owner.");
  setProgress("Seal and register the trading key.");
  await control.mutateAsync({action:"register",body:serverPubKey=>({master,agent:fresh.address,sealedKey:sealAgentKey(fresh.key,serverPubKey),settings:normalize(settings)})});check();fresh.key="0x";pending.current=null;setPendingAddress(null);
  await status.refetch();check();setMessage("Registered and paused. Review settings, then enable Auto Trader.");
 }
 async function closeImmediately(){
  if(!tradingAgent.isReady){window.dispatchEvent(new Event("x1:setup"));throw new Error("Complete terminal trading approval before closing positions.");}
  setProgress("Pause Auto Trader before closing positions.");
  await control.mutateAsync({action:"pause",body:{}});check();
  const paused=await status.refetch();check();
  if(paused.isError||paused.data?.state!=="paused")throw new Error("Could not verify Auto Trader is paused. No close orders were sent.");
  setProgress("Submitting reduce-only close orders now.");
  const count=await closeNow({info,master,check,submit:submitPlan});check();
  await Promise.all([main.refetch(),xyz.refetch(),status.refetch()]);check();
  setMessage(count?"Positions verified closed. Auto Trader is paused.":"No open perpetual positions. Auto Trader is paused.");
 }
 async function action(op:"settings"|"pause"|"resume"|"flatten"|"remove"){
  if(op==="resume"){
   if(!selectedMatches)throw new Error("Register the selected API wallet first.");
   validateSettings(settings,markets);if(hasChanges)throw new Error("Save your settings before enabling Auto Trader.");
   const list=await refreshChecks(),current=await status.refetch();check();
   if(current.isError||!current.data?.registered||!current.data.hasKey||!list.some(row=>row.address.toLowerCase()===current.data?.agent?.toLowerCase()&&row.validUntil>Date.now()))throw new Error("A registered, approved Auto Trader API wallet with a stored key is required.");
  }
  if(op==="settings")validateSettings(settings,markets);
  setProgress(`Sign Auto Trader ${op}.`);await control.mutateAsync({action:op,body:op==="settings"?normalize(settings):{}});check();
  const updated=await status.refetch();check();
  if(op==="settings"&&updated.data?.settings)setSettings(normalize(updated.data.settings));
  if(op==="remove"){if(pending.current)pending.current.key="0x";pending.current=null;setPendingAddress(null);}
  setMessage(op==="flatten"?"Close request accepted and queued. Positions remain open until the next executor cycle (normally within five minutes), then trading pauses. Check cycle orders and fills below.":op==="remove"?"Auto Trader registration and stored service key removed. Existing positions remain open.":op==="resume"?"Enabled. Check the next cycle for live or dry-run execution.":op==="pause"?"Paused. Existing positions remain open.":"Settings saved for the next cycle.");
 }
 const registered=status.data?.registered===true;
 return <>
  {!configured&&<p role="alert" className="text-sm text-error">The terminal builder must match {AUTO_TRADER_BUILDER} to use this service.</p>}
  {subaccount&&!status.data?.lastCycle&&<p role="status" className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">Waiting for the executor to report a cycle for this subaccount. Registration or an active state alone does not confirm trading. Your main account registration is separate.</p>}
  <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
   <section className="space-y-4 rounded-xl border border-stroke-weak bg-surface p-4"><h3 className="text-sm font-semibold"><Trans>Account readiness</Trans></h3><p className="break-all font-mono text-xs text-fg-muted">Signing owner: {address}</p><p className="break-all font-mono text-xs text-brand">Trading account: {subaccount?.name??"Main account"} · {master}</p><ul className="space-y-3">
    <Check label="Owner wallet" ok={!!wallet} detail={wallet?"Connected — signs control requests locally":"Connect or unlock Rabby / X1 Wallet / Phantom"} />
    <Check label="Account equity" ok={funded} detail={equity===null?mode.data==="portfolioMargin"?"Portfolio margin is not supported by this integration":"Waiting for verified account balances":`${money(equity)} · minimum $15`} />
    <Check label="Auto Trader API wallet" ok={agentApproved} detail={targetAgent??"Separate trading-only key; never uses the owner's private key"} />
    <Check label="Builder fee" ok={feeApproved} detail={fee.isError?"Approval status unavailable":"0.05% per fill, plus exchange fees"} />
    <Check label="Service registration" ok={registered&&!!status.data?.hasKey} detail={registered?status.data?.hasKey?"Encrypted key held by execution service":"Key missing — register again":"Not registered; registration starts paused"} />
   </ul>
   <button type="button" disabled={busy} className="text-xs text-brand" onClick={()=>{void Promise.all([agents.refetch(),fee.refetch(),main.refetch(),xyz.refetch(),spot.refetch(),mode.refetch(),status.refetch()]);}}><Trans>Refresh checks</Trans></button>
   {!feeApproved&&<button type="button" className={autoButton} disabled={busy||!wallet||!configured} onClick={()=>void run(async()=>{setProgress("Approve the 0.05% builder fee.");await approveFee.mutateAsync({builder:AUTO_TRADER_BUILDER,maxFeeRate:"0.05%"});check();const f=await fee.refetch();check();if(f.isError||f.data===undefined||f.data<50)throw new Error("Fee approval submitted but not verified. Refresh checks.");setMessage("Builder fee verified.");})}><Trans>Approve 0.05% fee</Trans></button>}
   <p className="text-xs text-fg-muted"><Trans>Fail-safe guards block trading on stale signals, expired agents, missing approvals or low equity. The daily loss stop blocks increases in exposure; it cannot guarantee a loss limit.</Trans></p>
  </section>
  <section className="space-y-4 rounded-xl border border-stroke-weak bg-surface p-4">
   <div className="block space-y-2 text-sm"><span>API wallet<HelpTip label="API wallet" /></span><select aria-label="Auto Trader API wallet" className="w-full rounded-lg border border-stroke-weak bg-background px-3 py-2" disabled={busy} value={selectedAgent} onChange={e=>{setSelectedAgent(e.target.value);setImportKey("");setError(null);}}><option value="">{status.data?.agent?`Registered wallet · ${status.data.agent}`:"Create a new API wallet"}</option>{agents.data?.map(row=><option key={row.address} value={row.address}>{(row.name??"").replace(/ valid_until \d+$/, "")||"Unnamed"} · {row.address}{row.validUntil<=Date.now()?" · Expired":""}</option>)}</select></div>
   <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed"><strong className="text-warning">Fund the selected trading account, not this API wallet.</strong> Auto Trader uses only the selected account’s Hyperliquid balance. API wallets only sign trades and need no separate funding; choosing a different API wallet does not create a separate balance.</p>
   {selectedAgent&&(!selectedMatches||!status.data?.hasKey)&&<div className="space-y-3"><p className="text-xs text-fg-muted">One Auto Trader registration is shown per selected trading account. Registering this wallet replaces the current registration and pauses execution. The settings below will be saved for this wallet.</p><label className="block text-xs">API private key (if unavailable on this device)<input aria-label="Selected API wallet private key" type="password" autoComplete="off" value={importKey} disabled={busy} onChange={e=>setImportKey(e.target.value)} className="mt-2 w-full rounded-lg border border-stroke-weak bg-background px-3 py-2" /></label><button type="button" className={autoButton} disabled={busy||!funded||!feeApproved||!configured||status.isError||!status.data||!!validationError} onClick={()=>void run(useExisting)}>Register selected API wallet</button></div>}
   <SettingsCard markets={markets} value={settings} onChange={setSettings} disabled={busy||status.isLoading} />
   {!markets.length&&<p role="status" className="text-xs text-fg-muted">{signal.isError?"Market list unavailable. Refresh to retry.":"Loading markets from the signal API…"}</p>}
   {validationError&&<p role="alert" className="text-xs text-error">{validationError}</p>}
   <div className="flex flex-wrap gap-3">
    {!selectedAgent&&(!registered||pendingAddress)&&<button type="button" className={autoButton} disabled={busy||!wallet||!funded||!configured||agents.isError||status.isError||!status.data||!!validationError} onClick={()=>void run(createAgent)}>{pendingAddress?"Check API wallet approval":"Create Auto Trader API wallet"}</button>}
    {pendingAddress&&<button type="button" className={autoButton} disabled={busy||!funded||!agentApproved||!feeApproved||status.isError||!status.data||!!validationError} onClick={()=>void run(register)}><Trans>Register Auto Trader</Trans></button>}
    {registered&&!pendingAddress&&<span className="inline-flex items-center"><button type="button" className="text-sm text-brand disabled:opacity-40" disabled={busy||!wallet||!configured||status.isError} onClick={()=>setConfirm("renew")}><Trans>Renew API wallet</Trans></button><HelpTip label="Renew API wallet" /></span>}
    {registered&&selectedMatches&&!pendingAddress&&<span className="inline-flex items-center"><button type="button" className={autoButton} disabled={busy||!hasChanges||status.isError||!!validationError} onClick={()=>void run(()=>action("settings"))}><Trans>Save settings</Trans></button><HelpTip label="Save settings" /></span>}
    {hasChanges&&<button type="button" className="text-xs text-fg-muted" disabled={busy} onClick={()=>{if(status.data?.settings)setSettings(normalize(status.data.settings));}}><Trans>Reset to saved</Trans></button>}
   </div>
   {pendingAddress&&<p className="text-xs text-warning"><Trans>This setup key exists only in this page's memory. Register it before leaving. It is encrypted for the service; it is not saved to browser storage.</Trans></p>}
   {hasChanges&&<p className="text-xs text-warning"><Trans>Unsaved settings. Save before enabling. Changes to an active trader apply on its next cycle.</Trans></p>}
   <p className="text-xs text-fg-muted"><Trans>Creating the dedicated API wallet does not start trading. Register, review your saved settings, then explicitly enable. Renewal replaces the previous Auto Trader key and registration pauses execution.</Trans></p>
  </section>
  </div>
  {status.isError&&<p role="alert" className="text-sm text-error">Auto Trader status is unavailable. {status.error instanceof Error?status.error.message:""} {status.data?"Showing the last received status; enabling is blocked.":"Refresh checks to retry."}</p>}
  {registered&&<div className="flex flex-wrap gap-3 rounded-xl border border-stroke-weak bg-surface p-4">
   <span className="inline-flex items-center"><button type="button" className={autoButton} disabled={busy||!selectedMatches||status.isError||status.data?.state==="active"||status.data?.state==="flatten-requested"||!funded||!agentApproved||!feeApproved||!status.data?.hasKey||hasChanges||!!validationError||!!pendingAddress} onClick={()=>setConfirm("resume")}><span>Start Auto Trader</span></button><HelpTip label="Start Auto Trader" /></span>
   <span className="inline-flex items-center"><button type="button" className="rounded-lg border border-stroke-weak px-4 py-2 text-sm disabled:opacity-40" disabled={busy||!selectedMatches||status.isError||status.data?.state==="paused"} onClick={()=>void run(()=>action("pause"))}><span>Stop Auto Trader</span></button><HelpTip label="Stop Auto Trader" /></span>
   <span className="inline-flex items-center"><button type="button" className="rounded-lg border border-stroke-weak px-4 py-2 text-sm disabled:opacity-40" disabled={busy||status.data?.state==="flatten-requested"} onClick={()=>setConfirm("flatten")}><Trans>Close & pause</Trans></button><HelpTip label="Close & pause" /></span>
   <span className="inline-flex items-center"><button type="button" className="px-3 py-2 text-sm text-error disabled:opacity-40" disabled={busy} onClick={()=>setConfirm("remove")}><Trans>Remove Auto Trader</Trans></button><HelpTip label="Remove Auto Trader" /></span>
   <a className="px-3 py-2 text-xs text-brand" href="/API#api-wallets"><Trans>Manage / revoke API wallets</Trans></a>
  </div>}
  {busy&&<p role="status" className="text-sm text-brand">{progress||"Waiting for approval…"}</p>}
  {error&&<p role="alert" className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">{error}</p>}
  {message&&<p role="status" className="rounded-lg border border-stroke-weak p-3 text-sm text-brand">{message}</p>}
  {status.data?<StatusCard status={{...status.data,isSubaccount:!!subaccount||status.data.isSubaccount}} />:status.isLoading?<p className="text-sm text-fg-muted"><Trans>Loading Auto Trader status…</Trans></p>:null}
  <section aria-label="Auto Trader preview" className="space-y-3 rounded-xl border border-stroke-weak bg-surface p-4"><h3 className="text-sm font-semibold">Target preview · live forecast</h3>
   <ForecastPreview account={master} settings={status.data?.settings??settings} status={status.data} signal={signal.data} signalError={signal.isError}/>
   {hasChanges&&<p className="text-xs text-warning">Unsaved form edits are not included. Save settings to update this forecast.</p>}

  </section>
  <Modal open={confirm!==null} onOpenChange={open=>{if(!open&&!busy)setConfirm(null);}}><ModalPopup size="md"><ModalHeader><ModalTitle>{confirm==="resume"?"Enable Auto Trader?":confirm==="flatten"?"Close all perpetual positions?":confirm==="renew"?"Renew Auto Trader API wallet?":"Remove Auto Trader?"}</ModalTitle></ModalHeader><ModalContent className="space-y-4">
   <p className="break-all font-mono text-xs">Signing owner: {address}</p><p className="break-all font-mono text-xs text-brand">Trading account: {subaccount?.name??"Main account"} · {master}</p>
   <p className="text-sm">{confirm==="resume"?`Enable automatic, perpetual rebalancing in the selected trading account with saved settings: ${settings.leverage}x leverage, ${(settings.killPct*100).toFixed(1)}% daily loss stop, minimum order $${settings.minOrderUsd}. Live trading depends on the operator's live gate. Trading can lose money and change manual positions.`:confirm==="flatten"?"Pause Auto Trader, then immediately submit reduce-only market orders to close all perpetual positions in the selected trading account, including manual positions there, through this terminal. Trading approval may be required. Orders allow up to 1% slippage; fees apply. Partial fills or exchange errors can leave positions open.":confirm==="renew"?"Approve a fresh trading-only key. This replaces the previous Auto Trader API wallet. Register the new key, then enable again; do not leave this page before registration.":"Delete Auto Trader configuration and its encrypted key from the service. This does not close positions or revoke the API wallet on-chain. Use API wallet Remove to revoke that permission. Orders already submitted may still fill."}</p>
   <div className="flex gap-3"><button type="button" className="flex-1 rounded-lg border border-stroke-weak p-2 text-sm" disabled={busy} onClick={()=>setConfirm(null)}><Trans>Cancel</Trans></button><button type="button" className={`${autoButton} flex-1`} disabled={busy} onClick={()=>{const op=confirm;setConfirm(null);if(op)void run(op==="renew"?createAgent:op==="flatten"?closeImmediately:()=>action(op));}}><Trans>Confirm</Trans></button></div>
  </ModalContent></ModalPopup></Modal>
 </>;
}
