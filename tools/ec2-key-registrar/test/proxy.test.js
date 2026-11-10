import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../src/app.js';
import {createProxyVerifier,signRequest,loadProxyKeys} from '../src/proxy-auth.js';
import {createService} from '../src/service.js';
import {createHandler,proxyMac} from '../../../api/ec2-keys.js';

const PROD='https://x1-terminal-20261029.vercel.app',PREVIEW='https://x1-terminal-20261029-git-feat-x-jacklevin74s-projects.vercel.app';
const OWNER='0x'+'ab'.repeat(20);
// Identical requests in the same millisecond carry identical MACs and count as replays, so tests use distinct timestamps.
let lastTs=0;const freshTs=()=>String(lastTs=Math.max(Date.now(),lastTs+1));
const prodHex=randomBytes(32).toString('hex'),previewHex=randomBytes(32).toString('hex');
const keys=[{tier:'production',secret:Buffer.from(prodHex,'hex')},{tier:'preview',secret:Buffer.from(previewHex,'hex')}];

async function listen(handler){const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,url:`http://127.0.0.1:${server.address().port}`};}
function fakeService(){const calls=[];return {calls,status:o=>{calls.push(['status',o]);return {ok:true};},nonce:o=>{calls.push(['nonce',o]);return {nonce:'n'};},create:async(o,raw,auth)=>{calls.push(['create',o,raw,auth]);return {created:true};},manage:async(op,o,raw)=>{calls.push([op,o,raw]);return {managed:op};}};}
async function upstream(t,options={}){
 const service=fakeService(),verify=createProxyVerifier({keys,now:options.now});
 const {server,url}=await listen(createApp({service,verify,production:true,...options}));t.after(()=>server.close());
 const call=async({method='GET',path=`/api/ec2-keys?op=status&owner=${OWNER}`,body='',secret=prodHex,ts=freshTs(),origin=PROD,mac,headers={}}={})=>{
  const h={'x-proxy-ts':ts,'x-proxy-auth':mac??signRequest(Buffer.from(secret,'hex'),method,path,ts,body),...(origin?{origin}:{}),...headers};
  if(method==='POST')h['content-type']??='application/json';
  const res=await fetch(url+path,{method,headers:h,body:method==='POST'?body:undefined});return {status:res.status,data:await res.json()};
 };
 return {service,call,url};
}

test('service refuses bad, missing, stale and replayed proxy signatures with 401',async t=>{
 const {call,service}=await upstream(t);
 assert.equal((await call()).status,200);
 assert.equal((await call({mac:'0'.repeat(64)})).status,401);
 assert.equal((await call({mac:''})).status,401);
 assert.equal((await call({secret:randomBytes(32).toString('hex')})).status,401);
 assert.equal((await call({ts:String(Date.now()-61_000)})).status,401);
 assert.equal((await call({ts:String(Date.now()+61_000)})).status,401);
 const ts=String(Date.now()),mac=signRequest(Buffer.from(prodHex,'hex'),'GET',`/api/ec2-keys?op=status&owner=${OWNER}`,ts,'');
 assert.equal((await call({ts,mac})).status,200);assert.equal((await call({ts,mac})).status,401);
 // A MAC for one path or body cannot be moved to another.
 assert.equal((await call({method:'POST',path:`/api/ec2-keys?op=disable&owner=${OWNER}`,body:'{"a":1}',mac:signRequest(Buffer.from(prodHex,'hex'),'POST',`/api/ec2-keys?op=disable&owner=${OWNER}`,ts,'{"a":2}')})).status,401);
 const health=await fetch((await upstream(t)).url+'/health');assert.equal(health.status,401);
 assert.equal(service.calls.length,2);
});
test('service enforces methods, ops, origins, body size and preview read-only access',async t=>{
 const {call,service}=await upstream(t);
 assert.equal((await call({method:'POST',path:`/api/ec2-keys?op=status&owner=${OWNER}`,body:'{}'})).status,405);
 assert.equal((await call({path:`/api/ec2-keys?op=sign&owner=${OWNER}`})).status,405);
 assert.equal((await call({path:`/api/ec2-keys?op=create&owner=${OWNER}`})).status,405);
 assert.equal((await call({method:'POST',path:`/api/ec2-keys?op=create&owner=${OWNER}`,body:'x'.repeat(5000)})).status,413);
 assert.equal((await call({origin:'https://evil.example'})).status,403);
 assert.equal((await call({origin:'http://localhost:4173'})).status,403); // production build: no localhost
 assert.equal((await call({origin:PREVIEW})).status,403); // production secret, preview origin
 assert.equal((await call({secret:previewHex,origin:PROD})).status,403); // preview secret cannot claim production
 assert.equal((await call({secret:previewHex,origin:PREVIEW})).status,200);
 assert.equal((await call({secret:previewHex,origin:PREVIEW,path:`/api/ec2-keys?op=nonce&owner=${OWNER}`})).status,403);
 assert.equal((await call({secret:previewHex,origin:PREVIEW,method:'POST',path:`/api/ec2-keys?op=create&owner=${OWNER}`,body:'{}'})).status,403);
 assert.equal((await call({method:'POST',path:`/api/ec2-keys?op=disable&owner=${OWNER}`,body:'{}'})).data.managed,'disable');
 assert.equal((await call({path:`/api/ec2-keys?op=status&owner=${OWNER}&x=1`})).status,400);
 assert.ok(!service.calls.some(c=>c[0]==='create'));
});
test('preview mutations work only when explicitly allowed; localhost only outside production',async t=>{
 const {call}=await upstream(t,{allowPreviewMutations:true});
 assert.equal((await call({secret:previewHex,origin:PREVIEW,method:'POST',path:`/api/ec2-keys?op=create&owner=${OWNER}`,body:'{}'})).status,200);
 const dev=await upstream(t,{production:false});assert.equal((await dev.call({origin:'http://localhost:4173'})).status,200);
});
test('per-client rate limit returns 429 after 30 requests a minute',async t=>{
 const {call}=await upstream(t);let last;for(let i=0;i<31;i++)last=await call({headers:{"x-forwarded-for":"203.0.113.9"}});assert.equal(last.status,429);
 assert.equal((await call({headers:{'x-forwarded-for':'203.0.113.10'}})).status,200);
});

async function proxied(t,{env,options}={}){
 const up=await upstream(t,options);let seen;
 const fetcher=async(url,init)=>{seen={url,init};return fetch(url.replace(/^https:\/\/keys\.test/,up.url),init);};
 const handler=createHandler({env:env??{EC2_KEYS_URL:'https://keys.test',EC2_KEYS_PROXY_SECRET:prodHex},fetcher});
 const logs=[];const original={log:console.log,error:console.error,warn:console.warn};for(const k of Object.keys(original))console[k]=(...a)=>logs.push(a.join(' '));t.after(()=>Object.assign(console,original));
 const {server,url}=await listen(handler);t.after(()=>server.close());
 const call=async(path,init={})=>{const res=await fetch(url+path,{...init,headers:{'x-forwarded-host':'x1-terminal-20261029.vercel.app',...init.headers}});return {status:res.status,text:await res.text(),headers:res.headers};};
 return {call,up,logs,seen:()=>seen};
}
test('Vercel proxy signs requests the service accepts and forwards x-auth and the body unchanged',async t=>{
 const p=await proxied(t);
 const ok=await p.call(`/api/ec2-keys?op=status&owner=${OWNER}`,{headers:{cookie:'session=secret','x-forwarded-for':'198.51.100.7, 10.0.0.1','x-real-ip':'1.2.3.4'}});
 assert.equal(ok.status,200);assert.deepEqual(JSON.parse(ok.text),{ok:true});
 const sent=p.seen().init.headers;assert.equal(sent.Cookie??sent.cookie,undefined);assert.equal(sent['X-Forwarded-For'],'198.51.100.7');assert.equal(sent['x-real-ip'],undefined);assert.equal(sent.Origin,PROD);
 const body='{"days":30,"name":"X1 KMS","owner":"'+OWNER+'"}';
 const created=await p.call(`/api/ec2-keys?op=create&owner=${OWNER}`,{method:'POST',headers:{'content-type':'application/json','x-auth':'{"nonce":"n"}',origin:PROD},body});
 assert.equal(created.status,200);const call=p.up.service.calls.find(c=>c[0]==='create');assert.equal(call[2],body);assert.equal(call[3],'{"nonce":"n"}');
 for(const r of [ok,created])assert.ok(!r.text.includes(prodHex));assert.ok(!p.logs.join('\n').includes(prodHex));
 assert.equal(created.headers.get('set-cookie'),null);assert.equal(created.headers.get('cache-control'),'private, no-store, max-age=0');
});
test('Vercel proxy rejects wrong method/op with 405, oversized bodies with 413, cross-site with 403, and fails closed without config',async t=>{
 const p=await proxied(t);
 assert.equal((await p.call(`/api/ec2-keys?op=create&owner=${OWNER}`)).status,405);
 assert.equal((await p.call(`/api/ec2-keys?op=status&owner=${OWNER}`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,405);
 assert.equal((await p.call(`/api/ec2-keys?op=sign&owner=${OWNER}`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,405);
 assert.equal((await p.call(`/api/ec2-keys?op=status&owner=${OWNER}`,{method:'DELETE'})).status,405);
 assert.equal((await p.call(`/api/ec2-keys?op=create&owner=${OWNER}`,{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(4097)})).status,413);
 assert.equal((await p.call(`/api/ec2-keys?op=create&owner=${OWNER}`,{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.example'},body:'{}'})).status,403);
 assert.equal((await p.call(`/api/ec2-keys?op=status&owner=nope`)).status,400);
 const missing=await proxied(t,{env:{}});const r=await missing.call(`/api/ec2-keys?op=status&owner=${OWNER}`);assert.equal(r.status,503);assert.match(r.text,/EC2 key service unavailable/);
 assert.ok(!p.logs.join('\n').includes(prodHex));
});
test('Vercel proxy with the preview secret gets only status from the service',async t=>{
 const p=await proxied(t,{env:{EC2_KEYS_URL:'https://keys.test',EC2_KEYS_PROXY_SECRET:previewHex}});
 const host='x1-terminal-20261029-git-feat-x-jacklevin74s-projects.vercel.app';
 assert.equal((await p.call(`/api/ec2-keys?op=status&owner=${OWNER}`,{headers:{'x-forwarded-host':host}})).status,200);
 assert.equal((await p.call(`/api/ec2-keys?op=nonce&owner=${OWNER}`,{headers:{'x-forwarded-host':host}})).status,403);
});
test('MAC format matches between the Vercel proxy and the service',()=>{
 const s=Buffer.from(prodHex,'hex');assert.equal(proxyMac(s,'POST','/api/ec2-keys?op=create&owner=x','123','{}'),signRequest(s,'POST','/api/ec2-keys?op=create&owner=x','123','{}'));
});
test('proxy secrets load from systemd credentials and must differ',t=>{
 const dir=mkdtempSync(join(tmpdir(),'x1-cred-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writeFileSync(join(dir,'proxy.secret'),prodHex+'\n');assert.deepEqual(loadProxyKeys(dir).map(k=>k.tier),['production']);
 writeFileSync(join(dir,'proxy-preview.secret'),previewHex);assert.deepEqual(loadProxyKeys(dir).map(k=>k.tier),['production','preview']);
 writeFileSync(join(dir,'proxy-preview.secret'),prodHex);assert.throws(()=>loadProxyKeys(dir),/must differ/);
 writeFileSync(join(dir,'proxy.secret'),'short');try{loadProxyKeys(dir);assert.fail();}catch(e){assert.ok(!String(e.message).includes('short'));}
});
test('existing databases from the creation-only service migrate in place',t=>{
 const dir=mkdtempSync(join(tmpdir(),'x1-mig-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const file=join(dir,'keys.sqlite');
 const old=new DatabaseSync(file);old.exec("CREATE TABLE requests(id TEXT PRIMARY KEY,idem TEXT NOT NULL UNIQUE,owner TEXT NOT NULL,name TEXT NOT NULL,days INTEGER NOT NULL,state TEXT NOT NULL,arn TEXT,agent TEXT,created INTEGER NOT NULL,aws_request TEXT);");old.close();
 const service=createService({file,kms:{}});assert.equal(service.status(OWNER).agents.length,0);service.close();
});
test('behind CloudFront (one trusted hop) unauthenticated limits key on the address CloudFront saw, not the edge',async t=>{
 const {url}=await upstream(t,{trustedHops:1,unauthLimit:(()=>{const seen=new Map();return k=>{seen.set(k,(seen.get(k)??0)+1);return seen.get(k)<=2;};})()});
 const hit=xff=>fetch(url+'/health',{headers:{'x-forwarded-for':xff}}).then(r=>r.status);
 assert.equal(await hit('1.1.1.1, 198.51.100.1, 130.176.0.1'),401);assert.equal(await hit('2.2.2.2, 198.51.100.1, 130.176.0.2'),401);
 assert.equal(await hit('3.3.3.3, 198.51.100.1, 130.176.0.3'),429); // same CloudFront viewer, different edges and spoofed first entries
 assert.equal(await hit('9.9.9.9, 198.51.100.2, 130.176.0.1'),401); // another viewer through the same edge is not penalized
});
