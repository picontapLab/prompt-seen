# 印尼语接入实施规格

状态为待实施。基线日期为 2026-11-17（America/Los_Angeles）。

首发提供完整的 Bahasa Indonesia 界面、内容说明、站内搜索和模板操作。沿用静态构建，先在预览完成纵向试点，再在全部公开目标通过指纹审校后启用 `/id/`。用户复制、下载或通过机器可读输出取得的 Prompt 使用条目原文及其实际语言。[语言覆盖评估](language-coverage-assessment.md) · [通用本地化流程](localization-workflow.md) · [Prompt 正文多语言设计](multilingual-prompt-design.md)

## 1. 目标和现有覆盖

注册表已有 `id`，其名称为 `Bahasa Indonesia`、前缀为 `id`、HTML 语言为 `id`、方向为 `ltr`，归入第 2 批。当前 `enabled: false`，`preview` 未设置，策略为 `incremental/fingerprint/optional`。印尼语消息目录、说明和准备台账均待建立。[语言注册表](../content/locales.yaml)

| 公开目标 | 基线总量 | 印尼语当前完成 |
| --- | ---: | ---: |
| Prompt、模板说明 | 285 + 75 | 0 |
| 合集、专题说明 | 16 + 3 | 0 |
| About、License | 2 | 0 |
| 内容说明合计 | 381 | 0 |
| UI 消息 | 427 / 14 个命名空间 | 0 |
| 共享解释字段 | 1,793 | 0 |

基线来自 `npm run --silent locale:check -- --locale id --json`。报告为 schema v2，`evaluationMode: candidate-production`，`ready: false`，`blocking: false`。379 个回退条目属于候选模式的可见内容库，实际生产构建尚未启用该路由。独立页按目标语言发布。381 份说明的实际来源为英语 371 份、简体中文 10 份。字段总数 2,220 已计入 UI 消息，共享字段为 Prompt 882、媒体 363、模板 308、示例 206、taxonomy 34。以开工及候选的报告为准，测试从报告读取目标数。

```text
sourceRevision: 53cbc8efce854f8f067acef8372daf49be82f9c3:67932e4416c290de4c3cc0c4bcaac69edfd938e03aa6416c1ef09ff8c43066a6
scopeFingerprint: sha256:0cca17d5dc54c700ea30a5800e4d2da07db1303a24902960ec369e0e483babc4
policyFingerprint: sha256:dcedc10f1845b90bbf4acfe68b922f6a9d9b88c80589fe6e6b60726e40b1392a
```

同期 `--all --json` 中，已启用的 `en`、`zh-Hans`、`es`、`pt-BR`、`ja`、`ko`、`de` 均 ready。阿拉伯语仅在预览中启用，报告为未就绪且非阻断。候选应严格检查全部当时已启用的语言，`--all --json` 用于诊断。

## 2. 配置和发布状态

修改注册表的现有 `id` 项。准备期采用以下配置，后续仅按状态表切换开关。

```yaml
- code: id
  pathPrefix: id
  nativeName: Bahasa Indonesia
  htmlLang: id
  direction: ltr
  enabled: false
  preview: false
  phase: 2
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

| 阶段 | enabled | preview | 进入条件及行为 |
| --- | --- | --- | --- |
| 准备 | false | false | 记录范围、术语和计划。生产及预览均省略 id |
| 基础预览及试点 | false | true | 完整 UI、全局 taxonomy、About、License 已审校。预览可查看内容库草稿和回退，整站 noindex |
| 生产候选 | true | true | 全量 strict 通过。只在独立候选检出中启用，验证静态产物 |
| 正式发布 | true | true | 通过候选门禁的提交进入现有部署流程，核对实际部署 build ID |

`id`、`id-ID`、`id-Latn-ID` 通过现有语言匹配器建议已构建的 `id`。马来语 `ms`、`ms-MY` 和 `ms-ID` 保持独立匹配。仅以马来语为浏览器偏好时，印尼语不成为推荐。根入口继续由用户选择语言。路由、字典、`lang` 和 hreflang 均使用 `id`，Open Graph 复用现有 `id_ID`，Intl 使用 `formatLocale('id')` 生成的 `id-u-nu-latn`。根首页、英语首页别名、资源 ID 与 slug 继续沿用 URL 模块的约定。[语言匹配器](../src/ui/pages/language-match.ts) · [Intl 格式化](../src/i18n/format-locale.ts) · [SEO metadata](../src/modules/seo/build.ts)

本次覆盖现有公开内容及其发布依赖。地区版、新增马来语、印尼语 Prompt 正文变体、在线翻译和生图均在此规格范围之外。开工时若发现 `prompt-locales/id/` 与 `source-only` 冲突，由内容负责人先处置并记录。

## 3. 印尼语文案和数据要求

采用面向印度尼西亚读者的标准书面 Bahasa Indonesia。控件使用简洁动词，例如 `Salin prompt`、`Unduh prompt`、`Simpan` 和 `Buka galeri`。说明用自然的短句，确需第二人称时用 `Anda`。按语义区分介词和前缀，例如 `di galeri`、`ke galeri`、`diuji`。实际需要重叠词时使用连字符，例如 `masing-masing`。母语审校确认词义、语气和术语一致性。

| 概念 | 首版用语 | 含义 |
| --- | --- | --- |
| Prompt / template | `prompt` / `templat` | template 留作检索别名。模板说明写清可改哪些字段 |
| Collection / topic | `koleksi` / `topik` | 分别对应合集和专题 |
| Reference image / result | `gambar referensi` / `hasil` | 输入图与生成结果分别标注，保持实际角色和顺序 |
| Portrait / sticker | `potret` / `stiker` | `portrait`、`sticker` 留作检索别名 |
| Lighting / background | `pencahayaan` / `latar belakang` | 描述画面实际光照和背景 |
| Product photography / packshot | `foto produk` / `packshot` | packshot 仅用于源文或图像确认属于该类型的作品 |
| Tested / no recorded result | `telah diuji` / `Belum ada hasil tercatat untuk nilai ini` | 保留测试和生成记录的适用条件 |

建立 `src/i18n/messages/id/` 的全部命名空间，包含页面标题、错误、空态、键盘提示、ARIA、GEO 和独立页。键、ICU 参数、富文本标签及 `select` 的业务分支与英文契约一致。印尼语 cardinal 只有 `other`。保留影响行为的显式分支如 `=0`，数量后采用 `1 hasil`、`2 hasil` 等写法。以 `search.count` 为例，目标文案为 `{count, plural, =0 {Tidak ada hasil} other {# hasil}}`。校验 `0 / 1 / 2 / 1000`、`1.234,5`、长日期 `17 November 2026` 及当前页面使用的日期格式，并确认浏览器接管前后输出一致。复用现有 UTC 时区和 Latin 数字约定。[字典结构校验](../scripts/lib/localization/messages.ts) · [ICU 编译测试](../src/i18n/catalog.test.ts)

每份 MDX 按报告的 `sourceLocale` 翻译标题、摘要、正文、原有独立 SEO 文案和合集推荐理由。共享字段按报告逐项翻译 alt、caption、标注、参考图说明、字段 label/help 和枚举选项显示名、生成与示例 notes、分类标签及报告内别名。审校实际媒体和交互，区分图中文字、来源图与生成图、合成 GIF 与原始输出。模型 ID、模型版本是否已知、授权标识、尺寸、时长和生成参数沿用原始记录。

模板的变量 ID、默认值、枚举实际值、约束、输入顺序、资产引用、Prompt/模板正文及哈希按变更前基线保留。包含 `biru tua`、`masing-masing`、`1,5` 的自由文本按现有字段类型和编译器规则处理。验证可见标签翻译后，相同枚举值和相同用户输入仍生成相同正文。HTML 外壳用 `id/ltr`。说明、alt 等标记实际文本语言，Prompt 区域依据实际 `promptLanguage`。

## 4. 范围冻结、批次和审校

开工时先取报告，再更新策略和 scope。用报告中的 `item.key` 与 `field.key` 分配唯一批次，保存拥有者、依赖、状态和来源指纹。去重共享字段的同时，梳理 MDX 引用、合集成员、专题筛选、首页 featured 和列表 showcase 等页面关系。公开目标的移除继续走通用的带证据流程。每批应用前用新的报告核对源树差异。

| 批次 | 内容与顺序 | 完成条件 |
| --- | --- | --- |
| 0 · 基础 | 术语表、风格指南、完整 UI、全局 taxonomy、About、License | 字典及页面审校就绪，启用预览 |
| 1 · 纵向试点 | `p_005`、`p_045`、`p_067`、`p_111`、`p_115`、`p_151`、`p_152`、`p_217`、`p_221`、`p_224`、`p_289`、`p_290`，以及 `t_001`、`t_002`、`t_017` 和所需共享字段 | 从搜索进入、理解参考图、编辑模板、复制和下载的完整流程通过。覆盖英文和中文 Prompt、中文源说明、多参考图、现有英文正文变体及 GIF |
| 2 · 内容覆盖 | 其余 Prompt、模板、媒体说明、参考图指导、生成及示例说明，优先包含首页和列表实际展出项 | 每批对应说明与字段均 current，保留项对照通过 |
| 3 · 聚合页 | 合集、专题和推荐理由，先在试点预览 `collection/c_001`、`topic/style/ink`、`topic/category/poster` | 成员和共享依赖具备发布资格，首页、列表与聚合页按实际显示内容通过检查 |

每个操作批次以约 20 份 MDX 或 100 个字段为审校尺度。优先完成共享依赖，紧密关联的条目可在同一事务发布。字典整套提交，避免字典目录一出现便因命名空间缺失而阻断其他内容验证。已审校字典的指纹记录可随首次基础内容 promote 合入，取当前报告的消息字段哈希。[构建字典校验](../scripts/lib/localization/messages.ts) · [审校记录校验](../scripts/lib/localization/promote.ts)

使用现有 schema v1 批次，只包含 `schemaVersion: 1`、`locale: id`、`operations`。

| 操作 | 从当前报告填写 |
| --- | --- |
| 页面 | `key = item.key`，两个字段路径均为 `["$page"]`，`expectedSourceHash = item.sourceFingerprint`，`expectedTargetHash = item.targetHash` |
| 页面译文 | `translation` 为 `{title, description, body}`，已有的 `seoTitle`、`seoDescription`、`reasons` 一并提供。目标地址取 `item.targetFile` |
| 共享字段 | 用 `field.key`、`sourceField`、`targetField`、`sourceHash`、`targetHash`，有数字路径时传 `expectedIdentity = field.identity`。译文类型沿用原始字符串或数组 |
| 新译文和 UI | 缺失目标显式传 `expectedTargetHash: null`。字典直接维护 JSON，通过报告审校 |

页面审校取完整 `sourceFingerprint`，共享字段取 `sourceHash`。import 产生 manifest 后，操作目标的审校取 `candidateHash`。每条记录带真实 reviewer、`completedAt`、`approved` 或 `changes-requested`，必要时写原因。语言审校由熟悉印度尼西亚用语的编辑确认。媒体和交互证据记录实际检查的图像、输入、编辑器值和输出。出现源、目标、数组身份或依赖冲突时重新生成计划，对变更后的候选重新审校。发布事务以现有锁和回滚能力执行。[导入合同](../scripts/lib/localization/import.ts) · [日常流程](localization-workflow.md)

从仓库根目录执行。下例以基础内容批次为例，替换 `ID_BATCH_ID` 为 import 输出的 64 位十六进制值。本地工作路径下的批次和审校输入由实际译审产出。

```sh
npm run --silent locale:check -- --locale id --json
npm run --silent locale:check -- --all --json
npm run locale:scope -- --locale id
# 核对差异和移除证据，更新基线后应用。
npm run locale:scope -- --locale id --apply

ID_BATCH_FILE=production/localization/id/batches/00-foundation.json
ID_REVIEW_FILE=production/localization/id/batches/00-foundation-reviews.json
npm run locale:import -- --locale id --file "$ID_BATCH_FILE"
npm run locale:import -- --locale id --file "$ID_BATCH_FILE" --apply
# 核对 manifest 并完成审校后，执行 promote 的计划和应用。
npm run locale:promote -- --locale id --batch "$ID_BATCH_ID" --reviews "$ID_REVIEW_FILE"
npm run locale:promote -- --locale id --batch "$ID_BATCH_ID" --reviews "$ID_REVIEW_FILE" --apply
npm run --silent locale:check -- --locale id --json
```

实施产物落在 `production/localization/id/`。提交 `scope.json`、`glossary.yaml`、`style-guide.md`、`batch-plan.json`、`batches/`、`reviews.json`、`search-cases.json`、`preservation-audit.json` 和 `production-acceptance.json`。其中 `scope.json` 由工具写入，`reviews.json` 记录当前指纹审批，保护项审计对正文和资产比较字节哈希，对共享 YAML 比较结构化事实。候选清单位于 `.artifacts/localization/id/pending/{batchId}/`，长期证据通过已提交输入或可追溯的 CI artifact 保存。审校资料只供构建与维护使用。逐批 promote 发布译文和审校记录，语言启用和部署分别由配置及现有工作流执行。

## 5. 印尼语搜索

复用现有 Latin tokenizer 的 NFKC、大小写、重音折叠和原文跨度。首版的词形覆盖使用显式词表，无通用去前后缀或词干化。重叠词如 `stiker-stiker` 按现有连字符分词处理，查询通过 `queryTerms` 去重。显示和高亮保留原写法。验证 `foto-foto`、`masing-masing`、`kupu-kupu`、`cafe/café`、前置 emoji 和 NFD 组合符。输入中的 `di sini`、`diuji`、`memotret`、`potret`、`pencahayaan` 保留各自的 tokenizer 结果，词表只覆盖明确的同义关系。[Tokenizer](../src/modules/search/tokenize.ts)

在 `src/modules/search/profiles.ts` 加入 id profile，复用现有低权重 `aliases` 字段及已有原词、前缀、模糊匹配排序。下表规定索引扩展，查询继续使用共享引擎。

| 触发词 | 扩展规则 |
| --- | --- |
| `potret`、`portrait`、`portraits` | 互扩 |
| `stiker`、`sticker`、`stickers` | 互扩 |
| `pencahayaan`、`lighting` | 互扩，裸 `cahaya` 保留词面语义 |
| `gambar referensi`、`foto referensi`、`reference image` | 完整短语互扩，裸 `referensi` 不触发 |
| `foto produk`、`fotografi produk`、`pemotretan produk`、`product photography` | 完整短语互扩。裸 `pemotretan` 保留词面语义 |
| `packshot`、`pack shot` | 互扩，并单向补入产品摄影组 |
| 内容类型 | 各 kind 映射到 `prompt`、`templat/template`、`koleksi/collection`、`topik/topic`。裸 `model`、`model AI`、`contoh` 不得触发 template 别名 |

多词触发必须在同一原始文本片段内连续出现，词间允许横向空白。用 `spans` 或等价的归一化和边界检查确认相邻词位置与分隔符。索引器保留字段和片段边界，包括原 Prompt 与说明正文、相邻 MDX 块、不同 taxonomy 项。句点、换行和自动加入的 kind 词不参与拼接。例子 `Foto. Produk ini …`、`foto keluarga untuk katalog produk` 和以 `foto` 结尾的标题加以 `produk` 开头的摘要均不能触发产品摄影别名。已有其他语言 profile 保持分词和别名行为。针对 id alias 输出写确定性 fixture，再验证序列化后的索引和实际 Worker。由于 MiniSearch 仍以多个词做 AND 检索，短语触发规则约束别名扩展，相关性由排序用例验收。[索引字段](../src/modules/search/documents.ts) · [引擎](../src/modules/search/engine.ts)

录入报告已有的 taxonomy `aliases` 字段。没有可审校源字段的新增词收录在受版本控制的 id profile 和术语表中，以避免改变通用依赖字段的来源。分析行为变更后从当前值递增 `SEARCH_ANALYZER_VERSION`，一起重新生成所有构建语言的索引与 Worker。当前版本为 6，序列化结构未变时沿用 schema 2。构建 ID 与索引、Worker 一并发布。

在 `search-cases.json` 保存 `schemaVersion: 1`、`locale: id`、`cases`。每例复用现有的 `query`、`expectedKeys`、可选 `excludedKeys` 和 `topK`。下表的斜线分隔多个查询，每个查询单列一例，默认 `topK = 5`。在母语审校通过后、排序调优前冻结查询和 key。

| 查询 | 预期稳定 key |
| --- | --- |
| `potret neon` / `portrait neon` / `POTRET NEON` | `prompt/p_005` |
| `potret sampul` | `prompt/p_111` |
| `foto pernikahan dua orang` | `prompt/p_115` |
| `foto produk studio` / `pemotretan produk studio` / `product photography studio` | `prompt/p_151` |
| `packshot putih` / `pack shot putih` | `prompt/p_152` |
| `stiker kucing kantor` / `sticker kucing kantor` / `stiker-stiker kucing kantor` | `prompt/p_221` |
| `monyet lentera GIF` | `prompt/p_224` |
| `poster Koloseum` / `poster Fuji` | 分别为 `prompt/p_289`、`prompt/p_290` |
| `templat poster produk` / `template poster produk` | `template/t_001` |
| `templat lukisan tinta` | `template/t_002` |
| `koleksi poster` / `topik tinta` | 分别为 `collection/c_001`、`topic/style/ink` |
| `p_217` | `prompt/p_217` |

添加至少一个确定的空检索和相近标签建议用例。固定反例中，普通人像、泛产品照片、跨字段词组及 `model AI` 均不得由错误别名获得相应命中。正例检查对应内容分组的前 `topK`，负例检查该查询的全部结果。独立搜索页与快捷搜索应返回同一预期分组。高亮只覆盖显示文本中真实匹配的跨度。仅别名命中时可无高亮。全部已启用语言的搜索回归继续通过。[搜索用例类型](../tests/support/localization-search.ts) · [搜索预览验收参考](../tests/e2e/portuguese.browser.spec.ts)

## 6. 用户流程和外部输出验收

| 验收面 | 通过条件 |
| --- | --- |
| 页面和导航 | 首页展出、用途入口、列表第二页、筛选、详情弹层与深链、刷新及返回恢复。收藏增删、撤销、跨语言切换保持资源 ID |
| 搜索 | 快捷与独立搜索、空态、错误、相近标签、键盘选择和关闭后焦点恢复。覆盖第 5 节的真实 Worker 查询 |
| 模板与 Prompt | 用 `t_001/t_002/t_017` 验证必填、列表、枚举、实际参考图和编辑后复制/下载。用 `p_005` 和 `p_217` 验证英语和中文原始 Prompt 及对应语言标记，在详情、弹层、直接复制及 Markdown 对照正文 |
| 媒体与排版 | 检查 alt、caption、多参考图顺序、GIF 播放及图中文字说明。复用 Latin/Latin Extended 字体。验收 320、390、768、1440 px、浅深主题、200% 缩放、键盘焦点及 axe。长标签如 `Gunakan gambar referensi` 换行后可读可用 |
| SEO | 生产可索引页使用本地化 title/description、自 canonical、`hreflang=id` 和现有 `x-default` 规则、`og:locale=id_ID`。跨语言 alternates 往返一致，结构化数据使用真实内容语言并指向实际产物 |
| 外部产物 | sitemap、Markdown twin、`llms.txt` 和 JSON/Markdown 导出只含合格项。比对数量、集合、URL 和 Prompt 语言，外部产物与同一构建的页面一致。搜索页、收藏等工具页继续沿用各自的 noindex 规则 |
| 预览与回退 | 预览整站 noindex，且无可索引 sitemap 条目。内容库可显示真实语言的草稿或回退。此类说明不进入 hreflang、结构化数据、Markdown twin、sitemap 或外部导出。About、License 无跨语言回退 |

在 `tests/e2e/indonesian.http.spec.ts` 和 `indonesian.browser.spec.ts` 复用 artifact 和搜索 helper。用测试变量 `ID_EXPECT_STATE` 断言生成结果，读取 `BUILD.buildMode`、`BUILD.locales` 及相关 URL。显式状态与产物不符时失败。启用候选必须断言存在 id、索引和非空的冻结用例。

| 状态 | 必须观测到的产物 |
| --- | --- |
| `disabled` | build info 及语言菜单无 id。按 basePath 请求 `/id/`、`/generated/id/feed/latest/1.json`、`/generated/id/search/index.json` 均为 404，收录及导出产物无 id |
| `preview` | build mode 为 preview，构建含 id 且 `enabled: false`，首页、About、License 与完整 UI 可访问，收录输出为空 |
| `enabled` | 构建含已启用的 id，当前内容库与索引可访问，生产及预览分别执行各自的收录断言 |

## 7. 实施任务与依赖

| 任务 | 负责角色 | 前置 | 交付 |
| --- | --- | --- | --- |
| ID-01 范围和术语 | 内容维护、母语译审 | 无 | 刷新报告、scope、批次台账、术语表和风格指南，提交准备期策略 |
| ID-02 基础预览 | 本地化工程、译审 | ID-01 | 完整 JSON 字典、基础内容审校及预览注册。补语言匹配、ICU 和格式化用例 |
| ID-03 搜索适配 | 搜索工程 | ID-01 | id profile、短语边界、分析器版本、确定性正负例和序列化验收。试点完成后冻结真实语料用例 |
| ID-04 内容与交互验收 | 内容维护、译审、前端测试 | ID-02 | 顺序完成试点到全量的批次。补充 HTTP、真实 Worker、模板、媒体及无障碍用例与保留项证据 |
| ID-05 生产候选 | 发布维护 | ID-03、ID-04 | 启用独立候选，严格检查、CI 构建矩阵、性能与 SEO 审计、候选验收记录 |
| ID-06 上线及恢复验证 | 发布维护 | ID-05 | 部署、线上冒烟、上一成功部署及恢复步骤、更新注册表和文档发布状态 |

实现沿用 `locale:check/scope/import/promote`。搜索改动集中在现有搜索模块，配置沿用 `content/locales.yaml`。需要改动 Next.js 路由、metadata 或静态输出时，先阅读仓库安装版本的对应指南。静态导出的语言入口继续使用应用当前的建议和选择流程。[工程约定](engineering-conventions.md) · [本地化维护流程](localization-workflow.md)

## 8. 构建门禁、上线与回滚

在禁用态和基础预览分别构建并验收。基础预览通过后，推进全量候选。任一门禁失败时修复并重跑对应产物。

```sh
# id.enabled=false，核对生产构建省略 id。
BASE_PATH='' BUILD_MODE=production npm run build
ID_EXPECT_STATE=disabled npm run test:e2e -- tests/e2e/indonesian.http.spec.ts --project=http --workers=1

# 基础批次通过后，设置 id.enabled=false、id.preview=true。
BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
ID_EXPECT_STATE=preview npm run test:e2e -- tests/e2e/indonesian.http.spec.ts --project=http --workers=1
```

候选质量检查按实际注册表严格检查每个已启用语言。

```sh
npm run locale:check -- --locale id --strict
node --input-type=module <<'NODE'
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
const { locales } = YAML.parse(fs.readFileSync('content/locales.yaml', 'utf8'));
for (const { code } of locales.filter(({ enabled, code }) => enabled && code !== 'id')) {
  const result = spawnSync('npm', ['run', 'locale:check', '--', '--locale', code, '--strict'], {
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
NODE
npm run content:validate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run tokens:check
```

正式候选复用现有 production 根路径和 preview 子路径 CI，并完成 production 子路径验收。逐个构建，同一次测试只读取对应的静态产物。使用发布配置的 `SITE_ORIGIN`，在 Node ≥24、可启动参考 nginx 容器并安装 Playwright 浏览器的环境执行。CI 复用现有浏览器项目及 Firefox 已验证版本。

```sh
BASE_PATH='' BUILD_MODE=production npm run build
ID_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=production npm run build
ID_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
ID_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1
```

从与生产产物相同的候选源树导出。沿用该产物的 `SITE_ORIGIN`，将 `ID_EXPORT_BASE_PATH` 设为对应的 basePath，两个输出变量分别指向独立的验收目录。导出 CLI 范围是 Prompt 和模板，合集和专题在 sitemap 与页面层验收。

```sh
BASE_PATH="$ID_EXPORT_BASE_PATH" BUILD_MODE=production npm run content:export -- --locale id --format json --out "$ID_JSON_EXPORT_DIR"
BASE_PATH="$ID_EXPORT_BASE_PATH" BUILD_MODE=production npm run content:export -- --locale id --format markdown --out "$ID_MARKDOWN_EXPORT_DIR"
```

候选报告须满足 `ready=true`、`blocking=false`、`localCurrent=indexable=target`、`fieldsCurrent=fieldsTotal`，且 missing、draft、unreviewed、outdated、archived、invalid、fallback 均为 0。记录相同源树启用前后的构建时间、文件数、HTML 与 id 搜索索引 raw/gzip 体积。通过参考 nginx 和现有测量脚本记录 id、默认语言首屏及空闲期 JS、字体请求与懒加载。沿用站点现有预算。普通页面首次加载排除完整搜索索引，搜索交互沿用现有按需预取。[CI 配置](../.github/workflows/ci.yml) · [性能预算](prompt-library-website-design.md#161-性能目标) · [测量脚本](../scripts/measure-first-load.ts)

`production-acceptance.json` 至少记录候选 commit、三种构建的 mode/origin/basePath/build ID、覆盖报告三个指纹及计数、搜索 analyzer 版本、测试结果、译审和媒体证据、性能记录、部署 ID、上一成功 build ID。附命令、退出码和证据位置。未执行的发布验证记为 pending，重要门禁跳过时不得标记通过。候选提交、内容源树或部署配置变化后重跑受影响的检查。

上线后用已有 `check:live` 核对生产域名及平台地址，均传该部署的 `--expect-build`，平台地址增加 `--platform`。冒烟覆盖 `/id/`、两种原文语言的详情、模板、列表第二页、搜索索引、sitemap、hreflang、复制和下载，检查生产可索引页面未收到平台的 noindex header。验证完成后将实际结果写入验收记录。[线上检查与部署](operations.md)

如发现路由错误、Prompt 复制失真、搜索索引与 Worker 不符、完整覆盖失效或发布了错误的收录信号，使用现有回滚工作流将整份产物恢复到上一已验证部署，并核对实际 build ID。恢复后检查默认语言入口、其他已发布语言与 sitemap，保留失败证据并修复主分支，防止下一轮部署重新引入问题。日常新增公开内容或修改来源时，按 scope 差异补译和复审，再执行全部启用语言门禁。[回滚操作](operations.md) · [回滚工作流](../.github/workflows/rollback.yml)
