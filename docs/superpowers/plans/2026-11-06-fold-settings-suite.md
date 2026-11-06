# Fold Settings Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dsh-nav-fold's three independent settings read as a coherent sidebar-optimization suite, then release one immutable v0.4.8 package from the original repository.

**Architecture:** Retain the single keyed `plugins.bundle.config` React occupant and existing independent Host form fields. Group existing controls semantically without changing persistence, the special workspace retry authorization, or the shortcut registration lifecycle. Add only scoped theme-token CSS, concise onboarding, upstream credit, and release copy.

**Tech Stack:** DSH 0.2.1-rc.5 Cordis, React 18, jsdom/Node test, npm pack, GitHub CLI Release.

## Global Constraints

- Work in the existing linked worktree. Do not create or push a deliverable feature branch; publish verified HEAD by normal fast-forward to the same repo's `main`.
- v0.4.7 is already public and immutable. New manifest, lockfile, package archive and tag must be `0.4.8`; keep v0.4.7 rollback available.
- Navigation remains conditional on saved workspace views; no default shortcut. Brand hiding remains independent/macOS-only with `stoner-byte/dsh-hide-brand` MIT credit.
- No real GUI screenshot or hardware acceptance claim: the attached browser lacks authentication. User has already approved implementation without an extra review question.

---

### Task 1: Group settings and explain entry/navigation in place

**Files:** Modify `test/safe-views.test.js:370-503`, `lib/client.js:47-160,493-567`. Read existing files before editing.

**Interfaces:** Consume `form.getSnapshot()/subscribe()/set()`. Preserve `explicitRetryApproved` workspace Save semantics, `data-dsh-nav-fold-navigation-enabled`, `data-dsh-nav-fold-navigation-save`, `data-dsh-nav-fold-brand-enabled`, `data-dsh-nav-fold-brand-save`; add group/option data attributes for scoped CSS.

- [ ] **Step 1: Write a failing React settings test.** Mount the existing `app.settingsPages.get('dsh-nav-fold')` via the `safe-views.test.js` mount/act pattern; assert `host.querySelector('[data-dsh-nav-fold-group="navigation"]')` contains two options ordered `views`, `session-navigation`, and `host.querySelector('[data-dsh-nav-fold-group="space"]')` contains only `brand`. Check three independent Save buttons, not a master toggle. Assert the nav row contains `DSH 设置`, `快捷键`, `无线麦`, `↑↓`, `←→`, `Enter`, `Esc`, and the brand row contains `stoner-byte`, `dsh-hide-brand`, `MIT` and its linked HTTPS upstream href. Existing failed-save/draft/quarantine tests stay intact.
- [ ] **Step 2: Run RED.** `node --test --test-name-pattern='settings groups' test/safe-views.test.js`; expected absent group fails, not a test fixture exception.
- [ ] **Step 3: Implement minimal DOM grouping.** Inside `WorkspaceSettings`, keep current hooks and handlers; change only the returned React tree. Use two `<div data-dsh-nav-fold-group="navigation|space">` with `<h3>` and semantic rows `<div data-dsh-nav-fold-option="views|session-navigation|brand">`. Each row contains its own `<label>` wrapping the current checkbox, short `<p>` utility text, and unchanged Save handler/button; one optional ordered `<ol>` inside the nav row with the approved three binding steps. Move the prerequisite role=status beside navigation. Use an `<a href="https://github.com/stoner-byte/dsh-hide-brand" target="_blank" rel="noopener noreferrer">stoner-byte 的 dsh-hide-brand</a>` in the brand row. No new state or combined save.
- [ ] **Step 4: Add scoped CSS and verify behavior.** Append only `[data-dsh-nav-fold-settings]` scoped selectors to the existing `css` template string: block groups, row grid with name/help plus aligned Save button, subtle `var(--dsw-alias-border-l1)` separators, `var(--dsw-alias-label-secondary)` help, native checkbox with `accent-color: var(--dsw-alias-brand-primary)`, clear `:focus-visible`, narrow-width single-column button. Retain Theme tokens and avoid fixed light/dark colors. Run `node --test test/safe-views.test.js test/client.test.js` and `git diff --check`; if generic tests select wrong elements, target the existing first workspace control without changing assertions' meaning.
- [ ] **Step 5: Commit tested UI changes** with a scoped message, after the test suite passes.

### Task 2: Describe suite and publish an immutable v0.4.8

**Files:** Modify `README.md:1-90`, `package.json:1-23`, `package-lock.json:1-10`, `test/client.test.js:12-16`, `test/host-config.test.js:31-45`. Create only ignored `artifacts/dsh-nav-fold-0.4.8.tgz`; do not overwrite previous packages.

**Interfaces:** Keep `name: dsh-nav-fold`, existing bundle exports, package file list and Host schema. Current published `main` and `v0.4.7` must remain ancestors of the new release.

- [ ] **Step 1: Write RED manifest/copy tests.** Change version assertions to `0.4.8`, assert README starts `# dsh-nav-fold · v0.4.8`, points to `releases/download/v0.4.8/dsh-nav-fold-0.4.8.tgz`, contains `自定义.*快捷键.*焦点` and `无线麦.*小米蓝牙遥控器`, and keeps `stoner-byte.*dsh-hide-brand`; package description names shortcut navigation first and upstream second. Run `node --test test/host-config.test.js test/client.test.js` and observe a manifest-only failure.
- [ ] **Step 2: Make metadata and docs green.** Edit manifest/lock to `0.4.8` (exact two root lock occurrences). Replace README top and current-version section with concise feature-first copy; treat Xiaomi/无线麦 as optional mapping, not direct Bluetooth. Update installation/rollback links (v0.4.8 new; v0.4.7 old); keep truthful GUI/hardware limits and author/MIT notices. `npm test` must pass 104+ tests and `node --check lib/client.js` and `git diff --check` succeed.
- [ ] **Step 3: Freeze and verify.** Commit new docs/metadata. `test ! -e artifacts/dsh-nav-fold-0.4.8.tgz` then `npm pack --pack-destination artifacts --json`; assert exactly README, THIRD_PARTY_NOTICES.md, cordis.patch.yml, lib/client.js, lib/index.js, package.json; hash archive and compare all six archive entries to source bytes. Preserve `artifacts/dsh-nav-fold-0.4.7.tgz` and published v0.4.7 Release.
- [ ] **Step 4: Install and inspect.** `plugin_manager` list then install the local tarball with registry `https://registry.npmjs.org/`; verify `application: applied`, version `0.4.8`, installed source hashes match, Host `Config.listConfigs(entry:'include:nav-fold')` and Client `Slots.listSubTree(root:'plugins.bundle.config')`. Report GUI and physical remote verification limits without substitutes.
- [ ] **Step 5: Publish safely.** Fetch main, merge only new remote history if needed, rerun full tests and archive-byte comparison, fast-forward push HEAD to `main` without force, fast-forward clean original main worktree, create a distinct annotated `v0.4.8` tag, then `gh release create v0.4.8 artifacts/dsh-nav-fold-0.4.8.tgz --verify-tag --repo nico-zhuang/dsh-nav-fold --notes-file /tmp/dsh-nav-fold-v0.4.8-release-notes.md`. GitHub Release title/body feature-first, link upstream credit, retain v0.4.7 rollback. Verify Release is public non-prerelease and remote asset SHA-256 matches a newly downloaded copy. Do not reuse or edit the existing v0.4.7 tag/asset.

## Self-review

The plan covers grouping, compact independent controls, guided entry/mapping/operation, upstream credit, immutable version, main/release/rollback and honest verification. No plugin API/state migrations or future modules are introduced. The user has already requested direct publication, so execution proceeds without another choice prompt.
