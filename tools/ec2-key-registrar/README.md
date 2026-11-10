# EC2 KMS keys for `/api_keys`

`/api_keys` lets a connected owner wallet create and manage non-exportable
`ECC_SECG_P256K1` / `SIGN_VERIFY` AWS KMS keys through a service on EC2 (`us-east-2`).
The service never signs, approves on Hyperliquid, registers bots or trades
(`capabilities: {sign:false, register:false}`). Hyperliquid approval stays in the
browser, through `approveAgent` signed by the owner.

## Architecture

```
Browser (/api_keys)  ── same-origin /api/ec2-keys?op=…&owner=… ──▶  Vercel function api/ec2-keys.js
   (no AWS access; signs each request with EC2_KEYS_PROXY_SECRET)  ── HTTPS ──▶  Caddy :443 on EC2
   (Let's Encrypt via TLS-ALPN, 8 KB body cap)  ──▶  x1-ec2-keys on 127.0.0.1:8790  ──▶  AWS KMS
   (assumes x1-ec2-key-registrar or x1-ec2-key-lifecycle per operation; temporary credentials only)
```

No SSH tunnel is in the request path. Local `vite dev` proxies `/api/ec2-keys` to the
deployed Vercel function (`EC2_KEYS_DEV_TARGET` overrides the target); the function
refuses a cross-origin POST, so local dev can read status but not change keys.

### Proxy authentication

`X-Proxy-Auth = hex(HMAC-SHA256(secret, method + "\n" + pathAndQuery + "\n" + ts + "\n" + hex(sha256(body))))`,
with `X-Proxy-Ts = ts` (ms). The service checks it with a constant-time compare, allows
±60 s of skew, and refuses a repeated `(ts, mac)` for 120 s. Anything else gets 401,
including `/health`.

There are two secrets. Vercel **Production** holds `proxy.secret`, Vercel **Preview** holds
`proxy-preview.secret`. The secret that verifies decides the tier:

| Tier | Accepted `Origin` | Operations |
|---|---|---|
| production | `https://x1-terminal-20261029.vercel.app` (+ `X1_EXTRA_ORIGINS`) | all |
| preview | `https://x1-terminal-20261029-*-jacklevin74s-projects.vercel.app` | `status` only, unless `X1_PREVIEW_MUTATIONS=1` |

`http://localhost:4173` is accepted only when `NODE_ENV` is not `production`.
Rate limits: 30 requests/min per client, 120 failed-auth requests/min per peer,
5 creates/hour and 30 changes/hour per owner, plus the 3-active-keys-per-owner quota.

### Operations

| op | Method | Effect |
|---|---|---|
| `status` | GET | Public metadata: `awaiting_approval`, `disabled`, `pending_deletion` (+`deletionDate`). The page shows "Authorized on Hyperliquid" from Hyperliquid's own `extraAgents`. |
| `nonce` | GET | Single-use, 5-minute nonce. |
| `create` | POST | `{owner,name,days}`. Idempotent: the same owner, nonce and body returns the original result; an uncertain `CreateKey` is never retried. A definite AWS refusal (e.g. validation) frees the owner to try again. |
| `rename` | POST | `{id,name,owner}`. Display name only. |
| `disable` / `enable` | POST | `{id,owner}` → `DisableKey` / `EnableKey`. |
| `delete` | POST | `{id,owner[,days]}` → `ScheduleKeyDeletion` (default 30, 7–30). The page tells the owner to also remove the Hyperliquid API wallet. |
| `cancel-delete` | POST | `{id,owner}` → `CancelKeyDeletion`. KMS leaves the key disabled. |

Every POST carries the `X1Ec2KeyCreation/1` EIP-712 envelope with `action` = op name,
`target` = owner, the nonce, a timestamp (±120 s) and `keccak256(body)`; the signer must
equal the record's owner. Each create and change is appended to
`/var/lib/x1-ec2-keys/audit.jsonl` (`ts, owner, op, id, agent, result`). No ARNs,
credentials or signatures appear in responses or logs.

## AWS permissions (templates in `deploy/`, `ACCOUNT_ID` filled in by the gate scripts)

- **Instance role** `copybot-kms-shadow-signer`: unchanged. It may assume the two roles below.
- **`x1-ec2-key-registrar`** (`registrar-policy.json`): `CreateKey` only for tagged,
  single-Region secp256k1 `SIGN_VERIFY` keys with `env=prod`; `TagResource` only with those tags;
  `GetPublicKey`/`DescribeKey` only on its tagged keys. Explicit Deny on Sign, Decrypt, grants,
  `PutKeyPolicy`, untagging, aliases and all lifecycle actions. The key policy is set by
  `CreateKey` itself (`src/kms.js` → `keyPolicy`).
- **`x1-ec2-key-lifecycle`** (`lifecycle-policy.json`): its IAM policy contains **no Allow**.
  The only grant is in each key's own key policy, written at creation:
  Disable/Enable/CancelKeyDeletion/DescribeKey and ScheduleKeyDeletion with a 7–30 day window.
  IAM additionally denies every other action, any key without `app=x1-terminal` and
  `purpose=ec2-api-key`, and any Region but us-east-2. Because no IAM Allow exists, adding
  tags to some other key (for example the copy trader's) grants this role nothing.
- The previous registrar policy is kept in `registrar-policy.previous.json` for rollback.

## Deploy / rollout

Gate scripts live in `deploy/gates/` (each one is run by a person, in order):
`1-iam.sh` → `2-eip-dns.sh <host>` → `3-security-group.sh` → on EC2 `4-ec2-cutover.sh <host>`
→ `5-vercel-secrets.sh <host>` → `6-preview-mutations.sh on|off` around the one real test.

## Rollback

1. `sudo systemctl disable --now caddy` on EC2, or revoke the 443 rule
   (see `3-security-group.sh`). The page then shows "EC2 key service unavailable";
   keys already approved on Hyperliquid keep working.
2. Restore code: copy `/opt/x1-ec2-keys.prev-<stamp>` back to `/opt/x1-ec2-keys`, restore its
   `x1-ec2-keys.service.installed` unit, `daemon-reload`, restart `x1-ec2-keys`.
3. IAM: `aws iam put-role-policy --role-name x1-ec2-key-registrar --policy-name create-ec2-api-keys-only --policy-document file://…registrar-policy.previous.json`
   (after replacing `ACCOUNT_ID`), and delete `x1-ec2-key-lifecycle` (`delete-role-policy`, `delete-role`).

## Rotate the proxy secret

On EC2: `openssl rand -hex 32 | sudo tee /etc/x1-ec2-keys/proxy.secret >/dev/null` (same for
`proxy-preview.secret`), then from the Mac `vercel env rm EC2_KEYS_PROXY_SECRET production`
and re-run the matching line of `5-vercel-secrets.sh`; restart `x1-ec2-keys` and redeploy.
Requests fail with 401 between the two steps; nothing else is affected.

## Revoke a key

1. On `/api_keys`, **Remove** the API wallet (revokes Hyperliquid access; owner-signed).
2. **Disable** (reversible) or **Delete** (schedules KMS deletion, 30 days, cancellable) the KMS key.
3. Emergency, without the page: an AWS admin can run `aws kms disable-key --key-id <id>` in us-east-2.

## Tests

```sh
npm ci --prefix tools/ec2-key-registrar --ignore-scripts
npm test --prefix tools/ec2-key-registrar
```

Offline only: fake KMS adapter and throwaway keys. They cover the proxy HMAC
(missing/bad/stale/replayed), method and op checks, body caps, origin tiers, rate limits,
owner signatures, nonces, idempotent create, ownership (403), AWS refusals, audit records,
the startup identity check and database migration.
