# Close removed positions

Default off. The terminal sends `closeRemovedPositions: true` and transient `removedMarkets: ["XRP"]` when saving an explicit deselection. The API validates against the previous persisted selection under a row lock and stores a server-controlled `closeMarkets` array. Clients cannot write that array. Status advertises `capabilities.closeRemovedPositions`.

The executor closes only queued, deselected perpetual markets on the selected trading account. Longs sell; shorts buy back. Orders use the existing reduce-only CLOSE path and full-close minimum exemption. Unrelated holdings and spot are untouched. Existing eligibility, equity, builder approval, freshness, transport and signing controls remain. Paused accounts do not execute. Partial closes retain their intent; flat positions send nothing. Reselecting a market or disabling and saving clears its intent. Intents persist until cancelled, so manually reopening a still-queued removed market will cause another close.

## Rollout after approval

1. Review and merge the API and executor changes. No database migration is needed; settings use existing JSON storage.
2. Install the reviewed executor revision through the existing deployment procedure. At a normal safe cycle boundary, configure `COPYBOT_CLOSE_REMOVED_READY=1` and restart through the existing service supervisor. Do not change order-queue or live-send flags. This step requires operator approval; it has NOT been performed.
3. Deploy the API revision. Set its `COPYBOT_CLOSE_REMOVED_READY=1` only after confirming the running executor supports it. This advertises support to the terminal. Keep the API flag unset while any executing instance lacks support.
4. Deploy the terminal revision. In /API, enable Close removed positions, deselect a previously saved market, then Save. Confirm status returns the flag and queued market before the next cycle. Test in a non-live environment first.
5. Verify next-cycle CLOSE is reduce-only and correctly directed; after a partial fill only the remaining position is closed. Verify unrelated holdings stay untouched. To cancel pending intents, disable the toggle and save, or reselect and save.

Rollback: disable the API readiness flag to block new enables, pause affected accounts via the normal owner control, and coordinate executor rollback. Merely disabling the API capability does not cancel already saved intents on an executor with its own flag enabled.

## Validation

API: `node --test tests/copybot-close-removed.test.js tests/copybot-subaccount-auth.test.js tests/copybot-sizeby.test.js tests/copybot-cycle-snapshot.test.js` (38 passed).
Executor: `node --test tests/close-removed.test.js tests/flow-weight.test.js tests/sqrt-size.test.js tests/targetlev.test.js` (53 passed).
Terminal: focused settings, panel, forecast, targets and removal tests (35 passed), TypeScript and Vite build passed.

Tests use mocks and planner functions. No live processes, settings, trades, keys or signing were changed.
