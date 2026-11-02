const decimal = value => {
 const s=String(value).trim(); if(!/^-?\d+(\.\d{1,30})?$/.test(s) || s.length>100) throw new Error("Invalid numeric archive field");
 const [whole, fraction=""]=s.split("."); return {n:BigInt(whole+fraction),scale:fraction.length};
};
function render(n, scale) {
 const sign=n<0n?"-":""; const str=(n<0n?-n:n).toString().padStart(scale+1,"0");
 return sign+(scale?`${str.slice(0,-scale)}.${str.slice(-scale)}`.replace(/\.?0+$/,""):str);
}
export function add(a,b) {const x=decimal(a),y=decimal(b),s=Math.max(x.scale,y.scale);return render(x.n*10n**BigInt(s-x.scale)+y.n*10n**BigInt(s-y.scale),s);}
function multiply(a,b) {const x=decimal(a),y=decimal(b);return render(x.n*y.n,x.scale+y.scale);}
export function parseCsv(text) {
 const records=[]; let row=[],field="",quoted=false,endedQuote=false;
 for(let i=0;i<text.length;i++) {
  const c=text[i];
  if(quoted) {if(c==='"') {if(text[i+1]==='"') {field+='"';i++;} else {quoted=false;endedQuote=true;}} else field+=c;continue;}
  if(c==='"') {if(field || endedQuote) throw new Error("Invalid CSV quote");quoted=true;}
  else if(c==="," || c==="\n") {row.push(field);field="";endedQuote=false;if(c==="\n") {if(row.some(Boolean))records.push(row);row=[];}}
  else if(c!=="\r") {if(endedQuote) throw new Error("Invalid CSV field");field+=c;}
 }
 if(quoted)throw new Error("Unterminated CSV quote");
 if(field || row.length){row.push(field);if(row.some(Boolean))records.push(row);}
 return records;
}
export function validateFill(value) {
 if(!value || !/^0x[\da-f]{40}$/i.test(value.user) || typeof value.coin!=="string" || !value.coin || value.coin.length>100)throw new Error("Invalid trader or market in local data");
 for(const field of ["px","sz","closedPnl"])decimal(value[field]);
 if(value.builderFee!==null)decimal(value.builderFee);
 if(decimal(value.px).n<0n || decimal(value.sz).n<0n)throw new Error("Invalid fill size or price");
 const time = /^\d+$/.test(String(value.time)) ? Number(value.time) : Date.parse(String(value.time));
 if(!Number.isSafeInteger(time) || time<0)throw new Error("Invalid fill timestamp");
 if(value.tid!==undefined && ((typeof value.tid==="number" && !Number.isSafeInteger(value.tid)) || !/^\d+$/.test(String(value.tid))))throw new Error("Invalid fill trade ID");
 return {...value,time,user:value.user.toLowerCase()};
}

export function parseFills(text) {
 const records=parseCsv(text.replace(/^\uFEFF/,"")); const headers=records.shift()?.map(h=>h.trim());
 if(!headers)throw new Error("Missing builder archive header");
 const aliases={user:["user"],coin:["coin"],px:["px"],sz:["sz"],closedPnl:["closed_pnl","closedPnl"],builderFee:["builder_fee","builderFee"],time:["time"]};
 const index=Object.fromEntries(Object.entries(aliases).map(([k,names])=>{const i=headers.findIndex(h=>names.includes(h));if(i<0)throw new Error(`Archive missing ${k}`);return[k,i];}));
 return records.map(row=>{
  if(row.length!==headers.length)throw new Error("Unexpected builder archive column count");
  const value=Object.fromEntries(Object.entries(index).map(([k,i])=>[k,row[i]]));
  const tidIndex=headers.findIndex(h=>h==="tid" || h==="trade_id");
  if(tidIndex>=0 && row[tidIndex])value.tid=row[tidIndex];
  return validateFill(value);
 });
}
function metrics() {return {fills:0,volume:"0",realizedPnl:"0",builderFeesPaid:"0",knownFeesPaid:"0",missingFeeFills:0,exchangeFeesPaid:null,totalFeesPaid:null};}
function accumulate(total,fill) {total.fills++;total.volume=add(total.volume,multiply(fill.px,fill.sz));total.realizedPnl=add(total.realizedPnl,fill.closedPnl);if(fill.builderFee===null)total.missingFeeFills++;else total.knownFeesPaid=add(total.knownFeesPaid,fill.builderFee);total.builderFeesPaid=total.builderFeesPaid===null || fill.builderFee===null ? null : add(total.builderFeesPaid,fill.builderFee);}
export function aggregateFills(fills, quotes = {}) {
 const users=new Map();
 for(const fill of fills) {
  if(!users.has(fill.user))users.set(fill.user,{address:fill.user,fills:0,totals:metrics(),byMarket:Object.create(null),byQuoteToken:Object.create(null)});
  const user=users.get(fill.user);user.fills++;accumulate(user.totals,fill);
  const market=user.byMarket[fill.coin]??={quoteToken:Object.hasOwn(quotes,fill.coin) && typeof quotes[fill.coin]==="string" ? quotes[fill.coin] : null,...metrics()};accumulate(market,fill);
  const token=market.quoteToken;if(token)accumulate(user.byQuoteToken[token]??=metrics(),fill);
 }
 const totalsByQuoteToken=Object.create(null);
 for(const user of users.values())for(const [token,total] of Object.entries(user.byQuoteToken)) {
  const sum=totalsByQuoteToken[token]??=metrics();sum.fills+=total.fills;sum.knownFeesPaid=add(sum.knownFeesPaid,total.knownFeesPaid);sum.missingFeeFills+=total.missingFeeFills;for(const key of ["volume","realizedPnl","builderFeesPaid"])sum[key]=sum[key]===null || total[key]===null ? null : add(sum[key],total[key]);
 }
 return {userCount:users.size,fillCount:fills.length,totalsByQuoteToken,users:[...users.values()].sort((a,b)=>b.fills-a.fills || a.address.localeCompare(b.address))};
}
