import {afterEach,expect,it} from "vitest";
import {scopedTradingAccount,useTradingAccountStore} from "@/stores/use-trading-account-store";
const owner=`0x${"ab".repeat(20)}` as const,sub=`0x${"12".repeat(20)}` as const;
afterEach(()=>useTradingAccountStore.getState().select(null));
it("scopes account selection to the connected owner and network",()=>{
 const selection={owner,network:"mainnet",address:sub,name:"Ledger strategy"};
 expect(scopedTradingAccount(selection,owner,"mainnet")?.address).toBe(sub);
 expect(scopedTradingAccount(selection,owner.toUpperCase(),"mainnet")?.address).toBe(sub);
 expect(scopedTradingAccount(selection,undefined,"mainnet")).toBeNull();
 expect(scopedTradingAccount(selection,sub,"mainnet")).toBeNull();
 expect(scopedTradingAccount(selection,owner,"testnet")).toBeNull();
});
it("returns to the main account without changing the signing wallet",()=>{
 const {select}=useTradingAccountStore.getState();select({owner,network:"mainnet",address:sub,name:"Bot"});expect(useTradingAccountStore.getState().selection?.owner).toBe(owner);select(null);expect(useTradingAccountStore.getState().selection).toBeNull();
});
