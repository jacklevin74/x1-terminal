import {createPublicKey} from 'node:crypto';
import {GetPublicKeyCommand, SignCommand} from '@aws-sdk/client-kms';
import {computeAddress, getAddress, hexlify, getBytes, recoverAddress, toBeHex} from 'ethers';
export const SECP256K1_N=0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
export function decodeDerSignature(input){
  const bytes=Buffer.from(input??[]);
  if(bytes.length<8||bytes.length>72||bytes[0]!==0x30||bytes[1]!==bytes.length-2)throw new Error('Invalid DER signature sequence');
  let offset=2;
  const integer=()=>{
    if(bytes[offset++]!==2)throw new Error('Invalid DER signature integer');
    const size=bytes[offset++];
    if(!size||size>33||offset+size>bytes.length)throw new Error('Invalid DER signature integer length');
    const value=bytes.subarray(offset,offset+size);offset+=size;
    if(value[0]&0x80||size>1&&value[0]===0&&!(value[1]&0x80))throw new Error('Non-canonical DER signature integer');
    const scalar=BigInt('0x'+value.toString('hex'));
    if(scalar===0n||scalar>=SECP256K1_N)throw new Error('Signature scalar out of range');return scalar;
  };
  const r=integer(),s=integer();if(offset!==bytes.length)throw new Error('Trailing DER signature bytes');
  return {r,s:s>SECP256K1_N/2n?SECP256K1_N-s:s};
}
export function addressFromSpki(input){
  const key=createPublicKey({key:Buffer.from(input??[]),format:'der',type:'spki'}),jwk=key.export({format:'jwk'});
  if(jwk.kty!=='EC'||jwk.crv!=='secp256k1')throw new Error('KMS public key must use secp256k1');
  const x=Buffer.from(jwk.x,'base64url'),y=Buffer.from(jwk.y,'base64url');
  if(x.length!==32||y.length!==32)throw new Error('Invalid secp256k1 public key');
  return getAddress(computeAddress(hexlify(Buffer.concat([Buffer.from([4]),x,y]))));
}
export function recoverSignature(digest,der,expectedAddress){
  const bytes=getBytes(digest);if(bytes.length!==32)throw new Error('Expected a 32-byte digest');
  const expected=getAddress(expectedAddress),{r,s}=decodeDerSignature(der);
  for(const v of [27,28]){
    const signature={r:toBeHex(r,32),s:toBeHex(s,32),v};
    try{if(recoverAddress(hexlify(bytes),signature)===expected)return signature;}catch{/* Try the other recovery bit. */}
  }
  throw new Error('KMS recovered signer does not match registered agent');
}
export class KmsSigner{
  #client;#keyId;
  constructor(client,keyId,address){this.#client=client;this.#keyId=keyId;this.address=getAddress(address);this.metrics={signCount:0,kmsMs:0,failures:0};}
  static async connect(client,keyId,expectedAddress){
    if(typeof keyId!=='string'||!keyId.trim())throw new Error('KMS key ID is required');
    const result=await client.send(new GetPublicKeyCommand({KeyId:keyId}));
    if(result.KeySpec!=='ECC_SECG_P256K1'||result.KeyUsage!=='SIGN_VERIFY'||!result.SigningAlgorithms?.includes('ECDSA_SHA_256')||!result.KeyId)throw new Error('Incompatible KMS signing key');
    const address=addressFromSpki(result.PublicKey);
    if(address!==getAddress(expectedAddress))throw new Error('KMS key address does not match registered agent');
    return new KmsSigner(client,result.KeyId,address);
  }
  async signDigest(digest,{signal}={}){
    const message=getBytes(digest);if(message.length!==32)throw new Error('Expected a 32-byte digest');const started=performance.now();
    try{
      const result=await this.#client.send(new SignCommand({KeyId:this.#keyId,Message:message,MessageType:'DIGEST',SigningAlgorithm:'ECDSA_SHA_256'}),{abortSignal:signal});
      if(result.KeyId!==this.#keyId||result.SigningAlgorithm!=='ECDSA_SHA_256')throw new Error('Unexpected KMS signature metadata');
      const signature=recoverSignature(hexlify(message),result.Signature,this.address);this.metrics.signCount++;return signature;
    }catch(error){this.metrics.failures++;throw error;}finally{this.metrics.kmsMs+=performance.now()-started;}
  }
}
/** Cache public metadata; failed initialization is evicted. Clear on retirement. */
export function createSignerCache(client){
  const signers=new Map();
  return {async get(keyId,agent){const id=keyId+':'+getAddress(agent);if(!signers.has(id)){const pending=KmsSigner.connect(client,keyId,agent).catch(error=>{signers.delete(id);throw error;});signers.set(id,pending);}return signers.get(id);},clear(){signers.clear();}};
}
