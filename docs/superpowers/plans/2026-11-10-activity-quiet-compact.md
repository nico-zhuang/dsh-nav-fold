# Activity Quiet Single-Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 仅活跃列表中的免打扰会话以标题＋月亮单行呈现，可见工作区副行消失，辅助朗读仍保留工作区信息。

**Architecture:** 保持 `activityOnly && row.quiet`、Host 偏好、颜色标记与菜单逻辑；在 `SessionRow` 中为 Quiet 活跃行渲染独立 title flex 行并省去 subtitle，普通及其他 Tab 走原来的 title/subtitle 分支。CSS 对 Quiet 的新 flex 行预留操作按钮宽度，标题可收缩截断而月亮不收缩。

**Tech Stack:** React createElement, DSH client plugin CSS, Node `node:test`, jsdom.

## Global Constraints

- 只更改 `lib/client.js` 与 `test/safe-views.test.js` 及本设计／计划文档；沿用 `feat/activity-custom-color-phase1`，不改正式 main、v0.4.14、Host schema 或已安装插件。
- Quiet 的背景弱化、3px 色标、顶部固定、原有月亮文案与取消菜单不变。按钮 `aria-label` 保留工作区；普通会话和收藏／工作区 Tab 仍显示工作区副行。
- 不把 jsdom 的 DOM 断言当成真实 DSH GUI 像素验收；不推送／安装／发布。

---

### Task 1: 免打扰活跃行压成单行

**Files:** Modify `lib/client.js:211-220,981-998`; Test `test/safe-views.test.js:1681-1712,1565-1579`.

**Interfaces:** Existing `SessionRow({ row, activityOnly, nativeMenu, ... })` uses `activityOnly && row.quiet`; existing `row.workspace`, `row.title`, `moonIcon()` and button `aria-label` remain unchanged. New `.dsh-nav-fold-session-quiet-title-row` CSS class and existing `data-activity-quiet-icon` are only DOM/CSS contracts; no persistence API changes.

- [x] **Step 1: Write failing tests**: give running `busy` fixture `cwd: '/projects/quiet-workspace'`. Before toggling assert a subtitle containing `quiet-workspace`; after toggling assert Quiet `.dsh-nav-fold-session-main` contains exactly one `.dsh-nav-fold-session-quiet-title-row` with existing title and `[data-activity-quiet-icon]`, no `.dsh-nav-fold-session-subtitle`, and `aria-label` still includes `quiet-workspace`. After toggling back assert subtitle/workspace/status dot return. Render the same Quiet-preference session with `activityOnly=false` (Favorites or workspace view) and assert it remains two lines without `.dsh-nav-fold-session-quiet`, while an ordinary active row remains two lines. Replace obsolete Quiet subtitle contrast test with a test reading `.dsh-nav-fold-session-quiet .dsh-nav-fold-session-main` 86% color mix and assert text contrast >=4.5 using the existing luminance helper.
- [x] **Step 2: Verify RED**: `node --test --test-name-pattern='Quiet running session|Quiet and selected light-theme subtitle' test/safe-views.test.js` fails because Quiet still has a subtitle and moon lives on the second line; no source changes yet.
- [x] **Step 3: Minimal implementation**: in `SessionRow` render `activityOnly && row.quiet ? React.createElement('span', {className:'dsh-nav-fold-session-quiet-title-row'}, React.createElement('span',{className:'dsh-nav-fold-session-title'}, row.title || row.id), React.createElement('span',{className:'dsh-nav-fold-quiet-icon',...}, moonIcon())) : React.createElement(React.Fragment,null, existing title, existing subtitle-with-workspace-and-state-dot)` inside the existing main button. Keep `aria-label` and all menu branches unchanged. Replace unused Quiet subtitle CSS with `.dsh-nav-fold-session-quiet-title-row { display:flex;align-items:center;gap:5px;min-width:0;padding-right:82px; }`, native Activity override `padding-right:58px`, and `.dsh-nav-fold-session-quiet-title-row .dsh-nav-fold-session-title { flex:0 1 auto;min-width:0;padding-right:0; }`; moon retains its `flex:none;width:16px;height:16px` rule.
- [x] **Step 4: Verify GREEN and full suite**: rerun focused command; run `node --check lib/client.js` and `node --test --test-concurrency=1 test/*.test.js` (the existing parallel README renderer occasionally reads a zero-byte desktop WebP); `git diff --check` must be empty. Run Impeccable detector after UI changes. Review actual source/diff for untouched menu/Host behavior.
- [x] **Step 5: Commit scoped files**: after review stage only `lib/client.js`, `test/safe-views.test.js` and the two Quiet design/plan docs; commit on the feature branch. Do not alter installed DSH or README stills.

## Self-review

The sole visual behavior change is the approved Quiet Activity row. Workspace remains in `aria-label`, standard rows and other Tabs remain two lines, and the color marker/menu/Host code are outside scope. No new profile key, dependency or network access is needed.

## 执行记录

- RED：原实现没有 Quiet 单行标题容器，聚焦测试 1 通过／1 失败；GREEN：单行 DOM、恢复和 Favorites 隔离的聚焦测试 2／2 通过。
- 完整串行 `node --test --test-concurrency=1 test/*.test.js` **171／171** 通过；`node --check lib/client.js` 与 `git diff --check` 通过。并行 README 截图测试已有可复现的零字节图片竞态，未在此特性改动。
- Impeccable 检测只报既有 `lib/client.js:153` 动画曲线 advisory（本次未触碰）；独立只读源码复审给出规格符合／代码质量通过。尚未在真实 DSH 最窄侧栏或系统 GUI 做像素尺寸验收，不能把 jsdom 断言称作实机视觉验收；没有安装、推送、发布。
