import {create} from "zustand";
import {createJSONStorage,persist} from "zustand/middleware";
import {isAddress} from "viem";
export interface SelectedTradingAccount {owner:`0x${string}`;network:string;address:`0x${string}`;name:string}
interface State {selection:SelectedTradingAccount|null;select:(account:SelectedTradingAccount|null)=>void}
function validSelection(value:unknown):value is SelectedTradingAccount{
 if(!value||typeof value!=="object")return false;
 const s=value as Partial<SelectedTradingAccount>;
 return typeof s.owner==="string"&&isAddress(s.owner)&&typeof s.address==="string"&&isAddress(s.address)&&["mainnet","testnet"].includes(s.network??"")&&typeof s.name==="string"&&s.name.length<=100;
}
export const useTradingAccountStore=create<State>()(persist(set=>({selection:null,select:selection=>set({selection})}),{
 name:"x1-terminal:trading-account",storage:createJSONStorage(()=>typeof window!=="undefined"?window.sessionStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}),partialize:state=>({selection:state.selection}),
 merge:(persisted,current)=>{const value=(persisted as {selection?:unknown}|undefined)?.selection;return {...current,selection:validSelection(value)?value:null};},
}));
export function scopedTradingAccount(selection:SelectedTradingAccount|null,owner:string|undefined,network:string){return owner&&selection?.owner.toLowerCase()===owner.toLowerCase()&&selection.network===network?selection:null;}
