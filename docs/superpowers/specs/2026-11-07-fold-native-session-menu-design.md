# Fold 会话行复用 DSH 菜单设计

## 问题与目标

Fold 0.4.9 的活动／收藏会话行自己绘制菜单和置顶／归档按钮，缺少 DSH 内置的重命名。用户要求三点按钮和置顶、归档等菜单项改用 DSH 本身的行为，不在 Fold 再造一套。

## 已核查的宿主边界

- DSH 0.2.2-rc.1 的 `@deepseek-ai/dsh-client-ui-context-menu` 公开 `ctx.contextMenus.open({ kind: 'session', value: { sessionId, displayTitle } }, point)`，`sidebar.workspaces` 的标准 props 注入 `useContextMenu()` 和 `getTriggerProps()`。原生会话菜单已经注册置顶、重命名、分叉、复制 ID、归档，附带权限门控与宿主确认流程。
- npm 无 `@deepseek-ai/dsh-client-ui-context-menu@0.2.1-rc.5`。Fold 的 Client 注入列表不能增加该包为硬依赖；rc.5 保留现有可用的菜单和按钮，避免破坏已支持版本。
- Workspace 视图继续用 DSH 原生工作区树，不修改其 slot 声明或安全隔离判定。

## 设计

在 rc.1 中，Fold 会话行使用 DSH 公共 `useContextMenu/getTriggerProps` 绑定右键及键盘触发；三点触发按钮沿用 DSH 图标与原生 `ctx.contextMenus.open/close` 目标，点击只传当前行的会话 ID 和展示标题，不改变当前会话。菜单、归档确认和置顶状态完全由 DSH 的共享上下文菜单处理。Fold 不渲染自绘菜单、独立 Pin/Archive 按钮或自己的归档确认弹窗；收窄动作区占位到一个三点按钮。仅当宿主没有完整的上下文菜单入口时走旧路径：保留原有菜单、Pin/Archive 按钮与确认流程，以兼容 rc.5。

不复制 DSH 私有会话行组件，也不绕过其权限判断；这意味着三点按钮是由 Fold 使用 DSH 的公开菜单触发契约和同款 icon 渲染，而不是把原生工作区树的一整行搬进 Activity/Favorites。

## 验证

先在测试中证明 rc.1 Activity/Favorites 的三点、右键、Shift+F10 传递固定目标，不导航、不渲染重复操作；再证明 rc.5 回退保持现有菜单和归档确认。运行完整既有回归及语法/差异检查；只有真实已登录 GUI 验收后才能声称视觉和点击流程都已通过，不能把 jsdom 测试冒充它。
