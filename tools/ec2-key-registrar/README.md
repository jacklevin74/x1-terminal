# `/api_keys` key service (x1-ec2-keys)

**Since 2026-11-20 new keys are created in the SIGNER account**, not in this trading account, so the
policy-signer Lambda (`hl-policy-signer`) can actually trade with them. The service relays the owner's
exact EIP-712-signed request (domain `X1SignerKeys` v1) to the key provisioner Lambda in the signer
account (hl-ws `signer/src/terminal-wallets.js`, design and deploy plan in hl-ws
`docs/terminal-api-wallets.md`). The provisioner verifies the owner's signature itself, creates a
secp256k1 key whose key policy denies `kms:Sign` to every principal except `role/hl-policy-signer`, and
writes a binding (owner, account, agent, conservative limits) that the signer reads. This host can disable a
key (fail-safe) but cannot create, bind, enable or delete one without the owner's signature.

Keys created here before that date are **legacy** (trading account, `backend=legacy` in the database). The
Organizations RCP keeps the signer account from ever using them. The page shows them as "not usable for
trading" and offers only rename, disable, delete and cancel-delete (domain `X1Ec2KeyCreation` v1, lifecycle
role). Nothing on this host can create a trading-account key any more; `x1-ec2-key-registrar` is unused.

Flow: owner picks the trading account (main or an owned sub-account) and approval duration (30/90/180 days,
default 90) → signs `create` → provisioner makes the key and a `pending` binding → owner signs `approveAgent`
on Hyperliquid in the browser → the status poll asks the provisioner to `activate`, which checks Hyperliquid
itself (agent listed with ≥ 1 h left, X1 builder fee ≥ 0.05%, sub-account still owned) → `active`.
Renewal: same agent, same name, later `valid_until`; the next poll refreshes the binding's expiry.

## Architecture

```
Browser (/api_keys) ── same-origin /api/ec2-keys?op=…&owner=… ──▶ Vercel function api/ec2-keys.js
  (no AWS access; HMAC-signs each request) ── HTTPS ──▶ CloudFront <id>.cloudfront.net (caching disabled)
  ── HTTP :80 + X-Origin-Verify ──▶ Caddy on EC2 (port 80 open only to the CloudFront origin-facing prefix list)
  ──▶ x1-ec2-keys on 127.0.0.1:8790 ──▶ AWS KMS (assumed registrar or lifecycle role, temporary credentials)
```

- CloudFront: viewer HTTPS only (default `*.cloudfront.net` certificate), PriceClass_100,
  managed `CachingDisabled` cache policy, origin request policy `x1-ec2-keys-origin` that forwards
  all query strings and only `content-type`, `x-auth`, `x-proxy-ts`, `x-proxy-auth`, `origin`.
  It adds the custom origin header `X-Origin-Verify: v1:<secret>`; Caddy answers 403 without it and
  strips it before proxying. The secret lives in `/etc/caddy/origin-verify.env` (0600); Caddy runs
  without `--environ` and with its admin API off so the value never reaches logs or a local endpoint.
- Origin hop CloudFront → EC2 is plain HTTP. Its contents are protected by the proxy HMAC (replay-checked)
  and owner signatures (single-use nonces); the origin-verify value is visible on that hop, which is why
  the security group still admits only CloudFront.
- `X-Forwarded-For` arrives as `browser, vercel-egress, cloudfront-edge`. With `X1_TRUSTED_HOPS=1` the
  service keys unauthenticated limits on `vercel-egress` (what CloudFront saw) and, after the HMAC
  verifies, per-client limits on `browser` (set by the Vercel proxy).
- Optional: AWS WAF on the distribution (rate-based rule, ~$5/month + $1/rule + per-request) is not needed
  for this traffic level because unauthenticated requests stop at Caddy or the HMAC check.
- Later custom domain: request an ACM certificate in **us-east-1** for e.g. `keys-api.<domain>`, add it
  as an Alternate domain (CNAME) on the distribution with `sni-only`, create a CNAME/alias record to the
  `*.cloudfront.net` name, then change `EC2_KEYS_URL`. Nothing changes on EC2.

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
| `create` | POST | `{account,days,name,owner}`, signed with `X1SignerKeys`. Relayed to the provisioner (`key-create`). Idempotent: the same signed request always maps to the same key; an unconfirmed invoke is finished by the status poll with the stored request (the provisioner returns or adopts the key it made). A provisioner refusal (quota, sub-account not owned, …) frees the owner to try again. |
| `rename` | POST | `{id,name,owner}`. Display name only. |
| `disable` / `enable` | POST | Signer keys: `{account,agent,owner}` → provisioner `key-manage` (enable returns the binding to `pending` until re-activation). Legacy keys: `{id,owner}` → `DisableKey`; enable is refused. |
| `delete` | POST | `{id,owner[,days]}` → `ScheduleKeyDeletion` (default 30, 7–30). The page tells the owner to also remove the Hyperliquid API wallet. |
| `cancel-delete` | POST | `{id,owner}` → `CancelKeyDeletion`. KMS leaves the key disabled. |

Every POST carries the `X1Ec2KeyCreation/1` EIP-712 envelope with `action` = op name,
`target` = owner, the nonce, a timestamp (±120 s) and `keccak256(body)`; the signer must
equal the record's owner. Each create and change is appended to
`/var/lib/x1-ec2-keys/audit.jsonl` (`ts, owner, op, id, agent, result`). No ARNs,
credentials or signatures appear in responses or logs.

## AWS permissions

- **Instance role** `copybot-kms-shadow-signer`: unchanged. Same-account trust policies let it assume the roles below
  (session name `x1-ec2-keys`).
- **`x1-signer-key-client`** (trading account, `deploy/signer-client-*.json`, gate 7): only
  `lambda:InvokeFunction` on the signer-account `hl-copybot-provisioner`; everything else denied. The provisioner's
  resource policy admits only this role (`TerminalKeysRoleArn` in hl-ws `signer/infra/copybot-followers.yaml`).
  Cross-account Lambda invoke from this instance role to the signer account is already used by the live bots
  (`hl-policy-signer`), so the Organizations RCP (which blocks cross-account KMS) does not block it.
- **`x1-ec2-key-lifecycle`** (`lifecycle-policy.json`): legacy keys only; its grant is in each legacy key's policy.
- **`x1-ec2-key-registrar`**: no longer used by the code. Retire it after the cutover (see hl-ws doc).

## Deploy / rollout

Gate scripts in `deploy/gates/`, each run by a person, in order (each has a verify step and a rollback):
`1-iam.sh` → `2-security-group.sh` (dedicated group `x1-ec2-keys-cloudfront`, TCP 80 from
`com.amazonaws.global.cloudfront.origin-facing` only; a separate group because that prefix list counts as
~55 of the 60 inbound rules) → on EC2 `3-ec2-cutover.sh` → `4-cloudfront.sh` → `5-vercel-env.sh` →
on EC2 `6-preview-mutations.sh on|off` around the one real test.

## Rollback

Fastest: `npx vercel env rm EC2_KEYS_URL production` (page shows "EC2 key service unavailable"; keys already
approved on Hyperliquid keep working), or `sudo systemctl stop caddy` on EC2. Full, in reverse order:
`4-cloudfront.sh rollback`, `3-ec2-cutover.sh rollback` (restores the previous code/unit, stops Caddy),
`2-security-group.sh rollback`, and for IAM re-apply `deploy/registrar-policy.previous.json` (fill in
`ACCOUNT_ID`) and delete `x1-ec2-key-lifecycle` (`delete-role-policy`, then `delete-role`).

## Rotate the proxy secret

On EC2: `openssl rand -hex 32 | sudo tee /etc/x1-ec2-keys/proxy.secret >/dev/null` (same for
`proxy-preview.secret`), then from the Mac `vercel env rm EC2_KEYS_PROXY_SECRET production`
and re-run the matching line of `5-vercel-env.sh`; restart `x1-ec2-keys` and redeploy.
Requests fail with 401 between the two steps; nothing else is affected.
The origin-verify secret: write a new `/etc/caddy/origin-verify.env`, update the distribution's
`X-Origin-Verify` custom header to `v1:<new>` (get/update-distribution-config), wait for deploy, then
`systemctl restart caddy`; requests get 403 in between.

## Revoke a key

1. On `/api_keys`, **Remove** the API wallet (revokes Hyperliquid access; owner-signed).
2. **Disable** (reversible) or **Delete** (schedules KMS deletion, 30 days, cancellable) the KMS key.
3. Emergency, without the page: an AWS admin can run `aws kms disable-key --key-id <id>` in us-east-2.

## Tests

```sh
npm ci --prefix tools/ec2-key-registrar --ignore-scripts
npm test --prefix tools/ec2-key-registrar
```

Offline only: fake provisioner, fake KMS adapter and throwaway keys. They cover the proxy HMAC
(missing/bad/stale/replayed), method and op checks, body caps, origin tiers, rate limits,
owner signatures, nonces, idempotent create, ownership (403), AWS refusals, audit records,
the startup identity check and database migration.
