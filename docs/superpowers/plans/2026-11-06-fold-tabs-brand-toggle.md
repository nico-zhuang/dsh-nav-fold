# Fold Full-Width Tabs and Brand Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the workspace/activity/favorites Tab bar full width without its hide button, and give Fold an independent saved hide-brand switch.

**Architecture:** Keep the existing client module and Host Config; change the Tab row's invariant from two children to one and ignore the legacy localStorage hide key. Add an independently subscribed brand-style effect whose style node exists only while `hideBrandEnabled === true` in a ready form snapshot. Do not bundle the colleague's plugin, which injects unconditional CSS.

**Tech Stack:** Cordis Host Schema + Client configForms; JavaScript, React, jsdom, Node `node --test`.

## Global Constraints

- Preserve native `sidebar.workspaces` ownership, quarantine of real competitors, DS-Bot temporary suspension, and the remote keyboard command `dsh-nav-fold.session-navigation`.
- Brand hide switch defaults to false and works with workspace views disabled; it hides only macOS (`[data-platform="darwin"]`) display-only brand row, leaving non-macOS interactive controls intact; no independent `dsh-hide-brand` installed.
- Work on `feat/fold-remote-navigation`, preserve `0.4.7-preview.2` rollback tarball, and do not push or publish.
- Source rationale: https://github.com/stoner-byte/dsh-hide-brand ; its package.json declares MIT, but its repository has no LICENSE file. Independently implement a scoped CSS rule; do not copy source files.

---

### Task 1: Always-visible, full-width Tab strip

**Files:** Modify `test/safe-views.test.js`, `lib/client.js`.

**Interfaces:** Consumes `mount({ active, folded })` and `document.querySelector('[data-dsh-workspace-tabs]')`; produces one-child `data-dsh-workspace-tabs-row` with three `button[data-view]`.

- [ ] **Step 1: Write failing tests.** Replace the obsolete fold-button expectations in `test/safe-views.test.js` with checks of `row.children.length === 1`, `row.firstElementChild === tabs`, three accessible tab buttons, `tabs.hidden === false` even after `mount({ active:true, folded:true })`, and CSS rule `grid-template-columns: minmax(0, 1fr)` plus `margin: 6px 0 8px` (native root already has 12px padding on each side). Structural damage tests remove `data-dsh-workspace-tabs` instead of the retired button and verify saved view auto-disables. Keep the focused keyboard/tab selection tests.
- [ ] **Step 2: Run `node --test test/safe-views.test.js` and verify failures are missing one-child layout/legacy state.**
- [ ] **Step 3: Remove CSS `::before` spacer, `data-collapsed` and toggle styles; change row to a one-column grid. Remove `collapsed`, localStorage read/write, foldButton DOM construction and cleanup. In `syncSelection`, retain `tabs.style.setProperty('--dsh-view-index', ...)` and `aria-pressed`. In `ensure`, require `bar.children.length === 1` and `bar.firstElementChild === tabs`; append only `tabs` to bar.**
- [ ] **Step 4: Run `node --test test/safe-views.test.js` and `npm test`; fix only expected obsolete assertions and failures.**
- [ ] **Step 5: Commit test and implementation together after green.**

### Task 2: Saved, independent hide-brand switch

**Files:** Modify `lib/index.js`, `lib/client.js`, `test/host-config.test.js`, `test/safe-views.test.js`, `README.md`.

**Interfaces:** Host produces `hideBrandEnabled: Schema.boolean().default(false).volatile()`; Client reads `form.getSnapshot().value?.hideBrandEnabled === true` only if `status === 'ready'` and manages `style[data-plugin-css="dsh-nav-fold/hide-brand"]`; settings UI saves via `form.set('hideBrandEnabled', draftBrand)` independently of `workspaceViewsEnabled`.

- [ ] **Step 1: Write failing tests.** Check Host default false/schema; in the jsdom fixture include `<div class="kB3qhq_logoRow">brand</div>`, assert no style by default, style with scoped selector after `form.set('hideBrandEnabled', true)`, and no style after false, loading, or plugin dispose. Verify style persists when workspace view setting is off or temporarily peer-suspended. Render settings page via `React.act` to check independent checkbox/save and failed save retry; extend fixture `set(field,value)` to preserve both fields.
- [ ] **Step 2: Run `node --test test/host-config.test.js test/safe-views.test.js` and confirm expected failures before editing production.**
- [ ] **Step 3: Add Host Config field; after resolving `form` in Client register `ctx.effect` with `form.subscribe` and an owned `<style>` whose textContent is `[data-platform="darwin"] .kB3qhq_root > [class*="logoRow"] { display: none !important; }`; remove node on false/dispose. In settings page render a separately saved brand checkbox with status/error and leave workspace retry/quarantine flow unchanged.**
- [ ] **Step 4: Run targeted tests and `npm test`; update README with independent switch, colleague source attribution, and caveat not to enable both plugins.**
- [ ] **Step 5: Commit green code, tests and docs.**

### Task 3: Package and verify preview

**Files:** Modify `package.json`, `README.md` only if version/docs need update; create ignored `artifacts/dsh-nav-fold-0.4.7-preview.4.tgz`.

**Interfaces:** Produced tarball preserves the package's existing export paths and Cordis patch id; installed preview is `0.4.7-preview.4`.

- [ ] **Step 1: Run `node --check lib/client.js`, `node --check lib/index.js`, `npm test`, `git diff --check`, and Impeccable detector on `lib/client.js`.**
- [ ] **Step 2: Bump only the local preview version to `0.4.7-preview.4`; `npm pack --pack-destination artifacts` and inspect package listing and checksum.**
- [ ] **Step 3: Install via `plugin_manager install_bundle` using the verified package/archive and explicit registry if needed; require `application: applied`, then check live Host Config schema and Client slot through `cordis_inspect_query`.**
- [ ] **Step 4: Inspect available authenticated GUI without switching other windows; if unavailable, state GUI/remote acceptance limitation and invite user to check in their active window. Preserve all rollback archives and branch.**
- [ ] **Step 5: Re-run `npm test`, `git status`, verify installed package version, commit source/version changes (not ignored tarball), and report exact verification evidence.**
