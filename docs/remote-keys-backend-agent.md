# Backend agent task: implement remote KMS signing for `/keys`

## Objective and repositories

Replace the missing production service behind X1 Terminal `/keys` with real
owner-authorized KMS agent creation and paused Auto Trader registration.

- `jacklevin74/x1-terminal`: read `docs/remote-keys-api.md`,
  `apps/terminal/src/lib/remote-keys/api.ts` and the `/keys` page first.
- `jacklevin74/wxnt-sale-deploy`: extend the existing `/api/copybot` handler.
- `jacklevin74/hl-ws`: integrate KMS at the current copybot signer seam.

The localhost demo is working, including real KMS signatures and independent
browser recovery. It **simulates** Hyperliquid approval and backend registration.
It proves signing compatibility, not production IAM readiness or exchange
acceptance. Never copy the demo's lack of owner authentication into production.

The portable reference implementation is in `tools/remote-keys-demo/`:
`src/kms-signer.js`, its unit tests, independent Python digest vectors and the
explicit opt-in real-AWS test. `src/hyperliquid-test-wallet.js` is a test adapter;
production must retain its existing action-building and posting logic.

## Required API operations

Implement the exact shapes and EIP-712 definitions in `remote-keys-api.md`:

1. GET `op=kms-status&addr=<selected-account>`: public, account-scoped metadata.
2. GET `op=kms-nonce&addr=<selected-account>`: single-use nonce for `X1RemoteKeys/1`.
3. POST `op=kms-create&addr=<selected-account>`: create a non-exportable KMS agent.
4. POST `op=kms-register&addr=<selected-account>`: verify approval and register paused.

No new Vercel function files under `api/`; put shared modules in `api/_lib/`.
Do not advertise `supported: true` until the actual executor supports this signer.
Report required contract adjustments instead of silently changing the protocol.
Keep demo state and production registrations entirely separate.

## Authorization and request safety

Recover the owner signature, verify the exact raw-body hash and expected domain,
operation, timestamp and target. Require `addr == target == body.master` and
`body.owner == recovered signer`. Verify selected-subaccount ownership server-side
on Hyperliquid; never infer it from browser state. Preserve existing X1CopyBot
authentication and legacy registration. The new nonce endpoint cannot demand
X25519 sealing metadata because this flow transfers no private key.

Consume expiring nonces atomically. An identical retry after an uncertain response
must return its original creation result or a recoverable pending operation,
not create another billable key. Reject altered bodies/replays. Establish a
durable operation/idempotency record before external KMS creation; account for
crashes between key creation and DB commit with tagged orphan reconciliation.
Rate-limit and cap creation per owner/account. Do not trust public `canCreate`
metadata as authorization for a mutation.

## Database and lifecycle

Use versioned migrations in the existing DB. Store opaque record ID, owner,
selected trading account, public agent address, server-only KMS ARN, display name,
intended/verified expiry, lifecycle state, created/last-successful-sign timestamps.
Add appropriate uniqueness constraints and indexes. Do not return key ARNs or
credentials to the frontend. Store no private key or sealedKey for KMS records.

Creation is awaiting_approval. The owner approves the address through the terminal's
existing Hyperliquid approveAgent call. Registration must independently verify:

- Owner/subaccount relationship and record ownership.
- KMS key spec/usage/state and derived public address match the requested agent.
- The owner currently approved this agent and its validity has not expired.
- Existing builder fee, equity and registration prerequisites remain satisfied.

Create an explicit signer='kms' registration with its server-side key reference.
Preserve settings and persist paused. Never resume during registration or silently
replace a different active signer. Add safe administrative/orphan/removal lifecycle
handling; do not disable/delete production keys as part of development.

Existing Auto Trader status must expose KMS signing capability in a way the UI
recognizes as usable; its legacy `hasKey` check cannot accidentally force raw-key
import for a valid KMS registration. Do not claim successful registration without
checking the selected account, owner, agent and paused state.

## Executor integration

Use a signer interface backed by the tested KMS adapter at `hlsend.js`'s signing
seam. Obtain/reuse the signer per follower-cycle; cache public metadata. Keep the
current action construction, msgpack encoding, nonce allocation, source `a`/`b`,
vaultAddress hashing/request field, builder fee, strategy, sizing, leverage,
thresholds, risk checks and order placement behavior unchanged.

Cover maker/IOC orders, cancel, leverage, reduce-only close and trigger stops.
Use `ECC_SECG_P256K1`, `SIGN_VERIFY`, `ECDSA_SHA_256`, `MessageType=DIGEST` with the
32-byte EIP-712 keccak digest. Decode DER, low-s normalize, recover v and verify
against the registered agent. Never SHA-256 the digest again or retry exchange
orders automatically because KMS/HTTP results are uncertain.

For a KMS follower, KMS failure or address mismatch aborts sends without a local-key
fallback. Keep existing legacy followers on their explicitly selected old signer
during migration. Preserve agent-expiry and all execution gates. Do not introduce
a public arbitrary-digest signing endpoint. Record successful-sign time from real
signatures and expose bounded error/latency metrics without sensitive data.

## AWS production identity

All Regional resources stay in selected Region `us-east-2`. Before provisioning,
confirm the actual project, paid/free plan, available capabilities and executor
hosting location. The new AWS experience previously blocked Roles Anywhere; do not
assume it works or use multi-Region KMS. Do not enable advanced capabilities without
user authorization.

Use temporary credentials: Vercel OIDC for the registrar and an appropriate runtime
identity for the executor. Do not copy the demo's human aws-toolkit profile into
production or introduce long-lived access keys.

Separate permissions: registrar creates/tags keys and reads public metadata but
cannot Sign; executor can Sign/GetPublicKey only for its permitted keys and cannot
create/decrypt/manage keys; lifecycle/admin permissions are separate. Enforce
owner/selected-account binding in the executor even though Hyperliquid owner agent
approval can cover multiple subaccounts. Supply least-privilege role/key policies,
required environment-variable names, trust conditions and an audit plan. Never
print/commit credential values. IAM negative tests must demonstrate the separation.

## Validation and delivery

Run offline tests for nonce replay/body tampering, wrong owner/subaccount/key,
disabled or expired agents, missing builder approval, atomic registration,
concurrent/idempotent creation and orphan cleanup. Mock exchange and AWS errors;
assert zero exchange POSTs after signing failure. Verify every action path uses
correct vaultAddress and builder fee. Existing legacy tests must remain passing.

Use only isolated dev resources for real KMS checks. A separate Hyperliquid testnet
acceptance run requires a dedicated testnet owner to approve the KMS address and
explicit authorization before placing/canceling orders. Do not use live followers.

Deliver PRs, test results, contract differences, migrations/rollback, required AWS
configuration, and exact staged deployment/restart/acceptance steps. Include
removal/revocation handling and orphan-key cleanup before enabling public creation.

**Do not merge, deploy, run production DB migrations, restart live executors,
register production agents or place trades without approval.** Do not migrate
existing follower keys automatically. No production changes are authorized by this
handoff document alone.
