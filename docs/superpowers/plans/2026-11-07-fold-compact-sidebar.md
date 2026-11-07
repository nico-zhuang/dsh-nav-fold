# Fold Compact Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soften the dark-mode selected workspace Tab and reclaim vertical list space between collapsed panel navigation and workspace tabs, without modifying host-owned new-session/footer actions.

**Architecture:** Keep Fold's existing injected CSS and selectors in `lib/client.js`. Build the indicator from existing host hover/primary-text theme tokens so it lightens dark selection and darkens light selection; trim the two redundant margins while preserving the 36px panel rows and 24px arrow hit target. Release as new `dsh-nav-fold` patch version only after regression and review.

**Tech Stack:** Cordis Client plugin, CSS variables/color-mix, Node node:test, jsdom.

## Global Constraints

- Verified Host versions: DSH 0.2.1-rc.5 and 0.2.2-rc.1; do not add rc.1-only hard dependencies.
- Do not move or replace host `newSession` button or footer actions; research only. Never reparent or hide third-party React nodes.
- Keep 36px panel-row and 24px divider hit target, tab keyboard focus/reduced-motion, wrapped icons and normal expanded navigation.
- Respect existing slot conflict/quarantine logic and preserve `v0.4.10` Release; use a distinct patch version for any published artifact.
- Public release and live installation do not establish authenticated GUI click-through; explicitly report verification limits.

---

### Task 1: Theme-aware shallow Tab and compact Fold navigation

**Files:** Modify `lib/client.js:48-107`, `test/client.test.js:375-401`, `test/safe-views.test.js:916-944`.

**Interfaces:** Existing CSS string `const css` is injected by plugin apply; `data-sidebar-nav-collapsed="true"` marks only Fold-controlled folded panel nav and `[data-dsh-workspace-tabs-row]` marks Fold-owned tabs row. Host panelList in both verified versions has `margin-bottom:8px`, row `min-height:36px`, gap 2px; Fold's arrow reserves 24px and tabs currently add `margin-top:6px`.

- [ ] **Step 1: Add failing focused tests.** Assert Fold's collapsed-nav CSS overrides host `margin-bottom:8px` to zero while still using `grid-template-columns: repeat(auto-fit,36px)`; assert own Tab row `margin: 0 0 8px` and no horizontal padding; confirm arrow remains 24px and panel buttons 36px. Assert Tab indicator uses `color-mix(in srgb, var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10)) 85%, var(--dsw-alias-label-primary, currentColor) 15%)` (or an equivalent verified theme-adaptive neutral mix), does not use `--dsw-specific-sidebar-fill` or black as selected fill, and drops the old shadow. In a mounted view, check aria-pressed, three glyphs, unmount/disable cleanup and native tree remains intact; reuse existing fixtures rather than fake browser support for color-mix.
- [ ] **Step 2: Run focused RED** `node --test --test-name-pattern='compact Fold|quiet selected' test/client.test.js test/safe-views.test.js`; confirm expected failure on old 8px+6px margins and sidebar-fill dark block.
- [ ] **Step 3: Implement minimal CSS only.** Add `margin-bottom:0` within marked collapsed `nav[class*="panelList"][data-sidebar-nav-collapsed="true"]`; change `[data-dsh-workspace-tabs-row]` margin from `6px 0 8px` to `0 0 8px`; replace indicator background and box-shadow with theme-aware mix/no shadow. No host newSession/footer selectors, no JavaScript sizing or new observer.
- [ ] **Step 4: Run focused GREEN, then `npm test`, `node --check lib/client.js`, and `git diff --check`.** Verify the tests check both versions' shared CSS contract, icon wrap, keyboard and reduced motion. Commit only code and tests with public noreply identity.

### Task 2: Patch metadata and user-facing boundaries

**Files:** Modify `package.json:3`, `package-lock.json:3,9`, `README.md:1-30,38,57,99-103`, `test/client.test.js:12-16`, `test/host-config.test.js:31-46`.

**Interfaces:** Current version `0.4.10` is already published and remains immutable. README documents both tested DSH releases and separates native rc.1 menu from rc.5 fallback.

- [ ] **Step 1: Add version RED** asserting `0.4.11` for manifest/root lock and README download/rollback `v0.4.10` rather than `v0.4.9`; run `node --test test/client.test.js test/host-config.test.js` and observe failing version assertions.
- [ ] **Step 2: Bump only root manifest/lock versions to `0.4.11`; update README installation and rollback URLs, identify subtler Tab selected fill and tighter folded-nav spacing without promising exact pixels of real GUI or changes to newSession/footer.** Keep the existing rc.1/rc.5 behavior explanations and credit.
- [ ] **Step 3: Run `npm test`, `node --check lib/client.js`, `git diff --check`, `npm pack --dry-run --json`; commit only scoped files with public noreply identity.**

### Lead-only final verification and delivery

- [ ] Re-run full test suite and inspect whole diff; independent read-only branch review for theme, layout, version and no third-party DOM control.
- [ ] Run mechanical Impeccable detector once on changed UI file. Inspect actual installed result and light/dark rendering if an authenticated browser path is available; distinguish test fixture from live GUI if not.
- [ ] Confirm original main and remote main ancestry/cleanliness; fast-forward reviewed commits, rerun tests in original repo, create `0.4.11` tarball and verify tarball content, install via plugin_manager and check applied state/live slots. Tag/push/publish distinct release only after tested; download release asset and compare bytes; keep `v0.4.10` available. Do not silently update the unrelated upstream market PR unless its status and scope are confirmed.
- [ ] Summarize researched host newSession placement, footer action schema, risks and opt-in compact-entry path without implementing either.
