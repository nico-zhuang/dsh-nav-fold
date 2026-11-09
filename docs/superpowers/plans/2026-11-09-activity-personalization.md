# Activity Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Activity tab only, add independent top pin, manual color marker, and presentation-only quiet mode.

**Architecture:** Keep `selectWorkspaceViews` as pure projection of Host status. Add a small preferences parser/serializer keyed by session id, then apply a separate Activity-only projection before rendering. Preserve Favorites and the Host native context menu; expose Activity actions through a separate accessible button and menu.

**Tech Stack:** Cordis client module, React, localStorage, node:test, jsdom.

## Global Constraints

- Do not alter native pin/favorites or workspace tree. Do not suppress real notifications or stop work.
- Preferences are browser-local; corrupted values safely ignored and arbitrary CSS colors prohibited.
- Pinned rows precede all unpinned rows and bypass recent limit; quiet rows count as recent unless pinned; archive/subagent/blank filters remain.
- Do not install into desktop or publish until real GUI and independent review have evidence.

---

### Task 1: Pure Activity Projection

**Files:** Modify `lib/client.js:6-46` (pure selection only); test `test/safe-views.test.js` or `test/client.test.js` near existing `selectWorkspaceViews` tests.

**Interfaces:** `selectWorkspaceViews(list, statuses, workspaces, unread, limit, activityPreferences = {}) -> {activity, favorites}`. Each preference record is `{top?:boolean, quiet?:boolean, color?:string}`.

- [ ] Add tests that assert a stale `recent` item beyond limit appears if `top:true`; a running quiet item sorts as recent and is limit-bound; `top:true,quiet:true` remains at top; no change to Favorites or real row `kind`; archived and subagent rows remain excluded.
- [ ] Run `node --test test/client.test.js` to observe expected assertion failures.
- [ ] Implement minimal projection while retaining base rows and the original non-Activity Favorites calculation.
- [ ] Rerun focused tests and `npm test`; commit test and projection together.

### Task 2: Preferences Storage and UI Actions

**Files:** Modify `lib/client.js` preference helpers and `WorkspaceView` / `SessionRow` / scoped CSS; add focused React integration tests in `test/safe-views.test.js`.

**Interfaces:** Storage key `dsh-nav-fold:activity-preferences`; parser validates only known fields and finite allowlisted colors; update a single session preference without touching `uiWorkspace` APIs.

- [ ] First test round-trip through Activity action buttons, reload restoration, filtering on corrupted JSON, native context-menu coexistence, Favorites without Activity controls, quiet overflow recovery via management, and no `uiWorkspace.pinSession/unpinSession` calls; verify RED.
- [ ] Implement independent accessible Activity organize menu with three actions, using a constrained color palette with named alternatives and clear color. Keep native ellipsis and right-click untouched.
- [ ] Keep React state and localStorage best-effort, ignore invalid or malicious preference data, preserve existing `aria-label` status text for real statuses outside quiet Activity.
- [ ] Rerun focused tests and full suite; commit.

### Task 3: Visual and regression verification

**Files:** Only scoped UI CSS in `lib/client.js` and test assertions; design doc if constraints change.

- [ ] Review the rendered row in an isolated mock Host with Activity/Favorites and native menu, including narrow sidebar and keyboard, if automated GUI available. Never claim tests in user desktop if not run.
- [ ] Run `npm test`, `node --check lib/client.js`, `git diff --check`, Impeccable detector once after UI edits, inspect `git diff main...HEAD` and independent review.
- [ ] Deliver unmerged/unpublished branch and report exact test/GUI evidence.
