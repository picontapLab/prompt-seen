# Prompt 图片资源库：主流语言覆盖评估

> 评估日期：2026-10-14（America/Los_Angeles）  
> 状态：架构与发布建议，尚未实施  
> 适用场景：SEO 优先的图片 Prompt、模板与案例网站；开发者通过 Git 与文件维护；支持逐语言、逐条内容发布。

## 1. 建议结论

建议按 **13 个 locale、12 种语言**设计第一阶段的覆盖范围。简体中文与繁体中文分别维护，因此 locale 数量比语言数量多 1。

- 第一批 8 个：`en`、`zh-Hans`、`es`、`pt-BR`、`ja`、`ko`、`de`、`fr`。
- 第二批新增 5 个：`ru`、`zh-Hant`、`it`、`id`、`ar`。
- 后续候选：`nl`、`pl`、`tr`、`vi`、`hi`、`th`，由真实查询、使用情况及维护能力决定顺序。

这是结合现有中文用户约束、跨语言覆盖和实现成本作出的**产品推荐**，不是用户规模排行，也不是“13 个 locale 能覆盖多少全球用户”的统计结论。第一批中的韩语、第二批中的阿拉伯语用于验证更广的产品适配；并没有足够证据断言它们一定比荷兰语、波兰语带来更多访问或收入。

如果产品只追求尽快验证欧洲语言的 SEO 增量，可把 `nl`、`pl` 提前，换到部分第二批语言之前；应保留可调整发布批次的能力，而不是把市场判断写进业务代码。

## 2. 证据范围与限制

本次采用第一手来源：W3Techs 的内容语言表和测量说明、Google Search Central 的多语言搜索规范、W3C 国际化指导、Unicode 的分词与 locale 数据规范。没有使用语言人口榜、第三方估算的 AI 产品地区流量、模型声称支持的语言数量来推导消费能力。

**已核对事实：** W3Techs 总表访问日期为 2026-10-14，页面图表标注日期也为 **14 October 2026**；数据会每日更新。表格统计已识别内容语言的网站，单位不是用户、访问次数或搜索量。[官方内容语言表](https://w3techs.com/technologies/overview/content_language)

W3Techs 方法说明：样本包含超过 2000 万个有实际内容或功能的站点；排除无用站点、重复站点、跳转域名；按网站统计，子域不作为独立网站。不能把这些比例相加，声称所选语言覆盖某个比例的全球用户；也不能把该样本等同整个互联网人口。[方法说明](https://w3techs.com/technologies)、[官方 FAQ](https://w3techs.com/faq)

尚未取得这个新网站的真实查询量、地区流量、复制率、复访率或付费数据。因此以下优先级属于可验证的建议；中文、印地语、阿拉伯语的低网站占比不能证明相应用户需求低。

## 3. 已核对的语言信号

下表数字统一来自 2026-10-14 的 W3Techs 官方总表。中文未区分简繁，葡萄牙语未区分巴西和葡萄牙；该来源不支持对这些子类型分别报数。[数据来源](https://w3techs.com/technologies/overview/content_language)

| 语言 | 内容语言已识别的网站占比 | 建议 locale | 建议批次 |
| --- | ---: | --- | --- |
| 英语 | 49.5% | `en` | 第一批 |
| 西班牙语 | 6.0% | `es` | 第一批 |
| 德语 | 5.9% | `de` | 第一批 |
| 日语 | 4.9% | `ja` | 第一批 |
| 法语 | 4.5% | `fr` | 第一批 |
| 葡萄牙语 | 4.1% | `pt-BR` 起步 | 第一批 |
| 俄语 | 3.4% | `ru` | 第二批靠前 |
| 意大利语 | 2.8% | `it` | 第二批 |
| 荷兰语／弗拉芒语 | 2.2% | `nl` | 后续高优先候选 |
| 波兰语 | 1.8% | `pl` | 后续高优先候选 |
| 土耳其语 | 1.6% | `tr` | 后续候选 |
| 中文 | 1.3% | `zh-Hans`、`zh-Hant` | 第一／二批 |
| 印尼语 | 1.2% | `id` | 第二批 |
| 越南语 | 0.9% | `vi` | 后续候选 |
| 韩语 | 0.9% | `ko` | 第一批 |
| 阿拉伯语 | 0.6% | `ar` | 第二批 |
| 泰语 | 0.3% | `th` | 后续候选 |
| 印地语 | <0.1% | `hi` | 需要专项验证 |

## 4. 第一阶段 13 个 locale 的取舍

下表“推荐理由”“成本”均为针对本产品的设计判断。成本按同样数量的内容、同样发布质量比较，不是报价或翻译质量测量。

| locale | 发布名称 | 推荐理由 | 主要维护工作 | 相对成本 |
| --- | --- | --- | --- | --- |
| `en` | English | 作为全局入口和跨语言内容基线；官方表中网站占比最高 | 建立 Prompt、摄影、设计术语表；写清模型与适用条件 | 基线 |
| `zh-Hans` | 简体中文 | 延续已经明确的中文用户需求 | 中文标题、说明、关键词与搜索词；中英 Prompt 块各自标语言 | 中 |
| `es` | Español | 网站语言信号较强，初期一份通用西语内容便于管理 | 优先通用术语；避免过多局部俚语；有地区需求后再拆 | 中 |
| `pt-BR` | Português (Brasil) | 葡语值得覆盖；先明确一种编辑规范，减少地区写法冲突 | 明确标为巴西葡语；未来 `pt-PT` 独立审校 | 中 |
| `ja` | 日本語 | 网站语言信号较强；也可验证亚洲非拉丁文字体验 | 日文断句、搜索分词、专业词及按钮长度 | 中高 |
| `ko` | 한국어 | 在首批验证韩文体验与术语适配；优先级是产品假设 | 韩文搜索、助词和专业表达；不能按中文分词处理 | 中高 |
| `de` | Deutsch | 网站语言信号较强 | 复合词搜索、长标签与换行、语法性术语 | 中 |
| `fr` | Français | 网站语言信号较强 | 重音字符、标点和词汇、通用法语规范 | 中 |
| `zh-Hant` | 繁體中文 | 中文资源可以再利用，但需要独立文本规范 | 简繁转换草稿加术语审校；不能只换字符就宣称地区适配完成 | 中 |
| `ru` | Русский | 官方表中的俄语信号明显，适合第二批靠前 | 西里尔字体、词形变化、搜索别名和术语审校 | 中高 |
| `it` | Italiano | 网站语言信号较强，界面布局可复用 | 专业术语、复数、长文审校 | 中 |
| `id` | Bahasa Indonesia | 在第二批验证东南亚拉丁文字内容 | 印尼语术语与检索词，不与马来语混用 | 中 |
| `ar` | العربية | 覆盖 RTL 使用体验；发布前需要独立验收 | 标准书面语规范、RTL 布局、双向文字、字体和混合输入 | 高 |

葡语先选巴西版本、韩语进入首批、阿拉伯语进入第二批，并不来自 W3Techs 的地区或产品流量数据。它们是本方案的编辑和覆盖选择，发布后应根据实际结果调整。

## 5. 下一批候选如何排序

| 候选 | 建议判断 | 增加语言前应验证的内容 |
| --- | --- | --- |
| 荷兰语 `nl` | 优先候选；网站语言信号高于数个推荐语言，值得用专题试点 | 相关关键词曝光、试点点击与复制率、编辑审校人选 |
| 波兰语 `pl` | 优先候选；网站语言信号明确 | 词形匹配、搜索术语、模板说明的审校能力 |
| 土耳其语 `tr` | 第二梯队靠前；可共享拉丁文字 UI | 土耳其语大小写转换、附加词尾和搜索相关性 |
| 越南语 `vi` | 第二梯队；可复用 LTR 布局 | 组合字符与重音输入、字体、词组搜索与技术术语 |
| 印地语 `hi` | 保留独立试点；不因网站占比低直接否定 | 天城文字排版、Hinglish／英语混合查询、当地用户实际使用偏好 |
| 泰语 `th` | 适合有需求后专项上线 | 无空格文本的分词、断行、字体和输入体验 |

若下一阶段希望覆盖更多实际可维护的语言，推荐先试点 `nl`、`pl`、`tr`、`vi`，再以专项结果决定 `hi`、`th`。这是维护收益的假设，不是受众价值判断。俄语已进入第二批，不再放在无限期观察名单。

## 6. 语言、地区、文字不能混为一个维度

BCP 47 支持语言、文字和地区子标签。W3C 建议只在确有区分价值时增加子标签。[W3C 语言标签说明](https://www.w3.org/International/articles/language-tags/)

**建议约定：**

- 中文使用 `zh-Hans`、`zh-Hant`，避免用国家代码代表书写体系；繁体内容以后可按实际术语需要再拆 `zh-Hant-TW`、`zh-Hant-HK`。
- 英语先使用 `en`，无需为相同内容复制 `en-US`、`en-GB`、`en-AU`。
- 西语先使用 `es`，有实质内容差别后再增加 `es-ES`、`es-MX` 等。
- 葡语明确使用 `pt-BR`，不把巴西版本当作所有葡语地区都已完成本地化。
- 阿拉伯语初期使用 `ar` 和统一书面语编辑规范，不为每个国家生成相同副本。

**SEO 特别注意：** `es-419` 是有效的 BCP 47 语言标签，但 Google 当前 `hreflang` 文档明确说明不支持这一代码。HTML `lang` 与 Google `hreflang` 的接受范围不是完全相同。初期选择 `es` 可以避免这项差异；Google 明确支持 `zh-Hans`、`zh-Hant`。[Google 支持的语言及地区代码](https://developers.google.com/search/docs/specialty/international/localized-versions#language-codes)

页面路径可统一小写，如 `/zh-hans/prompts/ink-portrait`、`/pt-br/templates/product-poster`；注册表保存规范标签 `zh-Hans`、`pt-BR`。路径格式和语言标签分别管理，避免随处手写。

## 7. 从双语架构升级需要改变哪些部分

### 7.1 内容按条目、按语言独立发布

建议保持一份共享资源数据，每种语言维护对应介绍：

```text
content/prompts/p_001/
├── entry.yaml
├── prompt.txt
└── locales/
    ├── en.mdx
    ├── zh-Hans.mdx
    ├── es.mdx
    └── ja.mdx

content/locales.yaml
src/i18n/
├── messages/en.json
├── messages/zh-Hans.json
└── glossary/
    ├── common.yaml
    └── ja.yaml
```

`entry.yaml` 存 ID、分类、模型、资源图片和来源等共享信息。每份 locale 文件包含 `title`、`summary`、SEO 元数据、正文、图片替代说明及翻译状态。模板字段的 ID 固定，标签与帮助文字放进 locale；图片内实际文案使用单独的 `outputTextLanguage`。

语言注册表至少包含 `code`、`pathPrefix`、`nativeName`、`htmlLang`、`direction`、`enabled`，与详细设计文档一致。不要求新增一条内容就立即准备 13 份翻译；只有审核完成的版本生成可索引页面。

### 7.2 明确三种不同的“语言支持”

| 层次 | 覆盖内容 | 发布要求 |
| --- | --- | --- |
| 界面语言 | 导航、筛选、表单、按钮、提示、日期与数量 | 字典完整且经过排版验收 |
| 内容与 SEO 语言 | 标题、摘要、正文、专题、alt、title 与 description | 内容独立审核，按条目发布 |
| Prompt 输出语言 | 原始 Prompt、可选的本地化 Prompt、图中文字语言 | 保留原始版本；新增翻译版本需记录模型、测试及差异 |

“支持阿拉伯语界面”不能自动表示“所有 Prompt 都已验证可用阿拉伯语生成图片”。切换页面语言只改变介绍和操作文案；默认复制经验证的原始 Prompt。若翻译 Prompt 的语义、变量或画面文字发生变化，需要作为独立变体保存，不覆盖原始案例。

### 7.3 翻译状态与变更跟踪

页面状态使用 `draft`、`published`、`archived`；审核状态独立使用 `machine-draft`、`reviewed`、`outdated`，另外保存 `sourceLocale`、`sourceHash`、`translatedAt`、`reviewedAt`、`reviewer`。源文变化时识别受影响翻译并报告待复核；关键操作或输入约束改变时，应复核相关译文。普通文案修改不强制所有 locale 一起更新。

用工具批量产生翻译草稿，CI 校验占位符、字段、链接、标签和源内容哈希，审校者检查术语与含义；不要由 CI 自动把未经审校的草稿设为发布。Google 对自动生成内容强调准确性、质量及相关性，并提醒大量缺乏用户价值的页面可能违反其规模化内容滥用政策。[Google 自动生成内容指导](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)

## 8. 国际化 SEO 的发布规则

以下是 Google 已核对的要求或建议，以及本方案对应的实施约定：

1. **官方建议：每种语言使用独立 URL。** 本方案使用同域子目录；不要依赖 Cookie 或 `Accept-Language` 在同一地址返回不同主要正文。[多语言站点规范](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
2. **官方说明：Google 根据可见内容判断语言。** 因而翻译标题、说明、使用指南和专题；不能只翻译菜单就称完成 SEO 本地化。经验证的原始 Prompt 可以保留在独立标记语言的块中。[页面语言识别](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites#make-the-page-language-obvious)
3. **官方要求：语言关联包含自身并相互返回。** 本方案从已发布版本集合生成完整 `hreflang`；使用绝对地址；每个已完成翻译页面使用自身 canonical。缺失翻译不生成同地址风格的英文复制页。[语言版本关联](https://developers.google.com/search/docs/specialty/international/localized-versions)
4. **官方建议：避免自动语言跳转。** 本方案保留手动切换，初访只提示建议语言；用户正在访问的语言页面不因 IP 被改写。[用户切换与跳转](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites#let-the-user-switch-the-page-language)
5. **本方案约定：单一发布集合控制全部输出。** 页面生成、sitemap、搜索索引、语言菜单及 `hreflang` 共用已发布状态。只有真实存在且审核完成的页面进入这些集合。
6. **官方支持：`x-default` 处理未匹配语言。** 本方案首页可关联语言选择入口；详情可关联对应的英文落地页，且该页面必须存在。[x-default 文档](https://developers.google.com/search/docs/specialty/international/localized-versions#xdefault)

Google 说明 HTML、HTTP header 和 sitemap 三种语言关联方式等效，没有同时维护三份的搜索收益。本方案优先由同一生成器输出 HTML 的语言关联；sitemap 必须准确列出可索引页面；若也输出 sitemap alternate，则必须复用同一发布集合。[关联方式说明](https://developers.google.com/search/docs/specialty/international/localized-versions#methods-for-indicating-your-alternate-pages)

## 9. 搜索、字体和 RTL 的实际成本

### 9.1 搜索不能统一按空格切词

Unicode 文本分段规范说明，中文、日语、泰语等语言的可靠词边界检测需要字典或其他专门机制；可见字符也可能由多个码点组成。[Unicode UAX #29](https://www.unicode.org/reports/tr29/)

**建议：** 搜索索引按 locale 单独生成；构建端与查询端使用相同版本的分析器；中文、日文和泰文分别验证分词方案。韩文需要单独相关性验证，不能直接归入中文逻辑。对拉丁／西里尔语言测试大小写、重音、词形、专业别名；提供固定英文模型名称和艺术术语的跨语言检索。截断和高亮按 grapheme cluster 处理，避免破坏重音与组合字符。

### 9.2 不把所有字体和字典一次发给用户

**建议：** 当前 locale 加载对应 UI 字典、搜索索引和字体；首页初始渲染不加载其余 12 份全文索引。用 CLDR／Intl 系列能力处理日期、数字、复数和排序；不把“数量 + 固定英文单词”当通用句式。Unicode CLDR 本身提供这些 locale 规则。[CLDR 官方说明](https://cldr.unicode.org/)

### 9.3 阿拉伯语需要独立 RTL 验收

W3C 指导使用 HTML `dir` 控制基础方向；未知方向的输入可以用 `dir="auto"`，混合方向的内联文本可用 `bdi` 隔离。[W3C 方向与输入指导](https://www.w3.org/International/questions/qa-html-dir)

**建议：** 基础组件从第一批开始使用逻辑方向属性，避免到阿拉伯语上线时重写布局。RTL 页面设置 `lang="ar" dir="rtl"`；英文 Prompt、代码和模型名按内容实际方向设置 LTR 或隔离。返回箭头与抽屉位置按语义适配；图片、播放符号及图表不机械镜像。测试键盘焦点、输入光标、弹层关闭、滑块、筛选顺序及动效方向。

## 10. 分批发布与验证

### 第一批：8 个 locale 的完整纵向样本

建议每个语言先准备首页、分类解释、20 条代表性 Prompt、3 套模板和 2 个专题，确保“搜索进入 → 阅读 → 改写 → 复制”流程完整。这是可执行的起始样本建议，不是 SEO 必需数量。

先完成英语与简体中文基线，再在同一批次内逐个发布西语、巴西葡语、德语、法语、日语、韩语。每种语言达到质量条件后独立上线，避免整批同时等待。

### 第二批：扩展到 13 个 locale

建议优先推进俄语、繁体中文和意大利语；随后印尼语；阿拉伯语在 RTL 专项验收通过后发布。若首批数据反而显示荷兰语或波兰语需求更明确，可提前试点这两种语言。批次中的顺序可以随实际数据调整。

### 第三批：用数据代替固定排名

按语言和页面类型观察：自然搜索曝光及点击、索引状态、站内无结果查询、Prompt 复制、模板使用、复访和来源页。国家数据与页面语言分别记录，不能把国家一对一映射为语言。

建议发布后一段足够观察窗口内复盘，例如 6–8 周；该周期仅为运营建议，新站收录与季节性可能需要更久。评估以趋势和实际样本量为准，不预设某种语言一定盈利；没有曝光也要检查页面是否被发现、索引及内容是否有竞争力。

## 11. 内容与构建成本的估算方式

不要以语言数量直接估算总成本：共享元数据、资源图片和模板变量定义只维护一次；正文、SEO 元数据、术语、审校及搜索质量随 locale 增长。

例如 500 个条目全部发布 13 个 locale，会产生最多 6500 个条目详情页，尚未包括专题和列表页。这只是 `500 × 13` 的规划示例，不是现有仓库数量。每次源文变化，更新任务也会扩大；通过状态和哈希跟踪精准定位待复核内容。

推荐把维护预算分为三个部分：固定 UI 字典和组件适配；按条目增长的翻译与审校；按语言增长的分词、术语、字体和用户质量验证。阿拉伯语的固定界面适配成本较高；中文、日文、泰文等的搜索工作更需要专项验证。实际报价应按文本量、审校方式和翻译工具另行估算。

## 12. 对既有详细设计文档的更新要求

- 把“中英文双语”约束改为“第一阶段 13 个 locale，按内容独立发布”。
- 增加统一 locale 注册表，使用 `zh-Hans`、`zh-Hant` 替代笼统中文版本。
- 将 `zh.mdx`、`en.mdx` 扩展为 `locales/{tag}.mdx`，并设置翻译状态与来源哈希。
- 将页面语言、Prompt 语言、图片中文字语言作为不同字段。
- 搜索、sitemap、语言切换、canonical 和 `hreflang` 共用发布集合。
- 增加 RTL 逻辑属性、字体分包、Unicode 字符处理与多语言搜索验收。
- 将 13 个 locale 覆盖目标与首批 8 个 locale 发布范围分开写清，避免首版承诺全部内容已完成所有语言审校。

对应内容已经同步至 [详细设计文档](./prompt-library-website-design.md)，本文记录评估依据，详细设计文档定义实施约定。

## 13. 来源核查记录

所有页面于 2026-10-14 访问。动态内容语言表的页面标注日期为2026-10-14；以后引用比例需要重新核对。下面列出本报告使用的第一手来源，链接指向支持相应事实的原页。

| 来源 | 支持的事实范围 |
| --- | --- |
| [W3Techs 内容语言表](https://w3techs.com/technologies/overview/content_language) | 本报告语言占比与2026-10-14图表日期 |
| [W3Techs 方法说明](https://w3techs.com/technologies) | relevant web、网站统计单位、子域合并及排除规则 |
| [W3Techs FAQ](https://w3techs.com/faq) | 抓取、更新与测量限制 |
| [Google 多语言与多地区网站](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) | 独立 URL、可见内容识别与避免自动跳转；页面标注更新2025-12-10 |
| [Google 语言版本关联](https://developers.google.com/search/docs/specialty/international/localized-versions) | hreflang、语言代码、简繁标签、x-default及三种实现方式；页面标注更新2026-09-21 |
| [Google 自动生成内容指导](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) | 内容质量、审校与规模化低价值页面问题；页面标注更新2026-10-01 |
| [W3C 语言标签](https://www.w3.org/International/articles/language-tags/) | BCP 47 标签、语言／文字／地区区分 |
| [W3C 双向文字及HTML方向](https://www.w3.org/International/questions/qa-html-dir) | dir、auto、bdi及混合输入 |
| [Unicode 文本分段规范](https://www.unicode.org/reports/tr29/) | 字符簇、词边界与语言分词；页面版本Unicode18.0.0、日期2026-09-01 |
| [Unicode CLDR](https://cldr.unicode.org/) | 日期、数字、复数、排序与地区规则 |

本报告不提供全球用户覆盖百分比、具体语言的 AI 付费能力排行或该网站的预期流量数字；现有证据不足以支持这些定量结论。
