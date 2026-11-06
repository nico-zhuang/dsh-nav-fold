# Fold Workspace Folder Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ↑↓ traverse visible native workspace folders and sessions; Enter on a folder toggles its native expansion without leaving navigation.

**Architecture:** Extend only the existing transient remote-navigation candidate selector and Enter branch in `lib/client.js`. The native DSH `ProjectRowItem` (`role="treeitem"`, `data-row-key="workspace:<key>"`, `aria-expanded`, own `onClick`) remains the sole owner of expansion and rendering; Fold only focuses and clicks it. Keep the current selected-session initial focus, tab transitions, safety withdrawal, and storage behavior.

**Tech Stack:** JavaScript ES module / DSH Cordis Client bundle, jsdom + Node test runner, npm pack, plugin_manager.

## Global Constraints

- Work only on the clean isolated `feat/fold-remote-navigation` worktree at `/Users/nicozhuang/岁金技术中心/DSH-test/sidebar-nav-fold-v045-archive-preview`; no push, publish, merge, remote-control remapping, or overwrite of the installed `0.4.7-preview.4` archive.
- DSH 0.2.1-rc.5 native workspace folder row is `[role="treeitem"][data-row-key^="workspace:"][aria-expanded]`; its own `click()` toggles expansion. Session row uses `data-row-key^="session:"`; flat list has no folder rows. Do not call private group-expansion APIs or create proxy folder rows.
- Ignore hidden / `aria-hidden` descendants and visually absent nodes; the existing selector's `getComputedStyle()` visibility check remains. A folder Enter keeps navigation active and attempts to preserve focus; session Enter still opens and exits. ←→, Esc, editable controls, dialogs, DS-Bot suspension, structural quarantine, and independent Logo config remain unchanged.

---

### Task 1: Native folder focus and Enter toggle

**Files:** Modify `test/client.test.js:733-765`, `lib/client.js:128-129,716-784`; README remote-navigation paragraph later in Task 2.

**Interfaces:** Consumes existing `visibleRows(): Element[]`, `focusRow(row)`, `remembered: Map`, `onNavigationKey(event)`. Produces the same functions with workspace candidate rows including `[role="treeitem"][data-row-key^="workspace:"][aria-expanded]`; a workspace Enter calls the native row's `click()` but not `stopNavigation()`. No new Service methods or settings.

- [ ] **Step 1: Write a failing test** following `remote navigation registers one unbound shortcut...` in `test/client.test.js`. Use the existing `slotFixture`, `settingsForm(true)`, `shortcutFixture`, `start`, and `flush` helpers. Mount native `workspace:w` folder with `aria-expanded="true"`, nested session `session:first` selected, nested folder `workspace:child` with `aria-expanded="false"`, and `session:second` inside a `[hidden]` wrapper; provide a click listener on each folder that toggles `aria-expanded` and toggles the child wrapper's `hidden`. Assert initial session focus; ArrowUp lands on folder; Enter toggles its `aria-expanded` and keeps the `data-dsh-nav-fold-navigation` marker and folder focus; ArrowDown traverses visible folder/session DOM order and never focuses hidden second session. Repeat Enter to close and test navigation over remaining rows; ensure `opened` is empty until Enter on a session. Test Escape restores previous focus and no folder click creates a new Session. Also assert CSS contains `[data-row-key^="workspace:"]:focus` outline scoped under `data-dsh-nav-fold-navigation`. Add a separate test replacing the focused folder element with another `data-row-key="workspace:w"` and checking `await flush()` restores focus to that folder, plus flat-list existing test remains unchanged.
  Core test assertions, using the surrounding fixture's `region`, `doc`, `key`, `opened`, and `folder` variables:
  ```js
  folder.addEventListener('click', () => folder.setAttribute('aria-expanded', folder.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'));
  shortcut.command.resolve({ region: 'page', modal: null, target: doc.body }).run();
  key('ArrowUp');
  assert.equal(doc.activeElement, folder);
  key('Enter');
  assert.equal(folder.getAttribute('aria-expanded'), 'false');
  assert.ok(doc.querySelector('[data-dsh-nav-fold-navigation]'));
  assert.deepEqual(opened, []);
  ```
- [ ] **Step 2: Run `node --test test/client.test.js`.** Expected RED: folder is skipped or Enter stops navigation; verify the failure is specifically missing folder behavior.
- [ ] **Step 3: Minimal implementation in `lib/client.js`.** Expand workspace `visibleRows` selector to `'[role="treeitem"][data-row-key^="workspace:"][aria-expanded], [role="treeitem"][data-row-key^="session:"]'`; keep all existing visibility filters. In the Enter branch, after the `index < 0` guard and `event.preventDefault()`, add `if (selected === 'workspace' && target.matches('[role="treeitem"][data-row-key^="workspace:"][aria-expanded]')) { target.click(); return; }` before `stopNavigation()`; the remembered workspace row key is already set by `focusRow`, and the existing `onNavigationMutation` refocuses after DOM replacement. Add the matching folder selector as a sibling to the current session `:focus` outline CSS rule. Never call `uiWorkspace.openSession` for a folder.
- [ ] **Step 4: Run `node --test test/client.test.js` and `npm test`.** Expected GREEN with all current baseline tests (99) plus new tests; keep DS-Bot and tab tests passing. Inspect `git diff --check`, then commit only `lib/client.js` and `test/client.test.js` with one-shot Git author/committer identity if local config remains absent.

### Task 2: Documentation, new preview, installation and limits

**Files:** Modify `README.md:74-86`, `package.json:3`, `package-lock.json:3,9`, `test/client.test.js:15`, `test/host-config.test.js:26`. Create ignored `artifacts/dsh-nav-fold-0.4.7-preview.5.tgz`; preserve `0.4.7-preview.4.tgz` byte-for-byte.

**Interfaces:** Package exports, `dsh.client.inject`, Cordis patch `nav-fold`, existing Host Config (`workspaceViewsEnabled`, `hideBrandEnabled`) and the unbound `dsh-nav-fold.session-navigation` id remain unchanged.

- [ ] **Step 1: Update the two manifest version assertions first to `0.4.7-preview.5`, run `node --test test/client.test.js test/host-config.test.js`, and observe the expected old-version RED.** Update only manifest + lock root and `packages[""]` versions to `.5` and rerun GREEN. Adjust README's preview narrative: in the workspace tree ↑↓ includes folder headers, Enter toggles folder and retains navigation; Enter on a Session opens it. State that physical remote/GUI acceptance is still separate, and preview.4 remains rollback.
- [ ] **Step 2: Run `node --check lib/client.js`, `node --check lib/index.js`, `npm test`, `git diff --check`, and Impeccable `detect --json lib/client.js`; review advisory findings.** Pack to the new filename with `npm pack --pack-destination artifacts --json`; assert tarball has `README.md`, `THIRD_PARTY_NOTICES.md`, `cordis.patch.yml`, `lib/client.js`, `lib/index.js`, `package.json`, and verify SHA-256 for both `.5` and rollback `.4`.
- [ ] **Step 3: Install only `.5` via `plugin_manager install_bundle` with `https://registry.npmjs.org/`; require `application: applied` and no unapproved build scripts.** Use `cordis_inspect_list` and the exact Host `Config.listConfigs(entry:'include:nav-fold')` and Client `Slots.listSubTree(root:'sidebar.workspaces')` contracts to confirm new version remains mounted and both settings persist. Compare installed `lib/client.js` checksum to the worktree. Do not claim the user's authenticated GUI or physical remote was exercised if it was not.
- [ ] **Step 4: Fresh `npm test` and clean `git diff --check`; commit manifest, lock, tests and README on the isolated branch.** Record the commit, archive SHA, current installed version, rollback SHA, and any GUI/manual acceptance limit. Do not push or publish.
