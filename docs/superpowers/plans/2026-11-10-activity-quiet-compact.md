# Activity Quiet Single-Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 仅活跃列表中的免打扰会话以标题＋月亮单行呈现，可见工作区副行消失，辅助朗读仍保留工作区信息。

**Architecture:** 保持 `activityOnly && row.quiet`、Host 偏好、颜色标记与菜单逻辑；在 `SessionRow` 中为 Quiet 活跃行渲染独立 title flex 行并省去 subtitle，普通及其他 Tab 走原来的 title/subtitle 分支。CSS 对 Quiet 的新 flex 行预留操作按钮宽度，标题可收缩截断而月亮不收缩。

**Tech Stack:** React createElement, DSH client plugin CSS, Node `node:test`, jsdom.

## Global Constraints

- 只更改 `lib/client.js` 与 `test/safe-views.test.js` 及本设计／计划文档；沿用 `feat/activity-custom-color-phase1`，不改正式 main、Host schema 或现用 web profile 中的 v0.4.13 插件。
- Quiet 的背景弱化、3px 色标、顶部固定、原有月亮文案与取消菜单不变。按钮 `aria-label` 保留工作区；普通会话和收藏／工作区 Tab 仍显示工作区副行。
- 用户已授权本机实测；只在新建 `navfold-qa-20261111` profile 安装临时开发包。该 profile 仍看得到本机真实会话列表，测试时不得打开或修改真实会话；不推送／发布，也不把 jsdom 的断言冒充真实 DSH GUI 验收。

---

### Task 1: 免打扰活跃行压成单行

**Files:** Modify `lib/client.js:211-220,981-998`; Test `test/safe-views.test.js:1681-1712,1565-1579`.

**Interfaces:** Existing `SessionRow({ row, activityOnly, nativeMenu, ... })` uses `activityOnly && row.quiet`; existing `row.workspace`, `row.title`, `moonIcon()` and button `aria-label` remain unchanged. New `.dsh-nav-fold-session-quiet-title-row` CSS class and existing `data-activity-quiet-icon` are only DOM/CSS contracts; no persistence API changes.

- [x] **Step 1: Write failing tests**: give running `busy` fixture `cwd: '/projects/quiet-workspace'`. Before toggling assert a subtitle containing `quiet-workspace`; after toggling assert Quiet `.dsh-nav-fold-session-main` contains exactly one `.dsh-nav-fold-session-quiet-title-row` with existing title and `[data-activity-quiet-icon]`, no `.dsh-nav-fold-session-subtitle`, and `aria-label` still includes `quiet-workspace`. After toggling back assert subtitle/workspace/status dot return. Render the same Quiet-preference session with `activityOnly=false` (Favorites or workspace view) and assert it remains two lines without `.dsh-nav-fold-session-quiet`, while an ordinary active row remains two lines. Replace obsolete Quiet subtitle contrast test with a test reading `.dsh-nav-fold-session-quiet .dsh-nav-fold-session-main` 86% color mix and assert text contrast >=4.5 using the existing luminance helper.
- [x] **Step 2: Verify RED**: `node --test --test-name-pattern='Quiet running session|Quiet and selected light-theme subtitle' test/safe-views.test.js` fails because Quiet still has a subtitle and moon lives on the second line; no source changes yet.
- [x] **Step 3: Minimal implementation**: in `SessionRow` render `activityOnly && row.quiet ? React.createElement('span', {className:'dsh-nav-fold-session-quiet-title-row'}, React.createElement('span',{className:'dsh-nav-fold-session-title'}, row.title || row.id), React.createElement('span',{className:'dsh-nav-fold-quiet-icon',...}, moonIcon())) : React.createElement(React.Fragment,null, existing title, existing subtitle-with-workspace-and-state-dot)` inside the existing main button. Keep `aria-label` and all menu branches unchanged. Replace unused Quiet subtitle CSS with `.dsh-nav-fold-session-quiet-title-row { display:flex;align-items:center;gap:5px;min-width:0;padding-right:82px; }`, native Activity override `padding-right:58px`, and `.dsh-nav-fold-session-quiet-title-row .dsh-nav-fold-session-title { flex:0 1 auto;min-width:0;padding-right:0; }`; moon retains its `flex:none;width:16px;height:16px` rule.
- [x] **Step 4: Verify GREEN and full suite**: rerun focused command; run `node --check lib/client.js` and `node --test --test-concurrency=1 test/*.test.js` (the existing parallel README renderer occasionally reads a zero-byte desktop WebP); `git diff --check` must be empty. Run Impeccable detector after UI changes. Review actual source/diff for untouched menu/Host behavior.
- [x] **Step 5: Commit scoped files**: after review stage only `lib/client.js`, `test/safe-views.test.js` and the two Quiet design/plan docs; commit on the feature branch. Do not alter installed DSH or README stills.

### Task 2: 连续 Quiet 底色连接及隔离实测

**Files:** Modify `lib/client.js:215-221`; Test `test/safe-views.test.js:1681-1740` or adjacent static CSS test; update this plan/spec only. QA package from local committed branch, not current web profile.

**Interfaces:** `.dsh-nav-fold-session-quiet` remains the only Quiet row indicator. Adjacent rows are direct siblings in one Activity container; top-group heading/divider and ordinary rows interrupt sibling adjacency. CSS `:has(+ .dsh-nav-fold-session-quiet)` targets an adjacent following Quiet row.

- [x] **Step 1: Write failing test**: assert source contains a selector that zeroes *both* bottom radii when a Quiet sibling follows and a selector that zeroes *both* top radii when a Quiet sibling precedes, each scoped to `.dsh-nav-fold-session-quiet`; also render two consecutive Quiet rows and assert they are adjacent siblings in the same Activity group, with a non-Quiet row between groups breaking adjacency.
- [x] **Step 2: Verify RED**: `node --test --test-name-pattern='adjacent Quiet' test/safe-views.test.js` fails due missing inner-corner selectors (no production edits yet).
- [x] **Step 3: Implement minimal CSS**: append `.dsh-nav-fold-session-quiet:has(+ .dsh-nav-fold-session-quiet) { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }` and `.dsh-nav-fold-session-quiet + .dsh-nav-fold-session-quiet { border-top-left-radius: 0; border-top-right-radius: 0; }` after the existing 7px `.dsh-nav-fold-session` radius. Do not touch SessionRow props, sorting, persistence, colors or menus.
- [x] **Step 4: Verify GREEN + review**: rerun focused and complete serial tests, `node --check lib/client.js`, `git diff --check` and Impeccable detector; independent read-only source review confirms no group boundary bleed. Commit source/tests/spec/plan only in feature branch.
- [x] **Step 5: QA install & GUI**: produce a new local tarball from the reviewed commit, install it only into `navfold-qa-20261111`, restart its own Web server, authenticate at its newly printed loopback URL, inspect actual Quiet single-line height and consecutive seam at the narrow sidebar width. Configure QA-only activity preferences without opening or mutating shared real sessions; if needed use a disposable synthetic view, clearly label it. Verify current web profile still has v0.4.13 and was untouched; report any untested items.

## Self-review

The sole visual behavior change is the approved Quiet Activity row. Workspace remains in `aria-label`, standard rows and other Tabs remain two lines, and the color marker/menu/Host code are outside scope. No new profile key, dependency or network access is needed.

## 执行记录

- RED：原实现没有 Quiet 单行标题容器，聚焦测试 1 通过／1 失败；GREEN：单行 DOM、恢复和 Favorites 隔离的聚焦测试 2／2 通过。
- 完整串行 `node --test --test-concurrency=1 test/*.test.js` **171／171** 通过；`node --check lib/client.js` 与 `git diff --check` 通过。并行 README 截图测试已有可复现的零字节图片竞态，未在此特性改动。
- Impeccable 检测只报既有 `lib/client.js:153` 动画曲线 advisory（本次未触碰）；独立只读源码复审给出规格符合／代码质量通过。第一轮单行提交时尚未做真实 GUI 验收；第二轮以下方 QA 记录补足。没有安装到现用 profile、推送或发布。

## 连片底色及本机 QA 实测（2026-11-11）

- 新增相邻 Quiet 回归先 RED（缺少下角直角规则），加两条 CSS 选择器后 GREEN；完整串行测试 **172／172** 通过，源码语法、差异空白检查通过。Impeccable 仍只报既有 `lib/client.js:153` advisory。独立只读审查给出规格符合／代码质量通过，没有 Critical/Important。
- 从 `f545725` 打包，仅安装到新建 `navfold-qa-20261111` Web profile 的本地 `dsh-nav-fold@0.4.14` 测试包；当前 `desktop` profile 依旧指向其原 `dsh-nav-fold-0.4.13.tgz`。测试 profile 与现有 DSH **共享会话列表**，测试期间只操作测试 profile 的活跃整理偏好，不打开会话或修改会话正文；QA profile 不是数据存储完全隔离的沙箱。
- 真实 DSH 0.2.2-rc.1 / Chromium：在 **272px 侧栏**，普通行 45px、Quiet 行 27px，标题＋月亮同行，没有可见工作区副行，按钮可访问、`aria-label` 仍含工作区，标题/月亮与操作按钮不交叠。连续三条的计算圆角依次为顶角 7px／底角 0px、中间四角 0px、顶角 0px／底角 7px，垂直接缝 0px；普通行和临时「顶部固定」分组标题／分隔线都截断连片，单独行保留圆角。收藏 Tab 的 4 行均非 Quiet、均有工作区副行。
- 色标：QA 对话框打开时不写入，无效 `#GGGGGG` 禁用确认；有效 `#5480D6` 保存后 Quiet 行有 3px 蓝色条，与连片底色和 27px 高度共存。刷新页面后三条 Quiet、外角与自定义蓝色仍在。实际深色与通过浏览器仅模拟 `prefers-color-scheme: light` 的浅色截图均检查了可读性与接缝；窄视口 750px 下侧栏仍是 272px 且无标题/月亮/菜单重叠。**未手动将侧栏拖至物理最小宽度，也未实测蓝牙遥控器或跨 profile 写入竞态。** 测试配置未并入现用 profile，未推送/发布。
