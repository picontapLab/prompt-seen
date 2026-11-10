# Prompt Seen 域名决策：Google 官方机制证据

核查日期：2026-11-01（America/Los_Angeles）。范围只限 PicOnTap 子域名与独立域名的决策机制；不是流量效果实验，也未读取 Search Console 或 Analytics 私有数据。

| 问题 | 已核实事实 | 对本次决策可以／不可以推导什么 |
| --- | --- | --- |
| 子域名是否保证继承主站排名 | Google 的排名系统以页面为核心，也使用站级信号；良好的站级信号不保证站内所有内容高排名。[排名系统说明](https://developers.google.com/search/docs/appearance/ranking-systems-guide) | 不能把“放子域名”直接换算成主站排名、权重或付费用户增量。官方也没有在该资料中公布子域名的继承公式。 |
| 子域名能否使用独立品牌名 | Google 搜索的 site name 支持域名和子域名；可以通过首页 `WebSite` 结构化数据表达名称偏好，最终由系统选择。[站点名称说明](https://developers.google.com/search/docs/appearance/site-names) | Prompt Seen 在 PicOnTap 子域名也能表达自己的搜索站点名称。独立域名不是独立品牌展示的必要条件。 |
| 含 prompt 的独立域名是否天然占优 | Google 说域名／路径中的关键词本身对排名影响很小；选择名称应符合业务需要。[SEO 入门指南](https://developers.google.com/search/docs/fundamentals/seo-starter-guide#things-we-believe-you-shouldnt-focus-on) | 不能以关键词域名为主要 SEO 理由。名称的记忆、理解与信任效果属于用户行为假设，需要单独验证。 |
| 外部链接如何产生价值 | Google 使用链接发现页面和判断页面相关性。[链接最佳实践](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) | 两种方案都可通过真实可抓取链接连接主站。不能把“链接到子域名”当成等量直接链接到付费落地页，也不能把独立域名的相关链接视为必然无价值。 |
| 是否可以让两站同时占据更多结果 | Site diversity 通常把子域名与根域名视为同站，但有例外。[排名系统说明](https://developers.google.com/search/docs/appearance/ranking-systems-guide#site-diversity) | 这是结果多样性规则，不是子域名排名降级规则；也不是独立域名可以多占结果的保证。 |
| 以后能否换域名 | Google 推荐对应 URL 的永久重定向；301 等永久重定向不造成 PageRank 损失，但重新抓取／索引时可能有暂时排名波动；一般至少保留重定向一年。[迁站指南](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes) | 选择可逆但有维护和迁移成本。不能用换域后几周的流量涨跌证明新域结构更优。 |
| Search Console 如何区分 | Domain property 汇总所有子域和协议，可用页面过滤或额外 URL-prefix property 拆开；新增 property 本身不改变搜索表现。[资源类型说明](https://support.google.com/webmasters/answer/34592?hl=en) | 子域名可以分开观察，无需为了数据隔离而注册独立域名。两种方案的查询与落地页可比性仍取决于同样的过滤口径。 |
| 跨域漏斗如何保持归因 | GA4 未配置跨域测量时，不同根域会各生成 ID；跨域测量通过 `_gl` 传递 ID。子域需要确认 cookie domain 一致，重定向不能丢失 linker 参数。[GA4 跨域测量](https://support.google.com/analytics/answer/10071811?hl=en) | 独立域名的漏斗可正确测量，但多一项配置和验证工作；子域也不是自动保证配置正确。这是测量成本，不能直接算作真实转化损失。 |

## 真实行为证据的获取与边界

Search Console 可以按查询、页面、日期、国家、设备与搜索类型观察点击、展示及 CTR；结果随时间、地点、设备和搜索历史变化，因此人工搜到或搜不到不是完整表现数据。[Performance 报告](https://support.google.com/webmasters/answer/7576553?hl=en)

查询表会省略匿名化查询，并受内部行数限制；图表总量不一定等于查询明细合计。[查询维度限制](https://support.google.com/webmasters/answer/17011259?hl=en)

决策所需的是查询意图 → 具体落地页 → 内容使用 → 成功生成 → 首次付费的分段证据，以及真实外部页面为什么推荐、链接到哪里。上述官方资料不提供 Prompt Seen 的效果数据，不能替代这些证据。

## 可检验的推断

- 若首要目标是 PicOnTap 付费用户，且相同内容和生成入口下没有独立域显著增加有效推荐访问的证据，子域名可能减少品牌识别与测量维护成本；转化提升仍须实验，不是 SEO 定律。
- 若目标是可脱离 PicOnTap 的独立项目资产，独立域名能使品牌地址与 PicOnTap 的归属解耦；是否因此更愿意被推荐，必须看真实推荐者行为，不能由开源身份直接推出。
- 不把两个域名同时收录的重复站点或短期换域前后对比视为干净实验：抓取、索引、内容历史、渠道与季节性都会混入结果。

## 本次仓库与公开页面核查

用户已明确：未来 6–12 个月优先为 PicOnTap 带来新增付费用户。以下是 2026-11-01 的观察，不代表线上行为数据。

- [产品设计](../prompt-library-website-design.md) §1–2 定位为浏览、理解、复制及改写图片提示词的资源库；账户、在线生图、支付属于后续能力。[PromptSheet](../../src/ui/prompt-detail/PromptSheet.tsx) 以复制为主要操作，[模板编辑器](../../src/ui/template-editor/TemplateEditor.tsx) 提供复制与下载。检查 `src`、实例配置和部署文件未找到 PicOnTap 引流入口或付费事件接线。
- 对 `content/prompts/*/entry.yaml` 逐条读取，并以 `locales/en.mdx` frontmatter 的 `status: published` 筛选：208 个 Prompt 条目中，204 个英语版本已发布；这些条目的 `inputRequirements.referenceImage` 分别为 `none: 140`、`optional: 19`、`required: 45`；模型显示名均为 GPT Image。这是内容库存口径，不是线上可访问数量、真实查询结构、用户占比或生图兼容性验证。
- [PicOnTap 首页](https://picontap.com/) 的公开流程是上传照片、描述修改、比较与下载，支持免注册免费额度；[价格页](https://picontap.com/pricing) 提供订阅。只检查公开页面，没有执行真实生成、注册或付款。无参考图的 Prompt 能否在主站直接完成，没有验证；“GPT Image”显示名相同也不足以证明复现能力。
- [配置](../../content/site.yaml) 仍以 `https://example.com`、`/prompt-seen` 和 `robots.mode: snippet` 为默认值；[schema](../../src/config/schema.ts) 默认关闭 analytics。[loader](../../src/modules/analytics/loader.ts) 仅提供可选 Cloudflare/Plausible 访问分析加载器。没有取得 Search Console 查询×页面数据或内容到成功生成到首次支付的记录，不能推断主站完全没有其他埋点。
- [Next 配置](../../next.config.ts) 为静态导出；[README](../../README.md) 和 [运维说明](../operations.md) 已支持自定义 origin、根路径构建。两个候选方案均可作为各自主机的根站点部署，需正确设置 origin、空 basePath、production 和 standalone robots，重建规范地址。子域名不是当前文档中的子路径部署，不必沿用主站路径转发。现有公开配置不能确认实际生产地址。

## 外部引用样本及其边界

| 实际打开的页面 | 观察到的推荐与目标 | 可用于本次判断的范围 |
| --- | --- | --- |
| [AINave 的 PicOnTap 页面](https://ainave.com/products/picontap) | 以免费试用、免注册、文字编辑照片为介绍，Visit website 链接到 picontap.com；Listed by 为 support | 证明这个目录存在商业产品链接；不能把它当独立用户口碑、自然推荐量或转化证据。 |
| [ToolRadar 的 PicOnTap 页面](https://toolradar-ki.de/tools/picontap) | 将用途归为照片编辑与产品图片；提示纯从零生成的用户考虑其他工具；链接主站与价格页 | 证明该外部页面如何描述产品意图。页面价格栏把年费与月费混淆，另有仅年付的过时说法，与当前主站不符；其价格和能力结论不能代替第一方核查。 |
| [promptseen.com 的关于页](https://promptseen.com/about-us/) | 自称创始人为 Rutik Soni，已经使用 Prompt Seen 名称 | 本次没有证据将它与本仓库关联。不能把这个同名站的搜索结果和引用算入本项目；独立域名也不自动获得唯一品牌识别。 |

仓库里的 `inspirationSources` 与来源帖点赞、收藏记录属于被引用的创作来源，不是引用 Prompt Seen 的入站页面，也不是本项目用户行为。

## 决策与可证伪条件

当前推荐 PicOnTap 子域名，例如 `prompts.picontap.com`，保留 Prompt Seen 产品名。依据是已确认的付费目标、可关联的产品用途、两种部署技术可行、未取得独立域名带来更多合格推荐的证据，以及子域名较少的域名和归因维护事项。品牌连续性对转化有利只是待验证假设；不预设 PicOnTap 已有知名度。

最可能推翻建议的未知因素：相同内容、入口和推广投入下，独立域名是否带来足够多额外的真实推荐及合格访客，抵消可能的付费转化差异与额外成本。

令 V 为同一固定期间内的去重合格新访客数，p 为同一观察窗口内首次付费率。暂不计成本时，独立域胜出要求 `V独立 / V子域 > p子域 / p独立`。若独立域付费率相对低 20%，合格新访客至少增加 25% 才持平；这是计算示例，不是预测。计入实际运营成本及迁移成本后阈值更高。也可能独立域的 p 更高，不应预设其必然有转化损失。

最小验证分为两部分：

1. 先用已有数据（如可取得）复核最近 90 天查询×落地页的意图及对应页面的首次付费队列；没有数据时，只接通 3–5 个主站确实能执行的提示词页面。记录内容访问、复制、进入主站、成功生成、首次支付。支付以服务端成功记录为准，排除已有付费用户。
2. 必要时以相同内容、品牌标识、CTA、生成目标、托管性能在两个真实候选域名做小规模非搜索随机分流；实验页不索引，不迁移全站。预先固定内容与渠道分层，主指标为每 1,000 名合格新访客的 30 天新增付费人数，成功生成率只作为早期诊断。用不含个人信息的关联 ID 或正确跨域配置连接事件，不把归因丢失当作流失。
3. 对真实相关的教程作者、资源维护者做少量、分组一致的推荐验证，记录实际刊登页面、目标链接及其带来的合格新访客，而非口头偏好和域名评分。这需要未来执行；本次未联系任何第三方。

比较基准是同时期同来源、同意图访客在子域名版本上的表现。预先根据实际付费基线与值得改变选择的最小增量确定样本量；小样本、置信区间跨越盈亏线或只有点击差异时不宣布胜出。随机分流验证访问后的行为，不能证明长期自然排名差异；少量推荐验证也不足以精确估计全体推荐者偏好。保持单一正式索引站点，避免用复制站收录或短期换域涨跌冒充因果实验。
