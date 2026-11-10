import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

// Requests reach this service only through the X1 Terminal Vercel function, which signs each one.
// MAC = hex(HMAC-SHA256(secret, method + "\n" + pathAndQuery + "\n" + ts + "\n" + hex(sha256(body))))
export const MAX_SKEW_MS=60_000;
export const REPLAY_TTL_MS=120_000;

export function canonicalRequest(method,pathAndQuery,ts,body){
 return [method,pathAndQuery,String(ts),createHash('sha256').update(body??'').digest('hex')].join('\n');
}
export function signRequest(secret,method,pathAndQuery,ts,body){
 return createHmac('sha256',secret).update(canonicalRequest(method,pathAndQuery,ts,body)).digest('hex');
}
/** Reads a 32-byte hex secret. The value is never logged or included in errors. */
export function parseSecret(text){
 const value=String(text??'').trim();
 if(!/^[a-f0-9]{64}$/i.test(value))throw Error('Proxy secret must be 32 random bytes in hex.');
 return Buffer.from(value,'hex');
}
/** Loads secrets passed with systemd LoadCredential=. The preview secret is optional. */
export function loadProxyKeys(directory=process.env.CREDENTIALS_DIRECTORY){
 if(!directory)throw Error('Proxy credentials are not configured.');
 const keys=[{tier:'production',secret:parseSecret(readFileSync(join(directory,'proxy.secret'),'utf8'))}];
 let preview;try{preview=readFileSync(join(directory,'proxy-preview.secret'),'utf8');}catch{}
 if(preview!==undefined){const secret=parseSecret(preview);if(timingSafeEqual(secret,keys[0].secret))throw Error('Preview and production proxy secrets must differ.');keys.push({tier:'preview',secret});}
 return keys;
}
/**
 * Returns verify(request) → "production" | "preview" | null.
 * Each secret maps to one tier, so a preview deployment can never sign as production.
 */
export function createProxyVerifier({keys,now=Date.now,maxEntries=50_000}){
 if(!Array.isArray(keys)||!keys.length)throw Error('At least one proxy key is required.');
 const seen=new Map();
 return function verify({method,pathAndQuery,ts,mac,body}){
  if(typeof ts!=='string'||!/^\d{13}$/.test(ts)||typeof mac!=='string'||!/^[a-f0-9]{64}$/.test(mac))return null;
  const current=now();if(Math.abs(current-Number(ts))>MAX_SKEW_MS)return null;
  for(const [id,expires] of seen){if(expires>current)break;seen.delete(id);}
  const given=Buffer.from(mac,'hex'),message=canonicalRequest(method,pathAndQuery,ts,body);let tier=null;
  for(const key of keys){const expected=createHmac('sha256',key.secret).update(message).digest();if(timingSafeEqual(expected,given)&&tier===null)tier=key.tier;}
  if(tier===null)return null;
  const id=`${ts}:${mac}`;
  if(seen.has(id)||seen.size>=maxEntries)return null; // replay, or fail closed under a flood
  seen.set(id,current+REPLAY_TTL_MS);
  return tier;
 };
}
