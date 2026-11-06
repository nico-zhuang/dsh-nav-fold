# Fold 工作区文件夹遥控导航设计

状态：用户已确认「上下停留原生文件夹、确认展开／收起且保持导航」方案；仅在 `feat/fold-remote-navigation` 独立工作树试用，不发布或覆盖 preview.4。

## 依据与目标

当前 Fold `visibleRows()` 在工作区只选 `[role="treeitem"][data-row-key^="session:"]`，因此 ↑↓跳过文件夹。DSH 0.2.1-rc.5 的原生 `ProjectRowItem` 把真实工作区／未分组文件夹渲染为 `role="treeitem"`、`data-row-key="workspace:<group.key>"`、`aria-expanded`，点击整行执行宿主的展开／收起；会话行使用 `data-row-key="session:<id>"`。平铺视图没有文件夹行。

1. 导航进入工作区时仍优先当前会话；↑↓沿 DOM 可见树顺序经过文件夹与会话，仅包括真实 `[role="treeitem"]` 的 `workspace:`（必须有 `aria-expanded`）和 `session:` 行，不吸纳更多按钮、搜索框、动画退出克隆或隐藏子节点。
2. 文件夹获得真实键盘焦点与清楚的 `:focus` 轮廓。其 Enter 仅调用该原生行的点击处理，展开／收起宿主自己的树状态，不打开或创建会话；导航保持开启，焦点尽量留在同一文件夹。宿主如因更新替换该 DOM，按 `data-row-key` 恢复到可见同名行；若文件夹已不可用则安全回退到现有可见行／当前 Tab，不捕获已离开侧栏的焦点。
3. 会话 Enter 仍按现有流程打开会话并退出导航；←→切三栏，Esc 返回进入前的焦点。平铺工作区及活动／收藏既有行为不变。现有弹窗、输入框、快捷键、DS-Bot 暂时占位与结构损坏的安全回退不变。

## 方案与边界

扩展 Fold 的候选行选择与焦点样式，对文件夹调用已有原生 `click()`，不直接写 DSH 私有 `groupExpansion` 状态、不复制文件夹 DOM 或自造焦点环；只在已启动的会话导航模式拦截 Enter。保持 Fold 的短生命周期 `remembered` 工作区 `data-row-key`，展开后不要在焦点仍在文件夹时跳去第一个子会话。对宿主角色／属性变化 fail-closed，不猜测其他行可折叠。无新增配置项、默认快捷键或实体遥控器映射。

## 验收

测试先红后绿：包含折叠与展开文件夹、嵌套文件夹、隐藏子项、焦点与 `aria-expanded` 变化、Enter 不开会话／不开新会话、切栏和 Esc、会话 Enter、重渲染后焦点恢复、DS-Bot 安全撤出；覆盖平铺视图不受影响。运行全套测试、语法及差异检查，独立打包递增编号并保留 preview.4 回滚包。本机试装后读取当前 Config 与 Slot；无法读取用户已认证 GUI 时，不把 jsdom 测试或安装成功说成实体遥控器与像素视觉验收。
