# 活跃整理菜单 C 紧凑色条实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把用户已选的 C 原型落到真实 Activity 菜单，保留五色／无色／自定义色的 Host 语义及键盘可达性。

**Architecture:** 只改 `lib/client.js` 内嵌菜单样式和六格箭头处理、自定义色底行局部 DOM；用现有 `test/safe-views.test.js` 两种 Host 菜单夹具验证样式与焦点。新版只进功能分支；发布安全门槛单独核查。

**Tech Stack:** React.createElement、内嵌 CSS、node:test、jsdom、独立 DSH QA profile 的真 GUI。

## Global Constraints

- 用户选择 `/tmp/navfold-menu-C-20261111.png`：六色单排，已存自定义色和独立铅笔编辑同排；不增加颜色数或更改 Host v1 数据。
- 六个按钮各至少 30×30 CSS px；菜单内容不可裁剪；笔形编辑按钮保留独立 focus/aria-label。
- 发布前须证明 profile A→B 同 raw 的在途 `form.set` 安全，不以此菜单设计豁免问题。

---

### Task 1: 菜单排列及焦点回归

**Files:**
- Modify: `test/safe-views.test.js:1448-1457,1831-1845,2146-2209`
- Modify: `lib/client.js:232-243,918-949`

**Interfaces:**
- Consumes: 既有 `data-activity-swatch`, `data-activity-custom-open/use/edit`, `activityAction`, `openCustomPicker`。
- Produces: 6×30px 单排色标与 `aria-label="编辑自定义颜色"` 的独立 SVG 编辑按钮。

- [x] **Step 1: 写失败测试。** 在现有 CSS 断言中期待 `grid-template-columns: repeat(6, 30px)`、swatch `width/height:30px`。在 rc5/rc1 的 `withCustomColorView` 中聚焦末色，按 ArrowRight 回到首色、ArrowDown 进入自定义按钮；首色 ArrowUp 到「免打扰」项；有色槽时断言 `data-activity-custom-edit` 有 SVG 且 `aria-label` 是「编辑自定义颜色」，在 DOM 中可独立聚焦它，并在真实 QA 菜单实测从 `data-activity-custom-use` 按 Tab 到编辑按钮；焦点操作零写入。
- [x] **Step 2: 运行 `node --test --test-name-pattern='compact|Activity menu A|A left stripe|restored custom HEX' test/safe-views.test.js`。** 预期因原三列 CSS／旧 Up-Down 行为／文本编辑按钮而失败，排除夹具错误。
- [x] **Step 3: 修改最小生产代码。** CSS 网格改六列各 30px、间隔 2px，底行一侧 `flex:1; display:flex; align-items:center`，右侧独立 30px 编辑按钮及一像素分隔；保留别名主题色。键盘 Left/Right 对六色循环、Home/End 首末、Up 聚焦前一个 Host menuitem、Down 聚焦自定义按钮、Tab 保留原先边界。右侧按钮用内嵌 `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13l3-.7L13 5.3a1.4 1.4 0 0 0-2-2L4 10.3 3 13Z"/></svg>`，可见无文字但中英 `aria-label` 明确。
- [x] **Step 4: 重跑上述针对性测试，预期 0 fail；再运行 `node --check lib/client.js && node --test --test-concurrency=1 test/*.test.js && git diff --check`，预期 0 fail。**
- [x] **Step 5: 完成真实 GUI 对照并提交。** 隔离 QA profile 安装此功能分支本地包，不改 desktop；在现有真实 DSH 界面看菜单六色是否完整单排、使用／编辑互不误触、暗色与浅色、最窄可用栏宽是否无裁剪；独立只读复审后以 `feat: compact Activity color menu into one row` 提交测试／源码／设计与验收文档。

### Task 2: 发布边界核查

**Files:**
- Inspect: `lib/client.js:1130-1225`, `test/safe-views.test.js:1969-2045` and installed DSH Host `form.set` contract.
- Update documentation only after a provable Host guarantee or fix exists.

**Interfaces:**
- Consumes: Task 1 已验证的功能分支；Host profile-bound/CAS 写入契约。
- Produces: 可信跨 profile 写入防串证据，或明确停止 v0.4.15 发布。

- [x] **Step 1: 重现默认双 origin 的边界并取得完整 Host 源码链。** 本机 desktop（49309）与独立 QA（64157）分别运行各自 profile；打包前端只设置 `ownsHost/streamBaseUrl`，无 RPC/fetch override；表单控制器虽异步排队，但请求最终使用本页相对 URL，Host `profileContext` 在本次 `runProfile` 中固定 `dir/patchPath`，`ConfigEditor.edit` 锁定并写该目录。故默认模式排队与已发出 A 写入均不可能落到 B。此处是打包源码静态证明，不谎称做过直接的跨端口破坏性写入测试。
- [x] **Step 2: 界定证明范围。** 明确源码证明限于默认页面／Host 各 profile 独立 origin；自定义传输、同 origin 动态代理、A 端口复用给 B 不在范围内。不能把写后检查／回滚当原子保护，也不能把该结论外推到未核实部署。
- [ ] **Step 3: 在默认模式发布门槛通过后再完成 v0.4.15 版本号、文档、主干、Tag、GitHub Release 操作。** 发布前复验测试与 npm 六文件包一致性，留下 SHA-256 与回退入口；若后续发现 profile 迁移复用同一 origin，立即暂停发布并回到 Host 原子身份保护方案。**
