# 土耳其语接入实施规格

状态为待实施。基线日期为 2026-11-17（America/Los_Angeles），工程基线为 `53cbc8efce854f8f067acef8372daf49be82f9c3` 及当日工作区。

交付可用土耳其语浏览、搜索、查看案例和填写模板的 `/tr/` 站点。首发采用 `complete/fingerprint/source-only`。先在预览中跑通一组真实案例，再完成全量翻译、审校与静态产物验收。土语是界面和内容说明的语言，复制、下载及导出使用各条目实际验证的 Prompt 正文。[语言覆盖评估](language-coverage-assessment.md) · [通用本地化规格](general-localization-spec.md) · [本地化操作流程](localization-workflow.md)

## 1. 语言标识与发布状态

| 用途 | 值 |
| --- | --- |
| 注册代码、路径前缀、HTML `lang`、`hreflang` | `tr` |
| 语言选择器、排版方向 | `Türkçe`、`ltr` |
| 数字、日期和 ICU 消息 | 复用 `formatLocale('tr')`，即 `tr-u-nu-latn` |
| Open Graph | `tr_TR` |
| 正式地址 | 根部署 `/tr/`，默认子路径部署 `/prompt-seen/tr/`，业务链接统一使用 URL 模块 |
| 浏览器语言偏好 | `tr` 和 `tr-TR` 均可建议 `Türkçe`，以当前产物是否包含 `tr` 为准。直接访问的 URL 继续决定页面语言，用户通过语言菜单主动切换 |

使用标准书面土耳其语，`tr-TR` 用于浏览器环境测试。现有注册项和 `phase: 2` 可直接复用，独立发布时点由 `enabled` 和 `preview` 控制。部署沿用 App Router 的 `generateStaticParams` 和静态导出。注册状态同时作用于 HTML、生成数据和语言入口。[语言注册表](../content/locales.yaml) · [构建配置](../src/config/load.ts) · [语言建议逻辑](../src/ui/pages/language-match.ts)

| 阶段 | `enabled` | `preview` | 策略及产物 |
| --- | --- | --- | --- |
| 当前 | `false` | 未设置 | `incremental/fingerprint/optional`。`tr` 可作为原始 Prompt 语言 |
| 准备 | `false` | `false` | 设置 `localization: { coverage: complete, review: fingerprint, promptBodies: source-only }`，生成范围快照，准备字典与试点内容 |
| 预览 | `false` | `true` | 完整字典与 About、License 就绪后开启。预览可展示草稿和有实际 `lang` 的回退内容，生产产物继续排除 `tr` |
| 候选及正式 | `true` | `true` | 严格覆盖检查通过后在独立候选检出启用。通过第 7 节矩阵后，才将启用提交纳入正式部署流程 |

## 2. 范围与工作量基线

在上述工作区实跑 `locale:check --locale tr --json` 和 `locale:scope --locale tr`，得到 schema v2 范围。检查报告为 `candidate-production`、`ready: false`、`blocking: false`，严格模式以退出码 1 拒绝当前候选。候选可模拟浏览 379 个回退条目，About 和 License 无回退。土语本地内容与可索引内容均为 0，字典和 `production/localization/tr/` 尚待创建。基线 `scopeFingerprint` 为 `sha256:235a7108d49c478b57cc7e7402f631eae5764754936262b703308fa5c8769911`。开工按当时的 `scope` 结果重新冻结。[覆盖检查](../scripts/lib/localization/check.ts)

| 公开内容说明 | 目标数 | 当前土语就绪数 |
| --- | ---: | ---: |
| Prompt | 285 | 0 |
| 模板 | 75 | 0 |
| 合集 | 16 | 0 |
| 专题 | 3 | 0 |
| About 与 License | 2 | 0 |
| 合计 | 381 | 0 |

另有 2,220 个去重字段目标，包含 427 条 UI 消息、882 个 Prompt 共享说明字段、363 个媒体说明字段、206 个运行记录说明字段、308 个模板字段和 34 个 taxonomy 字段。字段数与页面数分别验收。UI 目前有 14 个 namespace，新增内容、消息及共享依赖随发布候选重新验收。

- `locales/tr.mdx` 覆盖标题、摘要、说明、来源和限制。源文有独立 SEO 字段或合集 `reasons` 时逐项翻译。保持 MDX 组件、`prompt:` / `template:` 引用、变量名及归属链接可解析。
- 共享字段使用报告列出的实际目标路径。覆盖图片 alt、说明性标注、参考输入用途与上传顺序、示例备注、模板标签和帮助、枚举显示标签、taxonomy 标签与适用别名。alt 需对照实际资产，区分参考、成品、帧图和对照图。License 页面用现有许可的正式名称和链接。
- Prompt 字节、模板正文与变量 ID、默认值和约束沿用已验证源数据。对原文文本块及运行记录分别保留实际 `promptLanguage`。模型和版本置信度、帧数和播放方式、图中文字、生成参数和输出事实沿用记录。`source-only` 门禁将已有的 `prompt-locales/tr.*` 或模板 `tr` 正文变体报告为冲突，需先查明其发布历史和处置方案。[正文多语言设计](multilingual-prompt-design.md)
- `p_307` / `x_371` 是当前源正文为 `tr` 的已收录案例。试点须在 EN、简中和 TR 页核对相同的复制内容、下载、实际语言标记和生成记录哈希。核对一个参考图、成品 9 个编码帧、2 秒、播放一次及图中 `Robin`，将原始版本的帧数与此次合成结果分开描述。[Prompt 声明](../content/prompts/p_307/entry.yaml) · [运行记录](../content/examples/x_371/run.yaml)

### 交付路径

| 路径 | 交付 |
| --- | --- |
| `content/locales.yaml` | 上表的策略和分阶段开关 |
| `src/i18n/messages/tr/*.json` | 从实际 `en` 目录镜像 namespace 与 key，保留 ICU 参数与富文本 tag |
| `content/**/locales/tr.mdx` 与报告中的共享字段 | 正文和说明按 `locale:import` / `locale:promote` 写入，专题文件位置从报告取值 |
| `production/localization/tr/` | `scope.json`、`reviews.json`、`glossary.yaml`、`style-guide.md`、`batch-plan.json`、`search-cases.json`、分批审校及发布证据 |
| `src/modules/search/{tokenize,profiles,engine,types}.ts` | 土语词项、检索别名和分析器版本，复用现有索引与 Worker |
| `src/modules/seo/build.ts` 与现有测试 | `ogLocale('tr')` 映射 `tr_TR`，覆盖生产主版本与 alternate |
| `tests/support/localization-search.ts` 和 `tests/e2e/turkish.{http,browser}.spec.ts` | 复用用例格式，补充土语引擎、实际 Worker 及预览和发布状态检查 |

范围、字典、可复核的审校及批次清单提交到仓库。导入暂存和完整 CLI 报告走 `.artifacts/localization/` 或现有 CI 产物，交付记录保存相应哈希和链接。

## 3. 文案、输入与 UI

发布文案使用句首大写和简洁的动词。关键词包括 `Görsel üretim komutu`（首次解释 Prompt）、`Komut`（正文和操作）、`Şablon`（模板）、`Koleksiyon`（合集）、`Referans görsel`（参考图）、`İstem` 与 `prompt`（搜索别名）。按钮用 `Komutu kopyala`、`Kopyalandı`、`Şablonu kullan`、`Kaydet`。用词以术语表和母语或近母语编辑的审校结果为准。

- 翻译 `en` 的全部 ICU 消息。保留变量、富文本 tag 及有产品含义的 `=0` 分支。基数类使用 `one`、`other`，数字后的名词用单数，如 `1 sonuç`、`2 sonuç`、`0 sonuç`。页面至少检查 0、1、2、1234。普通数字 `1234.5` 的土语展示为 `1.234,5`，固定日期的长格式为 `17 Kasım 2026`。序列化值、比例、模板字段存储和原始时间戳遵循现有数据格式。
- ICU 及 UI 用自然语序来容纳 `{name}`，固定标签可写 `GPT Image ile`。对动态模型名、用户名和作品名优先用独立标签或调整语序，避免猜专名的元音和谐、后缀与转义。编辑文本用 NFC。搜索接受撇号变体与分解字符，原文和输入值原样保存。
- 复用 IBM Plex Sans、Fira Sans Extra Condensed 和 IBM Plex Mono 已有的 `latin` / `latin-ext` 文件。标题、按钮、表单、原文区和等宽标签实际渲染 `İ ı i I Ş ş Ğ ğ Ç ç Ö ö Ü ü â î û`，同时检查标记、上下标及行高。需要加宽或换行时改用现有布局约定，语言文本使用自然大小写。[字体配置](../src/styles/fonts/index.ts)
- 浏览器验收用 320px、390px 和桌面宽度，加 200% 浏览器缩放及明暗主题。检查语言菜单、搜索对话框、详情弹窗、媒体控件、模板错误和复制失败恢复。核对 tab 顺序、焦点返回、原文语言标记、accessible name、剪贴板文本及 hydration。TR-Q 布局下的 `/`、快捷键设置及输入框按现有产品行为验收，输入 `ı`、`İ`、组合重音和撇号时焦点与原始输入应完整保留。

## 4. 土耳其语搜索合同

已验证现有分词先做 NFKC 和 locale 小写，随后折叠拉丁重音，所以 `IŞIK` 现为 `ısık`。它还会把 `GPT Image` 与 `gpt image` 分为不同词项，`GIF` 与 `gif` 有同一问题。当前 `domainAliases` 未覆盖 `tr`，Open Graph 回退得到 `tr`。以下改动随土语接入交付。[分词器](../src/modules/search/tokenize.ts) · [现有领域词表](../src/modules/search/profiles.ts) · [搜索引擎](../src/modules/search/engine.ts)

| 场景 | 实现与验收 |
| --- | --- |
| 精确词项 | `tr` 走 NFKC → `toLocaleLowerCase('tr')` → NFC，保留土耳其字母 `ı i ç ğ ö ş ü` 以及 `â î û`。`I→ı`、`İ→i`，NFD 的 `I\u0307` 与 NFC 的 `İ` 同类。单测覆盖 `IŞIK→ışık`、`AĞAÇ→ağaç`、`kır/kir` 和 `kar/kâr` 两组区分。索引、Worker 查询、高亮共用词项规则 |
| ASCII 和常用词形 | 在 `tr` 的低权重 `aliases` 字段维护有语料来源的词组。试点覆盖 `ışık/ışığı/ışığında/ışıklar/ısık/isik`、`şablon/şablonu/şablonlar/sablon/sablonu/template`、`afiş/afişi/afis/afisi/poster`、`portre/portresi/portrait`、`şapka/şapkası/sapka`、`ürün/urun`、`stüdyo/studyo` 和 `mürekkep/murekkep`。保留精确正文的原权重。首发词形处理以审校过的词表为边界 |
| 摄影术语 | `ürün fotoğrafı`、`ürün fotoğrafçılığı`、`product photography`、`packshot` 只有实际连续短语或相应显式 taxonomy 别名才能激活领域词组，并召回 `urun fotografi` 等键盘拼法。按字段检查相邻词，跨句、跨字段及产品类型标签加单独 `fotoğraf` 均不触发。允许领域词条经别名召回更宽的 `fotoğrafçılık`。使用普通摄影、产品插画、包装设计作反例 |
| 专名加词尾 | 初始覆盖 `Robin’in`、`Robin'in`、`Robinʼin` 三种写法。`tr` 查询词项在已登记专名后识别 U+2019、U+0027、U+02BC 加登记后缀，首批登记 `Robin` 与 `in`，将该片段检索为专名。未知专名和普通词沿用常规分词。用合成反例验证孤立 `in` 和记号后的其他词不会触发专名召回 |
| 模型和格式 | 对 `model.displayName`、`providerModelId` 中实际出现的 `GPT Image`，以及实际有 GIF 输出的文档，在索引端加入英语小写查找变体。用现有 `model` 和 `terms` 字段检索品牌和格式，存储值与展示仍为原记录。三种写法 `GPT Image`、`GPT IMAGE`、`gpt image` 与 GIF 大小写应能召回同一目标。混合 `gpt image robin gif` 走现有多词 AND |
| 排名与高亮 | 基础词项与别名分开计分。隔离 fixture 中同条件下精确 title/terms 排在仅别名命中前。`kır/kir` 与 `kar/kâr` 单词查询互不命中，包括默认容错路径。高亮使用原文 UTF-16 范围，覆盖 `📷 I\u0307` 与 NFC 词形、代理对及组合符号；只有实际显示的匹配词才标记 |

实现时在已有 tokenizer、`domainAliases` 和 `createIndex` 路径加 `tr` 分支。需要识别连续短语的规则从各原始字段取词序，保留字段边界，别名分析器处理共享说明和原 Prompt 时保留各自内容。升级 `SEARCH_ANALYZER_VERSION`，重发 HTML、Worker 和索引，既有 build ID / 分析器版本不符的重载路径继续适用。普通页面请求继续按需加载索引，原有 EN、简中、ES、PT-BR、JA、KO、DE 检索回归套件全部执行。

### 冻结真实语料用例

在 `production/localization/tr/search-cases.json` 按现有 schema v1 写入每条 query、`expectedKeys`、必要的 `excludedKeys`、`topK` 及理由。下表同一行内的变体各自写一条。`topK: 5` 按结果 kind 分组判定，所有冻结用例在序列化索引和浏览器实际 Worker 均需通过。

| 查询 | 预期键 | 说明 |
| --- | --- | --- |
| `neon ışık`、`neon IŞIK`、`neon isik`、`neon ışığında` | `prompt/p_050` | 以现有霓虹轮廓光说明为语料，覆盖大小写、ASCII 和词尾 |
| `caz afişi`、`caz afisi`、`caz afis`、`caz poster` | `prompt/p_045` | 爵士俱乐部海报说明 |
| `ürün şablonu`、`urun sablonu`、`ürün template` | `template/t_001` | 产品海报模板与类型检索 |
| `robin şapka`、`robin sapka`、`Robin’in şapkası`、`Robin'in şapkası`、`Robinʼin şapkası` | `prompt/p_307` | 检查真实的原始土语和案例说明 |
| `GPT Image Robin GIF`、`GPT IMAGE Robin GIF`、`gpt image robin gif` | `prompt/p_307` | 一并验证 `model`、实际 GIF 输出及混合词 |
| `stüdyo ürün fotoğrafı`、`stüdyo ürün fotoğrafçılığı`、`stüdyo packshot`、`studyo urun fotografi` | `prompt/p_151` | 现有棚拍案例，`prompt/p_024` 从 packshot 的前五结果排除 |
| `ürün açısı` | `prompt/p_153` | 保留产品拍摄角度和真实参考图说明 |
| `caz afişi hiyerarşi` | `collection/c_001` | 合集标题或摘要用自然语言表达海报层级与爵士海报示例 |
| `mürekkep`、`mürekkep`（U+0075 U+0308）、`murekkep` | `topic/style/ink` | 同一专题，组合字符用实际原文高亮 |
| `zzqtr90317` | 无命中 | 无结果 UI、键盘焦点与无效索引重试另行检查 |

试点后由编辑与工程一起锁定自然措辞。源内容删除或新增用例时保留版本变更及原因。已有冻结用例的失败按翻译、召回、排名、路由四类定位，修改后重跑完整用例集。[共享用例结构](../tests/support/localization-search.ts)

## 5. 翻译批次与审校

开工在集成工作区确认实际公开范围。采用策略变更后的快照，包含本次将发布的新增目标和历史保留目标。媒体、模板版本与 taxonomy 等共享字段以字段 key 去重，优先给仍被使用的早期模板版本分配依赖。变更源文、目标文或数组顺序后重新计算范围与冲突，归档或删除只有在带可验证源证据时才移除目标。

```sh
npm run --silent locale:check -- --locale tr --json
npm run locale:scope -- --locale tr
# 核对差异与证据后写入范围快照
npm run locale:scope -- --locale tr --apply
```

| 顺序 | 任务和责任 | 退出条件 |
| --- | --- | --- |
| TR-01 范围与基础 | 工程冻结范围、设置策略和补状态测试。编辑与审校人完成术语、字典、全局 taxonomy、About 与 License | 全部消息能编译，基础内容已通过审校。禁用态与基础预览态均验证完成 |
| TR-02 纵向试点 | 编辑以真实用例中的条目为主批，加入 `p_146`（图中文字与标注）及 `p_190` → `t_068`（参考图工作流及简中模板正文）。翻译并审校相关媒体与模板字段、`c_001` 的全部成员及 `topic/style/ink` 的公开成员 | 列表弹窗、完整详情、模板、合集、专题能用土语完成浏览和操作。试点依赖与原文核验通过 |
| TR-03 搜索与 SEO | 工程实现第 4 节规则、`tr_TR` 和产物验收，待 TR-02 的自然语料就绪后冻结用例 | 引擎与 Worker 对齐，旧语言回归通过，试点正例和反例达标 |
| TR-04 全量覆盖 | 编辑按首页与列表、剩余 Prompt/模板、合集/专题和共享依赖收尾。审校人独立复核。每批建议 20–30 页或约 100 个共享字段，以依赖相连的组为提交单元 | 最新严格报告 `ready: true`，所有当前目标与字段完成，所有新增公开项随候选补齐 |
| TR-05 候选和发布 | 工程、站点维护者按第 7 节验证启用候选并完成回滚演练，发布后核对线上结果 | 候选和线上验收证据均归档 |

批次文件用现有 schema v1，顶层为 `schemaVersion`、`locale`、`operations`。页面操作的两个 field 均为 `["$page"]`，`expectedSourceHash` 用报告的 `sourceFingerprint`，`expectedTargetHash` 用当前 `targetHash`，缺失时显式为 `null`。`translation` 提供 `title`、`description`、`body` 与已有 SEO/reasons。共享字段用报告的 key、sourceField、targetField、两侧 hash，数字下标额外带 `expectedIdentity: field.identity`。短 frontmatter 哈希仅供现有内容元数据使用。[导入 schema](../scripts/lib/localization/import.ts) · [审校 schema](../scripts/lib/localization/check.ts)

只要 `src/i18n/messages/tr/` 目录存在，构建就会校验全套字典。先在 `.artifacts/localization/tr/catalog/` 准备整套 JSON，再一次性落入 `src/i18n/messages/tr/`。重新运行检查，从报告提取每条 UI 消息的 key、sourceHash、targetHash，随基础页面和 taxonomy 批次的审批传给 `locale:promote`，由它合并到 `reviews.json`。[字典校验逻辑](../scripts/lib/localization/messages.ts) · [批次推广实现](../scripts/lib/localization/promote.ts)

```sh
npm run locale:import -- --locale tr --file production/localization/tr/batches/pilot.json
npm run locale:import -- --locale tr --file production/localization/tr/batches/pilot.json --apply
# 核对实际候选并完成审校，将 import 返回的 batchId 设为 TR_BATCH_ID 后继续
npm run locale:promote -- --locale tr --batch "$TR_BATCH_ID" --reviews production/localization/tr/batches/pilot-reviews.json
npm run locale:promote -- --locale tr --batch "$TR_BATCH_ID" --reviews production/localization/tr/batches/pilot-reviews.json --apply
npm run --silent locale:check -- --locale tr --json
```

每条审批绑定准确的源/目标指纹、实际审校身份、时间与结论。语言审校覆盖术语和自然表达，媒体审校查看真实输出，模板和交互审校执行实际操作。复核授权/来源、模型证据、原文哈希、参考图顺序、实际渲染值、导出和 SEO 字段。AI 辅助复核记录真实身份。导入触及已发布依赖时按原子批次 pending，核对 `.artifacts/localization/tr/pending/{batchId}/manifest.json` 及候选。指纹变动、数组身份变更、拒绝或重用批次冲突时重新生成受影响操作并审校。`locale:promote` 在内容锁内重新验证审校指纹和已启用语言，再事务写入。

## 6. 静态路由与收录合同

- 生产的 `/tr/`、Prompt、模板、合集、专题、About 与 License 使用土语 HTML、标题、描述、可用的图像 alt 和自指 canonical。JSON-LD 中，`WebSite`、`CollectionPage`、`AboutPage` 的 `inLanguage` 为 `tr`，Prompt/模板 `CreativeWork` 节点的 `inLanguage` 随其 `text` 的实际语言，如 `p_307` 为 `tr`，`t_068` 为 `zh-Hans`。slug、稳定 ID、模板版本及媒体 URL 遵循现有数据。互译已发布才列出双向且自包含的 `hreflang="tr"`，`x-default` 使用同内容的默认版本或默认首页的既有规则。OG 主版本及 alternate 使用 `tr_TR`。[SEO 构建](../src/modules/seo/build.ts) · [结构化数据](../src/modules/seo/structured-data.ts)
- `/sitemap.xml` 引用 `/tr/sitemap-pages.xml`，抽查真实 `lastmod` 和 URL 200。已发布土语 Prompt/模板生成 `index.md`，`content:export --locale tr` 分别验收 JSON 与 Markdown。机器可读说明使用土语，原始 Prompt 块保留文本及实际语言。站点级 `llms.txt` 的语言列表新增 `Türkçe` 首页入口，主体沿用默认语言。核对列表、站内搜索、快捷搜索的地址由同一 URL 模块生成。[SEO 索引规则](../src/modules/seo/indexing.ts) · [机器可读输出](../src/modules/geo/documents.ts) · [导出 CLI](../scripts/content-export.ts)
- 搜索、混合筛选、收藏和翻译缺失等页面沿用 `noindex`。聚合页仍按实际展示条目判定收录。禁用时 `/tr/`、语言站点地图和 `generated/tr/` 的代表路径返回 404。预览时 `tr` 可被选择和浏览，全站 noindex，预览 locale 的 sitemap、Markdown 与 `llms.txt` 链接保持为空或 404，`content:export --locale tr` 在仅预览注册下以非公开语言退出。核对 `/` 及 `/en/` 的现有入口约定。

## 7. 验收、发布与回滚

### 候选命令

先在未启用状态校验严格报告，再在同一源树的候选检出里启用 `tr`。以下命令逐项成功才进入出包矩阵。全语言 JSON 供归档，用严格模式单查启用语言，避免将其他仍在准备的 locale 当作本次门禁。

```sh
set -e
mkdir -p .artifacts/localization/tr
npm run --silent locale:check -- --locale tr --json > .artifacts/localization/tr/report.json
npm run --silent locale:check -- --all --json > .artifacts/localization/tr/all-reports.json
npm run locale:check -- --locale tr --strict
node --input-type=module <<'NODE'
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
const { locales } = YAML.parse(fs.readFileSync('content/locales.yaml', 'utf8'));
for (const { code } of locales.filter((entry) => entry.enabled && entry.code !== 'tr')) {
  const result = spawnSync('npm', ['run', 'locale:check', '--', '--locale', code, '--strict'], { stdio: 'inherit' });
  if (result.status !== 0 || result.error) process.exit(result.status || 1);
}
NODE
npm run content:validate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run tokens:check
npm run storybook:build
```

严格报告中 `localCurrent = indexable = target`、`fieldsCurrent = fieldsTotal`、`fallback = 0`，并核对 `ready: true`、`blocking: false`、缺失/草稿/过期/未审校/无效目标计数为 0。候选测试至少模拟一次遗漏新增公开条目的翻译或共享字段、一次旧指纹，验证启用态的常规和预览构建都会拒绝，修复后再通过。测试使用隔离的 fixture 或候选检出。

### 静态产物验收矩阵

新增土语 HTTP 与浏览器状态断言，可通过仅测试用的 `TR_EXPECT_STATE` 传入下表值。校验 `BUILD.locales`、`enabled` 和构建模式。期望状态不符即失败，正式候选及启用后的 CI 显式设置 `enabled`。每行先运行 `BASE_PATH=… BUILD_MODE=… npm run build`，立即对这一份 `dist/` 运行 `TR_EXPECT_STATE=… PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1`，再执行下一行。预览未齐全时运行已经交付的状态与试点断言；全量候选覆盖 HTTP 及三浏览器。

| 阶段 | `BASE_PATH` | `BUILD_MODE` | `TR_EXPECT_STATE` | 重点 |
| --- | --- | --- | --- | --- |
| 禁用基线 | 空字符串 | `production` | `disabled` | URL 和产物无土语，EN / 简中仍可展示和复制 `p_307` 的 `tr` 原文 |
| 仅预览 | `/prompt-seen` | `preview` | `preview` | 土语入口、UI、试点内容、noindex 和机器可读输出的边界 |
| 候选根路径 | 空字符串 | `production` | `enabled` | 完整 UI、搜索、收录、导出、现有语言回归 |
| 候选子路径 | `/prompt-seen` | `production` | `enabled` | 子路径 canonical、hreflang、sitemap、分页、索引与 JSON 路径 |
| 候选子路径预览 | `/prompt-seen` | `preview` | `enabled` | 与 CI 预览配置一致，保留全站 noindex |

构建使用发布配置的 `SITE_ORIGIN`、同一代码和内容候选。每行记录 build ID、Node/浏览器版本、配置、测试输出及失败处置。用 nginx 提供打包产物和 `measure-first-load.ts` 测量 EN/TR 首页、列表和模板首屏，记录耗时、文件数、HTML 大小、土语索引 raw/gzip、首屏 JS 和字体请求，执行现有性能预算。普通页面空闲时完整搜索索引依旧为零请求，进入搜索交互后按需加载。Cloudflare 打包后核对 canonical 域与 `pages.dev` 预览域实际 HTTP 头及资源可达性。[Playwright 配置](../playwright.config.ts) · [部署流程](operations.md)

### 正式发布与持续维护

1. 将启用提交经正常 CI 和受信任的 Deploy 工作流发布。记录发布 SHA、Pages deployment ID、build ID 和候选证据。产物是一致的整站发布单元，HTML、`generated/tr`、sitemap 及 Markdown 同步上线。
2. 在 canonical 域用 `npm run check:live -- --expect-build "$TR_BUILD_ID"` 核验构建，并抽查 `/tr/`、`p_307`、`t_001`、真实搜索、sitemap、双向 hreflang、JSON-LD 与 `llms.txt`。按现有站点属性提交 sitemap，沿用已配置的 IndexNow 流程。验收记录需保存检查路径、结果、复核人、时间，失败或跳过项注明是否阻断发布。
3. 出现生产产物混用、核心流程阻塞或收录规则错误时，用现有 Rollback 工作流恢复已核验的部署，随即回退 `main` 的启用提交，避免下一次部署重带故障。再次核对线上 build ID、旧语言页面、`/tr/` 及其索引和外链、sitemap、hreflang 与 `llms.txt`。候选源译文、审校记录及源语言注册仍可用于修复与复验。[回滚流程](operations.md#rolling-back)
4. 启用后，公开内容发布随变更补齐 `tr` 翻译和新指纹审校。发现搜索缺口时，以实际语料增加词表与冻结用例。发布后复核索引状态、土语页面的曝光与点击，及现有分析能力能提供的搜索无结果率与复制/模板使用率。
