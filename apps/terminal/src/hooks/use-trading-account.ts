import {useConnection} from "wagmi";
import {getNetwork} from "@/lib/network";
import {scopedTradingAccount,useTradingAccountStore} from "@/stores/use-trading-account-store";
export function useTradingAccount(){
 const connection=useConnection();const selection=useTradingAccountStore(s=>s.selection);
 const selected=scopedTradingAccount(selection,connection.address,getNetwork());
 return {...connection,ownerAddress:connection.address,address:selected?.address??connection.address,subaccount:selected,isSubaccount:!!selected};
}
