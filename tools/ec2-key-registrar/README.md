# EC2 KMS key creation for `/api_keys`

The terminal's compact key-management page can create a real, non-exportable
`ECC_SECG_P256K1` / `SIGN_VERIFY` AWS KMS key through an isolated EC2 service in
`us-east-2`. It then offers a separate owner-wallet Hyperliquid authorization.

This service **creates keys only**. It has no signing, exchange, bot registration,
or execution route. Its AWS role explicitly denies Sign, Decrypt, CreateGrant
and key deletion. Creating or authorizing a key does not start a bot. Existing
executors and their key handling are unchanged. The public Vercel KMS handler
continues to report disabled; this localhost connection does not turn it on.

## Installed connection

- EC2 instance: `i-0aa2a040d308a7e9d`, selected Region `us-east-2`.
- Dedicated OS user / unit: `x1-ec2-keys`, `x1-ec2-keys.service`.
- Code: `/opt/x1-ec2-keys`; durable SQLite metadata:
  `/var/lib/x1-ec2-keys/keys.sqlite` (service-owned, mode restricted by UMask 0077).
- Service binds **only** `127.0.0.1:8790` on EC2. No security-group ingress added.
- Workstation tunnel: `127.0.0.1:18790` forwards to that EC2 loopback port.
- Vite dev/preview proxies `/api/ec2-keys` through this tunnel. AWS SDKs,
  credentials, and key ARNs are never part of the browser interface.
- Only localhost origins on port 4173 are accepted for mutations. No CORS grant.

If the tunnel disconnects, run from the terminal repository:

```sh
tools/ec2-key-registrar/scripts/tunnel.sh
```

Then open `http://127.0.0.1:4173/api_keys` and click **Refresh KMS**.
The foreground tunnel can be stopped with Ctrl-C. For an existing background
SSH tunnel, identify its PID by its local listening port before stopping it.

## Owner workflow

1. Connect the intended owner wallet. Mainnet is required by this UI.
2. Enter a key name and 7/30/90-day approval duration. Click **Create KMS key**.
3. Confirm the `X1Ec2KeyCreation/1` EIP-712 consent in the owner wallet. This
   creates a billable KMS key; no private key download is possible or needed.
4. Click **Authorize on Hyperliquid** and confirm a separate `approveAgent`.
   The unique HL name is `X1K` plus 12 address characters, avoiding replacement
   of an unrelated named API wallet. The UI verifies the owner’s `extraAgents`.
5. The authorized address appears in the normal API-wallet table. **Remove**
   there revokes Hyperliquid access; it does not delete the billable KMS key.

Trading execution still needs a separately configured signer and registration.
This service cannot be used with a local private-key import.

## AWS identity and policy

The instance keeps its existing `copybot-kms-shadow-signer` profile. Its existing
single-key Sign policy is not modified. One additional inline policy permits
AssumeRole into `x1-ec2-key-registrar`; the registrar assumes that role using
IMDSv2 temporary credentials. No static AWS credentials are installed.

The registrar’s baseline policy was generated with IAM Policy Autopilot from
`src/kms.js`, then scoped to Region, key spec, usage and required tags. The checked
policy artifacts are in `deploy/`. AWS requires the creator to retain PutKeyPolicy
permission for the key-lockout safety check; this is restricted to the registrar’s
own tagged keys. The HTTP service exposes no policy-management route. Sign,
decryption, grants and deletion remain explicitly denied.

```sh
uvx iam-policy-autopilot@latest generate-policies \
 "$PWD/tools/ec2-key-registrar/src/kms.js" \
 --region us-east-2 --account 938952892987 --service-hints kms sts --pretty
```

Identity policies simulate tagged CreateKey as allowed, untagged CreateKey as
denied, and Sign/Decrypt/ScheduleKeyDeletion as explicitly denied. No real KMS
key is created by installation or by the mocked unit tests.

## Persistence, retries and recovery

Creation requires a one-use, owner-bound five-minute nonce and an EIP-712
signature over the operation, owner, nonce, timestamp and exact request-body hash.
Timestamp skew is limited to two minutes. The SQLite transaction consumes the
nonce and saves a durable intent **before** calling AWS. The CreateKey client has
`maxAttempts: 1`. An identical creation body returns the existing key rather than
creating another. Per-owner and global quotas are three and thirty requests.

If CreateKey has an ambiguous outcome, that request is quarantined and further
new creation for the owner stops. Do not delete its database row or retry AWS
creation. An operator must reconcile the saved record ID/request tag against KMS
and CloudTrail. If a known ARN was persisted but GetPublicKey failed, repeating
the exact same owner/name/duration request only recovers public metadata. Do not
change the name or duration to try to bypass a pending request.

The SQLite database includes public identities and server-only key ARNs, never
private key material. Protect and back up it together with its WAL using SQLite’s
backup facility; copying the main file during writes alone is insufficient.
No existing Postgres or Redis database is read or changed by this service.

## Verification

```sh
npm ci --prefix tools/ec2-key-registrar --ignore-scripts
npm test --prefix tools/ec2-key-registrar
```

Tests use an in-process fake KMS adapter and generated throwaway local keys only.
They cover owner consent, replay, tampering, quota, ambiguous creation, duplicate
requests, public-key address recovery and metadata isolation. The same suite ran
on EC2. Health checks resolve temporary credentials without CreateKey or Sign.
An explicit AWS integration check also created one disposable test identity through
the authenticated EC2 HTTP flow. Its tags/spec were verified and the test key was
scheduled for deletion with the administrative role (seven-day waiting period).
It was never approved on Hyperliquid or used for signing. The service retains its
audit record as test_pending_deletion. User key creation requires owner-wallet
consent in the UI.

Only the newly installed service is enabled/restarted by its installation.
Existing trading-service PIDs and start timestamps were checked before and after
and remained unchanged. Vercel deployment is not configured for this tunnel; a
production connection needs a separately authenticated HTTPS service/proxy.
