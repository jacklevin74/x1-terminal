/** Fixed-window in-memory limiter. Returns true when the call is allowed. */
export function createRateLimiter({limit,windowMs,now=Date.now,maxKeys=20_000}){
 const windows=new Map();
 return function allow(key){
  const current=now();
  if(windows.size>=maxKeys)for(const [k,w] of windows)if(w.reset<=current)windows.delete(k);
  let entry=windows.get(key);
  if(!entry||entry.reset<=current){
   if(!entry&&windows.size>=maxKeys)return false; // fail closed instead of growing without bound
   entry={count:0,reset:current+windowMs};windows.set(key,entry);
  }
  if(entry.count>=limit)return false;
  entry.count++;return true;
 };
}
