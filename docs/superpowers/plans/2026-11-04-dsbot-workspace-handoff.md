# DS-Bot 工作区安全让位修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bot 模式的 DS-Bot 临时占位不再把 dsh-nav-fold 三栏偏好永久关闭；退出 Bot 后仅经完整安全检查才恢复。

**Architecture:** 沿用 client.js 现有严格的原生身份校验与硬隔离。增加运行时的 peer-suspended 状态，仅在 slot 是 single/root、原生项真实且唯一、自身项计数正确、额外项确为第三方注册时进入；先卸载本插件视图/控件，保留用户持久开启偏好。第三方离开后重新满足全部 `slotSafe` 与 DOM 检查才恢复；无法验证原生身份、结构不正确或本插件 DOM 受损仍走原 `quarantine` 并持久写 false。

**Tech Stack:** DSH 0.2.1-rc.5 client slots API、React 18、Node `node:test` + jsdom、npm pack。

## Global Constraints

- 起点是正式 v0.4.5 commit `f7671ef3ea1833213542dcf6cc828d4c35a760cc`；只在 `fix/dsbot-workspace-peer-suspension` 分支工作。不要推送、改 tag/release/市场、强改 desktop 当前安装或重启用户 GUI。
- 已产出的 `0.4.6-preview.1` 是真实 GUI 失败候选，只留 ignored `artifacts/` 作证据，**不得交付**；下一轮修正必须递增为 `0.4.6-preview.2`，不可同号重打。保持既有 `0.4.5-preview.1` 包、GitHub v0.4.5 Release 与 desktop 回退档。新包出现在 ignored `artifacts/`。
- 不依赖 DS-Bot 名字或内部变量；真实第三方占位期间绝不注册/保留本插件覆盖。结构不可信时保留原硬隔离与手动确认门槛。
- 不声称另一台设备或当前主 GUI 已验收；独立匿名 Host 的实际交互与模拟测试要明确区分。用户已在本机证实 Bot→Agent 可触发旧版冲突，未经新包跨设备验收不得正式发布。
- `lib/client.js` 是手写 client bundle；保持现有公开注入、样式与归档功能，不引入新依赖或更改 `lib/index.js` 的默认关闭。

---

### Task 1: 通过测试驱动临时竞争让位与硬隔离

**Files:**
- Modify: `test/safe-views.test.js:16-43,94-251,293-323`
- Modify: `lib/client.js:529-555,655-765`
- Modify: `README.md:76-77`（只修正兼容描述，不先改版本/下载地址）

**Interfaces:** Consumes existing `ctx.slots.entries(name)`, `entriesOfSlot(name)`, `spec(name)`, `subscribe(name,fn)`, `form.getSnapshot/subscribe/set`; produces in-function runtime `peerSuspended` boolean. No new public API.

- [ ] **Step 1: 先改测试、不碰生产代码。** 在 safe-views fixture 让 `addPeer(registrant = 'another-sidebar', priority = 50)` 存入 `{ options: {name:'sidebar.workspaces', priority}, registrant }`，让 `removePeer(registrant = 'another-sidebar')` 按该 registrant 删除；保留原无参调用。增加下列测试（按现有 `mount/flush` 风格）；现有 `peer arriving while Activity`、`synchronous slot notifications`、`peer joining during unregister` 的配置断言改为 true，并补充 peer 撤出后恢复断言。`failed automatic disable`、`after collision only settings Save`、`concurrent ready(true)` 改用已有的结构异常触发：有 bar 时删除 `[data-dsh-workspace-tabs-toggle]` 并 `await flush()`，确保 hard quarantine 仍写 false、未由设置 Save 批准前不会恢复；保留冒充原生和被篡改 DOM 原测试。另增加预先存在 peer 的正向恢复测试。不得为绿灯删除任何硬隔离断言。

```js
test('DS-Bot slot entry pauses views and leaves saved intent intact across Bot-Agent switches', async () => {
  const app = mount({ active: true });
  const writes = [];
  const set = app.form.set.bind(app.form);
  app.form.set = async (field, value) => { writes.push([field, value]); return set(field, value); };
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    for (let i = 0; i < 2; i++) {
      app.slots.addPeer('ds-bot-client', -101);
      await flush();
      assert.deepEqual(app.entries.map(entry => entry.registrant).sort(), ['Gb', 'ds-bot-client'].sort());
      assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
      assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
      app.slots.removePeer('ds-bot-client');
      await flush();
      assert.equal(app.doc.querySelector('[data-view="activity"]')?.getAttribute('aria-pressed'), 'true');
      assert.equal(app.entries.filter(entry => entry.registrant === 'dsh-nav-fold:workspace-views').length, 1);
    }
    assert.deepEqual(writes, []);
  } finally { app.dispose(); }
});
```

- [ ] **Step 2: 验证 RED。** 运行 `node --test --test-name-pattern='DS-Bot slot entry pauses' test/safe-views.test.js`；必须因当前 `form.set(false)` 或没有恢复而 FAIL，不能仅是 fixture 拼写错误。
- [ ] **Step 3: 编写最小实现。** 在 slotSafe 相邻处定义 `peerOnlyConflict(ours)`：spec single/root，`entries` 为数组且有唯一可信 native、恰好 `ours?1:0` 个 own，余项是非 native 且非 own 的其它插件，至少一项；其余状态返回 false。增加 `let peerSuspended = false`。`ensure()` 在判定 competing peer 时先检查已有 bar 是否被移位/破坏，若无结构异常令 `peerSuspended = true`，卸载 own entry 和 bar，不调用 `quarantine`/`form.set(false)`；第三方撤出后仅在 `slotSafe(Boolean(unregister))` 成立时清除暂停并继续创建 bar/恢复所选视图。`syncSelection()` 自身卸载条件与注册门槛都包含 `peerSuspended`；`onSlotChange()` 只在 `!slotSafe(true) && !peerOnlyConflict(true)` 时执行硬隔离。原生项错误、spec 错误、自身重复项、DOM 损坏、无第三方时 slot 不安全，仍原样 hard quarantine。示例判定形状：

```js
const peerOnlyConflict = (ours = false) => {
  if (ctx.slots.spec?.(slotName)?.kind !== 'single' || ctx.slots.spec?.(slotName)?.scope !== 'root') return false;
  const entries = ctx.slots.entries?.(slotName);
  if (!Array.isArray(entries) || entries.filter(nativeEntry).length !== 1) return false;
  if (entries.filter(entry => entry.registrant === ownRegistrant).length !== Number(ours)) return false;
  return entries.filter(entry => !nativeEntry(entry) && entry.registrant !== ownRegistrant).length > 0;
};
```

- [ ] **Step 4: 验证 GREEN**：重复定点命令并确认新测试通过；运行全体 `node --test test/safe-views.test.js` 确认先前写好的竞态/预先占位/硬隔离回归同时绿。额外验证原生注册簿暂时为空、sidebar region/footer 暂缺仍按 v0.4.5 只撤出不写 false，恢复时重新校验；在自身注册回调中同步加入 peer 必须让位；Workspace 已可见时插入和撤出多个 peer 不写 false；优先级不获胜时 peer 离开也不得先显示三栏。上述修正均先增加失败断言再改实现。若回归失败，只改生产代码中造成失败的最小分支，不降级保护断言。
- [ ] **Step 5: 更新 README 第 76 行**：第三方进入时仅运行时安全让位、其撤出且严格校验通过后自动恢复；宿主结构或身份异常仍撤出并自动保存为关闭，需设置页手动重试。运行 `node --test test/safe-views.test.js`、`npm test`、`node --check lib/client.js`、`git diff --check`，期望 0 失败。commit `fix: suspend workspace views during temporary slot competition`。

### Task 2: 生成独立 0.4.6-preview.1 验收包

**Files:**
- Modify: `package.json:3`, `package-lock.json:3,9`
- Modify: `test/client.test.js:12-17`, `test/host-config.test.js:16-20`
- Modify: `README.md:1-21,75-80`（版本、正式版下载与本地预览边界）
- Create ignored only: `artifacts/dsh-nav-fold-0.4.6-preview.1.tgz`, `artifacts/PREVIEW_RECEIPT_v046.md`

**Interfaces:** Consumes Task 1's behavior and version-independent pack manifest; produces local npm tarball for anonymous GUI tests, not a public URL.

- [ ] **Step 1: 测试先行**：将两处 manifest 断言改为 `0.4.6-preview.1`；跑 `node --test test/client.test.js test/host-config.test.js`，确认恰好版本断言 RED（不是加载错误）。
- [ ] **Step 2: 最小版本修改**：`package.json` 和 package-lock root/version 均设置 `0.4.6-preview.1`（仅根两个值），不要更改其它依赖。README 明示这是本地预览；GitHub v0.4.5 仍为最后正式版，绝不编造 v0.4.6 正式版安装 URL。实现例如：

```json
{"name":"dsh-nav-fold","version":"0.4.6-preview.1"}
```

- [ ] **Step 3: 验证并打包**：`npm test`、`node --check lib/client.js`、`git diff --check` 全绿；`npm pack --pack-destination artifacts --json` 生成唯一预览包，`tar` 中只含 v0.4.5 的六项约定文件（lib/client.js、lib/index.js、package.json、README.md、THIRD_PARTY_NOTICES.md、cordis.patch.yml），逐字节比对已提交 HEAD 版本后记录 SHA-256/字节数。先 commit 版本/测试/README，再比对包；preview 包/收据 ignored 不入 git。commit `chore: prepare isolated v0.4.6 preview`。

### Task 3: 独立 Host 的 DS-Bot 实际切换验收与回退记录

**Files:**
- Create ignored only: `artifacts/DSBOT_GUI_RECEIPT_v046.md`
- Do not modify installed desktop profile, GitHub, marketplace or source after Task 2 without重新跑相关测试。

**Interfaces:** Consumes Task 2 tarball and本机已存在的 `/Users/nicozhuang/.dsh/plugin-sources/ds-bot-0.2.3.tgz`；produces read-only evidence of transient slot occupancy and config writes in anonymous isolated DSH_HOME.

- [ ] **Step 1: 用新的临时匿名 DSH_HOME/profile，安装两个本地包并启动单独 host**（动态端口，不占用已有 `http://127.0.0.1:53436`；不要复制任何个人配置/模型密钥/会话）。如需临时安装，仅触碰该匿名 profile，保留其绝对路径与进程 id 供验证/安全清理。
- [ ] **Step 2: 使用 `agent-browser` 技能及可观察的 Host 工具验证**：开启三栏 → Activity → 切 Bot（DS-Bot TeamSidebar 存在，本插件覆盖与三栏消失，配置仍 true）→ Agent（DS-Bot 注销，本插件三栏与 Activity 自动恢复）→ 再切 Bot/Agent。记录 `entries/entriesOfSlot` 与 configForm 变更的真实观察，不把测试夹具或页面截图冒充另一个设备验收。
- [ ] **Step 3: 使用同一匿名 host 人为造成可控的结构异常，只在测试 profile 验证 hard quarantine**；如果无法安全做，不动用户 GUI，报告它仅有自动回归覆盖。记录成功/限制、安装包哈希、清理临时 host 后状态。最终独立 whole-branch review 通过后，保留该分支与 worktree，交付本地预览及跨设备验证步骤；正式发版另待用户验收。

### Task 4: preview.1 的真实 GUI 失败后纠正分类，再产 preview.2

- [ ] **先核证根因**：只用匿名 Host 中带日志的临时安装副本诊断；在 `artifacts/DSBOT_LIVE_DIAG_v046p1.md` 记录脱敏证据。原生完整形状的 `Gb` 与 DS-Bot 简形状的 `Gb` 确实并存；scope 本身正确，但 raw entry `options.name` 不存在。清理临时 hook，核对已还原包字节。**不要修改 desktop 或声称 preview.1 通过。**
- [ ] **先写 RED 测试、再改生产代码**：fixture 表现真实元数据（同 `Gb` registrant、priority -101、缺失 `options.name`）；Bot 占位必须撤 own/bar 且不保存 false；Agent 返回必须恢复 Activity/三栏并保留开启；两次切换可重复。完整原生形状重复、显式错 slot 名、缺失可信原生/slot spec 错、被移动/篡改的 bar 保持硬隔离。原生 identity 必须来自完整 locale/children 检查，不以裸 registrant 唯一性当安全证明；scoped entries 允许缺少 `options.name`，但明确提供错名仍视结构错误。
- [ ] **最小改动与回归**：只修 `peerOnlyConflict()` 的错误身份/可选字段判断和必要 fixture；保留胜出前 detached、空原生过渡、布局过渡与原 hard fallback。独立源码审查后，将 manifest/lock/版本断言/README 改为 `0.4.6-preview.2`（两阶段源提交可审），全套 `npm test` 和 six-file/HEAD 逐字节打包，单独收据 SHA；绝不以 preview.1 同号重包。
- [ ] **实际 GUI 重新验收**：使用已建匿名 profile + 新预览包，原先补日志的 client copy 必须还原或被新包替换；命名浏览器会话里实际 Agent（Activity/Favorites）→ Bot（Bot 列表，自己三栏/slot 撤出且设置 true）→ Agent（原三栏/视图恢复，设置 true），至少两轮，稳定后重读设置，必要时 reload。若仍失败继续诊断，不交付；若通过再做整体 review，停止匿名 Host，核对用户 desktop 未变，仅交付 preview.2 供另一设备验收，不发布 GitHub。
