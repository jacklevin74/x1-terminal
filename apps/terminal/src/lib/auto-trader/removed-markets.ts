import {allowedMarkets,selectableMarkets} from "./targets";
import type {AutoTraderSettings} from "./types";
export function removedMarketsForSave(previous:AutoTraderSettings,next:AutoTraderSettings,markets:readonly string[]) {
 if(next.closeRemovedPositions!==true)return [];
 const universe=selectableMarkets([...markets,...(previous.include??[]),...(next.include??[])],previous);
 const after=new Set(allowedMarkets(next,universe));
 return allowedMarkets(previous,universe).filter(coin=>!after.has(coin));
}
export function closeRemovedSettingsRequest(previous:AutoTraderSettings,next:AutoTraderSettings,markets:readonly string[]) {
 const {closeMarkets:_readonlyQueue,...settings}=next;
 const removed=removedMarketsForSave(previous,next,markets);
 return {...settings,...(next.closeRemovedPositions?{removedMarkets:removed}:{})};
}
