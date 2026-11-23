# Copy one trader: settings fields for the copybot API

The Auto tab has two modes: "Copy a trader" and "Basket". Both modes save their choice with the existing `settings` action. The terminal does not add a new action.

## Request

`POST /api/copybot?op=settings&addr=<master>`, signed the same way as every other `settings` call (`x-auth` header with nonce, timestamp and the EIP-712 `Request` signature over the body hash).

Body: the current `AutoTraderSettings`, plus the new optional fields.

Copy a trader:

```json
{
  "leverage": 3,
  "killPct": 0.1,
  "include": null,
  "exclude": [],
  "minOrderUsd": 10,
  "flowPct": 40,
  "follow": "0x418aa6bf98a2b2bc93779f810330d88cde488888",
  "followLeverage": 10
}
```

Basket with an edited member list:

```json
{
  "leverage": 3,
  "killPct": 0.1,
  "include": null,
  "exclude": [],
  "minOrderUsd": 10,
  "basket": [
    "0xc3602c55a23475df22818f78ac9d84c8b96dbda0",
    "0x8463d6ffcbfb56bf20ab2e1111f9a0e8359533f2"
  ]
}
```

The default basket (the 37 mood pool traders) sends no `basket` field. Switching from "Copy a trader" back to "Basket" sends the settings without `follow` and `followLeverage`.

## New fields

| Field | Type | Meaning |
|---|---|---|
| `follow` | string, optional | Lowercase `0x` address of the one Hyperliquid trader to copy. When present, the bot follows this trader instead of the mood pool. |
| `followLeverage` | integer 1 to 40, optional | Max leverage the bot may use while it copies `follow`. Sent only with `follow`. |
| `basket` | string[], optional, 1 to 200 addresses | The traders that count toward the basket mood score. Missing means the default pool. |

## What the terminal does today

1. The user presses Start. The terminal sends `settings` with the fields above, then `resume`.
2. If the server answers `settings` with an error, the terminal does not send `resume`. It shows this toast: "Copying one trader is not available yet. The bot will ignore the choice until the server supports it." For a basket it says "A custom basket is not available yet." instead.
3. If the server answers OK but the status read after it has no `follow` (or a different `basket`), the terminal treats that the same way: same toast, no `resume`.

## What the server needs

1. Accept `follow`, `followLeverage` and `basket` in `settings` and store them.
2. Return them in `op=status` under `settings`, so the terminal can confirm the save.
3. Reject `followLeverage` outside 1 to 40 and addresses that are not 40 hex characters.
