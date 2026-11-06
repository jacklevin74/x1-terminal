# `/keys` remote-signing integration contract

The terminal page is implemented. These operations are a **proposed contract**, not
an assertion that the current copybot backend supports them. Until it does, the
page reports that the service is not connected and disables setup. Do not return
success or synthetic agents for unsupported operations.

Extend the existing `/api/copybot` handler (no additional Vercel function files).
The terminal uses its existing same-origin proxy. AWS SDKs, credentials, KMS key
ARNs, private material and the ability to sign arbitrary digests remain server-side.

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
`disabled`. Null is required for unavailable `validUntil`/`lastSignedAt`. Status
must derive owner/subaccount mapping server-side, not trust a supplied owner.
Return only public agent metadata for the selected account. Set `canCreate` false
when quotas or billing policy prohibit creation. Records must represent
AWS-generated non-exportable secp256k1 KMS keys, not legacy encrypted local keys.

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
Set the intended `validUntil`. Do not approve the agent or start a bot.
Handle orphan creation and idempotency so an interrupted response cannot create
unbounded billable keys. Apply the production KMS IAM separation documented in
the KSM project before enabling this endpoint. Tests using a human AWS profile
are not evidence that production IAM separation exists.

### Owner approval

The terminal uses its existing owner-wallet `approveAgent` flow with
`agentAddress` and `agentName: 'X1 KMS <first-16-agent-address-hex> valid_until <validUntil>'`.
The per-key approval name avoids replacing a different key with the same display name. It verifies
`extraAgents` for the owner before allowing registration. Agent approval is
owner-wide on Hyperliquid; backend authorization must still restrict this key to
its selected trading account. The page never requests an AWS credential or raw
private key and does not sign trading payloads in the owner wallet.

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
page. That page/executor must understand KMS registration before the service
advertises support: creation/approval alone do not integrate a remote signer into
manual terminal orders or switch the production executor's signer.

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
agent creation stages and hiding another account's cached records.

No backend deployment, KMS resource creation, agent approval, bot restart or live
trade is performed by adding this page.

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
