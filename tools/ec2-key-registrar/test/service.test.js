import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ethers} from 'ethers';
import {createPublicKey} from 'node:crypto';
import {createService,DOMAIN,TYPES} from '../src/service.js';
function fixture(t,overrides={}){
 const directory=mkdtempSync(join(tmpdir(),'x1-keys-')),file=join(directory,'keys.sqlite');
 const wallet=ethers.Wallet.createRandom(),key=ethers.Wallet.createRandom();
 const pub=ethers.SigningKey.computePublicKey(key.privateKey,false).slice(2);
 const jwk={kty:'EC',crv:'secp256k1',x:Buffer.from(pub.slice(2,66),'hex').toString('base64url'),y:Buffer.from(pub.slice(66),'hex').toString('base64url')};
 const spki=createPublicKey({key:jwk,format:'jwk'}).export({type:'spki',format:'der'});let calls=0;
 const kms={create:async()=>{calls++;return {arn:'arn:aws:kms:us-east-2:938952892987:key/11111111-1111-1111-1111-111111111111'};},publicKey:async()=>({spki,spec:'ECC_SECG_P256K1',usage:'SIGN_VERIFY'}),...overrides};
 const service=createService({file,kms});t.after(()=>{service.close();rmSync(directory,{recursive:true,force:true});});
 const owner=wallet.address.toLowerCase();
 async function request({signer=wallet,name='First KMS',days=30}={}){const raw=JSON.stringify({owner,name,days}),nonce=service.nonce(owner).nonce,timestamp=Date.now();const signature=await signer.signTypedData(DOMAIN,TYPES,{action:'create',target:owner,nonce,timestamp:BigInt(timestamp),bodyHash:ethers.keccak256(ethers.toUtf8Bytes(raw))});return {raw,auth:JSON.stringify({nonce,timestamp,signature})};}
 return {service,owner,key,request,calls:()=>calls,file,kms};
}
test('creates a non-exportable KMS identity after owner consent and returns no AWS/private fields',async t=>{
 const f=fixture(t),r=await f.request(),result=await f.service.create(f.owner,r.raw,r.auth);
 assert.equal(f.calls(),1);assert.equal(result.agents[0].agent,f.key.address);assert.equal(result.capabilities.sign,false);
 assert.ok(!JSON.stringify(result).includes('arn:'));assert.ok(!JSON.stringify(result).includes(f.key.privateKey));
 await assert.rejects(f.service.create(f.owner,r.raw,r.auth),/Nonce expired or already used/);assert.equal(f.calls(),1);
 const again=await f.request();assert.equal((await f.service.create(f.owner,again.raw,again.auth)).createdAgentId,result.createdAgentId);assert.equal(f.calls(),1);
});
test('rejects wrong owner, tampered bodies, stale timestamps and unsupported expiry before AWS',async t=>{
 const f=fixture(t),bad=await f.request({signer:ethers.Wallet.createRandom()});await assert.rejects(f.service.create(f.owner,bad.raw,bad.auth),/Only the connected owner/);
 const r=await f.request();await assert.rejects(f.service.create(f.owner,r.raw.replace('First KMS','Other KMS'),r.auth));
 const expired=JSON.parse(r.auth);expired.timestamp-=300000;await assert.rejects(f.service.create(f.owner,r.raw,JSON.stringify(expired)),/Expired/);
 const wrongDays=await f.request({days:180});await assert.rejects(f.service.create(f.owner,wrongDays.raw,wrongDays.auth),/expiry/);assert.equal(f.calls(),0);
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
 const retry=await f.request();await f.service.create(f.owner,retry.raw,retry.auth);assert.equal(f.calls(),1);
 assert.equal(f.service.status(ethers.Wallet.createRandom().address).agents.length,0);
});
test('owner quota prevents unbounded billable keys',async t=>{
 const f=fixture(t);for(let i=0;i<3;i++){const r=await f.request({name:'KMS '+i});await f.service.create(f.owner,r.raw,r.auth);}
 assert.equal(f.service.status(f.owner).canCreate,false);const r=await f.request({name:'KMS extra'});await assert.rejects(f.service.create(f.owner,r.raw,r.auth),/quota/);assert.equal(f.calls(),3);
});
