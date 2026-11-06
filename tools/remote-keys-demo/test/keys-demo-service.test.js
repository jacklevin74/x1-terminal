import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicKey} from 'node:crypto';
import {Wallet,toBeHex} from 'ethers';
import {createKeysDemoService} from '../src/keys-demo-service.js';
const owner='0x1111111111111111111111111111111111111111',account='0x2222222222222222222222222222222222222222';
const wallet=Wallet.createRandom(),point=Buffer.from(wallet.signingKey.publicKey.slice(2),'hex');
const PublicKey=createPublicKey({key:{kty:'EC',crv:'secp256k1',x:point.subarray(1,33).toString('base64url'),y:point.subarray(33).toString('base64url')},format:'jwk'}).export({type:'spki',format:'der'});
const KeyId='arn:aws:kms:us-east-2:938952892987:key/test';
function der(sig){const integer=v=>{let b=Buffer.from(toBeHex(BigInt(v)).slice(2),'hex');if(b[0]&128)b=Buffer.concat([Buffer.from([0]),b]);return Buffer.concat([Buffer.from([2,b.length]),b]);};const body=Buffer.concat([integer(sig.r),integer(sig.s)]);return Buffer.concat([Buffer.from([48,body.length]),body]);}
function kms(){const calls=[];return {calls,async send(command){calls.push(command);switch(command.constructor.name){case 'CreateKeyCommand':return {KeyMetadata:{Arn:KeyId}};case 'GetPublicKeyCommand':return {KeyId,PublicKey,KeySpec:'ECC_SECG_P256K1',KeyUsage:'SIGN_VERIFY',SigningAlgorithms:['ECDSA_SHA_256']};case 'SignCommand':return {KeyId,SigningAlgorithm:'ECDSA_SHA_256',Signature:der(wallet.signingKey.sign(command.input.Message))};case 'ScheduleKeyDeletionCommand':return {KeyState:'PendingDeletion'};default:throw Error('Unexpected AWS operation');}}};}
const base={owner,account,name:'Demo',days:30};
test('mock create, approval and registration use no AWS calls and stay account scoped',async()=>{
 const client=kms(),service=createKeysDemoService({kms:client});
 let result=await service.run('create',{...base,provider:'mock'});const id=result.agents[0].id;
 await assert.rejects(service.run('register',{...base,id}),/approval/);
 result=await service.run('approve',{...base,id});assert.equal(result.agents[0].state,'approved');
 result=await service.run('register',{...base,id});assert.equal(result.agents[0].state,'paused');
 assert.equal((await service.run('status',{owner,account:owner})).agents.length,0);
 await assert.rejects(service.run('remove',{...base,account:owner,id}),/belong/);
 assert.equal(client.calls.length,0);
});
test('KMS test agent signs a harmless proof and schedules deletion without exposing key ARN',async()=>{
 const client=kms(),service=createKeysDemoService({kms:client});
 const result=await service.run('create',{...base,provider:'kms'}),row=result.agents[0];assert.equal(row.agent,wallet.address);assert.equal(row.keyId,undefined);
 const signed=await service.run('sign',{...base,id:row.id});assert.equal(signed.proof.verified,true);assert.equal(signed.proof.recovered,wallet.address);assert.equal(signed.proof.domain.name,'X1RemoteKeysDemo');assert.ok(signed.agents[0].lastSignedAt);
 const deleted=await service.run('remove',{...base,id:row.id});assert.equal(deleted.agents.length,0);assert.equal(client.calls.at(-1).constructor.name,'ScheduleKeyDeletionCommand');
});
test('three-agent cap and cleanup cover only locally created records',async()=>{
 const service=createKeysDemoService({kms:kms()});for(let i=0;i<3;i++)await service.run('create',{...base,provider:'mock'});
 await assert.rejects(service.run('create',{...base,provider:'mock'}),/three-agent/);await service.cleanup();assert.equal((await service.run('status',base)).agents.length,0);
});
test('failed AWS signing never falls back or records a successful signature',async()=>{
 const client=kms(),service=createKeysDemoService({kms:client});const result=await service.run('create',{...base,provider:'kms'}),id=result.agents[0].id;
 const original=client.send;client.send=command=>{if(command.constructor.name==='SignCommand')throw Error('AWS denied');return original(command);};
 await assert.rejects(service.run('sign',{...base,id}),/AWS denied/);assert.equal((await service.run('status',base)).agents[0].lastSignedAt,null);
});
