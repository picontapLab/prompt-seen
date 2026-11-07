# Prompt Seen：SEO / GEO 取证、局部修复与观测

调查日期：2026-11-06，America/Los_Angeles。原始记录使用 UTC ISO 时间（对应 11 月 7 日 UTC）。本报告主体记录本地审计完成时的基线；当时尚未部署。用户随后授权发布，已完成的生产部署与搜索提交见 [RELEASE.md](RELEASE.md)。**仍未证明搜索排名、曝光、点击或 AI 引用已提高**。

**已确认的结论：** 选定页面的基础 HTTP、索引指令和规范地址正常，但 Google 的收录状态不同；4 个参考图页面的生产 Markdown 均遗漏实际输入。当前能直接修复并验收的是“可引用的生成证据不完整”，不能把它认定为未收录的原因。

**有效基线：** 2 页已收录、2 页已发现未收录、1 页 Google 尚未知；Search Console 的 28 天效果仍在处理。Google AI Mode 的固定 7 题 × 2 次有效独立会话查询，没有回答引用 Prompt Seen，回答级准确引用率为 0/14。引用精确率分母为零，记为 N/A。没有可比的 28 天历史流量数据。

## 范围与选择依据

- 主要语言：英语。生产默认语言为 `en`；本地 production 内容索引为英语 231 个 prompt / 68 个 template，简体中文 215 / 67。选择英语依据现有默认入口、材料覆盖及实际英语 SERP，**不是**因为已有流量证明英语最好。花瓶案例的页面为英语，真实提示词仍为中文，不翻译实际运行文本。
- 一个意图簇：**使用参考图制作、调整商品视觉，并找到可核对输入与输出的提示词**。九宫格、角度变化和局部改色是这一工作流的具体任务；不新增语言、页面或主题入口。
- 主要搜索引擎：Google。已登录 Search Console，可读取真实 URL Inspection；SERP 使用 `hl=en&gl=us&pws=0`、桌面 Chrome，界面显示美国。账户、地理与时点仍是限制。浏览器插件 AITDK 注入的访问量估计不作为需求或流量证据。
- 主要 AI 产品：Google Search **AI Mode**。已登录、可执行联网问题并读取引用，且便于与同一引擎收录状态对照。它不等于普通 SERP 的 AI Overview，也不等于 Gemini App。UI 未暴露精确模型 ID，记录为 null；没有猜测版本。ChatGPT 标签页曾尝试打开，但没有形成有效测量，不算本轮第二个产品。
- 未取得查询量或完整查询表现，因此这是根据现有内容和公开任务需求选择的聚焦实验，不是“高流量关键词”结论。[真实 Google 结果](evidence/search-q2-r1.json)及[原始社区九宫格请求](https://www.reddit.com/r/aicuriosity/comments/1pscbkf/prompt_to_create_amazing_3x3_grid_ad_campaign/)支持任务确实存在；不能量化需求规模。

| 角色 | 页面与本地源文件 | 选择原因 |
| --- | --- | --- |
| 修改 | [p_123 九宫格案例](https://promptseen.dev/en/prompts/product-brand-story-grid/) · [英文正文](../../../content/prompts/p_123/locales/en.mdx) | 同一产品输入、两个不同 prompt/output，可核对重复使用与变体边界 |
| 修改 | [t_017 九宫格模板](https://promptseen.dev/en/templates/product-brand-story-grid/) · [英文正文](../../../content/templates/t_017/locales/en.mdx) | 已收录的复用入口，区分已记录值与未测试新值 |
| 修改 | [p_153 陶瓷角度变化](https://promptseen.dev/en/prompts/design-top60-03/) · [英文正文](../../../content/prompts/p_153/locales/en.mdx) | 单参考输入与实际角度变化，避免把材质相似说成几何精确 |
| 修改 | [p_218 花瓶局部改色](https://promptseen.dev/en/prompts/image26-s10-marked-vase-color-edit/) · [英文正文](../../../content/prompts/p_218/locales/en.mdx) | 两个有顺序的输入；最能暴露 Markdown 丢输入的缺陷 |
| 参照 | [p_151 棚拍商品主图](https://promptseen.dev/en/prompts/design-top60-01/) · [原正文](../../../content/prompts/p_151/locales/en.mdx) | 邻近商品任务、同站架构、已有收录；没有参考输入，保留正文与元信息，Markdown 前后逐字一致 |

参照页是观察参照，不是随机对照：它是纯文本生成、与三个未收录案例起点不同，不能假设平行趋势。

固定问题原文见 [questions.json](evidence/questions.json)。普通 Google 搜索直接使用问题原文；AI Mode 在其后统一加 `Search the web and cite the sources supporting your answer.`。Q3、Q7 是证据完整性的诊断题，不作为已证实的获客词。

| ID | 固定问题 | 重点页面 |
| --- | --- | --- |
| Q1 | How can I create AI product photos from a reference image with tested prompts and visible inputs and outputs? | 全部修改页 |
| Q2 | How can I create a 3x3 product campaign grid from one reference photo? | p_123 / t_017 |
| Q3 | Which product campaign grid prompt shows the exact prompt, reference image and generated result? | p_123 / t_017 |
| Q4 | How can I change a ceramic product photo to a three-quarter view while preserving its shape and material? | p_153 |
| Q5 | How can I change only the color of a vase in a photo using an AI image editing prompt? | p_218 |
| Q6 | How do I use an original product photo and a marked-up reference image together for a targeted color edit? | p_218 |
| Q7 | Can a tested product photography prompt guarantee the same output if the model ID and seed are not recorded? | 全部修改页 |

## 基线：实现、生产与检索状态分开核对

生产 [build.json](evidence/build.json) 为 `7ab2486c21460834dc3cbf7a20bb751baf842b3a`；本地开始时 HEAD 为 `89395feb8e5fda7419aa3f5d2594df8a71fb3363`、工作区干净。二者 Git tree 均为 `57e16b22806b0cb520bd19639f6e3ada146916e3`，代码树相同。生产配置为根域 `https://promptseen.dev`、静态 export、英语和简体中文；[部署工作流](../../../.github/workflows/deploy.yml)使用 Cloudflare Pages，并运行 `check:live` 与可选 IndexNow。没有假定工作流成功就等于生产正确，而是抓取实际响应。

原始 curl 抓取清单：[http-capture.json](evidence/http-capture.json)。每个页面保留 `.headers`、`.html`、`-md.headers`、`-md.md`；综合字段见 [baseline-pages.json](evidence/baseline-pages.json)。

| 页面 | 发现 / 抓取门槛：已验证 | Google 实际收录：已验证 | 需求与证据：事实及限制 |
| --- | --- | --- | --- |
| p_123 | sitemap 有 URL；HTML/Markdown 200；self canonical、en/zh-Hans/x-default 正常；无 noindex；HTML 有 a_229 | [已发现未收录](evidence/gsc-inspection-p123.json)，last crawl N/A；GSC 引用 sitemap | 有两次九格输出，HTML 有输入；Markdown 无 a_229。原标题没明确参考图任务；旧正文未解释参数未知与版本来源 |
| t_017 | 同上；HTML 有 a_229；模板链接到案例 | [已收录详情](evidence/gsc-inspection-t017-expanded.json)：Nov 6, 2026 6:32:54 PM（UI 显示时间），Googlebot smartphone，成功抓取、允许索引；Google canonical 为被检查 URL | 同一批两个记录，不是额外两次测试。Markdown 仍无输入，已记录值与新值需要明确区分 |
| p_153 | sitemap 有 URL；200、canonical、语言与索引指令正常；HTML 有 a_359 | [已发现未收录](evidence/gsc-inspection-p153.json)，last crawl N/A | 一次角度变化；Markdown 无 a_359。不能从单张新视角推断真实背面几何正确 |
| p_218 | sitemap 有 URL；200、canonical、语言与索引指令正常；HTML 有 a_373 / a_374 | [URL is unknown to Google](evidence/gsc-inspection-p218.json)，无已报告 sitemap/referrer、last crawl N/A | 两个输入顺序至关重要；Markdown 均缺失。英语页面使用中文实测 prompt 是语言事实，不是错误翻译 |
| p_151 | sitemap 有 URL；200、canonical、语言与索引指令正常；无参考输入 | [已收录](evidence/gsc-inspection-p151-control-expanded.json)，Nov 6, 2026 2:34:19 PM（UI 显示时间），Googlebot smartphone，抓取成功，允许索引，Google canonical 为被检查 URL | 对照正文不改；无输入缺陷。起始收录状态不同，不能作无偏因果对照 |

**未知：** p_123 / p_153 未收录的原因、p_218 的发现延迟原因、上述案例实际何时被 Googlebot 首次读取。sitemap 文件存在与 GSC“没有报告 sitemap”可以同时发生，不能据此断定站点地图坏了。技术门槛满足不保证收录。

[生产既有检查](evidence/check-live-before.txt)：19 pass / 2 warning / 0 fail；两个警告是移除地址返回 404、错误页直达 200 但携带 noindex，均非本轮页面，不扩大修改。两个 sitemap 共 639 个 URL；13 种模拟爬虫 UA 获得正常页面。UA 模拟不是经 IP 验证的真实爬虫。

另外对全部 5 个选定 URL 分别使用 Googlebot / OAI-SearchBot UA 抓取，[10 份原始响应](evidence/selected-ua-checks.json)均为 200、canonical 正确，每页两种 UA 的正文 SHA-256 相同。这只能排除本次网络位置下的 UA 差异，不能替代真实爬虫验证。

Search Console：首次 24 小时视图显示 0 clicks / 0 impressions，仅代表当时窗口；[28 天查询报告](evidence/gsc-28days.txt)与[页面索引汇总](evidence/gsc-indexing.txt)显示 processing。不能把 unavailable 转为 28 天零值，也不能用单日平均位置 0 当排名。站点地图 UI 显示 11 月 6 日提交/读取成功、发现数 0，但逐 URL 已确认部分收录，不能用汇总延迟否认它们。

[28 天 Pages 标签尝试](evidence/gsc-28days-pages-attempt.json)同样受 processing 限制，UI 仍保留 Top queries，未取得页面维度效果数据；该文件不冒充页面表现导出。

[Cloudflare AI Metrics](evidence/cloudflare-ai-metrics.json)（Last 7 days）显示约 3.23k 个 200、1 个 404，Googlebot 781、GPTBot 2.41k 等站点级分类计数；[原始请求表快照](evidence/cloudflare-logs-availability.json)保留最近一小时中的 50 行，可见具体路径、时间及状态；公开提交前已脱敏来源 IP。该有限快照没有完整 UA、verified-bot / 反向 DNS 证据，也没有覆盖所选页面全部历史；不能据此计算页面抓取成功率或断言某 AI 已读到内容。本轮 check:live、验证器及搜索测量可能诱发访问，分析时必须排除。没有开启日志付费产品、改变 WAF 或修改爬虫策略。

## 原始生成证据与内容差异

核查实际提示词 SHA-256（按现有管道 trim 规范化）、参考原图与输出原图字节哈希、记录映射、生产正文、JSON-LD 和 Markdown。核验结果见 [verification.json](evidence/local-after/verification.json)。没有进行新的图像生成；本轮视觉查看不被记作新生成测试。

| 实际记录 | 输入 → 输出 | 原始证据及核验结果 |
| --- | --- | --- |
| x_168，2026-10-29 | a_229 → a_228 | [run.yaml](../../../content/examples/x_168/run.yaml)、[原回执快照](evidence/receipts/x_168.json)、[导入记录](../../../production/applied/r4-default.json)：prompt / 输入 / 输出 hash 一致；回执 model 为 null |
| x_196，2026-10-29 | 同一 a_229 → a_267 | [run.yaml](../../../content/examples/x_196/run.yaml)、[原回执快照](evidence/receipts/x_196.json)、[导入记录](../../../production/applied/r4-alternate.json)：仅 palette / scenes 为另一组值；hash 一致；回执 model 为 null |
| x_269，2026-10-30 | a_359 → a_358 | [run.yaml](../../../content/examples/x_269/run.yaml)、[持久 audit](../../../production/design-ai-top60-2026-10/audit/design60-3-v6.json)：prompt / 输入 / 输出 hash 一致；回执仅称 GPT Image |
| x_282，2026-11-04 | a_373、a_374（依次为原图、标注覆盖层）→ a_372 | [run.yaml](../../../content/examples/x_282/run.yaml)、[S10 audit](../../../production/gpt-image-26-2026-11/audit/S10.json)：全部 hash 一致；回执 11 月 5 日 UTC 对应洛杉矶 11 月 4 日，无日期冲突；回执仅称 GPT Image |

`x_168` / `x_196` 快照是从 `.artifacts/content-production/top50-2026-10/jobs/{r4-default,r4-alternate}/job.json` 原样复制，保留源路径和回执。其余 audit 原本就在仓库。全部参考输入是本站合成素材；不是顾客商品、原社交作者输入或独立买家的复现。

所有选定 run 的 `providerModelId` 都是 null，`parameters` 都是 `{}`。显示的 GPT Image 2.5 / 2.6 来自[站主 11 月 5 日补充](../../../production/model-version-annotation-2026-11-05.json)，不是工具返回的 API ID。空参数不证明默认 seed、quality 或 sampling。现有 `verified` 表示有记录的生成，不证明所有约束都完美满足。

视觉复核：九宫格含九格，部分格是材质特写而非完整产品；陶瓷例子展示更高视角和把手，但不能证实隐藏几何；花瓶变为钴蓝、标注消失，但新釉面更亮。这些观察与已保存 notes 相符，新正文保留了限制，没有增加成功率或资历。

与当前检索内容比较：

- Google Q2 结果包含 [ComfyUI 的单图九宫格教程](https://www.youtube.com/watch?v=o6zPwB5U4Gg)和[社区原帖](https://www.reddit.com/r/aicuriosity/comments/1pscbkf/prompt_to_create_amazing_3x3_grid_ad_campaign/)。后者有提示词、九格任务和上传步骤；正文中的“100% accuracy”是要求，不能当效果证据。Prompt Seen 的具体补充价值是两个可逐字核对的 prompt、同一输入原图、不同输出及哈希链，不是声称九宫格概念独有。
- [Pixonara 原始产品页](https://pixonara.com/prompts/ai-product-photo-prompts)已经提供按任务选择、保留产品特征和发布前核对的说明；它也是 p_153 的灵感来源。仅补泛化“如何写产品 prompt”没有明确增量；本轮把本站实际材料与限制展现出来。
- [OpenAI 的 markup 示例](https://developers.openai.com/api/docs/guides/image-prompting#guide-an-edit-with-markup)是 p_218 记录的来源，不是本站生成回执。本例额外价值是本站合成底图、独立覆盖层、实际中文工作 prompt 与输出中釉面变化，不能声称它就是官方原图测试。
- Q4 / Q6 普通 SERP 混入真实陶瓷摄影和 Photoshop 调色教程，见 [Q4](evidence/search-q4-r1.json)、[Q6](evidence/search-q6-r1.json)。意图匹配是待验证假设，不是每一题都有强搜索需求的证明。当前 7 份已加载结果未出现本站；不能把未出现换算成精确排名。

## 可证伪假设与实际实现

| 环节 | 本轮定义 |
| --- | --- |
| 主要瓶颈 | 参考图驱动案例的生成证据不完整地呈现在可检索文档中：HTML 有输入，Markdown 丢输入；精确模型未知、参数未记录和来源归属没有在选定正文中充分说明 |
| 支撑证据 | 四份生产 `*-md.md` 均没有对应参考 asset；生产 HTML 有；[旧 exporter](../../../src/modules/geo/markdown.ts) 原来只序列化 output。原始记录确有输入、版本归属证据、未知参数 |
| 最小改动 | 在共享 Markdown exporter 中保留每个 run 的输入顺序、本地化 slot label、预览及原始字节 URL，并分开 Output；仅 4 个英语正文/标题/描述补充具体任务、可点击 run 记录和已知限制；不改变 prompt、模型字段、参数、输出或架构 |
| 当场技术指标 | 4 页共 7 次 run-input 展示（模板复用两个 run）从 Markdown 0 次完整展示变为 7/7；原图 URL 可访问且 hash 匹配；HTML / Markdown / JSON-LD prompt 相同；未知参数不被补成默认值 |
| 预期检索变化（未验证） | 在页面被重新抓取且具备收录资格之后，固定问题的准确引用覆盖可能上升；更具体的标题/摘要可能提高相关查询 CTR、有效曝光及点击。没有指定必然提升的幅度 |
| 技术反证 | 任一 run 输入遗漏、乱序、错误原图，或输出与 prompt/hash 不匹配，则修复不成立，阻止发布 |
| 检索反证 | 已确认重新抓取，完成同口径 28 天后，固定问题准确引用未改善，或只得到错误模型/输入归属的引用，不支持“证据呈现改善引用”的假设；若曝光相近而 CTR/相关点击下降，不支持标题/摘要假设，复查或回退文案 |
| 不能判定的情况 | 未收录、未重抓、GSC 仍缺数据、样本极少、问题没有实际曝光、AI 缓存/产品变更：不能判为成功，也不能把它们当内容无效的因果反证 |

改动没有声称 Markdown 是 Google 排名信号。Google 不需要 llms.txt 或 AI 专属 schema；本轮保留已有文件，修复其忠实性。SEO 侧的实施是选定页面可抓取的具体正文与元信息；Markdown 修复服务实际读取该表示的检索者，是否影响本轮 AI Mode 仍未知。技术规范见[原始资料研究](../2026-11-06-seo-geo-primary-sources.md)。

实际 diff：[implementation.patch](implementation.patch)。核心位置：[markdown.ts](../../../src/modules/geo/markdown.ts#L222)、[输入契约回归测试](../../../scripts/lib/content/content.test.ts#L480)及上表 4 个正文文件。共享修复会自然作用于现有 134 个有参考输入的 Markdown 文档（英语 67、简中 67），没有新增页面或批量改写正文。无参考输入文档不增加空章节；p_151 Markdown 与生产基线逐字相同。

只更新英语正文实际修改日，不伪造 lastTested / recordedAt。保留中文正文和它们的旧审核状态；内容校验因此新增 4 个 sourceHash 过期警告，不能把未复核翻译标为 reviewed。没有为消除警告扩展到第二语言。无新增依赖。

## 技术验收与爬虫政策

| 检查 | 实际结果与证据 |
| --- | --- |
| 内容校验 | [0 error / 0 publish error](evidence/content-validate.txt)，12 warnings：含 4 个本轮英语变化导致的中文翻译待复核，其他为既有警告 |
| 针对性回归 | [77 tests passed](evidence/targeted-tests.txt)：内容管道、Markdown、structured data；新用例通过真实内容加载管道验证双输入顺序、slot 标签、原图 CDN URL 和输出归属，同时覆盖 prompt / template |
| Production 构建 | [构建成功](evidence/build-after.txt)，Next.js 16.4.2，1243 静态 routes，TypeScript 编译通过；生成 `dist/` |
| 已有 SEO HTTP 测试 | [22 passed / 1 skipped](evidence/seo-http-tests.txt)，使用项目 nginx 容器；跳过项是当前 production 构建没有 drafts 的条件测试 |
| 无 JavaScript Playwright | [5 页通过](evidence/local-after/verification.json)：200、可抓取 prompt/正文、自指 canonical、无 noindex、双向 en/zh-Hans、对应 prompt language、Markdown MIME 与 canonical Link、输入原图 HTTP/hash、JSON-LD 内容一致 |
| 外部 Schema.org Validator | [生产 p_123](evidence/schema-validator.json)：2 items / 0 errors / 0 warnings；4 页本地 JSON-LD 合并提交，见[输入](evidence/local-after/schema-input.html)、[原始响应](evidence/local-after/schema-api.json)、[汇总](evidence/local-after/schema-validator.json)：8 objects / 0 errors / 0 warnings。不是 Google Rich Results 展示保证；本轮未运行 Google Rich Results Test |
| 视觉 | [桌面花瓶页](evidence/local-after/p218-desktop.png)、[390px 九宫格页](evidence/local-after/p123-mobile.png)：无横向溢出，原图/输出、真实中文 prompt 和限制可阅读；布局架构未改 |
| 静态检查 | [全仓 lint](evidence/lint.txt)、[最终定向 lint](evidence/lint-final.txt)与 `git diff --check` 通过 |

修改 Next.js 相关导出前已阅读本地 `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`、`01-getting-started/15-route-handlers.md`、`14-metadata-and-og-images.md` 的相关指南；保留静态 GET / 构建时 metadata / 主机负责 headers 的现有架构。

生产 [robots.txt](evidence/robots.txt) 与 [content/site.yaml](../../../content/site.yaml) 一致：搜索和 AI 检索允许，现有训练策略也为 allow。Googlebot 与 Google-Extended、OAI-SearchBot 与 GPTBot 分开核对；Google-Extended 还涉及 Gemini grounding，不把它简单等同于仅训练。**本轮没有修改训练授权。** 没有观察到选定页面的 `noai` / noindex / nosnippet 限制；真实边缘策略不能单凭 UA 模拟完全证明。

复验命令（先完成 production 构建；第二条保持运行，再在另一终端执行最后一条）：

```sh
BUILD_MODE=production npm run build
PORT=8090 sh scripts/nginx.sh
node docs/research/seo-geo-2026-11-06/verify.mjs
```

## SEO / GEO 后续观测协议

**SEO**：固定上列 5 个 URL、7 个问题原文、Google Web、United States、Desktop；Mobile 另出一组，不能合并。GSC 新出现的近义查询保留为探索性数据，下轮再预注册，不回填本轮固定查询。长自然语言问题在 GSC 可能没有可披露数据，须同时保留逐页面总量与缺失标记，不把隐私省略/未报告当零。

以实际部署日 D 留档：Git SHA、UTC/洛杉矶时间、生产 build.json、HTML/Markdown hashes、其他同期改动。先导出 D−28 至 D−1 的完整数据；本轮没有这段可用历史，不补造。逐 URL 保存重新抓取时间 R_i、Google-selected canonical、索引状态。D 至各自重抓期间单列。后窗口优先用 R_i 后第 1–28 个完整日；也保留统一日期窗口以便参照，说明混合收录起点和季节因素。

导出字段：date / query / page / country / device / clicks / impressions / CTR / average position。CTR 用总 clicks / 总 impressions；位置按曝光加权，不平均平均值。排名分布报告日级 query-page 平均位置的 1–3、4–10、11–20、>20 桶及各桶曝光占比，注明这是 GSC 平均位置分布代理，不是单次真实排名直方图。SERP 另按相同问题、国家、设备记录前 10 个自然结果及 AI 展示，保留时间和截图，不能与个性化样本混算。

p_151 保留未修改作参照；t_017 与它起初均已收录，可优先比较同窗口方向。其余 3 页从未收录到收录的曝光变化不能全部归功于内容；没有有效前窗口或可比趋势时，只做描述统计。任何部署、算法更新、产品/模型变更、索引延迟、节日与外部链接变化都记入混杂因素日志。

**GEO**：基线主样本为 [geo-summary.json](evidence/geo-summary.json)，对应 `ai-q1-r1.json` 至 `ai-q7-r2.json`。每条包含 capturedAt、产品、精确问题、提交文本、完整可见回答、引用 href、国家/语言参数、设备与 modelId:null。每次从新的查询会话进入，不加本站 URL 或品牌提示、不在同一对话追问。相同账户/网络，后台缓存与个性化无法排除；Q3 两次回答文本完全相同，不能假设统计独立。

后续在重抓后固定每周同一时段、每题 2 次新会话复测；先使用与基线相同的完整两轮作配对描述。若增加到 3 次，应另建完整协议版本，不能只对命中题加测。遵守产品访问限制，出现验证/错误即停止当轮并记录，不绕过、不计入“零引用”。本轮第三轮仅 Q1 完成，Q2 流量验证失败，剩余未执行；它们不纳入 14 次主统计。

逐回答标记：是否生成联网回答；是否出现本站 canonical 的引用链接（同名 `.com` 不算）；引用指向哪个页面；引用所支持的句子；模型归属、输入数量/顺序、prompt、输出、限制是否和真实记录一致。仅提到品牌、仅无关链接或含错误模型/参数的引用，不算准确引用。回答级准确引用率 = 含至少一条支持正确事实的本站引用的有效回答数 / 有效联网回答数；另报本站引用精确率 = 正确本站引用数 / 全部本站引用数。无本站引用时后者为 N/A。需要人工逐条判定，不能仅靠域名字符串视作准确。

准确引用、AI referral 和站内使用是不同指标。本轮没有足够的 AI referral 或用户行为数据；训练爬取数不是引用率，也不是有效曝光。

## 采集质量与未完成项

- `pilot-incomplete/` 明确排除：首次 AI 采集器只读取 `main/#search`，漏掉 AI Mode 的引用 DOM；另有 GSC 标签页重复声明变量导致没有真正切换 URL 的错误快照。随后改为新作用域、校验正文中的目标 URL，并重新采集。**先前中间汇报的“5 页均已发现未收录”错误；本报告和有效记录已更正。**
- Schema.org 浏览器代码输入首次没有真正提交编辑器内容；最终使用公开 `/validate` 接口提交抽取的代码，原始结果 0 error / 0 warning。没有把失败的空 URL 检查算作通过。
- Google 流量验证原文保留在 `ai-q2-r3.json`，客户端 IP 已标记脱敏；不绕过验证。其余有效回答完整保留。所有 source/receipt 来自已有资料，不新增生成测试。
- 无可用的完整 28 天查询/页面表现、无新版本生产重抓与后 28 天效果，均仍待观测。本地审计阶段未执行部署或索引请求；后续获授权的部署与提交另记于 RELEASE.md。未改 robots/WAF、做外链或扩展内容规模。

原始证据文件索引与哈希见 [evidence-manifest.json](evidence-manifest.json)。生产 HTTP 与所选页面的后续验证已经完成，见 RELEASE.md；仍须等待真实收录/重抓与可比效果数据。

公开提交前对 GSC 账户内检查 ID 和 Cloudflare 请求来源 IP 做定点脱敏，见 [publication-redactions.json](publication-redactions.json)。未改变页面、日期、状态或回答内容；公开文件哈希以本 manifest 为准。
