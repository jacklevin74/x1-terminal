import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicKey} from 'node:crypto';
import {Wallet,toBeHex,recoverAddress} from 'ethers';
import {KmsSigner} from '../src/kms-signer.js';
import {actionDigest,signTestAction} from '../src/hyperliquid-test-wallet.js';
import {actions,TEST_VAULT} from './fixtures/hl-actions.js';
const wallet=Wallet.createRandom(),point=Buffer.from(wallet.signingKey.publicKey.slice(2),'hex');
const PublicKey=createPublicKey({key:{kty:'EC',crv:'secp256k1',x:point.subarray(1,33).toString('base64url'),y:point.subarray(33).toString('base64url')},format:'jwk'}).export({type:'spki',format:'der'});
const KeyId='arn:aws:kms:us-east-2:123456789012:key/test';
function der(sig){const integer=v=>{let b=Buffer.from(toBeHex(BigInt(v)).slice(2),'hex');if(b[0]&128)b=Buffer.concat([Buffer.from([0]),b]);return Buffer.concat([Buffer.from([2,b.length]),b]);};const body=Buffer.concat([integer(sig.r),integer(sig.s)]);return Buffer.concat([Buffer.from([48,body.length]),body]);}
function client(failure){const calls=[];return {calls,async send(command){calls.push(command);if(command.constructor.name==='GetPublicKeyCommand')return {KeyId,PublicKey,KeySpec:'ECC_SECG_P256K1',KeyUsage:'SIGN_VERIFY',SigningAlgorithms:['ECDSA_SHA_256']};if(failure)throw Object.assign(new Error(failure),{name:failure});return {KeyId,SigningAlgorithm:'ECDSA_SHA_256',Signature:der(wallet.signingKey.sign(command.input.Message))};}};}
for(const [name,action] of Object.entries(actions))test(`${name}: KMS signs main and subaccount payloads`,async()=>{
 const kms=client(),signer=await KmsSigner.connect(kms,KeyId,wallet.address);
 for(const vaultAddress of [null,TEST_VAULT]){
  const options={nonce:1700000000000,vaultAddress,source:'b',expiresAfter:1700000060000};
  const body=await signTestAction(signer,action,options);
  assert.deepEqual(body.action,action);assert.equal(body.vaultAddress,vaultAddress??undefined);
  assert.equal(recoverAddress(actionDigest(action,options),body.signature),wallet.address);
  const input=kms.calls.at(-1).input;assert.equal(input.MessageType,'DIGEST');assert.equal(input.SigningAlgorithm,'ECDSA_SHA_256');assert.equal(input.Message.length,32);
 }
 assert.equal(signer.metrics.signCount,2);
});
test('vault, network, nonce, expiry and action changes invalidate the signed digest',()=>{
 const opts={nonce:1700000000000,vaultAddress:null,source:'b'};
 const d=actionDigest(actions.cancel,opts);
 for(const change of [{vaultAddress:TEST_VAULT},{source:'a'},{nonce:opts.nonce+1},{expiresAfter:opts.nonce+1000}])assert.notEqual(actionDigest(actions.cancel,{...opts,...change}),d);
 assert.notEqual(actionDigest({...actions.cancel,cancels:[{a:25,o:54321}]},opts),d);
 assert.throws(()=>actionDigest(actions.cancel,{nonce:1}),/vaultAddress/);
 assert.throws(()=>actionDigest(actions.cancel,{...opts,nonce:NaN}),/nonce/);
});
for(const failure of ['AccessDeniedException','ThrottlingException','DisabledException','ExpiredTokenException'])test(`${failure}: no payload and no fallback`,async()=>{
 const kms=client(failure),signer=await KmsSigner.connect(kms,KeyId,wallet.address);
 await assert.rejects(signTestAction(signer,actions.maker,{nonce:1,vaultAddress:null}),{name:failure});
 assert.equal(signer.metrics.signCount,0);assert.equal(signer.metrics.failures,1);
});

test('matches eight independent Python msgpack/EIP-712 reference digests',async()=>{
 const {readFile}=await import('node:fs/promises');
 const vectors=JSON.parse(await readFile(new URL('./fixtures/hl-digests.json',import.meta.url),'utf8'));
 assert.equal(vectors.length,8);
 for(const vector of vectors)assert.equal(actionDigest(vector.action,vector.options),vector.digest);
});
test('payload is bound to the original action and options across an asynchronous KMS call',async()=>{
 const action=structuredClone(actions.maker),options={nonce:1,vaultAddress:null};
 const signer={address:wallet.address,async signDigest(digest){await new Promise(resolve=>setTimeout(resolve,1));return wallet.signingKey.sign(digest);}};
 const pending=signTestAction(signer,action,options);action.orders[0].s='999';options.nonce=2;options.vaultAddress=TEST_VAULT;
 const body=await pending;assert.equal(body.action.orders[0].s,'150');assert.equal(body.nonce,1);assert.equal(body.vaultAddress,undefined);
});
