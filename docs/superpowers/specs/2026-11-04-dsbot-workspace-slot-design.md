# DS-Bot 切换时工作区视图安全让位设计

## 已核实的问题

用户在共装设备切换 DS-Bot 的 Bot/Agent 后观察到 dsh-nav-fold 三栏永久关闭。本机 DS-Bot 0.2.3 的已安装 client bundle 在 Bot shell 注册 `sidebar.workspaces` 的 `TeamSidebar`，在 Agent shell 撤销；用户又在本机确认该切换可触发冲突。已发布 dsh-nav-fold v0.4.4/v0.4.5 在看到第三方占用时调用 `quarantine()`，既撤销本插件视图，又异步 `form.set('workspaceViewsEnabled', false)`；后续第三方撤出时仍须用户去设置页再次手动保存。现有 `safe-views.test.js` 的两个竞争测试复现了这个自动保存/永久关闭行为。真实另一台设备的 slot entries 时间序列尚未直接读到，不假称已在那台设备抓到日志。

## 目标和范围

- 不改 DS-Bot，也不删除/屏蔽/修改 DS-Bot 或宿主的注册项。
- 将**已验证原生项 + 第三方项（可同时有自身项）**认作临时的 singleton 竞争：立刻撤出本插件替代视图和三栏控件；不调用 `form.set(false)`；保留用户在插件设置里保存的真实偏好。第三方撤出后，只有重新通过原生注册项、唯一性、优先级胜出和宿主 DOM 完整性校验，才恢复三栏与原来选择的 Activity/Favorites；不能趁 Bot 还占位时抢占。DS-Bot 的名字不是判定条件，避免版本耦合。
- 持续保留强退避：非 single/root、原生项不存在或身份/子槽结构错误、伪装原生/多个原生项、没有竞争者时自身覆盖失败、插件栏 DOM 被修改/重定位等，照旧硬隔离，并在可写的已就绪配置中尝试保存 false；除用户在设置页明确重新保存开启外不解除硬隔离。疑似竞争者但原生无法验证时按强退避，不猜来源。
- 用户明确保存关闭或配置变成非 ready 时，本插件撤出；不能把临时暂停误当重新授权。
- 插件包仅作为新的本地独立预览 `0.4.6-preview.1` 生成，保持 v0.4.4、v0.4.5 GitHub Release 和 desktop 当前试用安装不变；另一台设备实测之前不发布正式版。

## 状态/时序

`active` 需运行时 slot 严格安全；`peer-suspended` 保留已保存的开启偏好但不渲染、不持有 own slot；`hard-quarantined` 保留原有持久关闭与手动恢复门槛。进入 Bot：DS-Bot 注册 third-party entry → 判定可验证竞争 → 先撤 own entry 和栏，不持久关闭；退出 Bot：DS-Bot 注销 → slot 事件使验证重新通过 → 恢复控件与原视图。若模式切换正好与自身注册/卸载事件交叉，则使用现有 `slotMutationDepth`/`missedSlotChange` 防止重入，再校验之后才能恢复。若同一时刻检测到结构异常，硬隔离优先于临时暂停。

## 验收

1. 先增加失败回归：配置已开启、Activity/Favorites 视图中 third-party entry 插入与撤出（含先占位、两次切换和同步通知）时，竞争期间只剩原生+第三方，控件和自身覆盖撤出，不写 false；撤出后才恢复，开关仍 true。
2. 既有真实结构异常/伪装原生/栏被篡改的测试仍应写 false、关闭本插件且只允许用户在设置页重试；失败的异步关闭不会被外部 ready(true) 自动放行。
3. 完整 `npm test`、`node --check lib/client.js`、六文件打包比对；独立匿名 rc.5 宿主优先用已安装 DS-Bot 与预览版走实际 Bot→Agent→Bot GUI 切换，记录 slot 与表单状态。如受运行环境/权限阻碍，仅报告模拟覆盖，不冒充真实 GUI 验收。
4. 不覆盖用户 desktop 已安装插件、回退档、主 DSH GUI；不更新 GitHub 或市场，正式发布另待用户跨设备确认。
