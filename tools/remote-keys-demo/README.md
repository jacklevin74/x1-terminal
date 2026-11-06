# Local remote-key signing demo

Node.js 22+; development tooling only. This package is not a production signing API.
AWS credentials stay in this Node process, never in the terminal bundle.

```sh
cd tools/remote-keys-demo
npm ci --ignore-scripts
npm test
npm run check
npm run demo:keys
```

The bridge uses the existing `aws-toolkit` temporary-credential profile, checks
project `938952892987`, and uses `us-east-2` only. Renew an expired session through
your AWS login workflow before starting. It listens only on `127.0.0.1:8789`.
Start the terminal's Vite development/preview server separately on 5173/4173 and
open `/keys`. The page defaults to demo mode only on localhost. No wallet is
required; a synthetic demo account is used until one is connected.

- Mock mode creates only local records and simulates approval/paused registration.
- KMS mode creates real, billable AWS-generated secp256k1 test keys. Approval and
  registration remain simulated. Never approve or fund these demo addresses.
- Test AWS signature signs a harmless `X1RemoteKeysDemo` EIP-712 proof. Node and
  browser independently recover the agent address. It is not an executable
  Hyperliquid action. No exchange transport exists in the bridge.
- Delete test agent schedules its KMS key for deletion in seven days. Graceful
  shutdown does the same for remaining demo keys. A hard crash can bypass cleanup:
  ignored `artifacts/keys-demo-state.json` records key references for recovery.
  Restart the bridge and remove the records through the page. Do not delete the
  state file before recovering orphaned test keys.

Origin/Host checks, a per-session request token, loopback binding, serialized
mutations and a three-agent limit constrain this local demo. They do not replace
production owner authentication, IAM separation, idempotency, audit or quotas.
The development profile must be allowed STS identity, tagged KMS creation,
GetPublicKey, Sign and ScheduleKeyDeletion. No static AWS keys are configured here.

`npm test` is offline. `npm run test:aws` is an explicit opt-in integration run:
it creates a disposable key, signs six synthetic Hyperliquid action types under
main/subaccount scopes, verifies all 12 signatures locally and schedules deletion.
It does not register an agent, place orders or contact Hyperliquid. Interrupted
runs leave a public receipt under ignored `artifacts/` for cleanup recovery.

Fixed digest vectors were generated independently with Python msgpack/eth-account
matching the official Hyperliquid SDK. Regenerate with the optional dependencies
and `python scripts/generate-hl-vectors.py` if changing encoding.

The production handler and executor are already merged in wxnt-sale-deploy PR #10
and hl-ws PR #4. This package stays a localhost demo and does not call them.
Constraints: [backend notes](../../docs/remote-keys-backend-agent.md).
Frontend protocol: [API contract](../../docs/remote-keys-api.md).
