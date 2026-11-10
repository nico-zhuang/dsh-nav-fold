# 活跃会话自定义色标第一阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变原有六格、发布版和现行安装的前提下，让活跃会话可保存、复用和编辑一个自定义色标，旧行不随色槽编辑隐式变色。

**Architecture:** 沿用 `activityPreferences` Host v1 JSON，增加经校验的可选顶层 `customColor`，自定义会话的 `color` 写入当次选取的 HEX 快照。原有 Host 写入队列将 `customColor` 与当前行更新作为单次文档写入；选色 Modal 和菜单附加操作共用此入口，已着色的其他行保持不变。

**Tech Stack:** DSH client plugin (React createElement), Host Schemastery profile form, Node `node:test`, jsdom.

## Global Constraints

- 保持 v0.4.14 现行包、README 标题、`main`、旧 2×3 六格和五个预设标识不变；本分支不安装、不发布、不推送。
- 只写第一阶段自定义色槽；不实现最近使用、系统拖入、吸管或跨设备同步承诺。
- 严格 `#RRGGBB` 六位十六进制，存入前统一大写；数据读取的上限保留 200000 字符/1000 会话。
- 保存失败、取消或无效输入均不能显示伪成功；亮/暗主题显示实际保存颜色并可预览。

---

### Task 1: 文档读取与 Host 写入队列

**Files:** Modify `lib/client.js:9-55,982-1083,898-901,1125-1127`; Test `test/client.test.js:316-335`, `test/safe-views.test.js:1726-1766`.

**Interfaces:** `normalizeActivityHex(value): string|null`，`parseActivityCustomColor(raw): string|null`；`parseActivityPreferences(raw)` 保持原始返回结构，仅扩展会话 `color` 为严格 HEX；`updateActivityCustomColor(id, hex): Promise<boolean>` 把 `{id, patch:{color:hex}, customColor:hex}` 送进原队列；`SessionRow` 消费 `customColor` 和 `onActivityCustomColor` props。

- [x] **Step 1: Write failing tests**: assert `parseActivityPreferences('{"version":1,"sessions":{"a":{"color":"#c68ae2"},"b":{"color":"url(x)"}}}')` returns `{a:{color:'#C68AE2'}}`; mount a preexisting Host v1 document with `customColor:'#C68AE2'` and custom `sessions.a.color`, assert both render and ordinary blue/Quiet writes preserve the custom slot and old preference fields. The atomic custom write and multi-row editing tests belong to Task 2 when its UI exists.
- [x] **Step 2: Verify red**: `node --test --test-name-pattern='custom|HEX' test/client.test.js test/safe-views.test.js` must fail specifically due missing custom-color support, not environment error.
- [x] **Step 3: Implement minimal code**: normalize with `/^#[0-9a-fA-F]{6}$/`, add `parseActivityCustomColor`, keep `confirmedCustomRef`/`customColor` in the existing preview and flush queue, serialize `{version:1,sessions:next,...(nextColor?{customColor:nextColor}:{})}`, render `activityColors[row.color]?.[paletteMode] || normalizeActivityHex(row.color)` for a validated row.
- [x] **Step 4: Verify green**: same targeted command passes and old preference tests stay green.

### Task 2: 菜单入口、原生选色与确认语义

**Files:** Modify `lib/client.js:214-223,795-862,913-952`; Test `test/safe-views.test.js:1980+`.

**Interfaces:** Under six old swatches render `data-activity-custom-open` when empty, otherwise `data-activity-custom-use` plus `data-activity-custom-edit`. `data-activity-custom-picker` is the system `input[type=color]`; `data-activity-custom-hex` is a text field; `data-activity-custom-preview` renders light/dark 3px bars. `onActivityCustomColor(row.id, normalizedHex)` atomically saves slot and row, returns boolean.

- [x] **Step 1: Write failing tests**: opening custom must render dialog but make zero Host writes; invalid HEX must disable confirm; picker/text inputs sync; cancel must not write; confirm writes exactly one `activityPreferences` document and returns focus; saved custom button applies to another row, editing current row leaves prior row's HEX intact; rejected save keeps dialog open with alert. Exercise both native organizer and legacy menu. With a custom HEX selected, exactly one of the original six swatches must remain keyboard-tabbable (fallback to no-color), while the 2×3 arrow/Home/End navigation and custom-entry Tab path remain usable. If the Host preference raw changes, close the draft; if a Host snapshot changes but preferences remain byte-identical, preserve the visible draft, mark it stale, disable confirmation and require an explicit reopen under the current profile. A failed save with no snapshot change stays directly retryable; a failed save with an ambiguous same-raw snapshot replacement retains the draft and failure message but blocks retry until reopen. Do not claim protection for a same-raw profile switch after an asynchronous Host write was already issued.
- [x] **Step 2: Verify red**: `node --test --test-name-pattern='custom|HEX' test/safe-views.test.js` fails due missing controls.
- [x] **Step 3: Implement minimal code**: keep `colorChoices` unchanged, add separate action below grid; modal uses existing `Modal` and `Button` primitives and local HEX draft; `normalizeActivityHex` gates enabled confirm and preview; close menu before opening Modal, cancel/Escape restores anchor, save awaits `onActivityCustomColor` then closes only on success; reuse calls existing `activityAction({color:hex})` with same-color toggle-clear. Add styles matching existing theme tokens and forced light/dark preview samples.
- [x] **Step 4: Verify green**: same targeted command, plus `npm test`, passes without changing six swatches or keyboard indexes.

### Task 3: 完整回归与诚实交付

**Files:** Modify `test/host-config.test.js` only if strictly needed for schema compatibility; Modify spec/plan checkbox statuses; no production version bump, no README release edits.

**Interfaces:** No public Host schema change. Original code and docs remain on `main`; work in `feat/activity-custom-color-phase1`.

- [x] **Step 1: Run full gates**: `npm test` (baseline 159 pass), `npm run lint` if defined by `package.json`, `git diff --check`, and compare `git status --short --branch` with starting branch. The existing parallel README desktop/mobile still renderers can transiently read the same desktop WebP while cwebp has truncated it to zero bytes; if this independent screenshot test fails, also run the *same complete suite* serially with `node --test --test-concurrency=1 test/*.test.js`, report the race and do not alter committed README images as part of this feature. Inspect keyboard focus, persistence and cancellation tests.
- [x] **Step 2: Visual evidence**: if permitted, render the real changed component in an isolated local synthetic view, capture light/dark UI and inspect legibility; do not claim active DSH GUI validated based solely on jsdom or drawings. If no safe browser preview exists, report that limitation explicitly.
- [x] **Step 3: Review + commit**: compare diff to spec scope (no history/drag, no release/install), run tests again immediately before any success claim, commit only the feature branch using `git add lib/client.js test/client.test.js test/safe-views.test.js docs/superpowers/specs/2026-11-10-activity-custom-color-phase1-design.md docs/superpowers/plans/2026-11-10-activity-custom-color-phase1.md` and `git commit -m 'feat: add reusable Activity custom color slot'` if verification is clean.

## Self-review

The plan covers compatibility, HEX normalization, atomic persistence, reuse/edit semantics, failure and focus, both menu implementations, visual preview, rollback honesty, and explicit non-goals. Names are used consistently across tasks; there are no additional profile keys or dependencies. User already explicitly requested immediate execution after approving this scope, so proceed inline instead of asking for another execution-choice confirmation.

## 执行与验证记录

- Task 1/2 已在 `feat/activity-custom-color-phase1` 分支按 RED→GREEN 实现并复审；独立串行运行完整测试集 **171/171** 通过（具体命令与结果见本次会话验证输出）。原本并行的 `npm test` 在 README 桌面／移动图片同时渲染时偶发读取到零字节 WebP；该旧竞态未在本特性中修改。
- 自动化证据来自 Node/jsdom；没有对已登录的 DSH 当前 GUI 或系统原生选色面板做实时验收，也未制作能够准确代表实际 Host 组件的隔离浏览器截图。3px 明暗预览由 DOM／样式和复审检查，不冒称视觉实测。
- 仅完成开发分支，不安装、不发布。相同原文的 profile 若在 `form.set` 已发出后发生切换，公开 Host API 没有 profile-scoped/CAS 写入保证；这是未来安装发布前的安全门槛，不因 UI 草稿防护或串行测试通过而视为解决。
