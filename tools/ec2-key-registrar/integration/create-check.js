// Explicit integration check only. No Hyperliquid, exchange or KMS signing calls.
// The operator must schedule deletion of the resulting test key using admin credentials.
import {ethers} from 'ethers';
import {DOMAIN,TYPES} from '../src/service.js';
const wallet=ethers.Wallet.createRandom(),owner=wallet.address.toLowerCase();
const base='http://127.0.0.1:18790/api/ec2-keys';
async function request(op,init={}){const r=await fetch(`${base}?op=${op}&owner=${owner}`,{...init,signal:AbortSignal.timeout(30000)});const body=await r.json();if(!r.ok)throw Error(body.error??'Integration request failed');return body;}
const raw=JSON.stringify({owner,name:'EC2 setup check',days:7}),nonce=await request('nonce'),timestamp=Date.now();
const signature=await wallet.signTypedData(DOMAIN,TYPES,{action:'create',target:owner,nonce:nonce.nonce,timestamp:BigInt(timestamp),bodyHash:ethers.keccak256(ethers.toUtf8Bytes(raw))});
const result=await request('create',{method:'POST',headers:{origin:'http://127.0.0.1:4173','content-type':'application/json','x-auth':JSON.stringify({nonce:nonce.nonce,timestamp,signature})},body:raw});
const key=result.agents.find(k=>k.id===result.createdAgentId);
if(!key||!ethers.isAddress(key.agent))throw Error('Public key not confirmed');
console.log(JSON.stringify({owner,id:key.id,agent:key.agent,created:true,region:result.region,signingEnabled:result.capabilities.sign,requiresAdminCleanup:true}));
