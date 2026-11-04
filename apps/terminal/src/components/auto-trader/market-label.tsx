import {useState} from "react";
import {getIconUrlFromMarketName} from "@/domain/market/tokens";

export function AutoTraderMarketLabel({coin}:{coin:string}){
 const [failedSrc,setFailedSrc]=useState<string|null>(null);
 const src=getIconUrlFromMarketName(coin);
 const symbol=coin.split(":").at(-1)??coin;
 return <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-fill-weak text-[9px] font-semibold">{failedSrc===src?symbol.slice(0,2):<img src={src} alt="" className="size-full object-contain" onError={()=>setFailedSrc(src)} />}</span><span>{coin}</span></span>;
}
