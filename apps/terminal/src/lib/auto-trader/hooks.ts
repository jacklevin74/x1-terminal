import {useTradingAccount} from "@/hooks/use-trading-account";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useConnection, useWalletClient } from "wagmi";
import { useHyperliquid } from "@/lib/hyperliquid";
import { getSignal, getStatus, signedCall } from "./api";
import type { AutoTraderAction } from "./types";
import type { Address } from "viem";
export function useAutoTraderStatus(address:Address){return useQuery({queryKey:["auto-trader","status",address.toLowerCase()],queryFn:({signal})=>getStatus(address,signal),refetchInterval:30000,staleTime:10000,retry:1});}
export function useAutoTraderSignal(){return useQuery({queryKey:["auto-trader","signal"],queryFn:({signal})=>getSignal(signal),refetchInterval:30000,staleTime:10000,retry:1});}
export function useAutoTraderMutation(master:Address){
 const {address}=useConnection(),{data:wallet}=useWalletClient(),{env}=useHyperliquid();
 const {address:target}=useTradingAccount();
 const queryClient=useQueryClient(),latest=useRef({address,target,env});latest.current={address,target,env};
 const controller=useRef<AbortController|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 return useMutation({mutationKey:["auto-trader","action",master],retry:false,mutationFn:async({action,body}:{action:AutoTraderAction;body:Parameters<typeof signedCall>[1]})=>{
  if(controller.current)throw new Error("Another Auto Trader request is still pending.");
  const assertAccount=()=>{if(!mounted.current||!address||latest.current.address?.toLowerCase()!==address.toLowerCase()||latest.current.target?.toLowerCase()!==master.toLowerCase()||latest.current.env!=="Mainnet"||wallet?.account?.address&&wallet.account.address.toLowerCase()!==address?.toLowerCase())throw new Error("Wallet or network changed. Reconnect the intended owner account.");};
  assertAccount();if(!wallet)throw new Error("Unlock and connect your Rabby, X1 or Phantom owner wallet to continue.");
  const abort=new AbortController();controller.current=abort;
  try{return await signedCall(action,body,{master,owner:address,assertAccount,sign:request=>wallet.signTypedData(request),signal:abort.signal});}finally{controller.current=null;void queryClient.invalidateQueries({queryKey:["auto-trader","status",master.toLowerCase()]});}
 }});
}
