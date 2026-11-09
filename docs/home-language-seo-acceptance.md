# 首页语言与 SEO 实施验收

日期：2026-11-09（America/Los_Angeles）。规格：[home-language-seo-spec.md](./home-language-seo-spec.md) v1.2。

状态：代码完成，双线审查已复核；生产与预览模式本地验收通过；未部署生产。

## 实现

- FeedCard 贯通页面 locale 与 description；所有共享作品卡片始终显示最多两行摘要和测试信息。原始提示词不再进入普通卡片。
- 首页、自动插段与独立模板列表共用转换；自动选择同语言正文优先，跳过缺详情项后取满。跨语言模板仅展示用途说明，显式编辑顺序不变。
- 首屏实现 S01–S08，排除未到展示日期的兜底项；分享图来自最终首件。各栏目数量不变，latest 保持 12。
- 四套首页消息采用新定位；真实正文展示增加语言标签。列表、收藏、弹窗及首屏状态按语言重建，URL 缓存与 buildId 检查保持原有契约。
- 390px 手机图片上限改为 `min(27svh, 18rem)`，为语言标签与较长引述保留空间；320px 页眉缩小字标和间距，保留触摸操作。摘要显式采用语言对应正文字体。

## 首页摘要逐条审阅

审阅对象来自本次生产构建的实际 `more` 与 `latest`，每种公开语言 6 + 12 个位置、12 个去重条目。仓库首页已切换到 p_274–p_285；规格举例的 p_228、p_234 不在当前范围。审阅了三种语言的完整摘要，并与渲染出的作品对照。

| ID | 主体与结果／用途 | en | zh-Hans | ja |
| --- | --- | --- | --- | --- |
| p_274 | 人物九宫格英文反应贴纸 | 通过 | 通过 | 通过 |
| p_275 | 狗狗九种聊天反应 | 通过 | 通过 | 通过 |
| p_276 | 两人四张照片亭合影 | 通过 | 通过 | 通过 |
| p_277 | 狗狗虚构报纸头版 | 通过 | 通过 | 通过 |
| p_278 | 蜡笔猫工作与休息反应 | 通过 | 通过 | 通过 |
| p_279 | 毛绒浣熊社交电量反应 | 通过 | 通过 | 通过 |
| p_280 | 黏土青蛙鼓励贴纸 | 通过 | 通过 | 通过 |
| p_281 | 像素幽灵游戏反应 | 通过 | 通过 | 通过 |
| p_282 | 同一人物上下两格出门反差 | 通过 | 通过 | 通过 |
| p_283 | 咖啡、书与周末剪纸拼贴 | 通过 | 通过 | 通过 |
| p_284 | 可改姓名与年龄的生日收藏卡 | 通过 | 通过 | 通过 |
| p_285 | 狗狗独自在家的四格漫画 | 通过 | 通过 | 通过 |

这些摘要已符合主体、结果／用途明确的要求，无审校措辞、原生 GIF 或无记录验证承诺，因此无需改写源摘要。本次没有受摘要修改影响的详情页 meta description，也不需要刷新条目译文 sourceHash。13 个修改的首页消息键已完成英文／日文对照审校，并在 `production/localization/ja/reviews.json` 追加当前指纹记录。

完整原文、各栏目 ID、实际模板选择及构建清单保存在本地 `.artifacts/home-language/production/home-summary-review.json`。首件分别为 en/ja 的 p_274、zh-Hans 的 p_024；ja 没有日文正文模板，首页模板均无摘录，符合规格。

## 本地验证

构建来自当前工作区，基准提交 `ee26e18e835a78833ae8d2a46db3298d48a416dd`，buildId 为 `ee26e18e835a`。已有其他未提交工作参与工作区运行，但不纳入本任务提交。日志和截图保存在忽略目录 `.artifacts/home-language/`。

| 检查 | 结果 |
| --- | --- |
| `BUILD_MODE=production npm run content:validate` | 0 error、0 publish error；10 个既有非阻断 warning、1 个未使用媒体 info |
| `npm run locale:check -- --locale ja` | 349/349 页面、349 approved、1978 字段，ready=true，无 finding |
| `BUILD_MODE=production npm run typecheck` | 通过 |
| `npm run lint` | 通过 |
| `prettier --check`（仅本次变更文件） | 通过 |
| `npm test` | 53 个文件、430 项全部通过 |
| `BUILD_MODE=production npm run build` | 根路径静态产物通过；en、zh-Hans、ja |
| 生产 HTTP + Chromium | 138 通过，2 个仅预览适用用例跳过 |
| `BUILD_MODE=preview BASE_PATH=/prompt-seen npm run build` | 通过；en、zh-Hans、ja、ar，所有页面 noindex |
| 预览 HTTP + Chromium | 101 项全部通过；含默认语言 → 每个目标语言 → 默认语言及 en → zh-Hans → ar → en |

生产 Playwright 命令使用 `PW_BROWSERS=chromium`、`--workers=1`，文件为 home.http、home.browser、home-language.browser、list.http、list.browser、templates.http、seo.http、favorites.browser、prompt-languages.browser、shell.browser。模板语言切换、参数迁移、复制与下载由 prompt-languages.browser 覆盖。

预览运行相同的 home.http、home.browser、home-language.browser、list.http、templates.http、prompt-languages.browser、shell.browser，`--workers=1`。

浏览器检查包含首页直达／刷新、根首页别名、title/canonical/hreflang/OG、所有页 JSON 摘要、模板列表、复制、标注、轮换焦点、收藏、无限追加、回退前进、缺译收藏恢复，以及手动拦截后释放的 feed／收藏／弹窗竞态。桌面 1440×900、手机 390×844 和 320px 窄屏均无横向溢出；390px 复制操作保留首屏可见。浅深主题、减少动画和 serious/critical 可访问性回归通过。

最初安装版 Chrome 扩大回归出现 16 个失败（多项浏览器启动、页面创建及超时，另有动画断言失败）；没有将该轮记作通过。保留 `production/chrome-first-run.log` 和 traces 后，使用 Playwright 自带 Chromium 单进程重跑全部上述范围，138 项通过。全量单元测试最初发现一个非标准断点，改为项目既有 480px 边界后重跑全部 430 项通过。

## Standards

规范审查发现 3 项并全部修复：轮换测试等待 hydration 且确认源索引改变；收藏竞态测试等待旧响应完成；lang 元素显式设置字体。复核无剩余发现，未发现需处理的代码异味。

## Spec

规格审查发现 2 项并全部修复：收藏竞态等待响应完成；手机图片高度文档同步并说明原因。复核无剩余发现。

## 发布边界

没有部署、推送或创建自动监控。既有 ja 候选验收绑定旧输入，不能作为本次最终发布验收；若合并发布，需要按日语规格对最终提交完成发布验收。生产只读核查、Search Console 基线与上线后的收录／标题／查询观察仍以实际发布日 D 为准，尚未执行。
