import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,createPublicKey} from 'node:crypto';
import {ethers} from 'ethers';
import {KmsDenied,KmsState,KmsRejected} from './kms.js';
import {createRateLimiter} from './rate-limit.js';

export const DOMAIN={name:'X1Ec2KeyCreation',version:'1'};
export const TYPES={Request:[{name:'action',type:'string'},{name:'target',type:'address'},{name:'nonce',type:'string'},{name:'timestamp',type:'uint64'},{name:'bodyHash',type:'bytes32'}]};
export const MANAGEMENT_OPS=['rename','disable','enable','delete','cancel-delete'];
export class RequestError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new RequestError(status,message);};
const address=value=>{if(!ethers.isAddress(value))fail(400,'A valid connected owner address is required.');return ethers.getAddress(value).toLowerCase();};
const validName=name=>typeof name==='string'&&/^[-\w ]{1,16}$/.test(name)&&name===name.trim();
const validId=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
export function publicAddress(spki){const key=createPublicKey({key:Buffer.from(spki),format:'der',type:'spki'}).export({format:'jwk'});if(key.crv!=='secp256k1')throw Error('Invalid KMS public key curve');return ethers.computeAddress('0x04'+Buffer.from(key.x,'base64url').toString('hex')+Buffer.from(key.y,'base64url').toString('hex'));}

function migrate(db){
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS nonces(nonce TEXT PRIMARY KEY,owner TEXT NOT NULL,created INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,idem TEXT NOT NULL UNIQUE,owner TEXT NOT NULL,name TEXT NOT NULL,days INTEGER NOT NULL,state TEXT NOT NULL,arn TEXT,agent TEXT,created INTEGER NOT NULL,aws_request TEXT);
 CREATE INDEX IF NOT EXISTS requests_owner ON requests(owner);`);
 const columns=new Set(db.prepare('PRAGMA table_info(requests)').all().map(c=>c.name));
 for(const [name,type] of [['nonce','TEXT'],['kms_state',"TEXT NOT NULL DEFAULT 'enabled'"],['deletion_date','INTEGER'],['updated','INTEGER']])if(!columns.has(name))db.exec(`ALTER TABLE requests ADD COLUMN ${name} ${type}`);
}

/**
 * Owner-authorized KMS key service. Every mutation needs a fresh EIP-712 signature from the
 * record's owner over the exact request body. The service never signs, approves or registers.
 */
export function createService({file,kms,now=Date.now,maxOwner=3,maxTotal=30,audit=()=>{},createLimit=createRateLimiter({limit:5,windowMs:3600_000,now}),manageLimit=createRateLimiter({limit:30,windowMs:3600_000,now})}) {
 const db=new DatabaseSync(file);migrate(db);
 const inflight=new Set();
 const publicState=r=>r.kms_state==='disabled'?'disabled':r.kms_state==='pending_deletion'?'pending_deletion':'awaiting_approval';
 const rowPublic=r=>({id:r.id,name:r.name,agent:r.agent,createdAt:r.created,validUntil:r.created+r.days*86400000,state:publicState(r),...(r.kms_state==='pending_deletion'&&r.deletion_date?{deletionDate:r.deletion_date}:{})});
 const active=rows=>rows.filter(r=>r.kms_state!=='pending_deletion'&&r.state!=='rejected');
 const record=(entry)=>{try{audit({ts:new Date(now()).toISOString(),...entry});}catch{}};
 function status(owner){
  owner=address(owner);
  const rows=db.prepare('SELECT * FROM requests WHERE owner=? ORDER BY created ASC').all(owner),total=active(db.prepare('SELECT kms_state,state FROM requests').all()).length;
  return {version:1,supported:true,region:'us-east-2',owner,canCreate:active(rows).length<maxOwner&&total<maxTotal&&!rows.some(r=>['uncertain','creating_inflight'].includes(r.state)),pending:rows.filter(r=>!r.agent&&r.state!=='rejected').length,capabilities:{create:true,manage:true,sign:false,register:false},agents:rows.filter(r=>r.state==='ready'&&r.agent).map(rowPublic)};
 }
 function nonce(owner){owner=address(owner);const cutoff=now()-300000;db.prepare('DELETE FROM nonces WHERE created<?').run(cutoff);if(db.prepare('SELECT count(*) AS n FROM nonces').get().n>5000)fail(429,'Too many pending requests.');const nonce=randomBytes(16).toString('hex');db.prepare('INSERT INTO nonces(nonce,owner,created) VALUES(?,?,?)').run(nonce,owner,now());return {nonce,domain:DOMAIN,types:TYPES};}

 /** Parses and verifies the owner's signed envelope. Does not consume the nonce. */
 function authorize(action,owner,raw,header,keys,check){
  let body,auth;try{body=JSON.parse(raw);auth=JSON.parse(header??'');}catch{fail(400,'Invalid request.');}
  if(!body||typeof body!=='object'||Array.isArray(body)||!keys.includes(Object.keys(body).sort().join(','))||address(body.owner)!==owner||!check(body))return {body:null};
  if(!auth||typeof auth!=='object'||!Number.isSafeInteger(auth.timestamp)||Math.abs(now()-auth.timestamp)>120000||typeof auth.nonce!=='string'||!/^[a-f0-9]{32}$/.test(auth.nonce)||typeof auth.signature!=='string')fail(401,'Expired or invalid owner authorization.');
  const bodyHash=ethers.keccak256(ethers.toUtf8Bytes(raw));let signer;
  try{signer=ethers.verifyTypedData(DOMAIN,TYPES,{action,target:owner,nonce:auth.nonce,timestamp:BigInt(auth.timestamp),bodyHash},auth.signature).toLowerCase();}catch{fail(401,'Invalid owner signature.');}
  return {body,auth,signer};
 }
 const consumeNonce=(nonce,owner)=>!!db.prepare('UPDATE nonces SET used=1 WHERE nonce=? AND owner=? AND used=0 AND created>? RETURNING nonce').get(nonce,owner,now()-300000);

 async function create(owner,raw,header){
  owner=address(owner);
  const {body,auth,signer}=authorize('create',owner,raw,header,['days,name,owner'],b=>validName(b.name)&&[7,30,90].includes(b.days));
  if(!body)fail(400,'Choose a name (1–16 letters, numbers, spaces, _ or -) and an expiry of 7, 30 or 90 days.');
  if(signer!==owner)fail(403,'Only the connected owner can create this key.');
  const idem=createHash('sha256').update(owner+'\n'+raw).digest('hex');let row;
  db.exec('BEGIN IMMEDIATE');
  try{
   row=db.prepare('SELECT * FROM requests WHERE idem=?').get(idem);
   // The same (owner, nonce, body) is an idempotent retry and returns the original record.
   const retry=row&&row.nonce===auth.nonce;
   if(!retry&&!consumeNonce(auth.nonce,owner))fail(401,'Nonce expired or already used.');
   if(row?.state==='rejected'&&!retry){
    // AWS definitively refused the earlier attempt, so no key exists: this owner-signed request may try again.
    if(!status(owner).canCreate)fail(429,'Key creation quota reached.');
    if(!createLimit(owner))fail(429,'Too many key creation requests. Try again later.');
    db.prepare("UPDATE requests SET state='creating',nonce=?,updated=? WHERE id=?").run(auth.nonce,now(),row.id);row=db.prepare('SELECT * FROM requests WHERE id=?').get(row.id);
   }
   if(!row){
    if(!status(owner).canCreate)fail(429,'Key creation quota reached.');
    if(!createLimit(owner))fail(429,'Too many key creation requests. Try again later.');
    const id=randomUUID();db.prepare('INSERT INTO requests(id,idem,owner,name,days,state,created,nonce,updated) VALUES(?,?,?,?,?,?,?,?,?)').run(id,idem,owner,body.name,body.days,'creating',now(),auth.nonce,now());row=db.prepare('SELECT * FROM requests WHERE id=?').get(id);
   }
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
    db.prepare("UPDATE requests SET arn=?,aws_request=?,state='created',updated=? WHERE id=?").run(created.arn,created.requestId??null,now(),row.id);row.arn=created.arn;
   }catch(error){
    if(error instanceof KmsRejected){db.prepare("UPDATE requests SET state='rejected',updated=? WHERE id=?").run(now(),row.id);record({owner,op:'create',id:row.id,agent:null,result:'aws_rejected',awsError:String(error.message).slice(0,80)});fail(502,'AWS refused key creation. No key was created and nothing was billed.');}
    db.prepare("UPDATE requests SET state='uncertain',updated=? WHERE id=?").run(now(),row.id);record({owner,op:'create',id:row.id,agent:null,result:'uncertain'});fail(503,'KMS creation was not confirmed. No retry was sent. An operator must reconcile this request before another key is created.');}
  }
  try{
   const pub=await kms.publicKey(row.arn);
   if(pub.spec!=='ECC_SECG_P256K1'||pub.usage!=='SIGN_VERIFY')throw Error('Invalid key metadata');
   const agent=publicAddress(pub.spki);db.prepare("UPDATE requests SET agent=?,state='ready',updated=? WHERE id=?").run(agent,now(),row.id);
   record({owner,op:'create',id:row.id,agent,result:'ok'});
   return {...status(owner),createdAgentId:row.id};
  }catch{fail(503,'Key created, but its public address is not yet available. Retry the same name and expiry after refreshing; no new key will be created.');}
 }

 async function manage(op,owner,raw,header){
  if(!MANAGEMENT_OPS.includes(op))fail(405,'Operation is not supported.');
  owner=address(owner);
  const keys=op==='rename'?['id,name,owner']:op==='delete'?['id,owner','days,id,owner']:['id,owner'];
  const {body,auth,signer}=authorize(op,owner,raw,header,keys,b=>validId(b.id)&&(op!=='rename'||validName(b.name))&&(b.days===undefined||(Number.isInteger(b.days)&&b.days>=7&&b.days<=30)));
  if(!body)fail(400,op==='rename'?'Choose a name of 1–16 letters, numbers, spaces, _ or -.':op==='delete'?'Choose a deletion window of 7 to 30 days.':'Invalid key request.');
  if(signer!==owner)fail(403,'Only the key owner can change this key.');
  const row=db.prepare("SELECT * FROM requests WHERE id=? AND state='ready'").get(body.id);
  if(!row)fail(404,'Key not found.');
  if(row.owner!==owner||signer!==row.owner)fail(403,'Only the key owner can change this key.');
  if(!consumeNonce(auth.nonce,owner))fail(401,'Nonce expired or already used.');
  if(!manageLimit(owner))fail(429,'Too many key changes. Try again later.');
  if(inflight.has(row.id))fail(409,'Another change to this key is in progress.');
  inflight.add(row.id);
  const done=(result)=>record({owner,op,id:row.id,agent:row.agent,result});
  try{
   const state=row.kms_state;
   if(op==='rename'){db.prepare('UPDATE requests SET name=?,updated=? WHERE id=?').run(body.name,now(),row.id);}
   else if(op==='disable'){if(state!=='enabled')fail(409,'Only an enabled key can be disabled.');await kms.disable(row.arn);db.prepare("UPDATE requests SET kms_state='disabled',updated=? WHERE id=?").run(now(),row.id);}
   else if(op==='enable'){if(state!=='disabled')fail(409,'Only a disabled key can be enabled.');await kms.enable(row.arn);db.prepare("UPDATE requests SET kms_state='enabled',updated=? WHERE id=?").run(now(),row.id);}
   else if(op==='delete'){if(state==='pending_deletion')fail(409,'Deletion is already scheduled.');const days=body.days??30,out=await kms.scheduleDeletion(row.arn,days);db.prepare("UPDATE requests SET kms_state='pending_deletion',deletion_date=?,updated=? WHERE id=?").run(out?.deletionDate??now()+days*86400000,now(),row.id);}
   else{if(state!=='pending_deletion')fail(409,'Deletion is not scheduled for this key.');if(active(db.prepare('SELECT kms_state,state FROM requests WHERE owner=?').all(owner)).length>=maxOwner)fail(429,'Key quota reached. Delete another key first.');await kms.cancelDeletion(row.arn);
    // KMS leaves a key Disabled after CancelKeyDeletion.
    db.prepare("UPDATE requests SET kms_state='disabled',deletion_date=NULL,updated=? WHERE id=?").run(now(),row.id);}
   done('ok');
   return {...status(owner),updatedAgentId:row.id};
  }catch(error){
   if(error instanceof RequestError){done(`rejected:${error.status}`);throw error;}
   if(error instanceof KmsDenied){done('aws_denied');fail(403,'AWS refused this key operation.');}
   if(error instanceof KmsState){done('aws_state');fail(409,'The key is not in a state that allows this change. Refresh and retry.');}
   done('aws_unconfirmed');fail(502,'KMS did not confirm the change. Refresh before retrying.');
  }finally{inflight.delete(row.id);}
 }
 return {status,nonce,create,manage,close:()=>db.close()};
}
