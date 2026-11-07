# Task 1 native menu handoff report

Status: DONE_WITH_CONCERNS.

## RED → GREEN
- RED: `node --test --test-name-pattern='native session menu' test/safe-views.test.js` failed (0 pass, 1 fail): `calls.at(-1)` was undefined instead of the native `open` call for Activity A.
- GREEN: same focused command passed (1 pass, 0 fail).
- Full `npm test`: 110 pass, 0 fail (baseline 109 plus one).
- `node --check lib/client.js`: passed. `git diff --check`: passed.

## Changes
- Inject optional `contextMenus` in test mount and test Activity/Favorites ellipsis, toggle-close, right-click, Shift+F10, no duplicated Fold menu/actions/dialog, and no unintended navigation.
- Conditional native session menu branch in `SessionRow`; rc.5 retains the existing controls and behavior. No context-menu package dependency added.

## Concerns
- Client Inspect `Service.listService` and `Slots.listSubTree` each timed out because the Harness page was disconnected; public rc.1 API was supplied by the task brief. No live GUI verification or installation performed.
- Cross-realm target objects in VM tests require JSON normalization for deep-value assertions.
