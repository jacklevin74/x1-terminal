import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,createPublicKey} from 'node:crypto';
import {ethers} from 'ethers';
export const DOMAIN={name:'X1Ec2KeyCreation',version:'1'};
export const TYPES={Request:[{name:'action',type:'string'},{name:'target',type:'address'},{name:'nonce',type:'string'},{name:'timestamp',type:'uint64'},{name:'bodyHash',type:'bytes32'}]};
export class RequestError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new RequestError(status,message);};
const address=value=>{if(!ethers.isAddress(value))fail(400,'A valid connected owner address is required.');return ethers.getAddress(value).toLowerCase();};
export function publicAddress(spki){const key=createPublicKey({key:Buffer.from(spki),format:'der',type:'spki'}).export({format:'jwk'});if(key.crv!=='secp256k1')throw Error('Invalid KMS public key curve');return ethers.computeAddress('0x04'+Buffer.from(key.x,'base64url').toString('hex')+Buffer.from(key.y,'base64url').toString('hex'));}
export function createService({file,kms,now=Date.now,maxOwner=3,maxTotal=30}) {
 const db=new DatabaseSync(file);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS nonces(nonce TEXT PRIMARY KEY,owner TEXT NOT NULL,created INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,idem TEXT NOT NULL UNIQUE,owner TEXT NOT NULL,name TEXT NOT NULL,days INTEGER NOT NULL,state TEXT NOT NULL,arn TEXT,agent TEXT,created INTEGER NOT NULL,aws_request TEXT);
 CREATE INDEX IF NOT EXISTS requests_owner ON requests(owner);`);
 const rowPublic=r=>({id:r.id,name:r.name,agent:r.agent,createdAt:r.created,validUntil:r.created+r.days*86400000,state:'awaiting_approval'});
 function status(owner){owner=address(owner);const rows=db.prepare('SELECT * FROM requests WHERE owner=? ORDER BY created ASC').all(owner),total=db.prepare('SELECT count(*) AS n FROM requests').get().n;return {version:1,supported:true,region:'us-east-2',owner,canCreate:rows.length<maxOwner&&total<maxTotal&&!rows.some(r=>['uncertain','creating_inflight'].includes(r.state)),pending:rows.filter(r=>!r.agent).length,capabilities:{create:true,sign:false,register:false},agents:rows.filter(r=>r.state==='ready'&&r.agent).map(rowPublic)};}
 function nonce(owner){owner=address(owner);const cutoff=now()-300000;db.prepare('DELETE FROM nonces WHERE created<?').run(cutoff);if(db.prepare('SELECT count(*) AS n FROM nonces').get().n>5000)fail(429,'Too many pending requests.');const nonce=randomBytes(16).toString('hex');db.prepare('INSERT INTO nonces(nonce,owner,created) VALUES(?,?,?)').run(nonce,owner,now());return {nonce,domain:DOMAIN,types:TYPES};}
 async function create(owner,raw,header){
  owner=address(owner);let body,auth;try{body=JSON.parse(raw);auth=JSON.parse(header??'');}catch{fail(400,'Invalid request.');}
  if(!body||typeof body!=='object'||Object.keys(body).sort().join(',')!=='days,name,owner'||address(body.owner)!==owner||typeof body.name!=='string'||!/^[-\w ]{1,16}$/.test(body.name)||body.name!==body.name.trim()||![7,30,90].includes(body.days))fail(400,'Choose a name (1–16 letters, numbers, spaces, _ or -) and an expiry of 7, 30 or 90 days.');
  if(!auth||!Number.isSafeInteger(auth.timestamp)||Math.abs(now()-auth.timestamp)>120000||typeof auth.nonce!=='string'||!/^[a-f0-9]{32}$/.test(auth.nonce))fail(401,'Expired or invalid owner authorization.');
  const bodyHash=ethers.keccak256(ethers.toUtf8Bytes(raw));let signer;
  try{signer=ethers.verifyTypedData(DOMAIN,TYPES,{action:'create',target:owner,nonce:auth.nonce,timestamp:BigInt(auth.timestamp),bodyHash},auth.signature).toLowerCase();}catch{fail(401,'Invalid owner signature.');}
  if(signer!==owner)fail(403,'Only the connected owner can create this key.');
  const idem=createHash('sha256').update(owner+'\n'+raw).digest('hex');let row;
  db.exec('BEGIN IMMEDIATE');
  try{
   if(!db.prepare('UPDATE nonces SET used=1 WHERE nonce=? AND owner=? AND used=0 AND created>? RETURNING nonce').get(auth.nonce,owner,now()-300000))fail(401,'Nonce expired or already used.');
   row=db.prepare('SELECT * FROM requests WHERE idem=?').get(idem);
   if(!row){if(!status(owner).canCreate)fail(429,'Key creation quota reached.');const id=randomUUID();db.prepare('INSERT INTO requests(id,idem,owner,name,days,state,created) VALUES(?,?,?,?,?,?,?)').run(id,idem,owner,body.name,body.days,'creating',now());row=db.prepare('SELECT * FROM requests WHERE id=?').get(id);}
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  if(row.agent)return {...status(owner),createdAgentId:row.id};
  // Persist intent before CreateKey, and never issue it again after an uncertain result.
  const claim=db.prepare("UPDATE requests SET state='creating_inflight' WHERE id=? AND state='creating' RETURNING id").get(row.id);
  if(!row.arn&&!claim)fail(409,'Creation is pending or uncertain. Refresh; do not create a replacement. An operator may need to reconcile it.');
  if(claim){
   try{
    const created=await kms.create({id:row.id,request:idem,owner});
    if(!/^arn:aws:kms:us-east-2:\d{12}:key\/[a-f0-9-]{36}$/.test(created.arn??''))throw Error('Invalid key metadata');
    db.prepare("UPDATE requests SET arn=?,aws_request=?,state='created' WHERE id=?").run(created.arn,created.requestId??null,row.id);row.arn=created.arn;
   }catch{db.prepare("UPDATE requests SET state='uncertain' WHERE id=?").run(row.id);fail(503,'KMS creation was not confirmed. No retry was sent. An operator must reconcile this request before another key is created.');}
  }
  try{
   const pub=await kms.publicKey(row.arn);
   if(pub.spec!=='ECC_SECG_P256K1'||pub.usage!=='SIGN_VERIFY')throw Error('Invalid key metadata');
   const agent=publicAddress(pub.spki);db.prepare("UPDATE requests SET agent=?,state='ready' WHERE id=?").run(agent,row.id);
   return {...status(owner),createdAgentId:row.id};
  }catch{fail(503,'Key created, but its public address is not yet available. Retry the same name and expiry after refreshing; no new key will be created.');}
 }
 return {status,nonce,create,close:()=>db.close()};
}
