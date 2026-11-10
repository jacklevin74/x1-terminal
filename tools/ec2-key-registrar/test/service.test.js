import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ethers} from 'ethers';
import {createPublicKey} from 'node:crypto';
import {createService,DOMAIN,TYPES} from '../src/service.js';
import {KmsDenied,KmsRejected,checkIdentity,parseRole,keyPolicy,kmsAdapter} from '../src/kms.js';
const ARN='arn:aws:kms:us-east-2:111122223333:key/11111111-1111-1111-1111-111111111111';
function fixture(t,overrides={},options={}){
 const directory=mkdtempSync(join(tmpdir(),'x1-keys-')),file=join(directory,'keys.sqlite');
 const wallet=ethers.Wallet.createRandom(),key=ethers.Wallet.createRandom();
 const pub=ethers.SigningKey.computePublicKey(key.privateKey,false).slice(2);
 const jwk={kty:'EC',crv:'secp256k1',x:Buffer.from(pub.slice(2,66),'hex').toString('base64url'),y:Buffer.from(pub.slice(66),'hex').toString('base64url')};
 const spki=createPublicKey({key:jwk,format:'jwk'}).export({type:'spki',format:'der'});
 const calls={create:0,disable:0,enable:0,scheduleDeletion:0,cancelDeletion:0};const audit=[];
 const kms={create:async()=>{calls.create++;return {arn:ARN};},publicKey:async()=>({spki,spec:'ECC_SECG_P256K1',usage:'SIGN_VERIFY'}),
  disable:async()=>{calls.disable++;},enable:async()=>{calls.enable++;},scheduleDeletion:async(_arn,days)=>{calls.scheduleDeletion++;return {deletionDate:Date.now()+days*86400000};},cancelDeletion:async()=>{calls.cancelDeletion++;},...overrides};
 const service=createService({file,kms,audit:e=>audit.push(e),...options});t.after(()=>{service.close();rmSync(directory,{recursive:true,force:true});});
 const owner=wallet.address.toLowerCase();
 async function envelope(action,body,{signer=wallet,timestamp=Date.now(),forOwner=owner}={}){const raw=JSON.stringify(body),nonce=service.nonce(forOwner).nonce;const signature=await signer.signTypedData(DOMAIN,TYPES,{action,target:forOwner,nonce,timestamp:BigInt(timestamp),bodyHash:ethers.keccak256(ethers.toUtf8Bytes(raw))});return {raw,auth:JSON.stringify({nonce,timestamp,signature})};}
 const request=({signer=wallet,name='First KMS',days=30}={})=>envelope('create',{owner,name,days},{signer});
 async function created(){const r=await request();return (await service.create(owner,r.raw,r.auth)).createdAgentId;}
 return {service,owner,wallet,key,request,envelope,created,calls,audit,file,kms};
}
test('creates a non-exportable KMS identity after owner consent and returns no AWS/private fields',async t=>{
 const f=fixture(t),r=await f.request(),result=await f.service.create(f.owner,r.raw,r.auth);
 assert.equal(f.calls.create,1);assert.equal(result.agents[0].agent,f.key.address);assert.equal(result.capabilities.sign,false);assert.equal(result.agents[0].state,'awaiting_approval');
 assert.ok(!JSON.stringify(result).includes('arn:'));assert.ok(!JSON.stringify(result).includes(f.key.privateKey));
 const again=await f.request();assert.equal((await f.service.create(f.owner,again.raw,again.auth)).createdAgentId,result.createdAgentId);assert.equal(f.calls.create,1);
 assert.deepEqual(f.audit.map(e=>[e.op,e.result]),[['create','ok']]);assert.ok(!JSON.stringify(f.audit).includes('arn:'));
});
test('the same (owner, nonce, body) retry returns the original result without a second CreateKey',async t=>{
 const f=fixture(t),r=await f.request(),first=await f.service.create(f.owner,r.raw,r.auth),second=await f.service.create(f.owner,r.raw,r.auth);
 assert.equal(second.createdAgentId,first.createdAgentId);assert.equal(f.calls.create,1);
 const other=await f.request({name:'Other'});const parsed=JSON.parse(other.auth);
 // Reusing a consumed nonce for a different body is refused.
 const reuse=JSON.stringify({...JSON.parse(r.auth),signature:parsed.signature});await assert.rejects(f.service.create(f.owner,other.raw,reuse));assert.equal(f.calls.create,1);
});
test('an uncertain create retried with the same nonce never issues a second CreateKey',async t=>{
 const f=fixture(t,{create:async()=>{f.calls.create++;throw Error('transport timeout');}}),r=await f.request();
 await assert.rejects(f.service.create(f.owner,r.raw,r.auth),/No retry was sent/);
 await assert.rejects(f.service.create(f.owner,r.raw,r.auth),/pending or uncertain/);assert.equal(f.calls.create,1);
});
test('rejects wrong owner, tampered bodies, reused nonces, stale timestamps and unsupported expiry before AWS',async t=>{
 const f=fixture(t),bad=await f.request({signer:ethers.Wallet.createRandom()});await assert.rejects(f.service.create(f.owner,bad.raw,bad.auth),/Only the connected owner/);
 const r=await f.request();await assert.rejects(f.service.create(f.owner,r.raw.replace('First KMS','Other KMS'),r.auth),/Only the connected owner|Invalid owner signature/);
 const expired=JSON.parse(r.auth);expired.timestamp-=300000;await assert.rejects(f.service.create(f.owner,r.raw,JSON.stringify(expired)),/Expired/);
 const wrongDays=await f.request({days:180});await assert.rejects(f.service.create(f.owner,wrongDays.raw,wrongDays.auth),/expiry/);assert.equal(f.calls.create,0);
});
test('uncertain CreateKey cannot be retried or bypassed with a new name',async t=>{
 const f=fixture(t,{create:async()=>{throw Error('transport timeout');}}),r=await f.request();
 await assert.rejects(f.service.create(f.owner,r.raw,r.auth),/No retry was sent/);assert.equal(f.service.status(f.owner).canCreate,false);
 const again=await f.request();await assert.rejects(f.service.create(f.owner,again.raw,again.auth),/pending or uncertain/);
 const other=await f.request({name:'Other KMS'});await assert.rejects(f.service.create(f.owner,other.raw,other.auth),/quota/);
});
test('recovers public metadata without creating a second key and separates owner lists',async t=>{
 let fail=true;const f=fixture(t),read=f.kms.publicKey;f.kms.publicKey=async()=>{if(fail)throw Error('temporary');return read();};
 const first=await f.request();await assert.rejects(f.service.create(f.owner,first.raw,first.auth),/Key created/);fail=false;
 const retry=await f.request();await f.service.create(f.owner,retry.raw,retry.auth);assert.equal(f.calls.create,1);
 assert.equal(f.service.status(ethers.Wallet.createRandom().address).agents.length,0);
});
test('owner quota and per-owner create rate limit prevent unbounded billable keys',async t=>{
 const f=fixture(t);for(let i=0;i<3;i++){const r=await f.request({name:'KMS '+i});await f.service.create(f.owner,r.raw,r.auth);}
 assert.equal(f.service.status(f.owner).canCreate,false);const r=await f.request({name:'KMS extra'});await assert.rejects(f.service.create(f.owner,r.raw,r.auth),/quota/);assert.equal(f.calls.create,3);
 const g=fixture(t,{},{maxOwner:10});for(let i=0;i<5;i++){const x=await g.request({name:'K'+i});await g.service.create(g.owner,x.raw,x.auth);}
 const sixth=await g.request({name:'K6'});await assert.rejects(g.service.create(g.owner,sixth.raw,sixth.auth),/Too many key creation/);assert.equal(g.calls.create,5);
});
test('disable → enable → delete → cancel-delete updates state and audits each change',async t=>{
 const f=fixture(t),id=await f.created();
 const step=async(op,body={})=>{const r=await f.envelope(op,{id,owner:f.owner,...body});return f.service.manage(op,f.owner,r.raw,r.auth);};
 assert.equal((await step('disable')).agents[0].state,'disabled');
 assert.equal((await step('enable')).agents[0].state,'awaiting_approval');
 const deleted=await step('delete',{days:7});assert.equal(deleted.agents[0].state,'pending_deletion');assert.ok(deleted.agents[0].deletionDate>Date.now());assert.equal(deleted.updatedAgentId,id);
 assert.equal((await step('cancel-delete')).agents[0].state,'disabled');
 assert.equal((await step('rename',{name:'Renamed'})).agents[0].name,'Renamed');
 assert.deepEqual(f.calls,{create:1,disable:1,enable:1,scheduleDeletion:1,cancelDeletion:1});
 assert.deepEqual(f.audit.map(e=>`${e.op}:${e.result}`),['create:ok','disable:ok','enable:ok','delete:ok','cancel-delete:ok','rename:ok']);
 for(const e of f.audit){assert.deepEqual(Object.keys(e).sort(),['agent','id','op','owner','result','ts']);assert.ok(!JSON.stringify(e).includes('arn:'));}
 await assert.rejects(step('disable'),e=>e.status===409);assert.equal(f.calls.disable,1);
});
test('management on a key the caller does not own → 403, and nothing reaches AWS',async t=>{
 const f=fixture(t),id=await f.created(),intruder=ethers.Wallet.createRandom(),other=intruder.address.toLowerCase();
 const r=await f.envelope('disable',{id,owner:other},{signer:intruder,forOwner:other});
 await assert.rejects(f.service.manage('disable',other,r.raw,r.auth),e=>e.status===403);
 const forged=await f.envelope('disable',{id,owner:f.owner},{signer:intruder});
 await assert.rejects(f.service.manage('disable',f.owner,forged.raw,forged.auth),e=>e.status===403);
 assert.equal(f.calls.disable,0);assert.equal(f.service.status(f.owner).agents[0].state,'awaiting_approval');
});
test('management rejects altered bodies, reused nonces, wrong action and expired timestamps',async t=>{
 const f=fixture(t),id=await f.created();
 const r=await f.envelope('disable',{id,owner:f.owner});
 await assert.rejects(f.service.manage('enable',f.owner,r.raw,r.auth),e=>e.status===403||e.status===401); // signed for disable
 await assert.rejects(f.service.manage('disable',f.owner,r.raw.replace(id,id.replace(/^./,'2')),r.auth),e=>[401,403,404].includes(e.status));
 await f.service.manage('disable',f.owner,r.raw,r.auth);
 await assert.rejects(f.service.manage('disable',f.owner,r.raw,r.auth),/Nonce expired or already used/);
 const old=await f.envelope('enable',{id,owner:f.owner},{timestamp:Date.now()-300000});
 await assert.rejects(f.service.manage('enable',f.owner,old.raw,old.auth),/Expired/);
 const wide=await f.envelope('delete',{id,owner:f.owner,days:31});await assert.rejects(f.service.manage('delete',f.owner,wide.raw,wide.auth),/7 to 30/);
 assert.equal(f.calls.disable,1);assert.equal(f.calls.enable,0);assert.equal(f.calls.scheduleDeletion,0);
});
test('AWS refusal (key outside the allowed tags) → 403 and the record is unchanged',async t=>{
 const f=fixture(t,{disable:async()=>{throw new KmsDenied('denied');}}),id=await f.created();
 const r=await f.envelope('disable',{id,owner:f.owner});
 await assert.rejects(f.service.manage('disable',f.owner,r.raw,r.auth),e=>e.status===403&&/AWS refused/.test(e.message));
 assert.equal(f.service.status(f.owner).agents[0].state,'awaiting_approval');assert.equal(f.audit.at(-1).result,'aws_denied');
});
test('KMS identity check accepts only the expected assumed roles and refuses static credentials',()=>{
 const role=parseRole('arn:aws:iam::111122223333:role/x1-ec2-key-lifecycle','x1-ec2-key-lifecycle');
 assert.ok(checkIdentity({Account:'111122223333',Arn:'arn:aws:sts::111122223333:assumed-role/x1-ec2-key-lifecycle/x1-ec2-keys'},role));
 assert.throws(()=>checkIdentity({Account:'111122223333',Arn:'arn:aws:sts::111122223333:assumed-role/copybot-kms-shadow-signer/i-1'},role),/identity check failed/);
 assert.throws(()=>checkIdentity({Account:'111111111111',Arn:'arn:aws:sts::111111111111:assumed-role/x1-ec2-key-lifecycle/x1-ec2-keys'},role),/identity check failed/);
 assert.throws(()=>parseRole('arn:aws:iam::111122223333:role/copybot-kms-shadow-signer','x1-ec2-key-lifecycle'),/not configured/);
 process.env.AWS_ACCESS_KEY_ID='AKIATESTONLY';try{assert.throws(()=>kmsAdapter({registrarRoleArn:'arn:aws:iam::111122223333:role/x1-ec2-key-registrar',lifecycleRoleArn:'arn:aws:iam::111122223333:role/x1-ec2-key-lifecycle'}),/Static credentials/);}finally{delete process.env.AWS_ACCESS_KEY_ID;}
 const policy=JSON.parse(keyPolicy('111122223333','arn:aws:iam::111122223333:role/x1-ec2-key-lifecycle'));
 assert.ok(!JSON.stringify(policy).includes('kms:Sign'));assert.equal(policy.Statement.find(s=>s.Sid==='LifecycleScheduleDeletion').Condition.NumericGreaterThanEquals['kms:ScheduleKeyDeletionPendingWindowInDays'],'7');
});
test('a definite AWS refusal of CreateKey does not quarantine the owner and a new signed request may retry',async t=>{
 let refuse=true;const f=fixture(t,{create:async()=>{f.calls.create++;if(refuse)throw new KmsRejected('MalformedPolicyDocumentException');return {arn:ARN};}});
 const r=await f.request();await assert.rejects(f.service.create(f.owner,r.raw,r.auth),e=>e.status===502&&/No key was created/.test(e.message));
 const s=f.service.status(f.owner);assert.equal(s.canCreate,true);assert.equal(s.pending,0);assert.equal(f.audit.at(-1).result,'aws_rejected');
 refuse=false;const again=await f.request();const result=await f.service.create(f.owner,again.raw,again.auth);assert.equal(result.agents.length,1);assert.equal(f.calls.create,2);
});
