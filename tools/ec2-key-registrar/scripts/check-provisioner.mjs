// Run on EC2 after gate 8 (reads X1_SIGNER_CLIENT_ROLE_ARN and X1_PROVISIONER_ARN from the environment, e.g.
// `sudo env $(sudo cat /etc/x1-ec2-keys/env | xargs) node scripts/check-provisioner.mjs`).
// Verifies the cross-account path end to end: assume x1-signer-key-client, invoke the signer-account provisioner with
// the READ-ONLY op key-list for the zero address. Creates, changes and signs nothing. Prints pass/fail only.
import {provisionerClient} from '../src/provisioner.js';
try{
 const p=provisionerClient({roleArn:process.env.X1_SIGNER_CLIENT_ROLE_ARN,functionArn:process.env.X1_PROVISIONER_ARN});
 await p.verifyIdentity();console.log('x1-signer-key-client: pass');
 const out=await p.invoke({op:'key-list',account:'0x0000000000000000000000000000000000000000'});
 if(out.ok!==true||!Array.isArray(out.bindings))throw Error('unexpected answer');
 console.log('provisioner invoke (cross-account, read-only key-list): pass');
}catch(error){console.log(`FAIL (${error?.name??'error'}: ${String(error?.message??'').slice(0,80)})`);process.exit(1);}
