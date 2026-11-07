# Fold Native Session Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold Activity/Favorites sessions use the host's own ellipsis-triggered menu (rename, pin, archive) on DSH 0.2.2-rc.1 without regressing 0.2.1-rc.5.

**Architecture:** Prefer the root-provided `useContextMenu/getTriggerProps` and the public `ctx.contextMenus.open/close` session target on rc.1. Keep Fold 0.4.9's self-contained fallback for rc.5 (its context-menu package was not published). Never register or fork a second set of native actions.

**Tech Stack:** React 18, Cordis Client Slots, `@deepseek-ai/dsh-client-ui-context-menu` public API, Node `node:test` and jsdom.

## Global Constraints

- Only DSH `0.2.1-rc.5` and `0.2.2-rc.1` have verified workspace-slot signatures.
- Do not add `@deepseek-ai/dsh-client-ui-context-menu` as a hard Client dependency: npm has no rc.5 version.
- Do not navigate/open a Session when opening its action menu; allow DSH permission and archive confirmation handlers to own action execution.
- `docs/superpowers/specs/2026-11-07-fold-native-session-menu-design.md` is the approved design.

---

### Task 1: Native menu handoff regression (RED then GREEN)

**Files:** Modify `test/safe-views.test.js:24-79,1002-1081` and `lib/client.js:504,670-760`.

**Interfaces:** `mount({ contextMenus })` provides an optional test service only through `ctx.get('contextMenus')`; the direct context property throws without `inject`. `WorkspaceView` receives optional `useContextMenu` from the real root props; native target shape is `{ kind: 'session', value: { sessionId, displayTitle } }`.

- [ ] **Step 1: Add failing tests before production code.** With `nativeBuild:'rc1'`, a test context menu whose `open(target,point)` records the call and `active.getSnapshot()` holds the target, render one Activity row and one Favorites row with `useContextMenu: () => ({ getTriggerProps: target => ({ onContextMenu: e => { e.preventDefault(); contextMenus.open(target,{x:e.clientX,y:e.clientY}); }, onKeyDown: e => { if (e.key === 'F10' && e.shiftKey) contextMenus.open(target,{x:0,y:0}); } }) })`. Assert the three-dot button calls native `open` with the clicked row's exact ID and title; click twice toggles via native `close`; right-click and Shift+F10 pass the same target; `openSession` is never called. Assert no Fold-owned `[role=menu]`, `[data-session-pin]`, `[data-session-archive]` or `[role=dialog]` on rc.1; the existing rc.5 tests still require fallback actions.
- [ ] **Step 2: Run `node --test --test-name-pattern='native session menu' test/safe-views.test.js`.** Expected: FAIL because no native `open` is called / duplicate action controls still render.
- [ ] **Step 3: Implement one conditional native branch.** In `SessionRow`, obtain an active optional service with `const contextMenus = ctx.get?.('contextMenus')`; direct `ctx.contextMenus` access requires an unavailable rc.5 hard injection. When its `open`, `close`, `active.getSnapshot`, and root `useContextMenu` are available, create the immutable session target and spread `getTriggerProps(target)` onto the row only (events from the button bubble through that one binding). Button `onClick` calls `contextMenus.open(target,{x:button.getBoundingClientRect().left,y:button.getBoundingClientRect().bottom})`; when `active.getSnapshot()` points to this session it calls `close()` instead. Reuse `IconEllipsisOutlineRegular`, keep the button as a sibling of the main action, and render no local menu/Pin/Archive controls or modal in that branch. Otherwise preserve the full rc.5 path.
- [ ] **Step 4: Run the focused test; expected PASS.** Also run `npm test` (109 prior plus new tests, zero failures) and `node --check lib/client.js`.

### Task 2: Documentation and delivery verification

**Files:** Modify `README.md:67-70` and optional native-only layout CSS in `lib/client.js`; test native layout in `test/safe-views.test.js`.

- [ ] **Step 1: Add a failing native-layout test** that checks the native action strip contains only one 24px ellipsis trigger and the session title reserves at most that one control. Run `node --test --test-name-pattern='native session menu' test/safe-views.test.js`; expected FAIL on the old 82px reserve.
- [ ] **Step 2: Make the smallest native-only CSS change** (keep rc.5 three-control geometry intact) and update README to distinguish native rc.1 from legacy rc.5. Run focused tests; expected PASS.
- [ ] **Step 3: Run `npm test`, `node --check lib/client.js`, and `git diff --check`; review the final diff and public API notes.** Confirm upstream main remains untouched until integration, no local credential paths or user session data are committed.
- [ ] **Step 4: Commit tested changes with public noreply identity and integrate the isolated branch into the original repository `main` only after verification.** Keep installed GUI, published release, and GitHub market status distinct; do not claim authenticated click-through without performing it.
