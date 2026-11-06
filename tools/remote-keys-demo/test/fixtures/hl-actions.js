// Synthetic XRP fixtures, never submitted to an exchange.
const builder={b:'0x95e1642b6c06e06e6ad9412a90e908dcb09f6c1a',f:50};
const order=(t,r=false)=>({type:'order',orders:[{a:25,b:true,p:'1.2',s:'150',r,t}],grouping:'na',builder});
export const actions={
 maker:order({limit:{tif:'Alo'}}),
 taker:order({limit:{tif:'Ioc'}}),
 close:order({limit:{tif:'Ioc'}},true),
 stop:order({trigger:{isMarket:true,triggerPx:'1.1',tpsl:'sl'}},true),
 cancel:{type:'cancel',cancels:[{a:25,o:12345}]},
 leverage:{type:'updateLeverage',asset:25,isCross:true,leverage:3}
};
export const TEST_VAULT='0x1111111111111111111111111111111111111111';
