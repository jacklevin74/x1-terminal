# `/keys` remote-signing integration contract

The copybot handler is implemented in `jacklevin74/wxnt-sale-deploy` PR #10
(`25e3ea947d09b0ba6426cdb776ff14181ab3e70c`). The executor signer is implemented
in `jacklevin74/hl-ws` PR #4 (`7cd992b3148f237f8b93f0a5fbbd1a5fcd336ea1`). This
repository does not reimplement either service.

The page enables creation and registration only when `kms-status` returns
`supported: true` for the selected account. `supported: false` keeps setup
disabled and must not be answered with synthetic agents. Any other HTTP failure
is shown as the signing service not being connected.

The terminal still proxies `/api/copybot` to `https://wxnt-sale-sim.vercel.app`.
That public deployment currently answers `kms-status`, `kms-nonce`, `kms-create`,
and `kms-register` the same way it answers an unknown operation (`not registered`
once `addr` is present). Live setup therefore stays unavailable until a
non-production deployment of the merged handler is wired up. This page does not
perform that deployment.

AWS SDKs, credentials, KMS key ARNs, private material and the ability to sign
arbitrary digests remain server-side. No production KMS key, agent approval,
registration, executor restart, or trade is authorized by this contract.

## Status

`GET /api/copybot?op=kms-status&addr=<selected-trading-account>` returns:

```json
{
  "version": 1,
  "supported": true,
  "owner": "0xOWNER",
  "account": "0xSELECTED_ACCOUNT",
  "region": "us-east-2",
  "canCreate": true,
  "agents": [{
    "id": "opaque-agent-record-id",
    "agent": "0xPUBLIC_AGENT_ADDRESS",
    "name": "X1 Remote",
    "state": "awaiting_approval",
    "createdAt": 1793920000000,
    "validUntil": 1796512000000,
    "lastSignedAt": null
  }]
}
```

Addresses above are placeholders. Timestamps are Unix milliseconds. `id` contains
only letters/digits/underscore/hyphen, max 128 characters; it is not a KMS ARN.
`name` max 48 characters. Valid states: `awaiting_approval`, `approved`, `paused`,
`disabled`. `validUntil: null` is a non-expiring approval and is current, not
missing. A positive timestamp is an expiring approval. `lastSignedAt` is null
until a successful signature. Status must derive owner/subaccount mapping
server-side, not trust a supplied owner. Return only public agent metadata for
the selected account. Set `canCreate` false when quotas or billing policy
prohibit creation, and `supported: false` when KMS signing is disabled. Records
must represent AWS-generated non-exportable secp256k1 KMS keys, not legacy
encrypted local keys. A `disabled` record cannot be approved or registered, and
the executor must not sign with it.

## Mutation authorization

`GET ?op=kms-nonce&addr=<account>` returns a single-use 32-character hex nonce and:

- domain `{ "name": "X1RemoteKeys", "version": "1" }` (no extra domain fields).
- types `{ "Request": [{"name":"action","type":"string"},
  {"name":"target","type":"address"},{"name":"nonce","type":"string"},
  {"name":"timestamp","type":"uint64"},{"name":"bodyHash","type":"bytes32"}] }`.

POST operations use `x-auth: {nonce,timestamp,signature}` with owner EIP-712
signature of Request `{action,target:<selected account>,nonce,timestamp,
bodyHash:keccak256(UTF8(exact HTTP body))}`. Signer is the connected **owner**,
not the selected subaccount or agent. Validate expiry, replay prevention and
ownership before resource creation. Bind nonce to operation/account/owner as
appropriate, consume it atomically, and make repeated authenticated requests
idempotent. Browser mutations never automatically retry.

### Create

`POST ?op=kms-create&addr=<account>` body:
`{master:<account>,owner:<owner>,name:<1–24 letters/digits/space/_/->,days:7|30|90}`.

After verifying owner consent and account ownership, create an isolated
`ECC_SECG_P256K1` `SIGN_VERIFY` key in `us-east-2`; derive its public address.
Persist key ARN only on the backend with owner and selected-account scope.
Return full status plus `createdAgentId`, referencing an `awaiting_approval` row.
Set the intended `validUntil`, or `null` when the approval does not expire. Do not approve the agent or start a bot.
Handle orphan creation and idempotency so an interrupted response cannot create
unbounded billable keys. Apply the production KMS IAM separation documented in
the KSM project before enabling this endpoint. Tests using a human AWS profile
are not evidence that production IAM separation exists.

### Owner approval

The terminal uses its existing owner-wallet `approveAgent` flow. Hyperliquid
agent names have a 1–16 character base; a trailing ` valid_until <milliseconds>`
is excluded from that count and makes the approval expire. The earlier
`X1 KMS <first 16 hex>` base is 23 characters and is rejected by
`@nktkas/hyperliquid` 0.32.2 before the wallet signs.

Non-expiring records (`validUntil: null`) are approved as
`X1K<first 12 lowercase hex characters of the agent address>` (15 characters,
no suffix). Hyperliquid then reports `extraAgents[].validUntil: null`, which
the page treats as approved. Expiring records use that same base plus
` valid_until <validUntil>`. The distinct base avoids replacing a different key
that shares a display name. Disabled records are not submitted.

The page verifies `extraAgents` for the owner before allowing registration.
Null `validUntil` counts as current. Agent approval is owner-wide on
Hyperliquid; backend authorization must still restrict this key to its selected
trading account. The page never requests an AWS credential or raw private key
and does not sign trading payloads in the owner wallet.

### Register

`POST ?op=kms-register&addr=<account>` body:
`{master:<account>,owner:<owner>,id:<record-id>,agent:<public address>}`.

Verify owner auth, subaccount ownership, key/account/agent binding, enabled KMS
state, current owner agent approval/expiry, builder fee and applicable existing
registration constraints. Reject attempts to replace an active unrelated agent
silently; any required migration must be explicit. Register with signer `kms`,
server-side `kms_key_id`, no `sealedKey` or local key fallback. Persist paused.
Return full status with the requested agent `state: paused`. Never resume a bot
as part of this request. Reject disabled/expired records. Preserve existing
settings and all execution risk gates.

The UI's "Configure Auto Trader" link goes to the existing `/API#auto-trader`
page. A registration with `signer: "kms"` is usable without importing a private
key, including when `validUntil` is null. `supported: true` already means the
merged executor can sign for that registration. Creation or approval alone does
not switch manual terminal orders onto the remote signer. Registration remains
paused until the owner explicitly starts Auto Trader.

## Executor boundary

Use the tested KSM signer at the existing hlsend signing seam. Action construction,
nonce allocation, vault hashing, builder fees, order placement and risk controls
remain in the executor. AWS identity/role grants `Sign` only to the execution
service, never the browser or key registrar. Fail closed on KMS errors or a
recovered address mismatch. Do not implement a public arbitrary-digest sign API.
Track per-key signature timestamps from actual successful signatures, not UI reads.

## Checks

Frontend tests cover account/region binding, signed body hashing, secret-field
allowlisting, mismatched auth domains, account changes during signing, paused
registration confirmation, no automatic mutation retries, disconnected service,
`supported: false`, non-expiring `validUntil: null`, the 16-character approval
name, disabled keys, agent creation stages and hiding another account's cached
records.

Updating this page does not deploy the merged handler, create a KMS key,
approve an agent, register a bot, restart an executor, or place a trade.

## Local demo with real AWS signing

Localhost `/keys` now defaults to a separate demo adapter, not these production
operations. Start `npm run demo:keys` in `tools/remote-keys-demo` and the terminal preview on
4173. Vite's local `/api/local-keys` proxy forwards only to the loopback bridge.
Production deploys have no such bridge route. `/keys?mode=live` keeps the original
backend client, so mocks cannot populate its query cache or registration state.

Demo creation offers mock-only records or real AWS KMS test keys. Approvals and
registration are explicitly simulated; they do not call the owner wallet,
Hyperliquid or the production database. The signature test signs a harmless
`X1RemoteKeysDemo` typed proof, never a trading action. The browser independently
verifies the EIP-712 digest and recovered agent address using viem. The bridge uses
the tested server-side KMS signer. AWS credentials and key ARNs remain local to
that Node process; no AWS SDK enters the frontend bundle.

The bridge enforces a three-agent limit, loopback/Origin/Host checks, a per-session
request token and serialized mutations. Delete schedules the test key for removal
in seven days; graceful bridge shutdown cleans up all its remaining demo keys.
See the KSM README for startup and crash-recovery details.
