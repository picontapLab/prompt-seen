# 首页语言一致性与搜索主题优化 Spec

> 2026-11-10 工具与发布合同更新：本地化策略、覆盖检查、导入／发布、回退浏览及 SEO 输出以[通用本地化流程](localization-workflow.md)为准。本文的历史日期、验收与审校事实保留；后文旧有的日语专用门禁、缺译即无详情页、所有 published 地址均可收录等描述不再作为当前工具合同。

版本：v1.2。日期：2026-11-09，America/Los_Angeles。状态：已实现并完成本地验收，尚未生产发布；见[验收记录](./home-language-seo-acceptance.md)。

各语言首页应以当地语言清楚表达“带实际效果示例的 AI 图像提示词与模板库”，作品和模板的浏览摘要使用页面语言，真实提示词继续用于标注、复制和测试记录。首屏选品、缺译回退和缓存隔离采用相同规则，英文是本次问题的复现入口。本规格定义第一版的数据契约、页面行为、修改落点和发布验收，可直接拆分为实现任务。

第一版完成条件：本地化摘要贯通静态 HTML 和客户端列表；首页采用本规格文案；模板预览遵守语言规则；所有语言按统一规则选择首屏案例；语言切换后内容和缓存不串用；首页模板优先选用页面语言正文；首页可见作品的摘要通过第 5.1 节的修订验收；相关回归检查通过。代码完成、本地验收、生产发布分别记录状态。

v1.2 相对 v1.1 的变更：ja 已在注册表中启用，补充固定文案和构建期审校约束（§2.1、§3.2）；首页模板优先选用正文语言与页面一致的条目（§4.2）；首页可见摘要的修订由编辑建议改为验收项（§5.1）；最新作品保持十二项（§6）；title 加入差异化表述（§3.2）；效果观察先看收录与标题展示，曝光足够后再比较 CTR，并明确与 ja 发布的先后顺序（§9）。

## 1 问题与目标

本次线上核查发现，英文首页的十二张作品卡片包含相同的中文精灵图制作前缀，三张模板卡片包含中文正文摘录。作品卡片的前缀默认由 CSS 隐藏，悬停时显示，但文本已经存在于 HTML。页面的 title、description、HTML lang 和语言版本链接配置为英文。

当前 `PromptSummary.description` 已有页面语言的摘要；`FeedCard` 没有传递它，而是传递 `promptOpening`。首页和列表模板卡片同样直接展示 `bodyExcerpt`。因此修复应发生在浏览数据和组件层，无需批量改写生成图片时使用的原始提示词。

第一版目标：

- 用户从 title、H1 和简介知道这里提供 AI 图像提示词、实际效果和模板。
- 普通作品卡片和模板用途说明使用当前页面语言，在手机上也可直接阅读。
- 同一批作品以各自的结果或用途区分，避免重复展示公共制作指令。
- 展示原始提示词时，正确表达其语言与验证状态；复制仍取得完整实际正文。
- 新增语言通过注册表、文案与内容接入，不修改组件中的语言分支；每个已构建语言都有同等的选品与验收规则。
- 英文根首页与 `/en/` 别名使用相同内容，现有 canonical、hreflang 和路径规则继续成立。

关键词参考站仅用于观察主题在 title、description、H1 和正文中的分布。单词频率不代表排名效果，中英文分词结果也不能直接转换成语言占比。本规格不设置关键词密度百分比。

## 2 范围和已有规格的关系

### 2.1 第一版覆盖

| 范围 | 本次行为 |
| --- | --- |
| 默认语言根首页、其语言前缀别名及所有已构建语言首页 | 更新标题、简介、栏目文案、卡片和模板展示，按页面语言选择首屏作品和模板；各栏目数量不变 |
| 所有复用 `Card` 的页面 | 采用相同的本地化摘要，包括列表、分页、用途页、合集、收藏和相关推荐 |
| 首页和列表中的 `TemplateCards` | 本地化用途说明始终显示，只有正文语言匹配时显示参数摘录 |
| 独立模板列表 | 使用相同的模板摘录规则，避免首页修好后跳转仍出现意外混语 |
| `FeatureShowcase` | 保留真实正文与标注，增加明确的正文语言标签 |
| 静态产物与 feed JSON | 同一数据契约，初始页面和无限滚动追加的卡片一致 |
| 文案目录 | 遍历当前已有目录补齐键；当前为 en、zh-Hans、ja、ar，验收范围由本次构建的注册表决定；不启用新的公开语言 |

实际消费点以实施时搜索为准。`Card` 是共享组件，本次行为不是只对首页生效的特例。搜索页若使用自己的摘要组件，确认其仍读取本地化说明即可，无需强制换成 `Card`。

ja 的当前状态：`content/locales.yaml` 中 ja 已为 `enabled: true`（提交 1ce49cc3），发布候选已验收但尚未部署，见 `production/localization/ja/acceptance.md`。本规格按公开语言对待 ja。ja 启用后，`content:validate` 与 `content:build` 通过 `validateEnabledLocale` 把 ja 覆盖检查的结果全部升级为发布错误，其中包括：

- 消息字段审校：`home.json` 中每个被修改的英文源键或日文译文，都要在 `production/localization/ja/reviews.json` 记录与当前源文和译文指纹一致的审校，否则报告 `locale.field-review`。
- 内容译文过期：译文的 `translation.sourceHash` 覆盖源文件的 title、description 和正文。修改源语言摘要后，ja 译文变为 outdated。

因此修改英文首页消息或英文条目摘要时，须在同一改动中更新 ja 译文并记录审校，不能留到发布时处理。

### 2.2 保留的产品契约

- [多语言正文设计](./multilingual-prompt-design.md)继续管理实际提示词的选择：有对应语言正文就使用它，否则使用原文；显示、复制、下载保持一致。
- 本规格替换[网站设计](./prompt-library-website-design.md)中“普通卡片悬停显示提示词开头”“模板卡片无条件显示原始正文摘录”及首屏不按正文语言区分优先级的约定。实施时同步这些段落与组件注释。
- [英语社交案例规格](./english-social-showcase-spec.md)继续管理案例、生成记录和配置内的编辑顺序。本规格对各语言首页最终展示顺序的规则优先：同一语言优先级内保留编辑顺序，不再要求所有语言固定同一件首图；不要求为中文页面重新生成中文提示词。
- `home.featured` 的展示日期和原始编辑顺序作为基础输入，按第 5.4 节生成每个 locale 的 `onShow`。手动切换、注释联动、封面比例和测试记录保持原有语义。详情页与专题展示允许引用其他语言的真实提示词，须标明其语言。

### 2.3 后续范围

模型专题、GIF 专题及新的用途页属于第二批内容工作；第一版不依赖它们上线。其入口、选题与验收边界见第 10 节。

### 2.4 语言身份与缺译边界

所有数据选择和语言匹配使用 `content/locales.yaml` 的注册表 code。`HomeInput` 增加必填的 `locale: string`，由 `HomeBody.homeModel(locale)` 传入 `locale.code`。不得从标题文字、URL 前缀或默认语言猜测当前 code。客户端从 `useLocale()` 取值时复用 `registryCode`，先去掉 `ar-u-nu-latn` 等格式化扩展，再匹配注册表。

| 语言层 | 内容和选择规则 | 缺失处理 |
| --- | --- | --- |
| 界面与 SEO | 当前页面的消息目录；HTML lang/dir 使用该语言注册项 | 本次构建必需的消息键缺失时校验失败，不在目标语言页面静默显示英文消息 |
| 浏览说明 | 同一条目的当前语言 title、description、图片 alt 等已发布内容 | 未发布该语言版本则不进入该语言的可见索引；已声明可发布但必填内容缺失时由发布校验报错 |
| 实际提示词 | 按现有 resolver 选择当前语言正文，否则选择该条目原文 | 原文允许与页面语言不同，标明实际语言；不伪造译文或测试记录 |

界面语言完整不意味着每条内容都必须有该语言版本。某条目缺少目标语言页面时，沿用已有 `translation-missing` 路由或该页面既有的不可用状态；普通卡片不能从另一 locale 的索引补位。对于没有条目内容的语言首页，仍可展示本地化站点说明和有效入口。

比较正文语言时使用精确 code，不把简繁中文或区域变体合并。HTML 的 lang 使用注册项 `htmlLang`，页面布局使用注册项 `direction`；实际提示词单独设置其语言和方向。品牌、模型名和作品中指定的画面文字可以保持原文。

## 3 首页关键词与文案

### 3.1 主题分工

| 页面 | 主要搜索意图 | 内容承载 |
| --- | --- | --- |
| 首页 | AI image prompts | 实际图片、用途入口、可复制提示词与模板入口 |
| 模板列表及详情 | image prompt templates | 参数、示例、编辑操作 |
| 已有用途页 | portrait prompts、poster prompts、product photography prompts 等实际用途 | 对应用途案例与说明 |
| 后续模型专题 | GPT Image prompts 等有内容支持的模型词 | 模型适用场景及真实记录 |
| 后续 GIF 专题 | GIF sprite sheet prompts | 精灵图、裁帧与合成过程 |
| 作品详情 | 具体主体、风格、效果的长尾需求 | 该作品的提示词、结果、输入和方法 |

表中的英文词说明搜索意图，其他语言使用当地自然表达，例如中文“AI 图像提示词”、日文“画像生成 AI のプロンプト”；不要求将英文关键词原样写进每种语言的 H1。各语言可依据自己的搜索数据调整措辞，但页面功能与事实陈述一致。

这些是基于产品内容的定位，不是已验证的搜索量排序。模型名、GIF、语言名称与保存按钮保留真实含义，不通过隐藏它们调整词频。

中文首页使用“AI 图像提示词”，同样未经检索数据验证；中文用户也常用“AI 绘画提示词”“AI 生图提示词”等说法。第一版不据此改动文案。发布后若 zh-hans 页面积累了足够的查询数据，或已取得可复查的搜索建议数据，在下一版评估 title 与 description 用词。

### 3.2 固定文案

以下键位位于 `src/i18n/messages/{locale}/home.json`。`hero.intro` 为新增键，其他键复用现有结构。

| 键 | 英文 | 简体中文 | 日本語 |
| --- | --- | --- | --- |
| `documentTitle` | `AI Image Prompts with Real Examples & Templates \| {siteName}` | `带实际效果示例的 AI 图像提示词与模板 \| {siteName}` | `生成結果つきの画像生成 AI プロンプトとテンプレート \| {siteName}` |
| `description` | Explore AI image prompts with real examples, reusable templates, and model details. Find ideas for portraits, posters, product photos, and more. | 浏览带实际效果示例的 AI 图像提示词、可复用模板与模型信息，寻找人像、海报、商品图等创作灵感。 | 画像生成 AI のプロンプトを生成結果つきで紹介し、再利用できるテンプレートとモデル情報も掲載しています。人物、ポスター、商品写真などのアイデアを探せます。 |
| `hero.title` | AI image prompts with real examples | 带实际效果示例的 AI 图像提示词 | 生成結果つきの画像生成 AI プロンプト |
| `hero.intro` | Explore prompts, compare generated results, and adapt templates for portraits, posters, product photos, and more. | 浏览提示词、对比生成效果，修改模板，创作人像、海报、商品图等作品。 | プロンプトを見て生成結果を比べ、テンプレートを調整して、人物、ポスター、商品写真などを作れます。 |
| `hero.hint` | See what each phrase does. Point at, tap or tab to a lettered phrase to see its region in the image. | 看见每句话的作用。悬停、点按或用 Tab 键选中带字母的短语，查看它在图中的对应区域。 | 各フレーズの効果が見えます。記号付きのフレーズにポインターを置くか、タップするか、Tab で選ぶと、画像上の該当範囲が表示されます。 |
| `more.title` | Featured image prompts | 精选图像提示词 | 注目の画像プロンプト |
| `useCases.title` | Browse by use case | 按用途浏览 | 用途から探す |
| `latest.title` | Latest prompts | 最新提示词 | 新着プロンプト |
| `latest.all` | Browse all prompts | 浏览全部提示词 | すべてのプロンプトを見る |
| `templates.title` | Customizable prompt templates | 可自定义的提示词模板 | カスタマイズできるプロンプトテンプレート |
| `templates.intro` | Choose a template and customize its fields to create your prompt. | 选择模板并修改字段，生成你的提示词。 | テンプレートを選び、項目を変更してプロンプトを作成します。 |
| `collections.title` | Prompt collections | 提示词合集 | プロンプトのコレクション |

`more.all` 保留原有 ICU 计数结构，英文改为 `All {count, plural, one {# prompt} other {# prompts}}`，中文改为 `{count, plural, other {全部 # 条提示词}}`，日文改为 `{count, plural, other {全 # 件のプロンプト}}`。其他按钮与框号文案保持现有用途。

title 保留“with real examples / 带实际效果示例 / 生成結果つき”，使首页与只写“AI image prompts”的同类站点有所区分，同时不宣称每个条目都已验证。英文 title 在 siteName 为 Prompt Seen 时为 60 个字符；搜索结果可能截断或改写 title，发布后按 §9 记录实际显示。

en、zh-Hans、ja 以表中内容为验收基线。ja 文案遵守 `production/localization/ja/glossary.yaml` 与 `style-guide.md`：Output image 译为“生成結果”，Prompt、Template、Collection 分别为“プロンプト”“テンプレート”“コレクション”，说明文使用です・ます体，“AI”前后保留与现有消息一致的空格。修改的每个 ja 键按 §2.1 记录审校。ar 等预览语言采用同义本地化，按已有消息目录补齐新增键并通过现有消息检查，不把英文字符串复制为译文。ICU 复数、数字、日期、标点和语言名称使用现有 locale 格式化能力，不能复制英语的 one/other 规则替代各语言实际需要的复数形式。新增描述不宣称每个条目都经过验证；验证状态来自条目数据。

### 3.3 页面结构和首屏

- 每个首页一个可见 H1；有展示作品和无展示作品的分支都使用 `hero.title` 与 `hero.intro`。
- H1 下展示简介段落。`hero.hint` 使用现有注释提示位置，不再增加一行重复口号。
- 使用现有 `homePageMetadata` / `homeMetadata` 链路写入元数据，不在客户端直接修改 head。
- title 和 meta description 使用同一 locale 的消息；OG description 跟随该 description。保留品牌型 OG 标题的现有约定。
- 非默认语言首页 canonical 指向自身；默认语言根首页及其前缀别名沿用根首页 canonical。hreflang 来自本次实际构建且可访问的语言页面，使用 `htmlLang`；x-default 指向默认语言根首页，不把所有语言 canonical 合并到英文。
- 延续手机端作品、提示词和操作在前的视觉顺序。新增简介不得挤走既有首屏图片与复制操作；正文内容在初始 HTML 中存在，不能为爬虫单独展示。

## 4 浏览数据契约

### 4.1 作品卡片

复用已有的 `PromptSummary.locale` 和 `PromptSummary.description`，不新增内容 frontmatter 字段。

| `FeedCard` 字段 | 处理 | 语义 |
| --- | --- | --- |
| `locale: string` | 新增，必填 | 摘要和标题的页面语言注册表 code |
| `description: string` | 新增，必填 | 对应 locale 文件中的说明 |
| `promptOpening` | 从 `FeedCard` 移除 | 普通卡片不再传递原始正文开头 |
| `promptLanguage` | 保留 | 实际提示词语言；不得用它标记 description 的语言 |
| 其他现有字段 | 保留 | ID、路径、图片、测试信息、框号等 |

`toCard` 从 `PromptSummary` 直接映射新字段。`PromptSummary.promptOpening` 仍可供其他内容模型使用，本次不为清理字段扩大修改范围。`cardsFor` 继续从同一份 feed 卡片取数据，不在首页另建摘要索引。

公开条目的 description 继续由已有发布校验要求非空。运行时不以 `promptOpening`、其他语言说明或即时机器翻译兜底。区分“该条目没有目标语言发布版本”和“已经发布的版本缺少必填摘要”：前者按可见性规则省略，后者属于内容或产物错误，应由构建检查暴露。预览沿用既有草稿可见性，不用跨语言正文补齐草稿摘要。

### 4.2 模板卡片

`FeedTemplate` 增加必填的 `locale`、`description`，保留 `promptLanguage`，将 `excerpt` 改为 `ExcerptPart[] | null`。

在 `src/modules/feed/compose.ts` 提供共享的 `toFeedTemplate(summary: TemplateSummary, detail: TemplateDetail | null): FeedTemplate | null` 转换，首页编排、feed 编排和模板列表共同使用。详情不存在时返回 null，调用方跳过不可展示的条目。传入的摘要与详情必须属于同一 ID 和 locale；不允许混用另一语言的字段定义。转换规则如下：

1. 标题、说明、locale 来自同一份 `TemplateSummary`。
2. `summary.promptLanguage === summary.locale` 时，按当前逻辑从 `bodyExcerpt` 和该语言的字段定义生成 excerpt。
3. 语言不匹配时，`excerpt = null`，不把原文换个 lang 标签作为译文。
4. 使用注册表 code 精确匹配；不把 `zh-Hans`、`zh-Hant` 或不同区域变体隐式合并。
5. 同语言的提示词可以指定其他语言的画面文字，预览保留这些文字，不做字符级删改。

模板 description 始终展示；null excerpt 表示仅展示用途、标题和字段数量，没有空占位段落。变量名、颜色映射、样本值、编辑和复制行为保持原有字段契约。

首页模板区与 feed 中自动选取的模板插段使用同一个共享选择函数（例如 `pickFeedTemplates(summaries, detailOf, locale, limit)`，与 `toFeedTemplate` 同放在 `src/modules/feed/compose.ts`）。现有实现直接取前三个模板，可能把页面语言不同的模板排在前面：当前英文首页的三张模板卡都是中文正文，而 68 个模板中有 53 个的原始正文是英文。选择规则如下：

1. 先取 `promptLanguage === locale` 的模板，再取其他模板；两组内部保持输入索引的现有顺序。`locale` 使用第 2.4 节的注册表 code，精确匹配。
2. 依次调用 `toFeedTemplate`，跳过返回 null 的条目，直到取满上限（首页 `HOME_LIMITS.templates`，插段自动选取 3）。现有“先截取再过滤”可能不足三张，改为过滤后取满。
3. 同语言条目不足时用其他条目补足；补足的条目按上面的转换规则不显示摘录。
4. 插段配置中显式列出的 `templates` 是编辑选择，保持其顺序，不重排。独立模板列表展示全部模板，顺序不变。

ja 当前没有日文正文模板，ja 首页的三张模板卡都不显示摘录，这是预期行为。规则对所有注册表 code 相同，不写 `locale === 'en'` 一类分支。

### 4.3 生成与缓存

新字段同时进入 `public/generated/{locale}/feed/` 的页数据、相关索引中的卡片和服务端 HTML。测试夹具、Storybook、收藏页及弹窗骨架的构造数据一并更新。

沿用现有 `buildId` 和部署产物一致性机制，完整重新构建和打包；HTML、JS 与生成 JSON 使用同一构建版本。若存在仍读取 `promptOpening` 的消费者，先完成迁移，不通过兼容分支恢复外语摘要。

缓存身份至少区分 locale 和资源；带 buildId 的 feed/index 继续检查构建版本。现有 `loadJson` / `peekJson` 以完整生成 URL 为键时，URL 中的 locale 必须保留；不改成仅使用条目 ID、slug 或页码的全局缓存。`cardsById(locale)` 继续按语言隔离。

语言导航发生后，列表批次、收藏卡片、弹窗详情和首屏索引应绑定目标 locale。通过正确的组件重建或状态重置完成隔离；旧 locale 的异步请求即使晚返回，也不得提交到目标 locale 的 UI。feed 的历史快照只能在语言路径与 buildId 都匹配时恢复。

收藏的条目 ID 和用户已有收藏保持不变，展示数据重新从目标语言解析；目标语言不可见的收藏沿用不可用状态，不能展示缓存中的上一语言标题和摘要。不要求清除其他语言的合法缓存，也不新增每张卡片的网络请求。

### 4.4 切换语言的路由与状态

继续通过现有 `LanguageCombobox` 和路径函数导航到目标语言 URL。首页切换进入目标首页；条目有目标语言版本则进入相同条目；没有时沿用 `translation-missing`。详情弹窗中切换也使用现有完整导航语义，不增加弹窗内独立的 locale 状态。

目标页面就绪后，title、H1、简介、卡片、语言名、HTML lang/dir 与请求地址必须属于目标语言。浏览器前进、后退、刷新和通过 URL 直达均满足此约束；不允许只更新语言选择器文字而保留原来的内容。

语言偏好只保留既有导航用途，不把根首页改成按浏览器语言或 cookie 返回不同内容。模板切换语言时仍保持已填参数，按目标语言模板契约渲染；正文原文回退与页面说明缺译的处理分别遵循第 2.4 节。

## 5 组件展示行为

### 5.1 普通作品卡片

视觉顺序为图片、标题、摘要、测试信息。摘要在桌面、手机和键盘操作下始终可见，最多显示两行，使用 CSS 截断；DOM 保留完整的本地化 description。

- 摘要元素使用 `data-card-summary`，语言为 `card.locale`，方向从该 locale 推导。
- 测试信息保持可见；移除“悬停时 facts 被正文开头替换”的 CSS 和 JSX。
- 保留图片比例、裁切标记装饰、模型徽标的原有悬停行为、收藏按钮和详情链接。
- 摘要不设置 `aria-hidden`。卡片的 `aria-describedby` 包含摘要和测试信息的有效 ID，卡片名称仍由标题提供。
- 每张卡片只渲染一次摘要，不能另加隐藏的 SEO 文本副本。原始提示词不写入普通卡片的 title、aria-label、隐藏 span 或备用摘要。

摘要长度是编辑建议：英文一句、约 12–24 个词，中文、日文各一句简洁说明，不设构建长度门槛。

首页可见摘要的修订是发布验收项。范围是发布构建中各公开语言首页 `more` 与 `latest` 区的作品（当前英文首页为 6 + 12 = 18 项）。摘要从此成为全站卡片上的可见文字，每条须满足：

- 向访客说明主体和可见结果或用途，不打开详情也能区分相邻卡片。
- 不使用面向审校的措辞，例如“retains…”“preserves the reference”“保持参考图特征”。一致性与偏差属于详情页的观察结果正文。
- 与实际结果一致：精灵图后期合成的 GIF 不写成模型原生动画；没有验证记录时不暗示已验证。

需要修订的当前例子：p_234“Pelican and red bicycle preserve the sunset reference”，p_228“Synthetic blue-haired character retains hair clip and apron across six rice-eating poses”。

修订时的约束：

- 未设置 `seoDescription` 的条目，description 同时是详情页的 meta description（`scripts/lib/content/build-index.ts`）。修订会改变这些详情页的搜索摘要；这是预期效果，发布记录须列出受影响条目。
- 修改源语言文件的 description 后，zh-Hans 与 ja 译文变为 outdated。同一改动须更新这些译文、完成审校并写入新的 `sourceHash`；ja 的过期译文会直接导致构建失败（§2.1）。

例如猴子 GIF 可以描述“Six poses of a monkey raising a lantern, assembled into a looping GIF.”。说明应与实际结果一致，不把精灵图后期合成称作模型原生 GIF 输出。

### 5.2 模板卡片和模板列表

- 用途说明使用 `data-template-summary`，对应页面语言，始终可见。
- 有 excerpt 时使用 `data-template-excerpt`，保留参数颜色与实际正文语言。
- 无 excerpt 时不输出摘录节点，CSS 不预留其高度。
- 独立模板列表已经存在 description，迁移时只保留一份，不重复新增。

### 5.3 首屏与特写展示的原文边界

`FeatureShowcase` 是真实提示词与图片对应关系的演示，不属于普通摘要卡片。其 blockquote、短语位置、注释和复制内容继续使用同一个 `Showcase` 的真实正文。

为展示增加必填的页面 locale 参数，所有调用方与 Storybook 一并更新。在 blockquote 旁展示现有 `detail.sheet.label`，通过 `languageName(s.promptLanguage, locale)` 生成本地化语言名，例如 `Prompt · Chinese`。标签使用页面语言，blockquote 继续使用实际正文的 lang/dir。

各语言均使用第 5.4 节的首屏选择规则。没有适合的同语言案例时允许展示其他语言原文；“Another frame”中的其他语言案例也可保留，前提是语言标签清楚、复制取得所显示正文的完整版本。此类引用不计作摘要语言缺陷。标题、简介、摘要和标签仍须使用页面语言。

本次不改变验证状态计算，不把译文关联到另一份提示词的测试记录。如果首屏文案或记录声称已验证，则继续接受现有正文、语言、参数及输出匹配规则的检查。

### 5.4 各语言共用的首屏选择算法

选品在构建期的 `composeHome` 完成，不在客户端根据浏览器语言重新排序。下列规则对任意注册表 code `L = input.locale` 相同，不包含 `L === 'en'` 等分支。

候选准备：

1. `activeIds` 使用现有 `featuredOrder(input.settings.featured, input.today)`，保留已开始日期倒序、同日配置顺序及去重语义。
2. `futureOnlyIds` 为配置中出现、但不在 `activeIds` 中的 ID。这些条目未到首页展示日期，必须从本次所有首屏兜底池中排除；有已生效配置和未来重复配置的条目仍可展示。
3. 可用条目必须存在于目标语言可见索引，详情属于同一 ID 和 locale，具有可用封面与非空解析后的正文。标题与说明来自目标 locale。带标注候选沿用现有有效注释条件；不得把另一语言的短语位置用于当前正文。
4. `C` 为 `activeIds` 中可用且带标注的详情，保留配置排序。`F` 为 `input.featuredOrder` 中可用且带标注的详情，保持 feed 精选顺序，去除重复、`C` 中的 ID 及 `futureOnlyIds`。比较语言使用解析后的 `detail.prompt.language`。

按下表自上而下选择第一条适用规则，得到完整的 `onShow`：

| 条件 | `onShow` |
| --- | --- |
| `C` 中存在正文语言为 `L` 的案例 | 稳定分组为“`C` 中同语言案例”再接“`C` 中其他案例”；每组保留原有顺序 |
| `C` 无同语言案例，`F` 有同语言案例 | 取 `F` 中首个同语言案例放在前面，再接完整 `C` |
| 两者都无同语言案例，`C` 非空 | 使用完整 `C`，按实际正文语言标记 |
| `C` 为空，`F` 非空且无同语言案例 | 使用 `F` 的第一件案例 |
| 无可用带标注案例 | 从目标 locale 的最新作品序列中，排除 `futureOnlyIds` 后选择首个可用同语言详情，否则选择首个可用详情；只展示这一件 |
| 没有任何可用详情 | `onShow = []`，展示本地化 H1、简介、搜索及有效栏目 |

同语言优先在带标注候选中比较；只有没有可用带标注候选时才进入无标注兜底。无标注或当前媒体不支持标注交互时，不显示“点击短语查看区域”的提示。不得仅为满足语言偏好提高验证状态。

保持候选数量可控：有配置候选时最多在 `C` 之前增加一件兜底作品，不能把全部 feed 的完整提示词装入首屏客户端数据。搜索候选的过程中逐个解析、可用时停止；复用既有内容读取缓存，不为每个候选新增网络请求。

手动切换严格按该 locale 的 `onShow` 循环。切换页面语言后从目标语言的第一项开始，不沿用源语言的数组索引。`more` 继续从结果中的其余作品及 feed 精选顺序取值，排除当前首件并按 ID 去重。封面分享图从最终首件获取，没有首件时沿用无图元数据分支。生产与预览都只使用各自构建的可见内容。

确定性示例（`a`、`b`、`c`、`d`、`x` 表示不同条目，`L` 表示任意当前语言）：

| 用例 | 输入条件 | 期望 |
| --- | --- | --- |
| S01 | `C = [a(其他), b(L), c(其他), d(L)]` | `[b, d, a, c]`，同组次序不变 |
| S02 | `C = [a(其他), c(其他)]`，`F` 首个同语言为 `x` | `[x, a, c]` |
| S03 | `C = [a(其他), c(其他)]`，`F` 无同语言 | `[a, c]`，正确标明原文语言 |
| S04 | `C` 为空，`F = [a(其他), b(L), d(L)]` | `[b]` |
| S05 | `C` 为空，`F = [a(其他), c(其他)]` | `[a]` |
| S06 | 唯一同语言条目 `x` 在 `futureOnlyIds`，同时出现在 feed 中 | 不展示 `x`；按其他候选继续兜底 |
| S07 | 无带标注候选，最新可用序列为 `[a(其他), b(L)]` | `[b]`，保留真实正文，关闭无效标注提示 |
| S08 | 目标 locale 无可用详情 | 空 `onShow`、本地化首页、无失效操作或分享图引用 |

## 6 首页编排

`HOME_LIMITS` 保持原值：`more: 6`、`useCases: 8`、`latest: 12`、`templates: 3`、`collections: 2`。

v1.1 及之前曾计划把 `latest` 减为六项。重复展示的问题已由本地化摘要解决；减少数量只会删去首页指向最新条目的六个链接，而且剩下的六项仍是同一批 GIF 作品。对新站而言，首页链接有助于新条目被发现和抓取，因此保持十二项。若以后出于版面原因调整数量，须单独说明对内链的影响。

- `latest` 仍取 locale 索引的最新十二项；不足十二项时全部展示，空列表沿用现有空态。
- `more` 的候选顺序不变（其余展出作品，再接 feed 精选顺序，排除当前首件），但已在 `latest` 中的作品排到其他候选之后；候选不足六项时仍用它们补足。实施后的产物检查发现，首页配置的展出作品恰好是最新十二项，`more` 六项与 `latest` 完全重复，首页只链接 12 件不同作品；此规则使其增至 18 件。
- 模板区按第 4.2 节的选择规则取值。
- 不为多样性打乱“最新”的时间顺序，也不从该区排除恰好出现在精选中的新条目。
- 普通 feed 精选顺序与框号保持原义；首页首件及手动切换序列使用第 5.4 节结果。不同语言可有不同首图和轮换顺序，不能为此改写发布日期。
- “同系列最多两项”作为第二批编辑编排候选规则，不在第一版通过标题关键词或中文前缀猜测系列。
- 每个栏目入口使用现有路径函数，指向本次构建存在的页面；不新增空专题入口。

## 7 实现落点与任务顺序

| 任务 | 修改范围 | 可交付结果 |
| --- | --- | --- |
| T1 本地化浏览模型 | `src/modules/feed/types.ts`、`compose.ts`；`src/modules/home/compose.ts`；相关 fixtures | FeedCard 摘要字段贯通，模板转换与同语言优先的模板选择统一，HomeInput 显式传入 locale，JSON 与服务端消费者契约一致 |
| T2 卡片呈现 | `src/ui/gallery/Card.tsx`、`Card.module.css`、`Interludes.tsx`、`Gallery.module.css`；`src/ui/template-list/TemplateList.tsx` 及样式 | 可见本地化摘要、条件化模板摘录、可访问名称与描述正确 |
| T3 首页与真实正文展示 | `src/modules/home/compose.ts`；`src/ui/home/HomeHero.tsx`、`HomeBody.tsx`、`Home.module.css`；`src/ui/showcase/FeatureShowcase.tsx` 及所有调用方 | 同语言选品与确定性兜底、新 H1 和简介、正文语言标签、保持标注和复制 |
| T4 文案与语言导航 | 所有现有语言的 home 消息与 `production/localization/ja/reviews.json` 的字段审校；首页可见摘要在源语言、zh-Hans、ja 中的修订及 `sourceHash` 更新；检查 `LanguageCombobox`、`prefetch.ts`、`Feed`、`FavoritesList`、`DetailPopup` 的语言身份及状态生命周期 | 自然本地化、缺译行为明确、缓存与异步结果隔离；既有行为已满足时只补回归验证 |
| T5 验收和文档同步 | 第 8 节测试；网站设计、多语言设计和英语社交案例规格中的首屏顺序约定 | 注册表驱动的全语言验收，旧约定与新行为一致 |

T1 与 T2 是同一条贯通改动，合入版本必须同时更新数据生产方和消费者。各任务均以类型检查可通过的状态收尾，不能只修改接口后把其余调用方留给发布时修复。

涉及 Next 实现前阅读当前安装版本的指南：`node_modules/next/dist/docs/01-app/02-guides/static-exports.md` 和 `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`。继续使用静态导出，在构建时解析摘要，不引入每张卡片独立的网络请求。

若新增展示字体文字键，同步检查 `src/styles/fonts/display-cjk.ts` 的 `DISPLAY_MESSAGE_KEYS` 及字体构建；普通摘要使用现有正文字体。

## 8 验收测试

测试以固定混合语言夹具验证数据与 DOM，不依赖线上始终存在 `p_224`—`p_235` 或固定的十二次重复。语言一致性主要通过文本来源与 locale 字段判断，不能以“英文页没有任何汉字”替代正确的判断。

语言集合从构建产物的 `BUILD.locales` 获取，不在测试入口写死 en/zh-Hans。下表中的 `L`、`M` 表示不同的有效语言 code；数据层用夹具覆盖缺失分支，产物测试验证真实已发布内容。英文根首页与 `/en/` 是当前默认语言的具体实例，通用断言从注册表和路径函数推导。

| ID | 场景 | 必须满足 |
| --- | --- | --- |
| A01 | `L` 页面、`L` description、`M` 原始 prompt | FeedCard.locale 为 `L`；摘要等于 `L` description；卡片数据没有 promptOpening |
| A02 | 同条目切换到 `M` 页面 | 摘要等于 `M` description；原始正文和测试记录未被摘要替换 |
| A03 | `L` 模板页面，只有 `M` 正文 | description 为 `L` 且可见；excerpt 为 null；无摘录 DOM；字段数和详情入口可用 |
| A04 | 模板有 `L` 正文 | 摘录、参数顺序和颜色来自该版本；编辑默认值和复制保持正确 |
| A05 | `L` 指令要求图片写 `M` 文字 | 原文中的指定画面文字保留，不按字符所属文字系统误判或删除 |
| A06 | 初始 HTML、分页直达、无限滚动追加 | 同一作品的摘要和 locale 一致，原始正文不会作为普通卡片隐藏副本重新出现 |
| A07 | 首页、列表、收藏、相关推荐复用 Card | 摘要始终可见，保存/打开/返回正常，弹窗骨架不因字段迁移报错 |
| A08 | 默认语言根首页及其前缀别名 | title、H1、简介一致；各一处 H1；canonical 指向根首页，hreflang 和 x-default 来自实际构建语言 |
| A09 | 每个 `L` 首页的首件及手动切换 | 选品符合 S01—S08；有适合的同语言候选时首件为 `L`；复制等于当前完整 prompt；切换页面语言后重置为目标首件 |
| A10 | `L` 首页显示 `M` 原文 | 页面文案、摘要使用 `L`；blockquote 标记 `M`；语言名用 `L` 表达；有效标注可操作，验证状态不被提升 |
| A11 | 首页最新区有 0、3、超过 12 项 | 数量为 min(12, 总数)，保持输入索引顺序，空态无坏链接 |
| A12 | 重复公共前缀的两条固定夹具 | 卡片显示各自用途说明，正文中的公共前缀不进入卡片文本 |
| A13 | 声明为可发布的 `L` 版本缺少必填摘要 | 发布校验失败，不退回原始提示词或另一语言摘要 |
| A14 | 生产与预览构建 | 所有已构建语言的新消息键齐全；循环测试该构建的全部语言；公开语言集合不因本次改变 |
| A15 | 每种已构建语言的直达、刷新和非默认首页 | HTML lang/dir、title、H1、摘要、日期数字均属于目标语言；canonical 指向正确页面；无 hydration 错误 |
| A16 | 默认语言与每个其他语言双向切换 | 目标 URL 与页面数据一致；前进后退正常；新页面不残留原语言摘要和首屏索引 |
| A17 | 同 ID、slug 或页码的不同语言缓存 | 数据按 locale/URL 隔离；先缓存 `L` 再打开 `M` 时不会读取 `L` 的标题、摘要或详情 |
| A18 | `L` 请求未完成时切到 `M`，随后 `L` 请求返回 | 迟到结果不覆盖 `M`；追加页、收藏及弹窗保持目标语言 |
| A19 | 收藏条目在 `M` 没有已发布页面版本 | 收藏 ID 保留，按既有不可用状态展示；不出现 `L` 卡片补位；切回 `L` 可再次查看 |
| A20 | 目标页面说明缺译，或只有目标提示词正文缺译 | 前者进入已有缺译路由或从列表省略；后者保留目标语言说明与标明语言的原始正文 |
| A21 | 模板填写参数后切换语言 | 保持既有参数迁移规则，使用目标模板渲染契约；复制内容与当前渲染的完整正文一致 |
| A22 | LTR ↔ RTL 切换，含不同方向的原文 | 页面方向更新，原文方向独立；摘要、按钮、焦点与省略显示正确，无横向溢出 |
| A23 | 格式化扩展、区域变体和未来新增语言 | `ar-u-nu-latn` 归一到 ar；不同注册表 code 不合并；新增语言夹具无需修改选择算法即可通过 |
| A24 | 未来展示日期、无可用带标注作品、空语言索引 | 未来条目不从 fallback 提前出现；无标注时无无效引导；空首页无失效复制按钮或 OG 图片引用 |
| A25 | `L` 页面的模板输入为 `[a(M), b(L), c(M), d(L), e(L)]`，其中 `d` 无详情 | 首页取 `[b, e, a]`：同语言优先、组内顺序不变、跳过无详情条目并取满；`a` 无摘录。插段显式列表保持配置顺序 |
| A26 | 修改英文消息与条目摘要后的 ja 检查 | `npm run locale:check -- --locale ja` 无 finding；`content:validate` 无 ja 发布错误；被修改条目的 zh-Hans、ja 译文 `sourceHash` 为当前值 |
| A27 | 首页可见摘要审阅 | 发布构建中各公开语言首页 `more`、`latest` 的全部摘要按 §5.1 逐条审阅并记录结论，不含面向审校的措辞 |
| A28 | 展出与精选候选都在最新十二项中，另有足够的其他作品 | `more` 不含 `latest` 中的作品；其他候选不足时仍取满并把 `latest` 作品排在后面 |

### 8.1 测试位置

- 数据与编排：扩展 `src/modules/feed/feed.test.ts`、`src/modules/home/home.test.ts`。覆盖 A01—A05、A11—A12、A23—A25 和 S01—S08；选品期望使用手工明确的输入输出，避免只调用同一个生产 helper 计算 expected。A13 和 A20 的内容可见性在 `scripts/lib/content/content.test.ts` 中验证。
- HTTP：扩展 `tests/e2e/home.http.spec.ts`、`list.http.spec.ts`、`templates.http.spec.ts`、`seo.http.spec.ts`，检查真实构建产物。
- 浏览器：扩展 `home.browser.spec.ts`、`list.browser.spec.ts`、`favorites.browser.spec.ts`、`prompt-languages.browser.spec.ts` 和已有语言导航用例，覆盖可见摘要、追加页、弹窗、剪贴板、A15—A22 的语言切换与状态。延迟请求用拦截与手动释放复现，不能用随机等待代替竞态验证。
- 卡片定位使用 `data-entry` 与新增摘要属性；原始提示词检查限定普通卡片子树，排除 script/style、JSON-LD 和明确的原文展示组件。
- 语言扫描可作为内容审阅提示，报告文本、条目、locale 和位置；第一版不引入通用语言检测依赖或按字符比例阻断发布。

每种语言都做直达/刷新 HTTP 与浏览器检查，并执行“默认语言 → 目标语言 → 默认语言”的切换；这覆盖所有语言且不要求穷举全部语言对。预览中另选一条跨拉丁、CJK、RTL 的连续切换路径，包含非默认语言之间的切换。缺少生产数据的分支通过固定夹具覆盖，不伪造线上翻译；有界面的路径仍需真实浏览器验证。

首页 HTTP 与浏览器测试中现有的 `worksOnShow` helper 需要同步新规则，但不能让生产选择函数与测试的 expected 共用同一实现而掩盖排序错误。保留 S01—S08 的独立断言，并检查元数据分享图对应实际首件。

### 8.2 视觉和可访问性

检查 1440×900 桌面、390×844 手机，以及 320px 窄屏。桌面保留现有首页首屏图片、H1、标注引述与复制操作的可见约束；390×844 保留图片、复制操作和引述开头的首屏约束。

摘要最多两行，无文字与模型、日期重叠；长拉丁词、中日韩连续文字和 RTL 均不横向溢出，不用按空格截词实现摘要。样式采用逻辑方向属性，页面方向来自注册表，原文单独处理双向文本。悬停、键盘焦点和触摸不会切换出其他语言摘要。深浅主题可读，减少动画偏好仍有效，无新增 serious/critical 可访问性问题。

继续使用真实图片尺寸和懒加载策略，不为容纳简介裁切主图或隐藏复制操作。若布局检查失败，调整现有字号、间距和图片最大高度后复验，不直接删除断言。

### 8.3 实施完成时运行

按当前仓库脚本执行 `npm run content:validate`、`npm run locale:check -- --locale ja`、`npm run typecheck`、`npm run lint`、`npm test` 和生产 `npm run build`；再运行上述相关 Playwright HTTP 与浏览器用例。Playwright 使用 `dist/` 产物及参考 nginx，需先完成构建并具备当前配置要求的浏览器和容器环境。

另做 preview 构建，遍历其所有 `BUILD.locales` 的首页/模板并验证语言导航；当前额外覆盖 ja、ar，未来增加语言后自动纳入。实施者记录实际命令、构建模式、语言集合和结果；环境缺失不能记为通过。文档格式检查限定变更文件，避免格式化整个已有工作区。

## 9 发布检查与效果观察

发布前保存可复查的首页 title、H1、摘要样本、语言标签、桌面和手机截图，以及同一构建的测试结果。同步发布 HTML、脚本和 feed JSON，记录 buildId。

与 ja 发布的顺序：ja 发布候选的验收绑定提交 a4d4b964 的运行输入（`production/localization/ja/acceptance.md`），本规格的改动会改变这些输入。建议在 ja 候选部署之后再合入本规格。若两者合并发布，须按[日语本地化规格](./japanese-localization-spec.md) §10.1 对最终提交重新完成 ja 验收，不能沿用旧结果；效果观察也须注明同期上线了 ja。

发布后只读核查构建清单中的所有公开语言首页、默认语言根首页与别名：元数据正确、摘要已经替换、选品与语言标签符合规则、手动切换和复制正常、语言路径仍可达。预览语言在对应预览部署验证，不作为生产页面假定存在。回退使用上一份完整构建产物，避免只回退 HTML 造成数据契约不一致。

效果观察以实际发布日 D 为基准，按各语言首页 URL 分组。2026-11-06 的 Search Console 记录显示全站 0 曝光，报告仍在处理数据；D 前 28 天的首页数据预计接近空白，不能作为前后对比的基线，但仍要导出留档。观察按以下顺序：

1. 收录：各语言首页的索引状态和 Google 选择的 canonical；默认语言前缀别名没有作为独立结果收录。
2. 标题展示：搜索结果实际显示的 title 是否为新 title；被改写时保存改写后的文本和查询。
3. 查询出现：首页开始获得曝光的非品牌查询，以及它们所属的主题（AI 图像提示词、模板、具体用途）。
4. 曝光足够后再比较：同一语言首页两个等长窗口的非品牌曝光各达到约 1,000 次后，再比较曝光、点击、CTR 和同类查询的排名变化；未达到时只记录趋势，不下结论。

不把英语词频或英语查询表现作为其他语言的验收标准。变化只能作为信号，不能直接归因于单次改动。

如现有分析系统能提供首页进入详情、模板使用或复制数据，一并观察；没有事件数据时记录为不可用，本规格不额外引入分析服务。低流量时延长观察，不承诺固定涨幅，不创建自动监控任务。

## 10 第二批内容工作边界

| 工作 | 开始条件 | 交付与验收 |
| --- | --- | --- |
| 完善已有用途页 | 第一版发布；有真实相关案例 | 本地化用途介绍、案例说明、正确内链；按已有内容发布规则构建 |
| 模型专题 | 能用现有案例回答具体模型使用需求 | 独立模型说明、适用场景、对应记录与案例；仅在页面可发布后添加首页链接 |
| GIF 专题 | 有可复现的精灵图与合成案例 | 明确生成和后期边界，提供真实流程、参数与结果；不把合成动画描述为原生视频输出 |
| 精选系列分组 | 明确哪些内容属于同一系列及顺序归属 | 先提交包含稳定分组依据、与 `home.featured` 的优先关系及兼容规则的增量规格，再实现每系列上限；不得从标题或语言猜测 |

第二批不阻塞第一版的语言与文案修复。任何新增页面都需要独立内容价值，不能只替换标题中的关键词复制现有列表。

## 11 依据

- [Google 多语言网站指南](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)：页面可见内容帮助语言识别，语言版本应有明确地址与对应关系。
- [Google 标题指南](https://developers.google.com/search/docs/appearance/title-link)：标题需清晰、准确、简洁，避免关键词堆砌。
- [Google SEO 入门指南](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)：改动效果需要观察，不能保证固定时间或排名提升。

上述原则支持内容与语言清晰度；本规格中的模板选择、摘要布局和文案是本产品的实现决策。
