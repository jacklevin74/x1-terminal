import {createServer} from 'node:http';
import {appendFileSync} from 'node:fs';
import {createService} from './service.js';
import {kmsAdapter} from './kms.js';
import {createApp} from './app.js';
import {createProxyVerifier,loadProxyKeys} from './proxy-auth.js';
process.umask(0o077);
const env=process.env;
const kms=kmsAdapter({registrarRoleArn:env.X1_REGISTRAR_ROLE_ARN,lifecycleRoleArn:env.X1_LIFECYCLE_ROLE_ARN,env:env.X1_KEYS_ENV??'prod'});
await kms.verifyIdentity(); // Confirms both assumed roles via STS without creating, changing or signing a key.
const auditFile=env.X1_AUDIT_LOG??'/var/lib/x1-ec2-keys/audit.jsonl';
// Append-only JSONL: timestamp, owner, op, record id, agent address, result. Never ARNs, credentials or signatures.
const audit=entry=>appendFileSync(auditFile,JSON.stringify({ts:entry.ts,owner:entry.owner,op:entry.op,id:entry.id,agent:entry.agent??null,result:entry.result})+'\n',{flag:'a',mode:0o600});
const service=createService({file:env.X1_KEYS_DB??'/var/lib/x1-ec2-keys/keys.sqlite',kms,audit});
const verify=createProxyVerifier({keys:loadProxyKeys()});
const extraOrigins=(env.X1_EXTRA_ORIGINS??'').split(',').map(v=>v.trim()).filter(v=>/^https:\/\/[a-z0-9.-]+$/.test(v));
const server=createServer(createApp({service,verify,production:env.NODE_ENV==='production',extraOrigins,allowPreviewMutations:env.X1_PREVIEW_MUTATIONS==='1'}));
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(env.X1_PORT??8790),'127.0.0.1',()=>console.log('EC2 key service ready on loopback; owner-signed create and lifecycle only; no signing or exchange routes.'));
process.on('SIGTERM',()=>server.close(()=>{service.close();process.exit(0);}));
