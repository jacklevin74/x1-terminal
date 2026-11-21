import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {ethers} from 'ethers';
import {createService,DOMAIN,SIGNER_DOMAIN,TYPES} from '../src/service.js';
import {KmsDenied,checkIdentity,parseRole,kmsAdapter} from '../src/kms.js';
import {ProvisionerUnavailable,parseProvisionerConfig} from '../src/provisioner.js';

const LEGACY_ARN='arn:aws:kms:us-east-2:111122223333:key/11111111-1111-1111-1111-111111111111';
const SUB='0x'+'2'.repeat(40);

// Fake signer-account provisioner. Like the real one (hl-ws signer/src/terminal-wallets.js) it verifies the owner's
// X1SignerKeys signature itself and returns the key it made for the same signed request (same nonce) on a repeat.
function fakeProvisioner(){
 const calls=[],bindings=new Map();let mode='ok',activation={ok:false,reason:'agent not approved by the owner on Hyperliquid'};
 const verify=(auth,action,target)=>{const h=JSON.parse(auth.header);const signer=ethers.verifyTypedData(SIGNER_DOMAIN,TYPES,{action,target,nonce:h.nonce,timestamp:h.timestamp,bodyHash:ethers.keccak256(ethers.toUtf8Bytes(auth.raw))},h.signature).toLowerCase();return {signer,nonce:h.nonce,body:JSON.parse(auth.raw)};};
 const p={calls,bindings,set:(m)=>{mode=m;},activate:(a)=>{activation=a;},async invoke(req){
  calls.push(req);
  if(mode==='down')throw new ProvisionerUnavailable('timeout');
  if(mode==='refuse')return {ok:false,reason:'owner does not own this sub-account'};
  if(req.op==='key-create'){
   const o=verify(req.auth,'create',req.owner);if(o.signer!==req.owner)return {ok:false,reason:'signer is not the owner'};
   const prev=bindings.get(req.account);
   if(prev&&prev.createNonce===o.nonce)return {ok:true,reused:true,binding:prev};
   if(prev)return {ok:false,reason:'account already has a signer key (pending)'};
   const b={account:req.account,owner:req.owner,agent:ethers.Wallet.createRandom().address,status:'pending',source:'terminal',keyState:'enabled',createNonce:o.nonce};
   bindings.set(req.account,b);
   if(mode==='lost'){mode='ok';throw new ProvisionerUnavailable('timeout');} // key made, answer lost
   return {ok:true,binding:b};
  }
  if(req.op==='activate'){if(activation.ok){const b=bindings.get(req.account);b.status='active';return {ok:true,status:'active',validUntil:activation.validUntil};}return activation;}
  if(req.op==='key-manage'){
   const b=bindings.get(req.account),o=verify(req.auth,req.action,b.owner);if(o.signer!==b.owner)return {ok:false,reason:'signer is not the key owner'};
   if(req.action==='disable')Object.assign(b,{status:'disabled',keyState:'disabled'});
   if(req.action==='enable')Object.assign(b,{status:'pending',keyState:'enabled'});
   if(req.action==='delete')Object.assign(b,{status:'disabled',keyState:'pending_deletion',deletionDate:Date.now()+30*86400000});
   if(req.action==='cancel-delete')Object.assign(b,{keyState:'disabled',deletionDate:null});
   return {ok:true,binding:{...b}};
  }
  return {ok:false,reason:'unknown op'};
 }};
 return p;
}
function fixture(t,{provisioner=fakeProvisioner(),kmsOverrides={},options={}}={}){
 const directory=mkdtempSync(join(tmpdir(),'x1-keys-')),file=join(directory,'keys.sqlite');
 const wallet=ethers.Wallet.createRandom();
 const calls={disable:0,scheduleDeletion:0,cancelDeletion:0};const audit=[];
 const kms={disable:async()=>{calls.disable++;},scheduleDeletion:async(_arn,days)=>{calls.scheduleDeletion++;return {deletionDate:Date.now()+days*86400000};},cancelDeletion:async()=>{calls.cancelDeletion++;},...kmsOverrides};
 let clock=Date.now();const now=()=>clock;
 const service=createService({file,kms,provisioner,audit:e=>audit.push(e),now,...options});t.after(()=>{service.close();rmSync(directory,{recursive:true,force:true});});
 const owner=wallet.address.toLowerCase();
 async function envelope(action,body,{signer=wallet,domain=SIGNER_DOMAIN,timestamp=now(),forOwner=owner}={}){const raw=JSON.stringify(body),nonce=service.nonce(forOwner).nonce;const signature=await signer.signTypedData(domain,TYPES,{action,target:forOwner,nonce,timestamp:BigInt(timestamp),bodyHash:ethers.keccak256(ethers.toUtf8Bytes(raw))});return {raw,auth:JSON.stringify({nonce,timestamp,signature})};}
 const request=({account=owner,name='First KMS',days=90,...o}={})=>envelope('create',{account,days,name,owner},o);
 async function created(opts){const r=await request(opts);return (await service.create(owner,r.raw,r.auth));}
 function legacy({state='enabled'}={}){const db=new DatabaseSync(file);const id='22222222-2222-2222-2222-222222222222',agent=ethers.Wallet.createRandom().address;
  db.prepare("INSERT INTO requests(id,idem,owner,name,days,state,arn,agent,created,kms_state,backend) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(id,'legacy-idem',owner,'Old EC2',7,'ready',LEGACY_ARN,agent,now(),state,'legacy');db.close();return {id,agent};}
 return {service,owner,wallet,request,envelope,created,legacy,calls,audit,provisioner,advance:ms=>{clock+=ms;}};
}

test('create relays the exact owner-signed request to the signer-account provisioner and mirrors the key',async t=>{
 const f=fixture(t),r=await f.request(),result=await f.service.create(f.owner,r.raw,r.auth);
 assert.equal(f.provisioner.calls.length,1);
 assert.deepEqual(f.provisioner.calls[0],{op:'key-create',account:f.owner,owner:f.owner,auth:{raw:r.raw,header:r.auth}});
 const k=result.agents.find(a=>a.id===result.createdAgentId);
 assert.deepEqual([k.backend,k.account,k.signerStatus,k.state,k.days],['signer',f.owner,'pending','awaiting_approval',90]);
 assert.equal(k.agent,f.provisioner.bindings.get(f.owner).agent);assert.equal(result.keyStore,'signer');assert.equal(result.capabilities.sign,false);
 assert.ok(!JSON.stringify(result).includes('arn:'));
 const again=await f.request();assert.equal((await f.service.create(f.owner,again.raw,again.auth)).createdAgentId,result.createdAgentId);
 assert.equal(f.provisioner.calls.length,1);
 assert.deepEqual(f.audit.map(e=>[e.op,e.result]),[['create','ok']]);
});
test('create refuses the legacy signature domain, the old body shape and unsupported durations before any invoke',async t=>{
 const f=fixture(t);
 const legacyDomain=await f.request({domain:DOMAIN});await assert.rejects(f.service.create(f.owner,legacyDomain.raw,legacyDomain.auth),e=>e.status===403);
 const oldShape=await f.envelope('create',{days:30,name:'Old',owner:f.owner});await assert.rejects(f.service.create(f.owner,oldShape.raw,oldShape.auth),e=>e.status===400);
 const week=await f.request({days:7});await assert.rejects(f.service.create(f.owner,week.raw,week.auth),/30, 90 or 180/);
 const stranger=await f.request({signer:ethers.Wallet.createRandom()});await assert.rejects(f.service.create(f.owner,stranger.raw,stranger.auth),/Only the connected owner/);
 assert.equal(f.provisioner.calls.length,0);
});
test('a signer-account refusal is shown with its reason, creates nothing and lets a new signed request try again',async t=>{
 const f=fixture(t);f.provisioner.set('refuse');
 const r=await f.request({account:SUB});await assert.rejects(f.service.create(f.owner,r.raw,r.auth),e=>e.status===403&&/does not own this sub-account/.test(e.message));
 const s=f.service.snapshot(f.owner);assert.equal(s.canCreate,true);assert.equal(s.pending,0);
 f.provisioner.set('ok');const again=await f.request({account:SUB});const ok=await f.service.create(f.owner,again.raw,again.auth);
 assert.equal(ok.agents[0].account,SUB);assert.equal(f.provisioner.calls.length,2);
});
test('an unconfirmed create is finished by the status poll with the same signed request, never a second key',async t=>{
 const f=fixture(t);f.provisioner.set('lost');
 const r=await f.request();await assert.rejects(f.service.create(f.owner,r.raw,r.auth),e=>e.status===503&&/without creating a second key/.test(e.message));
 assert.equal(f.service.snapshot(f.owner).canCreate,false);
 const other=await f.request({name:'Other'});await assert.rejects(f.service.create(f.owner,other.raw,other.auth),/quota/);
 f.advance(61000);
 const s=await f.service.status(f.owner);
 assert.equal(s.agents.length,1);assert.equal(s.agents[0].agent,f.provisioner.bindings.get(f.owner).agent);assert.equal(s.canCreate,true);
 const creates=f.provisioner.calls.filter(c=>c.op==='key-create');assert.equal(creates.length,2);assert.deepEqual(creates[1].auth,creates[0].auth);
 assert.equal(f.provisioner.bindings.size,1);
});
test('the status poll activates a pending key once Hyperliquid shows the approval, throttled, and surfaces the reason',async t=>{
 const f=fixture(t);await f.created();
 let s=await f.service.status(f.owner);
 const acts=()=>f.provisioner.calls.filter(c=>c.op==='activate').length;
 assert.equal(acts(),1);assert.match(s.agents[0].activation,/not approved/);
 s=await f.service.status(f.owner);assert.equal(acts(),1,'throttled');
 f.provisioner.activate({ok:false,reason:'builder fee not approved (need 0.05%)'});f.advance(21000);
 assert.match((await f.service.status(f.owner)).agents[0].activation,/builder fee/);
 const until=Date.now()+90*86400000;f.provisioner.activate({ok:true,validUntil:until});f.advance(21000);
 s=await f.service.status(f.owner);
 assert.deepEqual([s.agents[0].state,s.agents[0].signerStatus,s.agents[0].validUntil],['approved','active',until]);assert.equal(s.agents[0].activation,undefined);
 f.advance(21000);await f.service.status(f.owner);assert.equal(acts(),3,'an active key far from expiry is not re-checked');
});
test('signer-key management relays the owner-signed request; rename stays local; other owners and agents are refused',async t=>{
 const f=fixture(t),res=await f.created(),key=res.agents[0];
 const body=(extra={})=>({account:key.account,agent:key.agent,owner:f.owner,...extra});
 const d=await f.envelope('disable',body());const out=await f.service.manage('disable',f.owner,d.raw,d.auth);
 assert.equal(out.agents[0].state,'disabled');assert.equal(out.updatedAgentId,key.id);
 const call=f.provisioner.calls.at(-1);assert.deepEqual([call.op,call.action,call.account,call.auth.raw],['key-manage','disable',key.account,d.raw]);
 const before=f.provisioner.calls.length;
 const rn=await f.envelope('rename',body({name:'Renamed'}));assert.equal((await f.service.manage('rename',f.owner,rn.raw,rn.auth)).agents[0].name,'Renamed');
 assert.equal(f.provisioner.calls.length,before);
 const wrong=await f.envelope('enable',body({agent:ethers.Wallet.createRandom().address}));await assert.rejects(f.service.manage('enable',f.owner,wrong.raw,wrong.auth),e=>e.status===404);
 const intruder=ethers.Wallet.createRandom(),io=intruder.address.toLowerCase();
 const forged=await f.envelope('enable',body(),{signer:intruder});await assert.rejects(f.service.manage('enable',f.owner,forged.raw,forged.auth),e=>e.status===403);
 const theirs=await f.envelope('enable',{...body(),owner:io},{signer:intruder,forOwner:io});await assert.rejects(f.service.manage('enable',io,theirs.raw,theirs.auth),e=>e.status===404);
 const en=await f.envelope('enable',body());assert.equal((await f.service.manage('enable',f.owner,en.raw,en.auth)).agents[0].state,'awaiting_approval');
 const del=await f.envelope('delete',body());const gone=await f.service.manage('delete',f.owner,del.raw,del.auth);
 assert.equal(gone.agents[0].state,'pending_deletion');assert.ok(gone.agents[0].deletionDate>Date.now());
 const cancel=await f.envelope('cancel-delete',body());assert.equal((await f.service.manage('cancel-delete',f.owner,cancel.raw,cancel.auth)).agents[0].state,'disabled');
 await assert.rejects(f.service.manage('cancel-delete',f.owner,cancel.raw,cancel.auth),/Nonce expired or already used/);
});
test('legacy trading-account keys: disable, delete and cancel-delete only; never enabled; never count toward the new quota',async t=>{
 const f=fixture(t),{id}=f.legacy();
 const s=f.service.snapshot(f.owner);assert.equal(s.agents[0].backend,'legacy');assert.equal(s.agents[0].account,undefined);assert.equal(s.canCreate,true);
 const step=async(op,extra={})=>{const r=await f.envelope(op,{id,owner:f.owner,...extra},{domain:DOMAIN});return f.service.manage(op,f.owner,r.raw,r.auth);};
 assert.equal((await step('disable')).agents[0].state,'disabled');
 await assert.rejects(step('enable'),e=>e.status===409&&/cannot be re-enabled/.test(e.message));
 assert.equal((await step('delete',{days:7})).agents[0].state,'pending_deletion');
 assert.equal((await step('cancel-delete')).agents[0].state,'disabled');
 assert.equal((await step('rename',{name:'Old key'})).agents[0].name,'Old key');
 assert.deepEqual(f.calls,{disable:1,scheduleDeletion:1,cancelDeletion:1});
 // the signer-domain signature does not authorize a legacy change
 const r=await f.envelope('delete',{id,owner:f.owner});await assert.rejects(f.service.manage('delete',f.owner,r.raw,r.auth),e=>e.status===403);
 assert.equal(f.provisioner.calls.length,0);
 for(const e of f.audit)assert.ok(!JSON.stringify(e).includes('arn:'));
});
test('legacy AWS refusal → 403 and the record is unchanged',async t=>{
 const f=fixture(t,{kmsOverrides:{disable:async()=>{throw new KmsDenied('denied');}}}),{id}=f.legacy();
 const r=await f.envelope('disable',{id,owner:f.owner},{domain:DOMAIN});
 await assert.rejects(f.service.manage('disable',f.owner,r.raw,r.auth),e=>e.status===403&&/AWS refused/.test(e.message));
 assert.equal(f.service.snapshot(f.owner).agents[0].state,'awaiting_approval');assert.equal(f.audit.at(-1).result,'aws_denied');
});
test('three live signer keys per owner; a disabled key frees its slot',async t=>{
 const f=fixture(t);const subs=['0x'+'3'.repeat(40),'0x'+'4'.repeat(40)];
 const a=await f.created();await f.created({account:subs[0]});await f.created({account:subs[1]});
 assert.equal(f.service.snapshot(f.owner).canCreate,false);
 const extra=await f.request({account:'0x'+'5'.repeat(40)});await assert.rejects(f.service.create(f.owner,extra.raw,extra.auth),/quota/);
 const k=a.agents[0],d=await f.envelope('disable',{account:k.account,agent:k.agent,owner:f.owner});await f.service.manage('disable',f.owner,d.raw,d.auth);
 assert.equal(f.service.snapshot(f.owner).canCreate,true);
});
test('without the provisioner configured, creation fails closed and nothing is created anywhere',async t=>{
 const f=fixture(t,{provisioner:null});
 const s=await f.service.status(f.owner);assert.equal(s.keyStore,'unavailable');assert.equal(s.canCreate,false);assert.equal(s.capabilities.create,false);
 const r=await f.request();await assert.rejects(f.service.create(f.owner,r.raw,r.auth),e=>e.status===503);
});
test('identity checks: lifecycle role only, provisioner in another account, static credentials refused',()=>{
 const role=parseRole('arn:aws:iam::111122223333:role/x1-ec2-key-lifecycle','x1-ec2-key-lifecycle');
 assert.ok(checkIdentity({Account:'111122223333',Arn:'arn:aws:sts::111122223333:assumed-role/x1-ec2-key-lifecycle/x1-ec2-keys'},role));
 assert.throws(()=>checkIdentity({Account:'111122223333',Arn:'arn:aws:sts::111122223333:assumed-role/copybot-kms-shadow-signer/i-1'},role),/identity check failed/);
 assert.throws(()=>parseRole('arn:aws:iam::111122223333:role/x1-ec2-key-registrar','x1-ec2-key-registrar'),/not configured/);
 const ok={roleArn:'arn:aws:iam::111122223333:role/x1-signer-key-client',functionArn:'arn:aws:lambda:us-east-2:444455556666:function:hl-copybot-provisioner'};
 assert.equal(parseProvisionerConfig(ok).account,'111122223333');
 assert.throws(()=>parseProvisionerConfig({...ok,functionArn:'arn:aws:lambda:us-east-2:111122223333:function:hl-copybot-provisioner'}),/signer account/);
 assert.throws(()=>parseProvisionerConfig({...ok,functionArn:'arn:aws:lambda:us-east-2:444455556666:function:hl-policy-signer'}),/X1_PROVISIONER_ARN/);
 assert.throws(()=>parseProvisionerConfig({...ok,roleArn:'arn:aws:iam::111122223333:role/copybot-kms-shadow-signer'}),/X1_SIGNER_CLIENT_ROLE_ARN/);
 process.env.AWS_ACCESS_KEY_ID='AKIATESTONLY';try{assert.throws(()=>kmsAdapter({lifecycleRoleArn:'arn:aws:iam::111122223333:role/x1-ec2-key-lifecycle'}),/Static credentials/);}finally{delete process.env.AWS_ACCESS_KEY_ID;}
});
