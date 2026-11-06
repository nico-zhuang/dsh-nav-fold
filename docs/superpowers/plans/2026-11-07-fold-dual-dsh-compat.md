# Fold Dual-DSH Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore dsh-nav-fold workspace tabs on DSH 0.2.2-rc.1 without losing 0.2.1-rc.5 compatibility or conflict safety; release immutable v0.4.9 from original main.

**Architecture:** Keep all Host config fields and the single `sidebar.workspaces` occupant. Accept one of two exact source-backed native entry shapes in the existing native predicate; do not loosen the peer-only and winner/quarantine checks. Preserve rc.5 fixture and add an independent rc.1 fixture exercising the real Slot contract.

**Tech Stack:** DSH Client plain JavaScript, Schemastery Host Config, Node test/jsdom, GitHub Release `.tgz`.

## Global Constraints

- `0.2.1-rc.5` old `Gb` + `workspace` + menu.item/row.action remains accepted unchanged; `0.2.2-rc.1` new `tk` + `workspace` + exact source children (directoryFlow single/root; row.action list/root; leading/trailing list/root/inline; hover list/root) and absence of menu.item becomes separately accepted.
- Unknown build or corrupted/duplicate native identity still fails closed; peer pause must not persist disabled. Do not change form persistence, hard quarantine replay, third-party nodes, shortcut behavior, UI colors or logo integration.
- Never overwrite v0.4.8. New same-name bundle version is 0.4.9, pushed by fast-forward to original `main`; no preview branch/asset. No claim that all 0.2.1 variants were tested.

---

### Task 1: Add dual known-build native recognition

**Files:** Modify `test/safe-views.test.js:13-48,83-180`; modify `lib/client.js:634-643` only. Test fixtures keep the current rc.5 shape to avoid silently changing existing test coverage.

**Interfaces:** Existing `nativeEntry(entry)` feeds `slotSafe(ours)` and `peerOnlyConflict(ours)`; `mount({ active, peers, nativeBuild })` chooses a native fixture. Return values, Config fields and slot registration order remain unchanged.

- [ ] **Step 1: Write RED tests and fixture.** Add a `nativeBuild='rc5'` mount option; define `nativeRc1(rawScoped)` by copying the rc.5 `options` shape and using `registrant:'tk'`, `locale:'workspace'` plus exactly `directoryFlow:{kind:'single',scope:'root'}`, `session.row.action:{kind:'list',scope:'root'}`, `sidebar.session.row.leading/trailing:{kind:'list',scope:'root',inline:true}`, `sidebar.session.row.hover:{kind:'list',scope:'root'}`. Test saved `active:true,nativeBuild:'rc1'` shows exactly three buttons; clicking Activity/Favorites creates one active Fold occupant, selecting Workspace removes only own occupant, and no `form.set('workspaceViewsEnabled',false)` is issued. Test rc.1 peer suspension/recovery still preserves saved true; a `tk` peer with no valid native children or a malformed rc.1 native child still hard-quarantines. Keep rc.5 tests as-is.
- [ ] **Step 2: Observe RED.** `node --test --test-name-pattern='rc1 native|rc1 peer|rc1 malformed' test/safe-views.test.js`; expected new rc.1 saved-on case fails for missing tab bar; fixture error is not an acceptable red state.
- [ ] **Step 3: Implement the narrow second branch.** Replace current one-line `nativeEntry` with `const nativeEntry = (entry) => entry?.locale === 'workspace' && ((entry.registrant === 'Gb' && entry.children?.['sidebar.workspaces.session.menu.item'] && entry.children?.['sidebar.workspaces.session.row.action']) || (entry.registrant === 'tk' && !entry.children?.['sidebar.workspaces.session.menu.item'] && entry.children?.['sidebar.workspaces.directoryFlow']?.kind === 'single' && entry.children?.['sidebar.workspaces.session.row.action']?.kind === 'list' && entry.children?.['sidebar.session.row.leading']?.inline === true && entry.children?.['sidebar.session.row.trailing']?.inline === true && entry.children?.['sidebar.session.row.hover']?.kind === 'list'));` Strengthen new branch with root/list/single scope checks from rc.1 source (do not require absent scopes on rc.5). Never accept a generic `tk` peer.
- [ ] **Step 4: Verify and commit.** `npm test && node --check lib/client.js && git diff --check`; expected 106 prior + new rc.1 tests pass. Commit `lib/client.js` and `test/safe-views.test.js` before changing release metadata.

### Task 2: Publish v0.4.9 on main

**Files:** Modify `package.json:3,7`, `package-lock.json:3,9`, `README.md:1-35,95-103`, `test/client.test.js:12-16`, `test/host-config.test.js:31-50`. New ignored `artifacts/dsh-nav-fold-0.4.9.tgz` and release notes `/tmp/dsh-nav-fold-v0.4.9-release-notes.md`.

**Interfaces:** Package name `dsh-nav-fold`, all six files, Host Config, shortcut command and third-party notice unchanged.

- [ ] **Step 1: Write RED metadata tests.** Assert `manifest.version === '0.4.9'`, README first heading `v0.4.9`, new download path, and explicit `0.2.1-rc.5` and `0.2.2-rc.1` but no blanket `所有 0.2.1`. Run `node --test test/client.test.js test/host-config.test.js` and see version failure.
- [ ] **Step 2: Update docs and metadata.** Change only top-level and lock root versions to 0.4.9; update README installation and rollback v0.4.8 link; explain two known builds and unknown-build fail-closed. Do not claim tested GUI/device. `npm test` must pass.
- [ ] **Step 3: Pack and inspect.** `npm pack --pack-destination artifacts --json`; ensure exactly README, THIRD_PARTY_NOTICES.md, cordis.patch.yml, lib/client.js, lib/index.js, package.json; `tar -xOf ... package/<file> | cmp - <file>` for all six; save SHA-256. Do not touch prior archived tgz.
- [ ] **Step 4: Install one new-version local archive** via `plugin_manager` with registry `https://registry.npmjs.org/` (list first); check application applied, Client Slots `sidebar.workspaces` live native `tk` and Fold control where inspect can show it, Host Config entry, exact installed package bytes. Browser cannot be asserted visually without authenticated page; be explicit about that limit.
- [ ] **Step 5: Prepublish review and fast-forward.** Run full tests from clean original main after fast-forward, seek independent read-only code review for rc.5/rc.1/peer/unknown paths. `git fetch`, check `origin/main` ancestor, normal push `HEAD:refs/heads/main` (SSH single-command fallback if HTTPS fails). Create and push distinct annotated `v0.4.9`; `gh release create v0.4.9 artifacts/dsh-nav-fold-0.4.9.tgz --verify-tag --repo nico-zhuang/dsh-nav-fold --notes-file /tmp/dsh-nav-fold-v0.4.9-release-notes.md`. Verify public non-prerelease asset by separate download and byte compare, old v0.4.8 remains accessible.

## Self-review

Both known native signatures, peer safety, unknown-build fallback, release and rollback are covered. The only new runtime branch is a structural allowlist, not a generic override. This approved bugfix excludes shortcut-recording and dark-tab redesign until their APIs/design are separately confirmed.
