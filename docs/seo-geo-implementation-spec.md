# Prompt Seen 搜索可见性与 AI 引用实施规格

版本 1.2 · 2026-11-19（洛杉矶）

**一次交付。** 同一生产候选版本恢复简中首页、提示词全部分页、模板与合集入口，完成 **20 个提示词案例、5 个主题页（新建 4 个、更新 1 个）、3 个既有合集**，同步发布方法说明、英语及简中检索目录和 v2 数据集。重点页面覆盖英语与简中，共享组件和译稿按现有 12 语言策略验收。内容、页面和导出按真实依赖并行推进，通过同一份验收清单后发布。

**全部案例均由 GPT Image 2.5 或 GPT Image 2.6 生成。** 每个案例标明对应型号。全站 GIF 统一标注为“GPT Image 2.6 生成的 GIF”，英文为“GIF generated with GPT Image 2.6”。读者在复制前能看到生成原文的语言、实际输入和对应输出。[版本归属记录](../production/model-version-annotation-2026-11-05.json) · [2.6 补充记录](../production/model-version-annotation-2026-11-09.json)

执行者操作 Chrome、运行自动检查，并用独立 subagent 复核。遇到问题先修复和复测，只有确需账户持有人操作或所有者裁决的具体事项才转人工。发布后按抓取日期观测收录、点击和引用。

[简中翻译清单](#22-翻译清单与入口依赖) · [20 个案例](#41-20-个案例) · [主题与合集](#5-静态主题与编辑合集) · [交付与验收](#7-交付与验收) · [效果观测](#8-搜索和引用效果如何判读)

## 1. 实施决定与生产基线

| 工作 | 实施决定 |
| --- | --- |
| 恢复简中索引 | 补齐真实展示成员的译稿，由现有构建同时计算索引资格、hreflang、JSON-LD 和 sitemap。简中 `p_123` 同时影响首页和列表第 1 页。 |
| 调整首页和详情标题 | 首页调整 H1 的 DOM 顺序。详情保留作品名，用已有 `seoTitle`、`seoDescription` 描述任务与可见结果。列表把任务名称用于 H1 和结构化数据。长期标题、简介不写固定库存。 |
| 展示生成结果、限制和许可 | 扩展现有测试信息，用同一条运行记录生成静态 HTML、弹窗、Markdown 和公开导出中的案例说明。 |
| 品牌、语言、面包屑、图片标记 | 修正作品与网页的语言归属、面包屑终点、组织主页和来源署名。首页使用既有实体。作品许可、图片许可及图片 sitemap 进入回归验收。 |
| 主题入口 | 使用已有分类及用途路由。每个选择问题对应一个主要入口。反应贴纸和九帧社交 GIF 分别由现有合集承接，筛选 URL 用于浏览。 |
| 检索和复用 | 在 About 说明测试方法，从项目 README 和检索目录链接到方法、专题和版本化 JSON。 |

### 1.1 核查结果

2026-11-19 抓取了主站的页面、响应头、Markdown、robots、目录和两个语言 sitemap。生产 `buildId` 为 `f8048989773753dc60ac0c17fecdb26c70096a90`。本地 `085639d42` 与该版本的 `src/`、`scripts/`、`content/` 相同。下表的网络结论来自实际响应，第 2、4 节的依赖和匹配结果来自这份源树的全新 **production** 内容模型。索引资格指网站发出的信号，实际收录以搜索平台记录为准。[生产构建](https://promptseen.dev/generated/build.json) · [英语 sitemap](https://promptseen.dev/en/sitemap-pages.xml) · [简中 sitemap](https://promptseen.dev/zh-hans/sitemap-pages.xml)

| 样本 | 已观测到的行为 |
| --- | --- |
| `/`、`/en/` | 均返回 200，canonical、英语 alternate 与 x-default 均指向 `/`。英语 sitemap 只列根首页。首个 H2 为 “Your Everyday Reactions”，后面才是 H1。实体已有 `WebSite`、`Organization`，组织未输出 `sameAs`。 |
| 简中首页、提示词列表第 1、2 页、模板列表、合集列表 | 均返回 200、自指 canonical、`noindex, follow`，无 hreflang 或有效 JSON-LD 实体，均未进入简中 sitemap。根首页的 hreflang 随之排除简中。 |
| 英语提示词列表 | 文档标题为 “Image prompts · Prompt Seen”，可见 H1 与 `CollectionPage.name` 都是 “The roll”。`ItemList.numberOfItems` 为当页的 24 件作品。 |
| `p_123` 商品九宫格 | 英语详情在 sitemap，有 Markdown alternate、作品级 CC BY 4.0。Markdown 返回 `text/markdown`，HTTP `Link` 指回 HTML。简中详情仍展示中文旧稿，带 noindex、无 Markdown alternate，英语详情也未列出简中。 |
| `p_274` 肖像贴纸 | 英语和简中详情均可索引，两份 HTML 的 hreflang 互指，并各有自引用。简中说明包裹英文实测 prompt，`CreativeWork.inLanguage=en` 符合正文。 |
| `p_398` 磁带 GIF | 英语详情的面包屑在无链接的 “Illustration” 结束。该条目的 `source.license` 为空，作品节点省略许可。媒体有独立的署名与权利记录。 |

本次线上英语、简中 sitemap 分别有 427、379 个页面 URL，其中提示词详情为 314、293 个。简中 14 页提示词分页中第 4、8、14 页已列入 sitemap。以上为有日期的核查快照。既有参考图实验已发布 `p_123`、`p_153`、`p_218` 和模板 `t_017` 的证据改进，包括 Markdown 中按顺序保留参考图和原图地址。本期复用这些材料。[既有实验](research/seo-geo-2026-11-06/REPORT.md) · [生产验收记录](research/seo-geo-2026-11-06/RELEASE.md)

## 2. 简中索引恢复

### 2.1 索引资格与页面输出

索引沿用注册表、构建模式、条目审核状态和实际展示成员四层判定。首页检查首屏轮换、更多作品、最新作品、用途封面、模板及合集。分页检查本页卡片、编辑插入项及第 1 页的精选区。合集和主题还检查自身译稿与成员。筛选、删减或重排作品来通过资格检查会改变用户浏览结果，不能用作此项修复。[语言发布流程](localization-workflow.md) · [首页选择](../src/modules/home/server.ts) · [列表与 sitemap](../src/modules/seo/sitemaps.ts) · [内容索引](../scripts/lib/content/build-index.ts)

| 状态 | HTML 与发现入口 |
| --- | --- |
| 生产、启用、当前语言页面及所需成员合格 | 返回 200，canonical 为规范 HTML，无阻止收录的 meta 或响应头。合格语言版本互相列出并自引用。存在多版本且默认版本合格时，x-default 指向默认规范页。进入本语言 sitemap，按页面类型输出结构化数据。提示词与模板还提供 Markdown。 |
| 生产、可浏览的过期译稿或语言回退、成员中有未获索引资格的聚合页 | HTML 可读、自指 canonical、`noindex, follow`。无 SEO 语言 alternate、有效 JSON-LD 实体或 sitemap 条目。提示词和模板详情无 Markdown 文件及 alternate，导出和检索目录排除该版本。浏览用的语言切换、弹窗 JSON 与搜索结果按现有浏览策略工作。 |
| 默认语言首页别名、分页与预览 | `/en/` 与 `/` 共用根 canonical。第 2 页起各自 canonical，第 1 页别名跳向列表，越界页返回 404。预览 HTML 为 noindex，无公开内容记录、详情 Markdown 或语言 sitemap。平台预览主机的 noindex 响应头与正式域名分别验证。 |

### 2.2 翻译清单与入口依赖

同一候选版本交付以下 **21 个提示词、3 个模板** 的简中译稿与审核记录。表中按编辑动作归集。同一条目既是入口依赖又是重点案例时，合并编辑和译审。

| 编辑动作 | 提示词 | 模板 |
| --- | --- | --- |
| 补译缺失稿 | `p_013`、`p_019`、`p_026`、`p_034`、`p_044`、`p_048`、`p_053`、`p_064`、`p_070`、`p_075`、`p_080`、`p_084`、`p_088`、`p_097`、`p_099` | 0 项 |
| 校订草稿 | `p_066` | `t_003` |
| 根据当前源文更新译稿 | `p_007`、`p_058`、`p_123`、`p_153`、`p_218` | `t_001`、`t_017` |

执行者从候选版本的 `composeHome`、`composeFeed`、合集与主题详情取实际展示成员，追踪使页面失去资格的条目。记录构建 ID、语言、路径、页面区块、条目 ID、`localStatus` 和依赖成员，按相同选品顺序重算。成员变化或本次改写源文使更多已发布译稿过期时，把受影响的条目并入这次交付。验收逐项断言 24 个条目均为 `current` 且 `indexable=true`，再对照下表逐页核实正式产物。简中采用增量策略，基线报告在这 24 项仍需处理时已返回 `ready=true`。[首页组装](../src/modules/home/compose.ts) · [列表组装](../src/modules/feed/compose.ts)

| 简中入口 | 直接依赖（2026-11-19） |
| --- | --- |
| 首页、提示词第 1 页 | `p_123` |
| 第 2、3、6、7 页 | 第 2 页 `c_008`，第 3 页 `c_003`，第 6 页 `c_001`，第 7 页 `p_153` |
| 第 4、8、14 页 | 已合格，用作上线回归样本 |
| 第 5、9 页 | 第 5 页 `p_218`，第 9 页 `c_008`、`p_123` |
| 第 10 页 | `c_003`、`p_080`、`p_084`、`p_088`、`p_097`、`p_099` |
| 第 11、12 页 | 第 11 页 `p_053`、`p_058`、`p_064`、`p_066`、`p_070`、`p_075`。第 12 页 `p_034`、`p_044`、`p_048` |
| 第 13 页 | `c_001`、`p_007`、`p_013`、`p_019`、`p_026` |
| 模板列表 | `t_001`、`t_003`、`t_017` |
| 合集列表 | `c_001` 依赖 `t_001`，`c_002` 依赖 `p_088`，`c_003` 和 `c_005` 依赖 `p_123`，`c_008` 和 `c_009` 依赖 `p_153`。六个合集自身的简中稿均为 current。 |

**多语言交付。** 英语和简中按 `incremental/metadata` 发布，另十种启用语言按 `complete/fingerprint/source-only` 发布。4 个新主题各交付 12 个语言版本，共 48 份正文。既有海报主题补齐简中正文。源文标题、摘要、正文、SEO 文案或合集 `reasons` 变更时，独立 subagent 对照实际源、目标指纹检查受影响译稿。简中的旧式 `sourceHash` 只涵盖标题、摘要和正文，SEO 字段另行逐项比对。新增共享字段进入依赖检查，UI 和 Markdown 标签进入全部语言的 ICU 字典。译稿保留实际提交的 prompt。复核记录写入真实 AI 审核者、时间、结论和对应指纹，再按既有流程导入与发布。[语言注册表](../content/locales.yaml) · [指纹规则](../scripts/lib/localization/fingerprint.ts) · [译稿导入与发布](localization-workflow.md)

## 3. 首页、列表与实体标记

1. **首页首屏。** `HomeHero` 与 `FeatureShowcase` 共同决定 DOM 顺序。每个首页的主内容只含一个可见 H1，先于精选作品 H2。无精选作品时同样保留首页 H1。保留 “AI image prompts with real examples” 及已审核的本地化定位，轮换作品只更新作品区域。390px 宽度验证复制、看完整作品、切换精选的触达和焦点，桌面验证选中作品、图片尺寸与首屏加载。[首屏组件](../src/ui/home/HomeHero.tsx) · [首页语言规格](home-language-seo-spec.md)
2. **提示词列表。** H1 和 `CollectionPage.name` 共用本地化任务名称，英语 “Image prompts”，简中“图像提示词”。文档标题包含品牌，第 2 页起加页码。列表总量取 `data.total`，本页作品数取 `listPageWorks(page).length`，位置从 `offset + 1` 起。编辑插入项参与索引资格，末页按实际作品数计数。构建卡片轻量摘要时，在同一条目的运行中按 `coverAssetId` 匹配 `outputAssetIds`，取实际生成封面的型号。译文列表也使用这个值。列表简介写“每个案例都附生成原文和输出”。[列表组件](../src/ui/gallery/PromptList.tsx) · [卡片](../src/ui/gallery/Card.tsx) · [列表 metadata](../src/ui/gallery/list-metadata.ts)
3. **面包屑。** 详情的默认路径为“首页 › 提示词 › 作品名”。本语言有合格的分类主题时，在作品名前插入带链接的分类。分类仅有名称或只有回退页时，省略该层。最后一项显示当前作品名，使用无链接文本。可见导航和 `BreadcrumbList` 继续共用 `promptCrumbs`。分类链接的资格在构建时解析，弹窗不查询服务器。对原来只传入 taxonomy 的调用者同步补标题及分类主题资格。已有模板与合集导航保持各自的路径。[面包屑构造](../src/ui/prompt-detail/crumbs.ts)
4. **网页、作品和品牌。** 可索引详情新增 `WebPage`，以 canonical 加 `#webpage` 标识，`inLanguage` 为页面说明语言，`mainEntity` 指向已有 `canonical#work`。`CreativeWork.text`、`inLanguage` 对应当前可复制文本及其实际语言。有作品译本和明确目标实体时使用 `translationOfWork`。组织沿用根 `#organization`，`config.repository` 有公开仓库地址时用作 `sameAs`。About、页脚和检索目录共用官网和仓库链接。Prompt Seen 为出版者。作者类型按来源角色填写，单有署名时呈现署名及出处。`p_398` 将 ImagineArt 列为灵感来源并标明本站改写。[SEO 入口](../src/modules/seo/index.ts) · [实体构造](../src/modules/seo/structured-data.ts) · [站点配置](../content/site.yaml)
5. **权利与图片。** 页面链接本站文本许可（CC BY 4.0）及其适用范围。条目另列许可时展示该许可，作品级 JSON-LD 仅映射 `source.license` 的实值。每张图片取自己的 `credit`、许可和出处。核心图片使用描述性 alt 和实测尺寸，装饰图空 alt。图片 sitemap 每页输出一张代表图及 `image:loc`，有效 caption 进入可见正文和 `ImageObject`。Google 已弃用图片 sitemap 的 `image:caption`、`image:title` 标签。[仓库内容许可](../content/LICENSE) · [图片 sitemap 规范](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps#deprecated-tags-and-attributes)
6. **页面更新时间。** 修改运行短评、正文或推荐理由时更新受影响页面的内容日期，供 sitemap 计算 `lastmod`。首页仅在有可追溯的编辑日期时输出该值。重复构建得到相同日期，编辑译稿保留原运行日期。

## 4. 案例的生成记录与呈现

### 4.1 20 个案例

英语规范路径为 `/en/prompts/{slug}/`，简中为 `/zh-hans/prompts/{slug}/`。表中列出每个案例的生成型号和提示词原文语言。11 个案例使用 GPT Image 2.5，9 个使用 GPT Image 2.6。2026-11-19 基线中，英语和简中 sitemap 分别包含其中 20 个和 13 个详情。交付目标是两种语言各 20 个可索引详情。

| 任务 | ID 与规范 slug | 生成型号 | 生成原文与运行 | 编辑验收重点 |
| --- | --- | --- | --- | --- |
| 商品与包装 | `p_123` · `product-brand-story-grid` | GPT Image 2.5 | 英文 [x_168](../content/examples/x_168/run.yaml) | 同一张合成商品图，默认九格与配色变体分别对应各自的提示词 |
| 商品与包装 | `p_153` · `design-top60-03` | GPT Image 2.5 | 英文 [x_269](../content/examples/x_269/run.yaml) | 一张陶瓷瓶参考图改变拍摄角度，背面几何属于生成推断 |
| 商品与包装 | `p_053` · `skincare-tube-on-blue` | GPT Image 2.5 | 英文 [x_097](../content/examples/x_097/run.yaml) | 参考图可选，本次使用 0 张 |
| 商品与包装 | `p_043` · `honey-jar-label` | GPT Image 2.5 | 英文 [x_087](../content/examples/x_087/run.yaml) | 展示蜂蜜罐标签和该输出的图片许可 |
| 海报与文字 | `p_024` · `green-tea-tin-poster` | GPT Image 2.5 | 英文 [x_068](../content/examples/x_068/run.yaml) | 简中版提供中文译文和生成图片所用的英文原文 |
| 海报与文字 | `p_045` · `jazz-club-poster` | GPT Image 2.5 | 英文 [x_089](../content/examples/x_089/run.yaml) | 在输出上标出版式和可供排字的区域 |
| 海报与文字 | `p_097` · `blue-bauhaus-square` | GPT Image 2.5 | 英文 [x_141](../content/examples/x_141/run.yaml) | 描述方形构图，链接海报主题 |
| 海报与文字 | `p_217` · `image26-s09-market-opportunity-pitch-slide` | GPT Image 2.6 | 中文 [x_281](../content/examples/x_281/run.yaml) | 英语版提供英文译文和生成幻灯片所用的中文原文，图表数据注明为虚构示例 |
| 人像与修图 | `p_019` · `amber-teal-avatar` | GPT Image 2.5 | 英文 [x_063](../content/examples/x_063/run.yaml) | 纯文本生成双色光头像 |
| 人像与修图 | `p_084` · `blue-rim-avatar` | GPT Image 2.5 | 英文 [x_128](../content/examples/x_128/run.yaml) | 展示蓝色轮廓光和本站文本许可入口 |
| 人像与修图 | `p_138` · `gentle-old-photo-restoration` | GPT Image 2.5 | 英文 [x_183](../content/examples/x_183/run.yaml) | 标出合成旧照输入和修复输出 |
| 人像与修图 | `p_218` · `image26-s10-marked-vase-color-edit` | GPT Image 2.6 | 中文 [x_282](../content/examples/x_282/run.yaml) | 原图在前、标注层在后，说明改色后的釉面变化 |
| 反应贴纸 | `p_146` · `character-chinese-sticker-sheet` | GPT Image 2.5 | 英文 [x_191](../content/examples/x_191/run.yaml) | 按阅读顺序核对 16 格中文配字，模板变体独立列出 |
| 反应贴纸 | `p_274` · `everyday-reaction-stickers` | GPT Image 2.6 | 英文 [x_338](../content/examples/x_338/run.yaml) | 一张肖像生成九格反应，简中说明页保留英文生成原文 |
| 反应贴纸 | `p_275` · `dog-mood-reaction-stickers` | GPT Image 2.6 | 英文 [x_339](../content/examples/x_339/run.yaml) | 一张宠物参考图，逐格核对九个表情 |
| 反应贴纸 | `p_279` · `social-battery-raccoon-stickers` | GPT Image 2.6 | 英文 [x_343](../content/examples/x_343/run.yaml) | 纯文本生成浣熊贴纸，与肖像及宠物输入形成选择依据 |
| 动画 | `p_287` · `adapted-g02-nine-frame-composed-gif` | GPT Image 2.6 | 中文 [x_351](../content/examples/x_351/run.yaml) | “周一不想上班”角色动图，9 帧，2.4 秒循环 |
| 动画 | `p_398` · `gpt26-gif-30-cassette-spools-12-frame-loop` | GPT Image 2.6 | 英文 [x_462](../content/examples/x_462/run.yaml) | 磁带卷轴转动、外壳静止，12 帧，1.92 秒循环 |
| 动画 | `p_389` · `gpt26-gif-21-product-360-degree-turntable` | GPT Image 2.6 | 英文 [x_453](../content/examples/x_453/run.yaml) | 一张商品参考图，观察转台旋转 |
| 动画 | `p_370` · `gpt26-gif-01-green-frog-typing-loop` | GPT Image 2.6 | 英文 [x_434](../content/examples/x_434/run.yaml) | 纯文本输入，青蛙打字动作为 8 帧循环 |

20 个案例共用一个实现。每个案例交付任务摘要、实际输入、输出观察、具体限制、运行原文、许可和内链。`seoTitle` 在作品名不足以表达任务时补充任务，`seoDescription` 写输入和可见结果。保留既有 slug、模板关联及相似作品。编辑日期和运行日期分别取值。[内容模型](../src/modules/content/types.ts) · [提示词运行匹配](../scripts/lib/content/prompt-variants.ts)

### 4.2 按运行构建案例信息

1. 用 `matchingPromptRuns(content, record, locale)` 匹配当前可复制的提示词。条目 ID、规范化后的全文、SHA-256 和实际语言均须一致。模板还须匹配模板 ID、版本和解析后的参数。候选运行必须有输出，且每项输入和输出都能解析到原资产。匹配结果按记录日期、ID 倒序排列。
2. 在匹配集合中优先选条目指定的 `showcaseExampleId`，其次取首条。当前可复制译文没有匹配运行时，用同一函数匹配**源语言原文**，按同一顺序选展示运行。页面标出当前复制文本的语言，给出示例使用的原文及原图链接。其他变体各自列明实际提交文本和输出。现有 372 个提示词条目均有源原文匹配且带输出的记录。
3. 展示运行的 `model.displayName` 决定案例型号，统一写作 `GPT Image 2.5` 或 `GPT Image 2.6`。当前内容树的 372 个提示词条目和 391 份运行记录均已有具体版本。实施覆盖全站公开案例、首页精选与列表卡片、提示词详情、模板示例、运行说明、主题、合集、About、Markdown 和导出，包括旧文案及各语言副本。模板编辑器修改参数后，示例型号仍归属于生成该图时保存的参数和原文。`providerModelId`、seed 和其他参数只采用回执实值，空字段不生成可见标签。全站构建逐条校验版本与绑定，发现缺失或冲突时从归属清单和运行回执修正。
4. 在 `ExampleRun` 增加可选的多语言 `observation`、`limitation`，两项均进入本地化依赖、导入、审核与严格校验。执行者打开实际输出，写明可见结果和读者能核对的限制。GIF 使用展示运行的型号和原文件的 `image/gif` 生成统一标签。帧数、时长和循环次数取自该文件的 `animation`。[源 schema](../scripts/lib/content/schemas.ts) · [本地化依赖](../scripts/lib/localization/dependencies.ts)

生产构建为有输出的公开案例提供 `PromptDetail.facts`。尚无输出的预览草稿省略整个对象，按既有策略预览。HTML、弹窗、Markdown 和 v2 导出复用同一份构建结果。旧弹窗 JSON 缺少 `facts` 时，沿用其中的原文、示例和复制功能，型号取自对应示例的模型字段。旧数据缺少可选字段时省略该行。[详情组件](../src/ui/prompt-detail/PromptDetailBody.tsx) · [测试信息](../src/ui/prompt-detail/TestInfo.tsx) · [Markdown](../src/modules/geo/markdown.ts) · [弹窗 JSON](../scripts/emitters/prompt-json.ts)

| 字段 | 数据含义 |
| --- | --- |
| `matchingRunIds` | 仅收录与当前复制文本逐字匹配且有输出的运行，空集合为 `[]`。 |
| `exampleRunId`、`examplePrompt` | 实际展示的运行 ID，以及该运行提交的 `text`、`language`、`sha256`。当 ID 来自源语言匹配时，译文与原文各自可读、可复制。 |
| `model`、`recordedAt` | 取自 `exampleRunId`。型号使用规范显示名，精确 API ID 保留回执值或 `null`，记录日期取运行的 `recordedAt`。 |
| `referenceAssetIds`、`outputAssetIds` | 同一展示运行的有序资产 ID。已记录零张参考图时为 `[]`，输出至少一项。操作要求取 `test.referenceImage`，上传说明及其语言取详情的 `inputInstructions`、`inputInstructionsLocale`。 |
| `observation`、`limitation` | 使用当前说明语言已复核的短评。20 个重点案例的英、简中版本均须填实，其他条目仅呈现有内容的字段。 |

### 4.3 读者看到的内容

标题与任务摘要之后、完整提示词之前，给出生成型号、原文语言、参考图要求和本次实际输入、原图尺寸与格式、运行记录日期、观察和使用限制。每个结果链接对应的原图和运行原文。多输出按记录顺序呈现，动画另列帧数、时长和循环方式。署名、灵感来源和逐图许可取自相应记录，来源平台的互动数归原帖。静态 HTML 关闭 JavaScript 后仍可读，弹窗复用详情正文，卡片只取摘要所需字段。

| 场景 | 公开表述 |
| --- | --- |
| `p_123` 商品九宫格 | “GPT Image 2.5 使用英文提示词和一张合成的 PINE 瓶身参考图，生成了 1122 × 1402 像素的九格品牌故事板。商品视图保留了银色瓶盖和 PINE 字样，材质特写只展示局部。换用自己的包装时，请逐格检查标签小字。” 默认记录为 `x_168`，改变配色和场景的 `x_196` 列在变体比较中。 |
| `p_024` 简中页 / `p_217` 英语页 | “此图由 GPT Image 2.5 使用英文原文生成。下方提供简中译文和生成原文。” / “GPT Image 2.6 generated this slide from the Chinese prompt. Copy the English translation or the original Chinese prompt below.” |
| GIF 案例（含 `p_287` 九帧角色动图、`p_398` 磁带动图） | GPT Image 2.6 生成的 GIF |

GIF 的标题写作品名，摘要与运行短评描述可见动作。卡片、详情、弹窗、合集和 Markdown 复用同一个本地化模型标签，导出以同一型号和 `image/gif` 标识成品。各语言正文、SEO 摘要及徽标均按此验收。发布检查扫描公开文本中的旧型号说明、空字段标签、编辑占位词和错误的译文实测声明。执行者修正文案和本地化源，再检查渲染产物。历史回执保留原貌，页面可链接追溯。[商品默认运行](../content/examples/x_168/run.yaml) · [商品变体](../content/examples/x_196/run.yaml) · [融资幻灯片英文正文](../content/prompts/p_217/locales/en.mdx)

## 5. 静态主题与编辑合集

主题回答“做这类任务该怎么选”，合集回答更窄的选择问题。复用 `categories/[slug]`、`use-cases/[slug]` 与 `collections/[slug]` 的静态导出。主题页保持现有发布下限（3 个可见提示词），合集保持 2 个可见成员。索引另要求实际展示成员全部合格。每个主题正文至少选 3 个任务有区别的案例并说明选择理由，已有的自动作品列表照常展示。下表计数是本次内容模型中的可见成员数，用于估算翻译和页面复核工作。[主题实现](../src/ui/pages/TopicBody.tsx) · [发布规则](../scripts/lib/content/rules.ts)

| 英语规范路径 | 交付与编辑问题 | 简中版本的依赖 |
| --- | --- | --- |
| `/en/categories/product/` | 新建。47 件商品案例。比较一图多场景、变视角、标注改色的输入和局限，导向商业视觉合集 | 新主题译稿，加 `p_053`、`p_123`、`p_153`、`p_218` |
| `/en/categories/poster/` | 更新既有页。39 件。用海报与幻灯片案例解释版式留白、后期排字与生成文字的核对方法 | 补简中主题稿及 `p_097` |
| `/en/categories/portrait/` | 新建。31 件。比较纯文本头像、参考肖像与旧照修复，注明身份保持与历史细节的限制 | 新主题译稿，加 `p_019`、`p_084` |
| `/en/use-cases/social-post/` | 新建。166 件。按分享场景选择贴纸、单图或循环动画，引向反应贴纸和九帧社交 GIF 合集 | 新主题译稿，加 `p_053`、`p_088`、`p_099`、`p_123`、`p_153` |
| `/en/use-cases/packaging/` | 新建。20 件。比较罐、瓶、软管的标签展示，说明概念图的适用范围和印前复核 | 新主题译稿，加 `p_053`、`p_064` |

简中路径将上表 `/en/` 换为 `/zh-hans/`。新稿放入相应 `content/taxonomy/{categories,use-cases}/{term}/locales/`。每页交付任务定义、选择依据、三个带输入和限制的案例、指向同语言模板或合集的正文链接。在可索引的合集、详情或首页用途栏至少有一处普通 HTML 链接指回主题。使用仓库已有的 `prompt:`、`template:`、`collection:`、`category:`、`use-case:` 内容引用。构建时解析语言、子路径与可见性。验收时按链接访问，不依赖站内搜索或筛选操作。[现有海报主题稿](../content/taxonomy/categories/poster/locales/en.mdx) · [MDX 引用协议](../scripts/lib/content/mdx.ts)

| 既有合集 | 本期编辑交付 |
| --- | --- |
| `c_009` · `/en/collections/design-ai-product-commercial/` | 用 `p_151`、`p_152`、`p_153` 说明如何在商品展示与包装视角之间选择。合集有 18 个成员，原文的 58 件对应上层样本。`p_123` 九宫格列为延伸阅读。 |
| `c_015` · `/en/collections/english-social-reactions/` | 利用已有输入说明比较人像、宠物和纯文字贴纸。以 `p_274`、`p_275`、`p_279` 说明何时需要参考图、整张输出与拆成单张贴纸的区别。 |
| `c_016` · `/en/collections/social-nine-frame-composed-gifs/` | 合集标题用“九帧社交 GIF”及其本地化译名。用 `p_286`、`p_287`、`p_288` 按角色情绪、动作与循环节奏给出选择理由。相关案例链接磁带卷轴动图 `p_398`。 |

编辑使用已有合集 MDX 和按成员 ID 编写的 `reasons`，每页至少三条推荐理由写明“适合哪种输入、看哪项结果、试用时检查什么”。标题及首段不以不断变化的库存数作卖点。案例顺序、成员和计数取现有内容模型。关联模板必须真实存在。合格语言的 `CollectionPage/ItemList` 按页面可见成员顺序生成。[合集正文组件](../src/ui/pages/CollectionBody.tsx) · [商业视觉](../content/collections/c_009/entry.yaml) · [反应贴纸](../content/collections/c_015/entry.yaml) · [九帧社交 GIF](../content/collections/c_016/entry.yaml)

## 6. 方法、检索目录与公开数据

| 交付 | 实施要求 | 验收 |
| --- | --- | --- |
| 测试方法与品牌 | 在现有 `/{locale}/about/` 的方法段渲染固定 HTML ID `testing-method`，各语言目录和入口均链接 `#testing-method`。标题照常本地化。写明全部案例使用的两个型号、实际提示词与输入顺序如何关联输出、怎样复核、运行记录日期与编辑日期怎样读取。替换旧版固定库存及笼统的参数说明。用 `p_123` 讲变体、`p_217` 讲译文、`p_287` 讲 GIF 的播放时长和循环。提供维护者、官网、仓库问题入口和许可入口。 | 从案例和目录可直达本语言的方法段。三个例子都链接具体运行。项目 README 链接方法、专题与公开数据。每一条型号、参数及权利说明都有对应依据。 |
| 检索目录 | 根 `/llms.txt` 保留已合格的默认语言入口，新增 `/zh-hans/llms.txt`。两份目录由同一生成器按语言导出合格提示词和模板的本地化标题、摘要、Markdown 链接，合集和主题链接规范 HTML。开头说明案例型号、原文、输入要求、实际输入、改写、来源互动及许可。英文目录链接简中目录，两份目录均链接方法和数据集。 | 生产返回 `text/plain`，条目齐全、链接可达、目标内容具备索引资格。预览目录无公开内容记录。日期取真实内容变更时间。抓取策略沿用现有 robots 规则。 |
| 数据集 | 生产构建新增 emitter，复用 `exportJson`。稳定地址为 `/generated/datasets/v2/en.json`、`/generated/datasets/v2/zh-Hans.json`（文件名用注册表代码）及同目录 `manifest.json`。manifest 记录 `format`、`version`、`buildId`、每语言文件 URL、两类记录数及文件字节 SHA-256。CI 将 JSON 与 manifest 按生产 buildId 保存为发布工件。 | `format=prompt-seen/content-export`、`version=2`。语言、数量、URL 集合和内容与同一 SHA、production 模式下 CLI 导出一致，HTTP 为 `application/json`。每条保留 HTML/Markdown 地址和既有权利字段。单文件可独立下载，首页加载不发数据集请求。 |

**v2 导出契约。** 提示词记录新增第 4.2 节的 `facts`，同时导出展示运行的有序 `facts.references[]` 和 `facts.outputs[]`。每项含 `assetId`、原图 URL、尺寸、MIME、资产权利，以及该项具有的输入标签、动画信息。显示译文时，`prompt` 保留当前可复制文本，`facts.examplePrompt` 给出出图原文。即使 `matchingRunIds=[]`，消费者仍能从 `exampleRunId` 对应的型号、原文及资产读懂该图。零参考图用空数组。将详情的 `inputInstructions` 及 `inputInstructionsLocale` 一并投影到导出 `facts`，读者能按顺序复用参考图。既有 `test` 描述当前可复制文本，案例型号、原文及成品归属统一读 `facts`。`taxonomy`、`image`、`source`、`prompts`、`templates` 保持 v2 语义，删除或重释字段须升主版本。数据集与 CLI 共用 `exportJson`、索引资格过滤和序列化规则（UTF-8、两空格缩进、末尾一个换行），URL 走项目构造器。预览不生成公开数据文件。[导出格式](../scripts/lib/export.ts) · [导出命令](../scripts/content-export.ts) · [目录与 Markdown](../src/modules/geo/documents.ts) · [robots 策略](../src/modules/geo/robots.ts)

## 7. 交付与验收

第 2–6 节在同一候选构建中验收，以完整提交 SHA 标识。执行者记录上线前的生产 buildId、入口与观测问题，按同一份源数据编写页面和导出。源文与运行记录确定后，校订译稿并记录对应指纹。内容构建生成所有公开产物，自动断言和 Chrome 检查针对这些产物执行。失败项由执行者修复，并重跑受影响检查。A01–A09、A10 的打包与隔离回退演练及既有 CI 通过后，一次发布。正式域名与 Pages 域名的线上断言在生产切换后立即执行。

### 7.1 功能验收矩阵

| 编号 | 操作 | 通过条件 |
| --- | --- | --- |
| A01 | 直接请求 `/`、`/en/`、`/zh-hans/`，检查各启用语言首页的 HTML | 主内容的第一个标题是唯一可见 H1，精选标题为 H2。默认首页的 sitemap 只收录根 canonical，英、简中首页互指并自引用，x-default 为根。 |
| A02 | 按第 2.2 节逐条断言 24 项译审状态，再从实际成员计算合格入口。用测试夹具覆盖 current、过期、缺译和草稿 | 简中首页、全部提示词分页（基线 14 页）、模板列表、合集列表和表中 6 个受阻合集均出现在 sitemap。逐个 GET 核对 HTML、响应头、canonical、hreflang、JSON-LD，再核对详情 Markdown。夹具中撤去 `p_123` 的有效简中译稿时，详情与依赖它的聚合页按第 2.1 节退出索引、目录和导出。 |
| A03 | 核对分页、图片 sitemap、别名、未知路径和已移除地址 | 每页自指 canonical，`numberOfItems` 等于当页作品数，位置连续。第 1 页别名指回列表，越界和未知地址为 404，既有删除与跳转符合主机规则。代表图可访问，尺寸、alt、许可各有来源。 |
| A04 | 读取 20 个案例的英、简中静态 HTML、Markdown、弹窗和 v2 导出。在 Chrome 验证桌面和 390px 视口 | 两种语言各 20 个可索引详情。关闭 JS 仍可读取原文、结果及许可。四个出口的展示运行、型号、生成原文、输入顺序、输出、观察和许可逐项相符。开启 JS 后复制文本逐字匹配所选版本，焦点和返回位置正确，RTL 数字及型号顺序正确。旧弹窗 JSON 缺 `facts` 时仍能打开和复制。 |
| A05 | 打开 `p_123`、`p_218`、`p_053` 的输入与输出原图 | 商品九宫格仅 `x_168` 匹配当前原文，`x_196` 标作变体。花瓶按 `a_373 → a_374` 两项有序输入、`a_372` 输出。软管页面同时写明“参考图可选”和“本次使用 0 张”。 |
| A06 | 交叉读取 `p_024`、`p_217` 的英、简中页面与导出，再测试精确 API ID 为空和多输出两种夹具 | 绿茶罐始终对应 GPT Image 2.5、英文原文及 `x_068`。幻灯片始终对应 GPT Image 2.6、中文原文及 `x_281`。在两个提供译文的页面，`matchingRunIds=[]`，型号与资产均取自实际展示运行。译文和原文各自可复制，两张译文列表卡片也显示各自封面的型号。API ID 为空时仍显示具体版本，多图按同一运行的顺序展示。 |
| A07 | 扫描全部公开案例的型号与生成文案，交叉检查 `p_274`、`p_287`、`p_398` | 每个展示的输出标明其实际版本，文案与对应运行一致。简中肖像贴纸的 `WebPage.inLanguage=zh-Hans`、`CreativeWork.inLanguage=en`。九帧角色动图和磁带动图均显示同一语言的“GPT Image 2.6 生成的 GIF”标签。两者的帧数和时长分别取自各自文件。磁带保留灵感来源，作品和图片各按自己的许可字段输出。 |
| A08 | 从首页或相关详情沿普通 HTML 链接打开主题、合集及方法段 | 英、简中分别有 5 个目标主题和 3 个目标合集，目标 URL 返回 200、可索引，自指 canonical 并进入各自 sitemap。每页至少三例，成员、推荐理由和双向内链符合第 5 节。面包屑与 JSON-LD 一致，末项是当前页。方法锚点能跳到对应段落。 |
| A09 | 逐一 GET 两份 `llms.txt`、两份 v2 数据文件、manifest 和案例 Markdown，按清单与 CLI 对账 | 核对 HTTP 类型、语言、记录数、URL 集合、字段、原资产和 manifest 字节哈希。每个 Markdown 响应均有指向规范 HTML 的 HTTP `Link`，关系为 `rel="canonical"`。合格记录全部可达，预览、草稿和语言回退内容均按第 2.1 节处理。 |
| A10 | 测试根路径生产、子路径生产与子路径预览，再测试 Cloudflare 打包和既有回退流程 | 在候选环境复现两种主机规则，核对 URL、媒体、语言前缀和 noindex。切换后从两处真实域名复验。HTML、feed、字典、弹窗、sitemap 和数据集属于同一构建。隔离环境切回上一成功工件后，页面和文件与旧版一致。首次上线 v2 时，切回旧版的新增数据集地址应返回 404。 |

### 7.2 执行者复核与人工介入条件

| 复核对象 | 执行者的动作与留档 |
| --- | --- |
| 翻译、SEO 文案与案例事实 | 独立 subagent 对照源稿、生成原文、输入和输出资产逐项核对型号、译文、数字、署名及限制。图像描述要打开原图，贴纸逐格检查，GIF 对照帧序和回执。保存条目、证据、结论及审核指纹。执行者修正有分歧的稿件后交回独立复核。[译审流程](localization-workflow.md) |
| 页面呈现和交互 | 执行者用 Chrome 或 Playwright 的 `chrome` 项目打开真实页面，检查首屏、窄屏、弹窗与整页、键盘焦点、复制结果、原图链接、切换语言和 GIF 播放。保留公开页面 URL、buildId 及支持结论的截图或断言。修复后在相同视口和路径复测。 |
| 搜索后台与 AI 引用 | 使用已授权的 Chrome 会话读取 Search Console、操作固定问题。独立 subagent 按第 8 节对照回答原句与来源页面。账户导出和会话原文私下留档，公开报告使用汇总值及公开链接。 |

只有两类事项交给人工。账户持有人专属的登录、二次验证或授权操作，由执行者指出所需的具体一步。原始记录相互冲突时，执行者先查原件，在 Chrome 复现可观察现象，再交独立 subagent 复核。仍需所有者裁决时，一次提交条目、证据、已尝试的核对方式及需要决定的问题。其余工作继续推进。公开页面的必需验收项以实际通过为准，账户访问和观测窗口仅影响相应效果报告。

### 7.3 工程与上线验证

使用 Node 24+、仓库依赖、Chrome/Playwright 和参考 nginx 所需的 Docker。将 A01–A10 的断言加入相应单测、HTTP 和浏览器用例。以下命令用于复现根路径生产候选的检查，构建、CLI 导出和 Pages 打包沿用部署工作流的同一 `BUILD_ID`、`SITE_ORIGIN`、`BASE_PATH`、`BUILD_MODE` 和媒体配置 `MEDIA_BASE_URL`。[HTTP 验收](../tests/e2e/seo.http.spec.ts) · [浏览器配置](../playwright.config.ts) · [部署工作流](../.github/workflows/deploy.yml)

```sh
set -eu
export BUILD_ID="$(git rev-parse HEAD)"
export SITE_ORIGIN=https://promptseen.dev BASE_PATH='' BUILD_MODE=production
mkdir -p .artifacts/seo-geo
npm run --silent locale:check -- --all --json > .artifacts/seo-geo/locales.json
npm run content:validate
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e -- --project=http seo.http.spec.ts home.http.spec.ts list.http.spec.ts
PW_BROWSERS=chrome npm run test:e2e -- --project=chrome home.browser.spec.ts list.browser.spec.ts popup.browser.spec.ts prompt-languages.browser.spec.ts
npm run content:export -- --locale en,zh-Hans --format json --out .artifacts/seo-geo/export
cmp .artifacts/seo-geo/export/en.json dist/generated/datasets/v2/en.json
cmp .artifacts/seo-geo/export/zh-Hans.json dist/generated/datasets/v2/zh-Hans.json
npm run deploy:cloudflare:prepare
npm run test:deploy
```

从一份全语言报告的 `reports[]` 读取每个启用的 complete 语言，要求 `ready=true`、`blocking=false`。简中执行 A02 的条目及 URL 集合断言。将候选与基线的合格 URL 集合做差，本次内容编辑引起的既有入口退化须修复并复验。CI 沿用现有三个独立构建环境，分别是根路径 production、`/prompt-seen` production、`/prompt-seen` preview，并保留各自的全套浏览器结果。本地复跑时串行构建或使用独立目录，以免覆盖生产工件。归档候选的 HTTP 头、HTML/Markdown 哈希、JSON-LD、数据集对账、公开页面截图与回退构建 ID。用 Schema.org 校验器核对新增实体及实际提交的 JSON-LD。[CI 矩阵](../.github/workflows/ci.yml) · [部署与回退手册](operations.md)

发布工作流记录正式域名切换时间 D、生产 buildId 与 Pages 部署地址。在部署工作流中保留根路径生产工件，对 Pages 部署地址运行带 `--site`、`--platform` 与期望 buildId 的 `check:live`，对正式域名运行 `npm run check:live -- --expect-build "$BUILD_ID" --wait 180`。随后对正式域名按目标 URL 清单检查 A01、A02、A04–A09 的公开响应，核对实际交付的首页、分页、案例、目录和数据集。期望集合来自第 2、4、5 节和候选的实际展示成员，独立于线上 sitemap。IndexNow 使用现有差量流程。

正式域名出现全站 noindex、不合格内容进入 sitemap 或数据集、译文错绑生成记录、跨版本混用数据中的任一项时，按部署手册回退至上一成功部署，核实其 buildId 和对应页面，再撤回引发故障的提交。单条编辑错误修正内容和译审记录后重新验证受影响页面。

## 8. 搜索和引用效果如何判读

**SEO。** 执行者在已授权的 Chrome 会话中操作 Search Console。效果报告取 D 前 28 个完整日及对照窗口的曝光、点击和点击率（总点击 / 总曝光），按规范 URL、任务、查询、国家、设备及 Web/Image 分组。包含 “Prompt Seen”、“PromptSeen” 或主域名的品牌查询单列。用 URL 检查读取收录状态、Google 选定的 canonical 和最近抓取时间，首次观察到 D 后抓取时冻结该 URL 的日期 `Rᵢ`。其后 28 个完整日为该页对照窗口。4 个新主题单列首次观测到已发现、已收录的检查时间，以及首个窗口的绝对值。

站点覆盖率用“进入 sitemap 的合格规范 URL 数 / 合格规范 URL 总数”，同时输出两组 URL 的差集。搜索收录率用“抽检已收录 URL 数 / 有检查结果的合格样本数”，另列抽样数和取得检查结果的数量。零曝光按零计，隐私抑制、账户访问受限和窗口尚在计时分别记录原因及日期。账户原始资料私下留档。

**GEO。** Google AI Mode 的既有英语基线为 7 道商品参考图问题，每题 2 次，14 个有效联网回答中准确引用本站的有 **0 个**。执行者保留原题、联网提示、美国桌面 Chrome 环境和判定口径。在生产切换前采集下表 4 对中英文题的基线，8 题各开 2 个新会话，每轮共 16 次，与原 14 次分开统计。上线后每周在基线相同的星期和时段复测两组，原 7 题每轮 14 次、扩展 8 题每轮 16 次，分别计算指标。提问只给问题和联网要求。记录时间、语言、产品界面显示的模型名、国家、设备、完整回答、实际引用 URL 和它支持的原句。[既有七题](research/seo-geo-2026-11-06/evidence/questions.json) · [观测协议](research/seo-geo-2026-11-06/REPORT.md)

| 英语扩展题 | 简中扩展题 | 事实判定样本 |
| --- | --- | --- |
| How can I make a nine-panel reaction sticker sheet from one portrait photo? | 如何用一张肖像照做一张九宫格反应贴纸？ | `p_274` 的输入、九格输出 |
| How can I check Chinese captions on a generated 16-sticker sheet? | 如何检查 AI 生成的十六格贴纸上的中文文字？ | `p_146` 的实测记录与逐格核对 |
| How do I use a photo and a separate markup layer to recolor a vase? | 如何用原图和独立标注层给花瓶改色？ | `p_218` 的输入顺序和釉面变化 |
| What are some short looping GIFs generated with GPT Image 2.6, and how long do they run? | GPT Image 2.6 生成的短循环 GIF 有哪些例子，各自播放多久？ | `p_287` 角色动图为 2.4 秒，`p_398` 磁带动图为 1.92 秒 |

独立 subagent 逐条将引用原句与规范页面、生成运行和原图对照，核对域名、型号、原文语言、输入顺序、输出、限制及来源归属。执行者用 Chrome 打开有分歧的引用和原图并复判，记录判据。Markdown 引用按 canonical 归并到 HTML，并保留实际引用地址。报告分别列出仅提品牌的回答数、准确引用率（含至少一条准确本站引用的回答数 / 有效联网回答数）、引用精确率（准确本站引用数 / 全部本站引用数）。分母为零记 N/A，产品错误、验证中断及无联网回答单列次数。来源访问量、爬取量和准确引用分别统计。账户已有同口径的详情到模板点击和曝光事件时，两项计数与点击率一并报告。

**结果归因。** `p_151` 作为商品任务参照。按全站规则修正其型号文案，记录这一改动、共享组件与 `c_009` 内链带来的共同影响。原实验四页单列，原窗口跨越 D 时在 D 截断并记录覆盖天数。首个完整后窗按 URL 报告技术覆盖、流量变化、准确引用、具体事实错误、分母和同期改动。技术交付以第 7 节的生产验收完成为准。
