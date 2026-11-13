# KMS keys for Hyperliquid trading: design

Status as of 2026-11-10 HST.

Hyperliquid API wallets ("agents") are secp256k1 keys that may trade for an account but not withdraw.
This design keeps those private keys in **AWS KMS**: they are generated there, can't be exported, and
are used only through `kms:Sign`. No key file, seed or `agent.json` exists for a KMS key.

There are two independent halves:

| Half | What it does | Status |
|---|---|---|
| **Key management** | Owners create, disable, enable, rename and delete KMS keys from `/api_keys` | Live in production (PR #7) |
| **Signing** | A bot signs Hyperliquid actions with one KMS key | Live for the Copy trader only ([`kms-copy-trader.md`](kms-copy-trader.md)) |

They are deliberately separate. Whatever creates keys can't sign with them, and whatever signs
can't create, disable or delete keys. So if the public web path were compromised, an attacker could at
most manage keys; they couldn't trade.

## 1. Key management (`/api_keys`)

### Request path

```
Browser  /api_keys  (owner wallet, Mainnet)
  │  GET  /api/ec2-keys?op=status&owner=0x…   list keys, quota
  │  GET  /api/ec2-keys?op=nonce&owner=0x…    single-use nonce (5 min)
  │  wallet signs EIP-712 X1Ec2KeyCreation.Request {action, target=owner, nonce, timestamp, bodyHash}
  │  POST /api/ec2-keys?op=<action>&owner=0x…
  ▼
Vercel function  api/ec2-keys.js
  │  adds X-Proxy-Auth (HMAC) + X-Proxy-Ts; production and preview use different secrets
  ▼
CloudFront distribution (HTTPS)
  │  adds secret X-Origin-Verify header
  ▼  HTTP :80, security group allows only the CloudFront origin-facing prefix list
EC2  Caddy  →  forwards only /api/ec2-keys and /health; rejects a missing or wrong X-Origin-Verify
  ▼
x1-ec2-keys service  127.0.0.1:8790 (loopback only)
```

There's no SSH or tunnel anywhere in the request path.

### Actions

`<action>` is `create`, `rename`, `disable`, `enable`, `delete` or `cancel-delete`. `status` and `nonce` are
read-only and unsigned.

### What the service checks, in order

1. **Proxy HMAC:** the timestamp is within 60 s, and each request ID is accepted only once in a 120 s window. The secret's tier decides `production` or `preview`.
2. **Preview tier:** read-only (`status`) unless `X1_PREVIEW_MUTATIONS=1` is set on EC2. It's off by default and was turned on only for the one owner test.
3. **Owner signature:** the EIP-712 signature must recover to `owner`. The timestamp must be within 120 s, and `bodyHash` must equal `keccak256` of the exact body.
4. **Nonce:** used up atomically. A retry with the same nonce and body returns the original result instead of acting twice.
5. **Limits:**
   - at most 3 keys per owner and 30 in total;
   - 5 creates per owner per hour;
   - 30 lifecycle actions per owner per hour.
6. **Intent recorded first:** the request is written to SQLite before AWS is called. An uncertain AWS result (timeout, 5xx) is never retried automatically and blocks further creates for that owner until it's reconciled.

### Create

```
CreateKey  KeySpec=ECC_SECG_P256K1, KeyUsage=SIGN_VERIFY, Origin=AWS_KMS, MultiRegion=false,
           Tags {app=x1-terminal, purpose=ec2-api-key, env, owner, record, request},
           Policy = key policy below, BypassPolicyLockoutSafetyCheck=true
GetPublicKey → uncompressed secp256k1 point → keccak256 → agent address 0x…
```

The page shows the address. The owner then approves it on Hyperliquid with their own wallet ("Authorize on
Hyperliquid", an `approveAgent` action). The service never approves agents.

### Key policy (set once at creation; nothing can change it afterwards except an account administrator)

| Statement | Principal | Actions |
|---|---|---|
| `EnableIamPolicies` | the AWS account root | `kms:*` (lets administrators always recover the key) |
| `LifecycleOnly` | `x1-ec2-key-lifecycle` role | `DescribeKey`, `DisableKey`, `EnableKey`, `CancelKeyDeletion` |
| `LifecycleScheduleDeletion` | `x1-ec2-key-lifecycle` role | `ScheduleKeyDeletion` with a 7–30 day waiting period |

### IAM roles (the EC2 instance assumes them)

| Role | Allowed | Explicitly denied |
|---|---|---|
| `x1-ec2-key-registrar` | `CreateKey` only for secp256k1 `SIGN_VERIFY` keys from `AWS_KMS`, single-region, in us-east-2, with the required tags. May set `BypassPolicyLockoutSafetyCheck`. Can tag at creation, and run `GetPublicKey`/`DescribeKey` on keys tagged `app=x1-terminal`. | `Sign`, `Verify`, `Encrypt`/`Decrypt`, `GenerateDataKey*`, `CreateGrant`, `PutKeyPolicy`, `UntagResource`, `Disable`/`EnableKey`, `Schedule`/`CancelKeyDeletion`, alias changes, `ImportKeyMaterial` |
| `x1-ec2-key-lifecycle` | nothing through IAM; its only access is through each key's own policy (above) | Everything except the five lifecycle actions. Those five are also denied on keys without the `app=x1-terminal` and `purpose=ec2-api-key` tags, outside us-east-2, and (for `ScheduleKeyDeletion`) with a waiting period under 7 days. |

**Why the lockout check is bypassed:** KMS refuses `CreateKey` with a custom policy unless the caller
could edit that policy later. The registrar is intentionally denied `PutKeyPolicy`, so without the bypass
every create fails. The bypass is safe because the account root keeps `kms:*` on every key.

This was found in the first real create test (2026-11-10). The fix was owner-approved and is in commit `bb1042b`.

### Audit

Every mutation appends a line to `/var/lib/x1-ec2-keys/audit.jsonl` on EC2:
`ts`, `owner`, `op`, request `id`, `agent` and `result`, plus `awsError` on an AWS rejection.
KMS calls are also visible in CloudTrail; a dedicated trail for KMS events isn't set up yet.

### Verified on 2026-11-10 (owner wallet, Mainnet, PR #7 preview)

| Step | Result |
|---|---|
| Create, first attempt | Refused by AWS (lockout safety check); no key created |
| Create after the IAM fix | OK: key `X1 KMS`, agent `0x119B427dB339C17ce91da77c864665099D34d4A3` |
| Disable / Enable | OK |
| Delete / Cancel deletion | Not tested yet; planned with the test key on production |
| Preview mutations | Turned off after the test |

## 2. Signing

A signer is a bot whose IAM role has `kms:Sign` on **one** key ARN, with the conditions
`kms:SigningAlgorithm = ECDSA_SHA_256` and `kms:MessageType = DIGEST`, plus `GetPublicKey`/`DescribeKey`.

For each Hyperliquid action the bot:
1. builds the action exactly as for a local key (msgpack, nonce, `vaultAddress`, source `a`) and computes the EIP-712 `Agent` digest;
2. sends the 32-byte digest to KMS (`MessageType=DIGEST`, never hashed again);
3. decodes the DER signature, normalizes it to low-s and recovers `v`;
4. **checks that the recovered address equals the approved agent**, then POSTs `/exchange`.

If KMS fails or the address doesn't match, all sends stop. There is no fallback to a local key.

Measured latency is 11–58 ms per signature from EC2. The code is `copybot/kms-signer.js` and `hlsend.ex` in
`jacklevin74/hl-ws`.

### In use today

The live Copy trader (sub-account `0x6ac8…a6e5`, service `live-copy-023a`) signs with
`alias/copybot-shadow`, agent `0x5E9c…7f1f` "KMS Copy Trader". That key was created by hand, not through
`/api_keys`. Details and rollback are in [`kms-copy-trader.md`](kms-copy-trader.md).

### Not built yet: connecting page-created keys to bots

The status reply reports `capabilities.sign = false` and `register = false`. Keys created on `/api_keys`
can be approved on Hyperliquid but nothing signs with them yet. The missing piece is "attach key to bot":
1. The owner picks a bot and an account for an approved key.
2. That bot's role gets `kms:Sign` on exactly that key ARN, with the conditions above.
3. The bot is configured with the key ID and agent address. It checks the address at startup and before every send.

## 3. Security notes

- **Private keys never leave KMS.** No component, log or response ever holds one.
- **The CloudFront → EC2 hop is plain HTTP** to the instance's public address, limited to CloudFront by its IP list and the origin secret. Everything that matters on it is signed or single-use:
  - owner EIP-712 signatures and nonces;
  - the time-stamped HMAC, whose secret is never sent.

  Reading or modifying that traffic can't create, change or use a key. The cleaner future fix is CloudFront VPC origins: no public port, and no origin secret needed.
- Secrets live only in `/etc/x1-ec2-keys/` on EC2 (passed to the service with systemd `LoadCredential`) and in Vercel's sensitive environment variables. They're never printed or committed.

## 4. Open items

1. Delete the test key `X1 KMS` from production `/api_keys`. This is the first live delete test.
2. Alert on the hl-dash Status page when the KMS signer stops sends.
3. Set up a CloudTrail trail for KMS events.
4. Build "attach key to bot", then move the Copy trader to a page-created key (retiring `alias/copybot-shadow`).
5. Make the preview status reply report the preview tier's read-only capabilities.
6. Add a network switch on `/api_keys`.
7. Switch CloudFront → EC2 to VPC origins.

## Code

| Piece | Location |
|---|---|
| `/api_keys` KMS UI | `apps/terminal/src/components/api-wallets/ec2-kms-keys.tsx`, `apps/terminal/src/lib/ec2-keys/api.ts` |
| Vercel proxy | `api/ec2-keys.js` |
| EC2 service | `tools/ec2-key-registrar/src/` |
| IAM, CloudFront and Caddy templates; rollout gates 1–6 | `tools/ec2-key-registrar/deploy/` (operations: `tools/ec2-key-registrar/README.md`) |
| KMS signer (bots) | `jacklevin74/hl-ws`: `copybot/kms-signer.js`, `copybot/hlsend.js` |
