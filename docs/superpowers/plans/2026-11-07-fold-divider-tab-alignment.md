# Fold Divider and Tab Width Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Fold's collapsed divider optically between icon row and Tabs and make the Tab track match native New Session width in DSH rc.1 and rc.5.

**Architecture:** Keep the existing 24px toggle button and 36px icons unchanged, offset only its visual flex children in collapsed mode by -4px; keep expanded mode untouched. Add a theme-independent inline margin to the Fold-owned Tab row based on the native sidebar paint inset (rc.1=3px, rc.5 fallback=1px), yielding respective margins 4px/2px. No DOM movement, observer, or host selector override.

**Tech Stack:** Cordis Client plugin CSS, Node test runner, jsdom, native DSH 0.2.1-rc.5 and 0.2.2-rc.1 sidebar CSS fixtures.

## Global Constraints

- Do not alter new-session button, host stylesheet, navigation icon/Tab click ranges, selected Tab colors, animation duration, saved settings, third-party footer entries, or workspace slot safety.
- Collapsed toggle remains a 24px focusable target, icon rows 36px; 14px arrow with -4px offset remains inside its target. Narrow multi-row icons must never be overlapped by the target.
- rc.1 native newSession margin is paint-inset 3px +1px =4px; rc.5 is 2px and lacks paint-inset variable. Fold bar is a root child as is native New Session.
- v0.4.11 remains public rollback; release only a new v0.4.12 after tests/review/install. User-provided dark screenshot is a v0.4.11 visual baseline, not proof of new-version GUI validation.

---

### Task 1: Collapsed divider optics and native-width Tab track

**Files:** Modify `lib/client.js:59-77,92`; test `test/client.test.js:375-417`, `test/safe-views.test.js:916-946`.

**Interfaces:** CSS selectors `nav[class*="panelList"][data-sidebar-nav-collapsed="true"]`, `[data-sidebar-nav-toggle]::before/::after`, `[data-sidebar-toggle-center]` and `[data-dsh-workspace-tabs-row]` are Fold-owned. The toggle is an absolute button at `bottom:0; height:24px`; an arrow SVG is 14px high.

- [ ] **Step 1: Write failing tests** in the existing source/DOM style. In `test/client.test.js`, assert that the collapsed-only toggle's `::before`, `::after`, and inner `[data-sidebar-toggle-center]` all receive `transform: translateY(-4px)` while button `bottom:0`, `height:24px` and `padding-bottom:24px` persist; mount the nav, click toggle to confirm aria-expanded switches but no `.collapsed=false` optical offset selector exists. In `test/safe-views.test.js`, change the Tab row assertion to `margin: 0 calc(var(--dsh-sidebar-paint-inset, 1px) + 1px) 8px;`, explain from inspected native CSS why this evaluates to 4px in rc.1 and 2px in rc.5 (jsdom does not resolve `calc(var(...))` layout); preserve existing three Tab aria-pressed/disposal tests. Include a comment that screenshot pixels are 2× CSS pixels, so -4px CSS moves its visible mark about 8 screenshot pixels.
- [ ] **Step 2: Run focused RED** with `node --test --test-name-pattern='divider optics|native New Session width' test/client.test.js test/safe-views.test.js` and verify the expected missing offset/old margin fail (not fixture errors).
- [ ] **Step 3: Write minimal scoped CSS:**

```css
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > [data-sidebar-nav-toggle]::before,
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > [data-sidebar-nav-toggle]::after,
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] [data-sidebar-toggle-center] { transform: translateY(-4px); }
[data-dsh-workspace-tabs-row] { display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; margin: 0 calc(var(--dsh-sidebar-paint-inset, 1px) + 1px) 8px; min-width: 0; }
```

- [ ] **Step 4: Run GREEN** with the same focused command; then `npm test`, `node --check lib/client.js`, `git diff --check`. Confirm all prior keyboard/drag/reduced-motion, wide and rc5/rc1 fixture tests pass. Commit only code/tests with public noreply author.

### Task 2: Release v0.4.12 with accurate rollback

**Files:** Modify `package.json:3`, `package-lock.json:3,9`, `README.md:1-30`, `test/client.test.js:1-25`, `test/host-config.test.js:31-50`.

**Interfaces:** Existing root version `0.4.11` and README release URL/rollback are the sole patch metadata; no other dependencies change.

- [ ] **Step 1: Write failing version assertion** in `test/host-config.test.js`: `manifest.version === '0.4.12'`, root lock `.version` and `.packages[''].version` both `0.4.12`, README release download URL `v0.4.12/dsh-nav-fold-0.4.12.tgz`, rollback `v0.4.11`. In `test/client.test.js` change the release version string to 0.4.12. Run `node --test test/client.test.js test/host-config.test.js` and see expected 0.4.11 mismatches.
- [ ] **Step 2: Bump only manifest/lock root version and README installation links and explanation**: selected Tab unchanged, 4px collapsed visual offset and rc1/rc5 4px/2px outer Tab insets equal native New Session button, unchanged arrow target and available session height. Maintain disclaimer that real GUI validation is limited.
- [ ] **Step 3: Run `npm test`, `node --check lib/client.js`, `git diff --check`, `npm pack --dry-run --json --ignore-scripts` and commit only scoped metadata/docs/tests with public noreply author.**

### Lead-only verification and delivery

- [ ] Independent task review after each task and complete diff review. Run Impeccable detect on `lib/client.js` after changes and record advisory exceptions.
- [ ] Re-run full suite in original main after fast-forward, inspect tar contents and SHA-256, install distinct v0.4.12 via `plugin_manager`, check application/applied status and live `sidebar.workspaces` Slot/installed manifest; report unavailable automated GUI interaction honestly.
- [ ] Push main and unused v0.4.12 tag, publish immutable GitHub Release asset, redownload and compare bytes. Keep v0.4.11 rollback; do not overwrite existing package/tag.
