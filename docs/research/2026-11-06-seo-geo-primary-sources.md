# SEO / GEO 原始规范核对

核查日期：2026-11-06（America/Los_Angeles）；官方页面访问窗口：2026-11-07 03:25–03:29 UTC。仓库基线：`89395feb8e5fda7419aa3f5d2594df8a71fb3363`。本文件是规范与代码的只读研究，不代表已经验证生产部署、Google 收录、流量或 ChatGPT 引用效果。生产证据、页面选择和实施验收由本轮主报告记录。

## 已验证的官方要求

| 问题 | 原始来源与定位 | 对本轮的含义 |
| --- | --- | --- |
| 什么使页面具备 Google 收录资格？ | [Google technical requirements](https://developers.google.com/search/docs/essentials/technical)，页面 “Google Search technical requirements” 与 “Googlebot isn't blocked” | Googlebot 可访问、HTTP 200、可索引正文是最低门槛。满足门槛不保证收录；普通客户端 curl 200 也不证明真实 Googlebot 得到同一响应。 |
| AI 展示是否需要另一套特殊 SEO？ | [Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)， “Build and maintain a clear technical structure” | 官方将基础 SEO、索引与摘要资格列为前提；本轮应先验证正文和抓取链路。当前文档还列出 Search Console 的 generative AI inclusion 设置，其账户可见性及本站状态需实际检查，不能由文档推定。 |
| llms.txt、Markdown 或特殊 schema 能保证 AI 展示吗？ | 同上，“Mythbusting generative AI search” | Google 明确不使用 llms.txt 作特殊排名信号，也不要求 AI 专属 schema。现有 Markdown 可以服务确实读取它的工具，但不能把生成成功写成 SEO / GEO 成效。 |
| 什么内容值得展示？ | 同上，“Create valuable, non-commodity content for your audience” | 一手经验、独特可核对材料与用户实际需要是方向；对本项目可转化成精确提示词、输入、输出及已知限制，不能补造资历、测试或效果。 |
| 结构化数据验证通过意味着什么？ | [Google structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)， “Content”、“Relevance” 与开头的非保证说明 | 标记须忠实于用户可见正文。Rich Results Test 可发现多数技术问题；通过不保证富结果。仅 JSON 可解析也不等于 Schema.org 语义或 Google 富结果资格通过。 |
| OpenAI 搜索与训练权限是否独立？ | [Overview of OpenAI Crawlers](https://developers.openai.com/api/docs/bots)，正文及 OAI-SearchBot / GPTBot / ChatGPT-User 表格 | OAI-SearchBot 服务 ChatGPT 搜索，GPTBot 服务潜在训练采集，二者可独立配置。搜索访问还需放行官方 IP。ChatGPT-User 是用户触发读取，不决定搜索资格，且 robots 规则可能不适用。不能把允许训练当成提高引用的必要条件。 |
| Google 搜索和 Google-Extended 是否等价？ | [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)， Googlebot 与 Google-Extended 两节；页标更新 2026-10-30 UTC | Googlebot 控制 Google Search。Google-Extended 不影响 Search 收录与排名，但控制范围同时含 Gemini 训练及 Gemini / Vertex 的 grounding；不能一概把它叫“只管训练”的开关。它没有独立 HTTP UA 字符串。 |

以上页面均先搜索或直接打开到官方正文再核对，不以搜索摘要代替正文。官方描述可能更新，应在实际部署或下一轮测量时重查。

## 当前仓库实现与证据边界

| 已验证的代码事实 | 位置 | 能证明 / 不能证明 |
| --- | --- | --- |
| canonical origin 为 `https://promptseen.dev`，根路径部署，`robots.aiTraining: allow` | [content/site.yaml](../../content/site.yaml):4、9–11 | 证明仓库当前配置；不证明线上 CDN / WAF 没有覆盖。此次不修改既有训练授权。 |
| 搜索及用户触发 UA 一组允许；训练组跟随 aiTraining；通配 UA 允许 | [robots.ts](../../src/modules/geo/robots.ts):9–15、31–59 | 按当前根路径配置，生成器会允许 Googlebot、OAI-SearchBot 与 GPTBot 访问 `/`。需另核对生产 robots 与响应策略。当前将 Google-Extended 收进 training 分组是粗分类，其 grounding 范围见上表。 |
| metadata 生成 self canonical、已构建语言替代与默认语言 x-default；可输出 Markdown alternate；noindex 是显式可选项 | [build.ts](../../src/modules/seo/build.ts):70–123 | 证明已有实现，无需仅因 SEO 任务重复新增。页面实参、产物及生产 HTML 尚须验证。 |
| 索引资格在构建层由 locale enabled 且内容 published 判定 | [indexing.ts](../../src/modules/seo/indexing.ts):24–30 | 这是项目发布规则，不是 Google 实际收录状态。 |
| Prompt JSON-LD 为 CreativeWork，text 为实际提示词，inLanguage 为提示词语言；未知值会省略 | [structured-data.ts](../../src/modules/seo/structured-data.ts):30–36、174–195 | 数据模型有意避免捏造未知属性；仍需和页面、生成记录逐项比对。CreativeWork 本身不保证任何 Google 富结果。 |
| llms.txt 代码注释已注明 Google 不使用它；功能为提供 Markdown 链接 | [llms.ts](../../src/modules/geo/llms.ts):1–4、22–29 | 不应把现有 llms.txt 作为本轮主要增长杠杆，也无需无证据重做。 |
| Markdown 的示例记录输出时间、显示模型名、provider、参数、notes、不同于当前正文的实际 prompt、输出图；未输出 run.references / referenceLabels | [markdown.ts](../../src/modules/geo/markdown.ts):171–225；对照 [ExampleRuns.tsx](../../src/ui/prompt-detail/ExampleRuns.tsx):119 和 [RecordedShowcase.tsx](../../src/ui/prompt-detail/RecordedShowcase.tsx):67–78 | 是代码可证的 HTML / Markdown 证据不对称。只有选定页面确实需要参考图且生产文档复现此缺口时，才支持把它列为本轮瓶颈或必要连带问题。 |
| 展示模型名使用 `displayName ?? providerModelId` | [markdown.ts](../../src/modules/geo/markdown.ts):171–172；[TestInfo.tsx](../../src/ui/prompt-detail/TestInfo.tsx):10–11 | 可能无法同时看见别名与精确 ID。需要读原始 run；若 ID 为 null，应保留未知，不能从品牌名推测版本。 |

## 待验证假设与未知项

- **待验证假设：** 对参考图驱动的提示词，补齐机器可读文档的输入链接和标签，会使抓取者更容易把正确的输入与对应输出、参数关联。可用同一页面 HTML / Markdown 一致性断言验证技术结果；引用准确率仍需固定问题的独立重复测量，不能从断言通过推导提升。
- **未知：** 本站是否被 Google 收录、曝光与点击、主要国家设备、Google 选定 canonical、实际爬取时间、真实 OAI-SearchBot 到访与 CDN 阻断率。须使用 GSC、生产响应、带身份核验的日志；本文件没有这些数据。
- **未知：** ChatGPT 是否读取本站 llms.txt / index.md，及哪些页面进入其检索候选。官方 crawler 文档没有承诺采用该文件，也没有给本站任何引用保证。
- **未知：** Google 文档所述 generative AI performance report 与 inclusion setting 是否已对当前账户开放；实际 UI / 导出优先于推测。

## 验收方法的边界

1. 技术验收保存时间、URL、请求 UA、HTTP 状态与头、原始正文，并分别比较 HTML 可见正文、JSON-LD 和 Markdown。真实爬虫身份需要 IP / DNS 核验；自定义 UA curl 仅用于差异测试。
2. Schema.org 语义检查与 Google Rich Results Test 分开记录。结果需包含测试 URL / 截图或原始返回；未运行就写“未运行”，不能用单元测试冒充外部验证。
3. Search Console 以固定查询、页面、国家、设备、搜索类型与完整日期窗口导出。部署和首次重新抓取时间应留档，避免将尚未重新抓取的阶段算成修复后效果。
4. GEO 测量固定产品及可见模型标识、问题原文、语言、地区与会话条件；每题多次新会话，保留完整回答与所有引用 URL。“引用本站但模型或参数错误”不计准确引用；没有联网或调用失败另记技术失败。产品 UI 不暴露精确模型版本时写“未暴露”，不反向猜测。

既有 [2026-11-01 外部证据研究](prompt-seen-external-growth-evidence-2026-11-01.md) 明确记载当时尚未部署，且 origin 与仓库归属已有变化。它可以解释历史内容来源，但不得复用为本轮生产状态、排名或流量基线。
