# Activity Marker, Quiet and Durable Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver user-approved A left stripe, click-selected-color-to-clear, inline dimmed Quiet with moon, and Host-backed cross-port Activity preferences in a separately packaged local trial.

**Architecture:** Keep the current `lib/client.js` slot/React rendering and `selectWorkspaceViews` projection. Replace only the Activity preferences storage boundary with the existing `ctx.configForms.get('nav-fold')` Host-backed form, declaring one volatile string field in `lib/index.js`. A default empty string is an uninitialized migration sentinel; all persisted values, including cleared preferences, are versioned nonempty JSON. Rendering/subscription and writes must be bounded and safe when Host is not writable.

**Tech Stack:** Node ESM, React 18 slot client, Cordis/Schemastery plugin Config, node:test + jsdom, Chrome anonymous layout preview, desktop profile `dsh plugin --offline --ignore-scripts`.

## Global Constraints

- Only Activity is customized; no folder features, native pin/Favorites changes, real status/approval/notification suppression or Host right-click interception.
- Color marker A: 3px vertical stripe, 4px inset top and bottom, fixed color palette; same color selected again clears.
- Quiet: row stays in actual kind sorting and original recent cap, dims but remains actionable; moon replaces Activity status dot; delete top management.
- Host Config `activityPreferences` is `.volatile()` and defaults to `''`; serialized string max 200KB, 1000 session entries, no title/path/transcript. Current-origin browser key only migrates once while Host value is `''` and is kept for rollback. Host nonempty JSON, even empty sessions, always wins.
- If form is loading/not writable/set rejects, visibly report not saved and do not claim persistence. Existing v0.4.13-preview.2 remains installed until all checks and backup succeed.
- No auth/DOM claims about the private live GUI; anonymous browser fixture is labeled as such. Never force-stop current DSH or publish/merge main.

---

### Task 1: Inline Activity Row Semantics

**Files:** `lib/client.js:63-71,149-175,732-746,780-792,833-870`; `test/safe-views.test.js:900-1100,1170-1265`.

**Interfaces:** Input `selectWorkspaceViews(list,statuses,workspaces,unread,limit,preferences)` unchanged; `SessionRow` receives `row.quiet` and `row.color`; `activityAction({color})` keeps existing onActivityChange callback for now.

- [ ] **Step 1: RED model and UI tests.** Add in `test/safe-views.test.js` a kind-preserving `running` Quiet case that remains in Activity even if `limit=0`; a native Activity row test that asserts `.dsh-nav-fold-session-quiet` and `[data-activity-quiet-icon]`, absence of `[data-activity-quiet-manage]`, and left color marker. Assert the organizer contains exactly two textual actions (top/Quiet) with icon, and a labeled 2×3 swatch group ordered none/blue/green then amber/rose/violet: each 32px hit target has accessible name/title, selection state and keyboard support, the no-color swatch is clickable and uses slashed SVG; click blue twice and assert no color mark. Favorites must have neither organizer nor indicator. Assert CSS contracts `left: 3px`, `top: 4px`, `bottom: 4px`, `width: 3px`, and existing 24px strip actions.
- [ ] **Step 2: Run `node --test test/safe-views.test.js`.** Expected RED because current code demotes Quiet to recent, renders top manager and 18px marker, and repeated color stays selected. Record actual failing names.
- [ ] **Step 3: Immediately before UI edits read Impeccable craft floor, then make minimal code changes.** In model sort use `rank[a.kind]-rank[b.kind]`; in filter remove `!row.quiet` condition; remove quiet manager block and states; change stripe CSS to `position:absolute;left:3px;top:4px;bottom:4px;width:3px;border-radius:2px`; replace the six vertical text `MenuItemButton` colors with a 2×3 swatch group (32px labeled/focusable grid buttons, slashed SVG for no color), with `onClick` setting `color: color && row.color === color ? '' : color`; add Pin/Moon SVG to top/Quiet `MenuItemButton`; add Quiet row class and grey styling only to Activity title/subtitle/background, leaving the action strip clickable. Insert decorative 14px moon SVG after subtitle text when `row.quiet`, mark `data-activity-quiet-icon`; main button's existing aria-label already speaks Quiet. Do not use crossed bell or pause icon.
- [ ] **Step 4: Run `node --test test/safe-views.test.js && node --check lib/client.js && git diff --check`.** Expected GREEN all safe-views tests; review right-click, native ellipsis, Favorites isolation.
- [ ] **Step 5: Commit `git add lib/client.js test/safe-views.test.js && git commit -m 'feat: refine Activity marker and Quiet in row'`.**

### Task 2: Profile-Backed Activity Preferences

**Files:** `lib/index.js:3-8`; `lib/client.js:6-24,512-543,833-870`; `test/safe-views.test.js:24-39,1000-1200`; `test/host-config.test.js:31-47`.

**Interfaces:** `Config.activityPreferences: Schema.string().default('').volatile()`; `parseActivityPreferences(raw): normalized session map`; `form.getSnapshot().value.activityPreferences` is authoritative when nonempty; `await form.set('activityPreferences', JSON.stringify({version:1,sessions:next}))` returns success boolean. Existing form is `ctx.configForms.get('nav-fold')`.

- [ ] **Step 1: RED Host tests.** Extend the `mount()` form mock to accept `activityPreferences` and an initial shared Host snapshot; test saving a blue marker and remounting with a fresh `JSDOM` origin and the shared saved form value to recover it, while the new origin has empty localStorage. Test migration from current-origin localStorage only if Host string `''`, preserving old key; test that persisted `{"version":1,"sessions":{}}` prevents old cache re-import. Simulate `form.set` returning `false`, expect alert and rollback; rapid sequential changes preserve the latest map without stale overwrites. Add `test/host-config.test.js` assertion for `.volatile()` field default empty.
- [ ] **Step 2: Run `node --test test/safe-views.test.js test/host-config.test.js`.** Expected RED on Host-origin recovery/migration/schema.
- [ ] **Step 3: Add the Config field** to the current schema in `lib/index.js`; use the existing form instance and `useSyncExternalStore(form.subscribe,form.getSnapshot)` in WorkspaceView rather than a browser-local source of truth. On Host empty, stage and perform at most one bounded current-origin migration; on Host nonempty JSON, use that value. Serialize interaction writes through a local promise queue or a global busy gate, with no stale closures, and await `form.set`; on failure restore latest confirmed form snapshot and show `role="alert"`. Keep localStorage legacy key untouched. Only emit writes on user actions or the single migration; do not write while form is loading/not writable.
- [ ] **Step 4: Run `node --test test/safe-views.test.js test/host-config.test.js && node --check lib/client.js && npm test && git diff --check`.** Expected GREEN; inspect no call to `localStorage.setItem(activityKey,...)` remains. Confirm current unrelated Config booleans continue to work.
- [ ] **Step 5: Commit `git add lib/index.js lib/client.js test/safe-views.test.js test/host-config.test.js && git commit -m 'fix: persist Activity preferences in Host profile'`.**

### Task 3: Review, Package and Safe Local Trial

**Files:** `package.json`, `package-lock.json`, `README.md`, `test/client.test.js`, `test/host-config.test.js`, `artifacts/dsh-nav-fold-0.4.13-preview.3.tgz` (ignored build output, not committed). Installed desktop profile and backup directory must not be modified until package review passes.

**Interfaces:** New local-only version `0.4.13-preview.3`, distinct from installed `.2`. Same six package members as prior preview; no new runtime dependencies.

- [ ] **Step 1: RED version tests.** Update existing manifest/lock/README test expectations to `0.4.13-preview.3`; run `node --test test/client.test.js test/host-config.test.js` and observe the old `.2` values fail.
- [ ] **Step 2: Change only those three version metadata locations, run full `npm test`, `node --check lib/client.js`, `git diff --check`.** Expected all tests pass. Finish Impeccable layout review and run one final scoped detector after all UI edits. Use anonymous Chrome 220/320px fixtures to measure 45px row height, A stripe, moon, hover/focus/touch affordances and readable title; label screenshots as mockups, not actual live DSH.
- [ ] **Step 3: Independent read-only code review, then commit `git add README.md package.json package-lock.json test/client.test.js test/host-config.test.js && git commit -m 'chore: prepare Activity refinement preview'`.** Confirm only the isolated feature worktree changed; main remains clean.
- [ ] **Step 4: `npm pack --pack-destination artifacts --ignore-scripts --json`, verify exactly six package files equal committed source bytes, preview version and SHA-256.** Backup desktop `package.json`, `pnpm-lock.yaml`, and current `.2` tgz into a new private 0700 directory; byte-check `.2` archive matches installed files.
- [ ] **Step 5: Offline desktop installation** `dsh plugin --profile desktop add artifacts/dsh-nav-fold-0.4.13-preview.3.tgz --offline --ignore-scripts`. Verify installed version/bytes, plugin enabled, only nav-fold dependency/lock changed, all other direct deps still present, and live DSH PID unchanged. Do not grant unrelated plugin runtime exemptions.
- [ ] **Step 6: Give user normal DSH restart/real-GUI test instructions** (same-color clear, left full row stripe, Quiet row visible with moon, no manager, cross-restart persistence) and state GUI auth boundary. Retain rollback directory and artifact paths.
