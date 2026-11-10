# KMS signing for the Copy trader (live)

Status as of 2026-11-09 HST. The live Copy trader signs its Hyperliquid orders with an AWS KMS key. Its old
`agent.json` key is kept only as the rollback.

This is the first production use of the remote-signing design in
[`remote-keys-backend-agent.md`](https://github.com/jacklevin74/x1-terminal/blob/feat/kms-remote-keys-demo/docs/remote-keys-backend-agent.md)
(PR #1). It is deliberately narrow:
- one key;
- one account (the Copy trader sub-account);
- no `/keys` backend, owner registration or database.

The code lives in `jacklevin74/hl-ws`, branch `claude/bb-ec2-planner` (commit `4b8fb1d`).

## What runs where

| Piece | Where | Notes |
|---|---|---|
| Signing key | AWS KMS, `us-east-2`, `alias/copybot-shadow` | `ECC_SECG_P256K1` / `SIGN_VERIFY`. Generated in KMS (origin `AWS_KMS`); the private key can't be exported. Tagged `app=copybot`, `purpose=shadow`, `follower=<sub-account>`. |
| Hyperliquid agent | `0x5E9c15210e536D16eACc506FFcD1526DCb4E7f1f`, named "KMS Copy Trader" | Approved by master `0x0051…2519` on app.hyperliquid.xyz → More → API. Valid until 2027-05-09. |
| Trading account | Copy trader sub-account `0x6ac8731df1f6b08199e24253b6b112d58a07a6e5` | Copies `0x023a…2355`. |
| Executor | EC2 `hl-ws-test` (us-east-2), service `live-copy-023a` | Drop-in `live-copy-023a.service.d/kms.conf` sets `COPY_SIGNER=kms`, `COPY_KMS_KEY_ID`, `COPY_KMS_AGENT`, `AWS_REGION`. |
| Runtime identity | EC2 instance profile `copybot-kms-shadow-signer` | Temporary credentials from the instance metadata service; no access keys anywhere. |

## Permissions (least privilege)

The instance role's only permissions are:
- `kms:Sign` on this one key ARN, with the conditions `kms:SigningAlgorithm = ECDSA_SHA_256` and `kms:MessageType = DIGEST`;
- `kms:GetPublicKey` and `kms:DescribeKey` on the same ARN.

Checked from the instance:

| Call | Result |
|---|---|
| `CreateKey` | `AccessDenied` |
| `Sign` with `MessageType=RAW` | `AccessDenied` |
| `ListKeys` | `AccessDenied` |
| `DisableKey` / `ScheduleKeyDeletion` | Rejected |

The `DisableKey` and `ScheduleKeyDeletion` calls named the key by its alias, so they were rejected for that reason, not for permissions. They were not retried with the key ARN, because a successful call would have really disabled or deleted the key. The role grants neither action.

Creating keys and managing their lifecycle is done by a human administrator, outside the executor.

## Signing path

`hlsend.ex` keeps building the action exactly as before:
- msgpack encoding, nonce allocation and `vaultAddress` hashing;
- source `a`;
- the EIP-712 `Agent` digest.

For a KMS signer it then:
1. sends that 32-byte digest to KMS (`MessageType=DIGEST`, never hashed again);
2. decodes the DER signature and normalizes it to low-s;
3. recovers `v`, and checks that the recovered address equals the approved agent;
4. only then POSTs to `/exchange`.

If KMS fails or the address doesn't match, every further send is stopped, with no fallback to a local key, until the service is restarted.

## Verification so far

| Test | Account | Result |
|---|---|---|
| Shadow signer (`kms-shadow.js`), 7 signatures | n/a (sent nothing) | All recovered to the agent. 11–58 ms from EC2, about 170 ms from a laptop. |
| BTC, $15 IOC buy + reduce-only sell | master | Filled 74,850.0 / 74,855.0 (oids 600250932255, 600251094891) |
| xyz:AAPL, $15 IOC buy + reduce-only sell | Copy trader sub-account | Filled 351.22 / 351.19, HIP-3 fee 0.009% (oids 600259134619, 600259165327) |
| Live Copy trader switched to KMS | Copy trader sub-account | Started 19:19 HST: `"signer":"kms"`, agent "KMS Copy Trader". No errors since. |

Manual orders use `node copybot/kms-order.js --account 0x6ac8…a6e5 --coin <BTC|xyz:AAPL> --side buy|sell --usd N [--send]`:
- it previews unless `--send` is given;
- it refuses any account other than the Copy trader sub-account;
- it caps orders at $100 by default;
- it checks the agent's approval before sending.

## Rollback

On the EC2 machine, delete `/etc/systemd/system/live-copy-023a.service.d/kms.conf`, then run:

```
sudo systemctl daemon-reload
sudo systemctl restart live-copy-023a
```

The copier then signs with `agent.json` again ("Copy Trader Bot" `0x0639…e9f9`, still approved).

To retire the KMS key:
1. Remove "KMS Copy Trader" on Hyperliquid.
2. Detach the instance profile.
3. Schedule the key for deletion (AWS waits 7–30 days).

## Gaps before wider use

- **No alert yet when the KMS signer stops sends.** Planned: a Status-page check in hl-dash.
- **The key alias still says "shadow"** although the key is now used live. A dedicated `alias/copybot-live` would be clearer.
- **No owner-facing management.** Owner-authenticated creation and registration through `/keys`, the backend in wxnt-sale-deploy PR #10, is not deployed. The localhost demo still only simulates approval and registration.
- **Audit:** CloudTrail coverage of KMS `Sign` events in this account has not been checked yet.
