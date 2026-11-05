# Fold Remote Navigation Implementation Plan

> **For agentic workers:** Implement test-first, one behavior at a time, with the existing 89-test baseline preserved.

**Goal:** Use one configurable DSH shortcut to enter Fold's session navigator: Up/Down focus visible sessions, Left/Right switch the existing three views, Enter opens, Escape exits.

**Architecture:** Extend the existing `sidebar.workspaces` injection and `syncSelection()` state, not a second owner of the singleton slot. Register one unbound-by-default command in DSH's shortcut registry; handle bare arrows only while navigation is active and focus remains in Fold's sidebar. Real focus rests on a native or Fold session element; live selection remains separate from candidate focus.

**Tech Stack:** Plain-JS Cordis Client, DSH shortcut registry, React 18, node:test, jsdom. Current base: dsh-nav-fold v0.4.6, DSH 0.2.1-rc.5.

## Global Constraints

- Never mutate the shipped native workspace tree, session data, RemoteMic mappings, or another plugin's slot entry.
- No global default binding; user assigns the entrance command in DSH's native Shortcut settings, which checks registered conflicts.
- Fail closed on DS-Bot slot competition; preserve existing suspension and quarantine semantics; no persistent config change on a mere navigation interruption.
- No new sidebar replacement, design overhaul, or GitHub release in this task.

---

### Task 1: Keyboard behavior regression tests

**Files:** Modify `test/client.test.js`; test current fixture registration, native and custom rows, modal/editable boundaries, input and peer suspension.

- [ ] Add a fixture shortcut `register(command)` capturing its command/disposer and assert exactly one ID `dsh-nav-fold.session-navigation`, `defaults: {}`, and a valid `resolve()` action when three views are mounted.
- [ ] Add a native visible session-row fixture and a custom `data-dsh-nav-fold-session-id` button; assert entry focuses a row, Up/Down does not invoke openSession, Enter invokes openSession for custom row and native row click for native, Left/Right changes `data-view` while preserving active conversation, Escape exits.
- [ ] Add an editable target and open modal, peer-occupied slot and disabled views: command should pass and bare arrow keys should remain unconsumed. Assert cleanup restores any temporary tabindex.
- [ ] Run `node --test test/client.test.js` and observe feature-specific RED before production changes.

### Task 2: Minimal navigation implementation

**Files:** Modify `lib/client.js` inside the existing `ctx.slots.inject('sidebar.workspaces', ...)` and add `data-dsh-nav-fold-session-id` to its session button; modify `package.json` to load the shortcut service before this client.

- [ ] Register one command with `ctx.shortcuts.register({ id: 'dsh-nav-fold.session-navigation', label: () => '会话导航 / Navigate sessions', aliases: ['session navigation'], defaults: {}, regions: ['page','editable'], modals: [], resolve: () => ... })`. `resolve` passes when unavailable and returns `{status:'handled', run:startNavigation}` when three views are present.
- [ ] Add one local keydown handler scoped by active state and focus within sidebar; use existing `selected` and `syncSelection()` for horizontal navigation, focus currently rendered rows for vertical navigation, Enter opens the focused row, Escape restores prior focus. Dispose registration and listener on unmount.
- [ ] Run focused RED/GREEN cycles and the entire `npm test` suite. Keep CSS focus-visible from existing rules, adding one narrowly scoped native-row focus rule only if actual UI needs it.

### Task 3: Compatibility and local validation

**Files:** Update `README.md` only for new shortcut behavior and limits; no release docs until the tested feature is accepted.

- [ ] Run `node --check lib/client.js`, `npm test`, and inspect `git diff --check` plus scoped diff.
- [ ] Verify registered command appears in DSH settings and a new binding rejects registered conflicts; verify workspace/activity/favorites with keyboard, empty/hidden tabs, editable input, DS-Bot switch, disable/unload. If direct GUI control unavailable, report exact unverified actions rather than claiming GUI acceptance.
- [ ] Do not publish or replace the active profile's Fold plugin until compatibility is proven; deliver an isolated branch and explicit validation status.
 (Plan details are intentionally kept narrow to match the user's requested minimal feature.)
