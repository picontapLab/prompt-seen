# Top 50 前端验收

2026-10-29，本地静态构建 + nginx + 已安装 Google Chrome。此目录保存最终工作区的视觉证据；未部署到公网。

- 内容：50 个案例、31 个模板、5 个合集；66 张验收结果，另保留 1 张历史对照。
- 全量 E2E：394 通过，0 失败，2 条条件跳过，耗时约 199 秒。两条跳过项要求当前抽样模板拥有列表字段或多个样例；新增 Top 50 用例另行验证产品九宫格样例切换、自定义值状态及参考图联动。
- 逐案检查：[all-cases.json](all-cases.json) 记录 50 个英文桌面页面与 50 个中文手机页面，全部 200、无断图、无横向溢出、无页面脚本错误。
- 场景检查：[results.json](results.json) 记录 19 项页面/交互环境检查，无阻塞项。包含编辑器 Axe 严重/致命问题为 0、RTL、深色和无 JavaScript 访问。
- 完整 E2E 摘要：[e2e-summary.json](e2e-summary.json)。单元测试 335 通过，类型检查和 ESLint 通过；静态构建导出 837 个路由。
- 浏览器范围为 Chrome 桌面及视口模拟，未将本次结果表述为 Firefox、Safari 或实体手机验收。

20 张 PNG 已逐类检查：

- [首页](home.png)、[总合集](collection.png)、[手机合集](collection-mobile.png)
- [产品九宫格桌面](product-brand-story-grid-desktop.png)、[手机](product-brand-story-grid-mobile.png)
- [贴纸手机](character-chinese-sticker-sheet-mobile.png)、[双人参考图](two-person-wedding-editorial-desktop.png)
- [无参考图案例](crystal-sphere-waterfall-desktop.png)、[人像花园](hidden-portrait-flower-garden-desktop.png)
- [玻璃样例](editor-glass.png)、[自定义值未实测状态](editor-custom.png)
- [深色](dark.png)、[来源证据](source.png)、[RTL](rtl.png)

验收期间修复了参考图抢占高优先级加载、切换运行保留旧图、手机标题过晚出现、合集图片无内边框、外链图标和数字字体等问题。公开指标仅属于原始来源，本站生成结果保持独立归属；未知精确模型未补造。
