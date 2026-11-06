// Signing adapter for the isolated test suite. No exchange transport or key material.
import {encode} from '@msgpack/msgpack';
import {TypedDataEncoder,getAddress,keccak256,recoverAddress,ZeroAddress} from 'ethers';
export const DOMAIN={name:'Exchange',version:'1',chainId:1337,verifyingContract:ZeroAddress};
export const TYPES={Agent:[{name:'source',type:'string'},{name:'connectionId',type:'bytes32'}]};
export function actionDigest(action,{nonce,vaultAddress,source='b',expiresAfter}={}){
 if(!Number.isSafeInteger(nonce)||nonce<0)throw new Error('Explicit nonnegative safe-integer nonce required');
 if(vaultAddress===undefined)throw new Error('Explicit vaultAddress required: null for main account');
 if(!['a','b'].includes(source))throw new Error('Invalid Hyperliquid source');
 const vault=vaultAddress===null?null:getAddress(vaultAddress).toLowerCase();
 const uint64=n=>{const bytes=Buffer.alloc(8);bytes.writeBigUInt64BE(BigInt(n));return bytes;};
 const parts=[Buffer.from(encode(action)),uint64(nonce),vault?Buffer.concat([Buffer.from([1]),Buffer.from(vault.slice(2),'hex')]):Buffer.from([0])];
 if(expiresAfter!==undefined){if(!Number.isSafeInteger(expiresAfter)||expiresAfter<=nonce)throw new Error('Invalid expiresAfter');parts.push(Buffer.from([0]),uint64(expiresAfter));}
 const connectionId=keccak256(Buffer.concat(parts));
 return TypedDataEncoder.hash(DOMAIN,TYPES,{source,connectionId});
}
export async function signTestAction(signer,action,options){
 // Clone before awaiting KMS, binding returned payload to the signed snapshot.
 options=structuredClone(options);
 const frozen=structuredClone(action),digest=actionDigest(frozen,options);
 const signature=await signer.signDigest(digest);
 if(getAddress(recoverAddress(digest,signature))!==getAddress(signer.address))throw new Error('Recovered agent mismatch');
 return {action:frozen,nonce:options.nonce,signature,...(options.vaultAddress===null?{}:{vaultAddress:getAddress(options.vaultAddress).toLowerCase()}),...(options.expiresAfter===undefined?{}:{expiresAfter:options.expiresAfter})};
}
