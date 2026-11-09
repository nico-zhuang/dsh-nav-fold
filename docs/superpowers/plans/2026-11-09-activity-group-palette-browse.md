# Activity Groups, Cool Palette and Browse Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a separate preview.4 with the approved 03 top group, vivid-light cool palette and stable green-unread browsing, keeping preview.3 intact.

**Architecture:** Preserve the Host v1 `activityPreferences` IDs as opaque rollback-compatible slots. Add an in-memory browse hold to the existing pure Activity selector, wired to user-initiated opens and reset by a tab epoch; render top rows in a labeled group. Derive marker appearance from Host-computed foreground theme rather than only OS preference.

**Tech Stack:** DSH Cordis client ESM, React 18, CSS template string, node:test/jsdom, anonymous agent-browser Chrome.

## Global Constraints

- Scope is only dsh-nav-fold Activity; never silence notifications or approvals, change native Pin/Favorites, or alter Host profile persistence format.
- Keep six 32px menu swatches in order none/cyan/cobalt, indigo/lilac/slate; stored aliases remain green/blue/violet/rose/amber for preview.3 rollback.
- Distinct dark/light HEX values and Quiet opacity .85 are recorded in `docs/superpowers/specs/2026-11-09-activity-group-color-browse-design.md`.
- Keep main clean; do not overwrite installed preview.3, publish, or kill/restart the current GUI.

---

### Task 1: Approved top group

**Files:** Modify `test/safe-views.test.js`, `lib/client.js`.

**Interfaces:** Existing `selectWorkspaceViews(...).activity` gives top rows first; `SessionRow` keeps unchanged action and ARIA APIs. Render `data-activity-top-group` with a heading before consecutive top rows and optional separator before non-top rows.

- [ ] **Step 1: Write failing React test** with Host Activity preferences `{version:1,sessions:{a:{top:true},b:{top:true,quiet:true}}}` and three visible rows. Assert the group heading `顶部固定`, grouped row IDs `a,b`, `b` retains Quiet icon, third row stays outside; no group if no top rows; Favorites has no group.
- [ ] **Step 2: RED** `node --test --test-name-pattern='Activity top group' test/safe-views.test.js` must fail on absent group.
- [ ] **Step 3: GREEN** partition `rows.filter(row=>row.top)` in `WorkspaceView` and reuse its existing row mapper for group/ordinary rows. Add compact h3 heading and optional dividing border in its CSS string. Keep both as sibling nodes of keyed rows (not a wrapper around rows), so profile/Pin changes do not remount a Host menu anchor; the rows retain their per-row Activity top ARIA name. No Quiet manager.
- [ ] **Step 4: Verify** same targeted test and `npm test`, then commit only this task.

### Task 2: Five high-saturation cool markers and Host theme

**Files:** Modify `test/safe-views.test.js`, `test/client.test.js`, `lib/client.js`.

**Interfaces:** Keep v1 storage `row.color` as existing slot ID; `activityColors` maps old IDs to `{dark, light, zh, en}` with keys green→cyan, blue→cobalt, violet→indigo, rose→lilac, amber→slate. `getComputedStyle` of Host's primary row text determines the effective theme; mutation/media listeners re-evaluate after theme changes, and CSS variables color both stripe and menu dots.

- [ ] **Step 1: Add RED tests**: menu visible/ARIA order `无色/青蓝/钴蓝/靛蓝/雾紫/银灰`; saved old `green` renders 青蓝 without rewriting version1; test light Host foreground causes LIGHT `#075E82/#0754BD/#532BBB/#7F26A5/#49586C` and dark Host foreground causes DARK `#72CADA/#80AFFF/#B09AFF/#CF9CEB/#B2BAC8`; Quiet stripe opacity .85; no red/yellow/green manual names. Keep rollback read/write of green/rose intact.
- [ ] **Step 2: RED** `node --test --test-name-pattern='Activity cool palette' test/safe-views.test.js` must fail on old names/theme absence.
- [ ] **Step 3: GREEN** refactor old color constants into slot metadata; use actual Host primary foreground luminance before OS fallback, watch theme DOM attribute and OS color-scheme changes, set a theme marker on Activity wrapper and menu dot variables. Update only Activity stripe/Quiet opacity and swatches; preserve serialized IDs.
- [ ] **Step 4: Verify** targeted test, browser synthetic deep/light/Quiet contrast >=3:1 against the spec backgrounds, `npm test`, then commit.

### Task 3: Stable unread browsing without false Host state

**Files:** Modify `test/client.test.js`, `test/safe-views.test.js`, `lib/client.js`.

**Interfaces:** Add optional seventh argument `hold` to `selectWorkspaceViews(list,statuses,workspaces,unread,limit,preferences,hold)`; `hold` carries clicked unread ID Set and initial ordered ID array. A held ID has effective unread *sort* rank only while real `kind==='recent'`, bypasses recent cap, but its actual kind remains recent. The Activity component owns hold in React memory and resets it when leaving Activity using a tab generation counter.

- [ ] **Step 1: RED pure-model test** with A/B/C completionUnread and >20 recent rows: click hold A then B and clear each Host unread flag; expect A,B,C still visible in original order, real kinds recent/recent/unread. With `hold=null`, expect normal C-first ordering and original recent cap. A new approval/running row outranks held rows; explicit top remains first.
- [ ] **Step 2: RED React test** click A/B Activity rows, update status snapshots and re-render, then switch to Favorites and back; assert same-session positions remain stable but reentry reorders/drops out-of-cap rows. Switching Host modes must not write `activityPreferences` merely to hold a row.
- [ ] **Step 3: GREEN** track user Activity opens in `SessionRow` callback, feed transient hold into the selector, clear on selected-tab generation change, expire it after waiting/running transition, preserve row focus and current highlight. No timer and no falsified status dot.
- [ ] **Step 4: Verify** targeted RED tests turn GREEN, then `npm test` and commit.

### Task 4: Release validation and rollback-safe preview

**Files:** Modify `package.json`, `README.md`, `test/client.test.js`; produce ignored `artifacts/dsh-nav-fold-0.4.13-preview.4.tgz` and a separate private backup of installed .3 plus desktop manifest/lock.

- [ ] **Step 1: RED metadata test** change expected version/readme to preview.4 while manifests still say preview.3; verify failure.
- [ ] **Step 2: GREEN** bump only feature-branch package/readme version and describe grouping/cool dual-theme/browse hold and notification boundary. Run `npm test`, `node --check lib/client.js`, `git diff --check`, Chrome 220/320 dark/light visual + keyboard/axe checks. Run Impeccable detector once after UI editing.
- [ ] **Step 3: Stage safe package** tarball preview.4 under `artifacts/`, hash and compare all packaged files with source. Back up exact installed preview.3 archive and desktop package.json/pnpm-lock.yaml into a separate 0700 backup; verify before any install. Use `dsh plugin --profile desktop add <absolute preview.4 tgz> --offline --ignore-scripts` only after safe checks. Audit direct dependencies/lockfile and installed files; if CLI or sandbox blocks an operation, stop and report, never bypass. Do not restart/kill the GUI or claim authenticated verification.
- [ ] **Step 4: Commit** branch changes only, confirm main clean, installed preview.4 or report that installation did not happen; give user normal restart and rollback path.
