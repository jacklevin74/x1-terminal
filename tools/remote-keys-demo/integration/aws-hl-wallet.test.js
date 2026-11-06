// Explicit opt-in real AWS test. No Hyperliquid network transport exists here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {KMSClient,CreateKeyCommand,GetPublicKeyCommand,ScheduleKeyDeletionCommand} from '@aws-sdk/client-kms';
import {recoverAddress} from 'ethers';
import {STSClient,GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {KmsSigner,addressFromSpki,SECP256K1_N} from '../src/kms-signer.js';
import {actionDigest,signTestAction} from '../src/hyperliquid-test-wallet.js';
import {actions,TEST_VAULT} from '../test/fixtures/hl-actions.js';

test('real AWS KMS: isolated Hyperliquid test agent signatures', {skip:process.env.AWS_KMS_LIVE!=='1',timeout:180000},async t=>{
 const region=process.env.AWS_REGION||'us-east-2';
 assert.equal(region,'us-east-2','Only the selected AWS Region is allowed');
 const sts=new STSClient({region,maxAttempts:3});
 try{const identity=await sts.send(new GetCallerIdentityCommand({}));assert.equal(identity.Account,'938952892987','Unexpected AWS project: refusing to create a key');}finally{sts.destroy();}
 const client=new KMSClient({region,maxAttempts:3});
 const report={region,startedAt:new Date().toISOString(),keyId:null,agent:null,cases:[],cleanup:null};
 await mkdir('artifacts',{recursive:true,mode:0o700});
 const receipt=`artifacts/aws-hl-wallet-${Date.now()}.json`;
 const save=()=>writeFile(receipt,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 try{
  const created=await client.send(new CreateKeyCommand({KeySpec:'ECC_SECG_P256K1',KeyUsage:'SIGN_VERIFY',MultiRegion:false,Description:'Disposable Hyperliquid signing test; no exchange authorization',Tags:[{TagKey:'app',TagValue:'autotrader'},{TagKey:'env',TagValue:'dev'},{TagKey:'purpose',TagValue:'hl-wallet-test'}]}));
  report.keyId=created.KeyMetadata?.Arn;
  assert.ok(report.keyId,'CreateKey did not return key ARN');
  await save(); // Record key immediately so cleanup can be recovered after interruption.
  let pub;
  for(let attempt=0;attempt<10;attempt++){
   try{pub=await client.send(new GetPublicKeyCommand({KeyId:report.keyId}));break;}
   catch(e){if(!['NotFoundException','KMSInvalidStateException'].includes(e.name)||attempt===9)throw e;await new Promise(resolve=>setTimeout(resolve,500));}
  }
  report.agent=addressFromSpki(pub.PublicKey);
  const signer=await KmsSigner.connect(client,report.keyId,report.agent);
  let nonce=Date.now();
  for(const [name,action] of Object.entries(actions))for(const vaultAddress of [null,TEST_VAULT])await t.test(`${name}: ${vaultAddress?'subaccount':'main account'}`,async()=>{
   const options={nonce:nonce++,vaultAddress,source:'b',expiresAfter:nonce+60000};
   const started=performance.now(),payload=await signTestAction(signer,action,options);
   assert.equal(recoverAddress(actionDigest(payload.action,options),payload.signature),report.agent);
   assert.ok(BigInt(payload.signature.s)<=SECP256K1_N/2n);
   assert.ok([27,28].includes(payload.signature.v));
   assert.deepEqual(payload.action,action);assert.equal(payload.vaultAddress,vaultAddress??undefined);
   assert.equal(payload.expiresAfter,options.expiresAfter);
   const wrongDigest=actionDigest(action,{...options,source:'a'});
   assert.notEqual(recoverAddress(wrongDigest,payload.signature),report.agent);
   report.cases.push({name,scope:vaultAddress?'subaccount':'main',ms:Math.round(performance.now()-started),passed:true});
  });
  assert.equal(signer.metrics.signCount,12);report.metrics=signer.metrics;
 }finally{
  try{
   if(report.keyId){
    try{const result=await client.send(new ScheduleKeyDeletionCommand({KeyId:report.keyId,PendingWindowInDays:7}));report.cleanup={state:result.KeyState,deletionDate:result.DeletionDate?.toISOString()};assert.equal(result.KeyState,'PendingDeletion');}
    catch(error){report.cleanup={state:'FAILED',error:error.name};throw error;}
   }
  }finally{report.finishedAt=new Date().toISOString();await save();client.destroy();console.log(`Public test receipt: ${receipt}`);}
 }
});
