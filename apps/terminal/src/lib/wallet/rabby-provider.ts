import type {EIP1193Provider} from "viem";
type InjectedProvider=EIP1193Provider & {isRabby?:boolean;providers?:InjectedProvider[]};
const discovered=new WeakMap<Window,{provider?:EIP1193Provider}>();
/** Select Rabby explicitly instead of whichever extension owns window.ethereum. */
export function getRabbyProvider():EIP1193Provider|undefined{
 if(typeof window==="undefined")return undefined;
 let state=discovered.get(window);
 if(!state){
  state={};discovered.set(window,state);const target=state;
  window.addEventListener("eip6963:announceProvider",event=>{
   const detail=(event as CustomEvent<{info?:{rdns?:string};provider?:EIP1193Provider}>).detail;
   if(detail?.info?.rdns==="io.rabby"&&typeof detail.provider?.request==="function")target.provider=detail.provider;
  });
 }
 window.dispatchEvent(new Event("eip6963:requestProvider"));
 if(state.provider)return state.provider;
 const ethereum=(window as Window & {ethereum?:InjectedProvider}).ethereum;
 return [...(ethereum?.providers??[]),ethereum].find((p):p is InjectedProvider=>!!p&&p.isRabby===true&&typeof p.request==="function");
}
