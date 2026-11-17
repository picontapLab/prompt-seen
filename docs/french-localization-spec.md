# 法语接入实施规格

状态：规格已细化，接入待实施。更新日期：2026-11-17（America/Los_Angeles）。工程基线：`53cbc8efce854f8f067acef8372daf49be82f9c3` 及当前工作区。

交付可用法语浏览、检索、理解输入要求和操作模板的完整站点。首发采用与日语、德语一致的全量覆盖策略：分批准备和审校，在预览环境验证，全部公开目标就绪后才启用 `fr`。页面说明与界面使用法语，可复制的 Prompt 保留条目的原始正文及实际语言。

本文将[语言覆盖计划](language-coverage-assessment.md)中的法语接入细化为文件、流程和验收合同。复用[通用本地化流程](localization-workflow.md)、[通用规格](general-localization-spec.md)、[正文多语言设计](multilingual-prompt-design.md)和[工程约定](engineering-conventions.md)。通用文档中的部分语言启用状态已落后于当前注册表；本次以实际配置、源树和覆盖报告作为基线，不重复实施已有工具。覆盖计划中的纵向样本用于准备期验证，法语正式首发执行本文的 complete 全量门禁。

实施入口见第 9 节任务表，操作命令见第 6、10 节。下文的配置、批次、测试开关和验收文件均为待交付要求；本文更新本身不表示法语已启用、译文已审校或站点已发布。

## 1 交付范围与固定决策

| 项目 | 本次决定 |
| --- | --- |
| 语言身份 | `code: fr`、`pathPrefix: fr`、`nativeName: Français`、`htmlLang: fr`、`direction: ltr` |
| 编辑规范 | 通用书面法语，正文以 `vous` 称呼读者，按钮使用不定式；首发不建立 `fr-FR`、`fr-CA` 等重复页面 |
| 发布策略 | `coverage: complete`、`review: fingerprint`、`promptBodies: source-only` |
| 覆盖范围 | UI、全部公开内容说明及 SEO 文案、共享解释字段、分类与搜索别名、独立页面、语言导航及搜索体验 |
| 路由与部署 | 继续静态导出；保留稳定 ID、英文 slug、默认英语根首页、现有 basePath 和语言切换规则 |
| 浏览器偏好 | `fr`、`fr-FR`、`fr-CA`、`fr-BE`、`fr-CH` 在法语属于可选语言时推荐 `fr`；不自动跳转 |
| 生成事实 | 不修改模型名称、版本事实、许可、来源、记录正文、哈希、模板变量 ID、约束、枚举值和用户输入 |

不新增法语 `prompt-locales/fr/` 正文变体，不新增生图任务、在线翻译、地区版内容或翻译状态横幅。原文恰为法语时正常使用原文；如实施前出现法语正文变体，先报告与 `source-only` 的冲突，不静默覆盖或删除。

“全量”针对当前公开目标及保留的 scope 历史，不意味着翻译未公开草稿或复活归档内容。今后新增公开内容也必须满足已启用法语的完整覆盖要求。

## 2 已核对的工作量

基线来自 2026-11-17 实际执行的只读命令 `npm run --silent locale:check -- --locale fr --json`。报告为 schemaVersion 2，模拟法语启用后的生产候选，当前 `ready: false`、`blocking: false`，配置仍为 `incremental/fingerprint/optional`，尚无法语字典、译文或准备目录。普通检查退出 0 表示检查完成，不表示法语可发布；第 3 节改为 complete 后必须重新取报告，不能把本次策略指纹用于最终验收。

| 内容类型 | 目标数 | 当前法语完成数 |
| --- | ---: | ---: |
| Prompt 说明 | 285 | 0 |
| 模板说明 | 75 | 0 |
| 合集说明 | 16 | 0 |
| 专题说明 | 3 | 0 |
| About、License | 2 | 0 |
| 内容说明合计 | 381 | 0 |
| UI 消息 | 427，分布于 14 个命名空间 | 0 |
| 共享解释字段 | 1,793 | 0 |

`fieldsTotal: 2220` 已经包含 427 条 UI 消息，不能再加一次。1,793 个共享字段按文件分布为 Prompt 882、媒体 363、模板 308、示例 206、taxonomy 34。说明来源为英语 371 份、简体中文 10 份，不能一律从英语或德语二次翻译。

候选报告中的 379 个 `visible/fallback` 是可回退浏览的内容库条目；两个独立页面不回退。当前法语 `localCurrent` 和 `indexable` 都是 0，正式构建也尚未包含 `/fr/`。

本次报告的完整标识为：

```text
sourceRevision: 53cbc8efce854f8f067acef8372daf49be82f9c3:403059bea4b7375c5c58d6e9d7ed7f1149e74934254aff4a1afa7f66d1cef22b
scopeFingerprint: sha256:21419b1a5978a19b1c5d892bdd7943589e13b442443cab8d33947e10a71ee9c1
policyFingerprint: sha256:dcedc10f1845b90bbf4acfe68b922f6a9d9b88c80589fe6e6b60726e40b1392a
```

这些数量只用于估算和核对；开工、每批发布前和最终验收均重新计算，测试不得写死总量。当前注册表已启用 `en`、`zh-Hans`、`es`、`pt-BR`、`ja`、`ko`、`de`。只读全语言检查中它们均 ready；其中五个 complete 语言均为 381 个 current 目标、2,220 个 current 字段。简体中文沿用 incremental 策略，其已有缺译/回退不能被误报为本次新增回归，也不能顺便降低其他语言的策略。

`ar` 仅用于 preview，本次报告 `ready: false`、`blocking: false`。全语言报告用于发现结构问题及对照差异，发布严格检查只要求所有 enabled 语言及候选 `fr` ready；不能使用 `--all --strict` 把未启用的阿拉伯语变成法语上线前置任务。

## 3 配置与阶段状态

准备阶段将 `content/locales.yaml` 中现有法语条目改为以下配置；不新增重复条目：

```yaml
- code: fr
  pathPrefix: fr
  nativeName: Français
  htmlLang: fr
  direction: ltr
  enabled: false
  preview: false
  phase: 1
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

| 阶段 | enabled | preview | 进入条件与行为 |
| --- | --- | --- | --- |
| 准备 | false | false | 记录策略、scope、术语和批次；生产不生成法语路由 |
| 预览 | false | true | 完整 UI 字典、全局分类文本、About、License 已审校；可显示其余草稿或回退内容，全站 noindex |
| 生产候选 | true | true | 仅在独立候选分支或检出目录中启用；严格检查通过，构建 root 与 subpath 的生产产物供验收 |
| 正式发布 | true | true | 同一候选提交通过验收并进入既有发布流程；核对部署 build ID 和线上产物 |

`locale:promote` 只发布译文和审校记录，不改变上述开关，也不部署站点。disabled 的 complete 语言允许逐批 promote；全量尚未 ready 不是阻止合法批次进入准备流程的理由。已启用日语、德语等语言的门禁仍须通过。

## 4 交付文件与工程改动

| 位置 | 实施内容 |
| --- | --- |
| `content/locales.yaml` | 修改法语策略，按阶段改变 preview/enabled |
| `src/i18n/messages/fr/*.json` | 补齐默认英语字典的全部命名空间、叶子键、ICU 参数和标签 |
| `content/**/locales/fr.mdx` | 通过 importer 生成各目标路径的法语说明，保留正文结构和内容引用 |
| `content/prompts/`、`templates/`、`media/`、`examples/`、`taxonomy/` 内共享 YAML | 仅合并报告列出的法语解释字段及必要别名，保留其他键 |
| `production/localization/fr/` | scope、审校记录、术语表、风格规范、冻结的搜索用例和验收摘要 |
| `src/modules/search/tokenize.ts`、`profiles.ts` | 法语连字、带撇号省音词和受控专业别名，详见第 7 节 |
| `src/modules/search/types.ts` | 分析器行为改变时提升 `SEARCH_ANALYZER_VERSION`；数据结构不变时不提升 schemaVersion |
| `src/modules/search/tokenize.test.ts`、`engine.test.ts` 与新增 `scripts/lib/localization/french-search.test.ts` | 分词与高亮、别名负例、真实语料的序列化引擎验收 |
| `src/i18n/catalog.test.ts`、`format-locale.test.ts`、`src/ui/pages/language-match.test.ts` | ICU 编译与格式化、法语区域标签推荐及未启用时不推荐 |
| `tests/support/localization-search.ts` | 复用 `searchRecord` 解析含 taxonomy 的 topic key；为验收数据增加可选 `expectedTotal` 并落实断言 |
| 新增 `tests/e2e/french.browser.spec.ts` | 真实 Worker、排版、导航、模板、复制、收藏和无障碍验收 |
| 新增 `tests/e2e/french.http.spec.ts` 及既有 SEO、导出测试 | 法语禁用/预览/启用三种状态，产物存在性、输出集合与实际 Prompt 一致性；复用通用 helper |
| 新增 `tests/e2e/support/french.ts`，更新 `.github/workflows/ci.yml` | HTTP/浏览器共用预期状态断言；启用后的 CI 显式要求法语存在，准备期维持相应状态检查 |
| `README.md`、`docs/localization-workflow.md` | 链接规格；实施完成时同步真实状态和新增内容维护规则 |

计划新增的准备目录如下。这里定义的是实施交付物，本规格不会把它们标记为已完成：

```text
production/localization/fr/
  scope.json                  # locale:scope 写入的 v2 快照
  reviews.json                # schemaVersion 1，逐字段真实审校
  batch-plan.json             # schemaVersion 1，目标唯一归属及依赖，见 6.2
  glossary.yaml
  style-guide.md
  batches/                    # 原始翻译批次与对应审校输入，可重建 manifest
  search-cases.json            # schemaVersion 1，冻结 query 和稳定 key
  review-evidence.md           # 语言、图片和交互审校的实际范围与证据
  preservation-audit.json      # 法语字段之外的源内容、正文和事实前后对照
  evidence/baseline/           # 策略调整前后报告、配置和检查日志
  evidence/{candidate}/        # 三种构建的测试、截图、指标及日志索引
  production-acceptance.json   # 提交、配置、build ID、检查与成本结果

.artifacts/localization/fr/
  report.json
  pending/{batchId}/           # importer 生成的候选与 manifest
  transactions/               # 工具维护的事务记录
```

完整覆盖报告和浏览器 trace 可作为 CI artifact 保存；提交验收摘要及可追溯的证据位置。`.artifacts` 不作为跨机器唯一存档，保存原始批次以便重新 import。公共的 `generated/` 和运行时模型不得包含审校人、候选路径或全部审校记录。

现有 `locale:check`、`locale:scope`、`locale:import`、`locale:promote` 已支持注册语言，不新增法语专用 CLI，不另建发布判定器。现有消息加载、URL、SEO `fr_FR` 映射、格式化、浏览器区域语言匹配与字体分包优先复用并补足验证。若需要修改 Next.js 路由或渲染代码，先读本仓库 `node_modules/next/dist/docs/` 对应指南；当前 Next.js 16.4.2 的 `01-app/02-guides/static-exports.md` 明确限制请求时功能，不能照搬需要 Proxy、Cookie 或请求时重定向的国际化示例。

## 5 法语文本合同

### 5.1 术语与书写

术语表在首批翻译前确定，并由实际审校者维护。以下为本规格采用的初始用词：

| 概念 | 法语用词 | 约束 |
| --- | --- | --- |
| Prompt | prompt | 首次需要解释时用 `instruction destinée au modèle`；避免与页面说明混淆 |
| Template | modèle de prompt | 紧凑导航可用 `Modèles`；AI 模型写 `modèle d’IA` |
| Collection / Topic | collection / thème | 与模板及分类标签区分 |
| Reference image / Output image | image de référence / image générée | 不把输入图写成生成结果 |
| Copy / Download / Reset | Copier / Télécharger / Réinitialiser | 按钮描述动作 |
| Save to favorites | Ajouter aux favoris | 已收藏和移除使用对应状态文案 |
| Product photography | photographie de produit | `photo de produit`、`packshot` 可作为有语义依据的检索别名 |
| Poster / Sticker / Lighting | affiche / autocollant / éclairage | `poster`、`sticker` 可进入搜索别名 |
| Not verified | non vérifié | 不把无匹配生成记录写成已测试 |

法语采用句首大写，保留 `É`、`À`、`Ç`、`œ`、`æ` 等字符，不把无重音的搜索形式写进可见译文。自然语言使用 `’`，引号使用 `« … »`。本项目编辑规范规定冒号、百分号及法式引号内使用不换行空格 U+00A0，分号、问号和感叹号前使用窄不换行空格 U+202F。它们只应用于法语编辑文本，不批量替换代码、URL、占位符、Prompt 或用户输入。数字分组由 Intl 输出，不手工插空格。

模型和品牌名称、固定画面文案、代码片段及许可标识保持准确。来源的不确定性、一次运行的观察范围和改编限制要完整保留。About 与 License 翻译不能新增许可承诺。

### 5.2 UI 与格式化

14 个现有命名空间为 `common`、`detail`、`explore`、`favorites`、`feed`、`geo`、`home`、`pages`、`popup`、`primitives`、`search`、`shell`、`shortcuts`、`templates`；以实施时英语目录为准。

`validateBuildMessages` 也检查“字典目录已存在但语言尚未启用”的语言。因此先在准备目录完成整套 JSON，再整体加入 `src/i18n/messages/fr/`，不能将只含一两个命名空间的中间状态提交为可构建版本。UI JSON 不走 `locale:import`：直接维护完整字典，运行报告取得消息字段哈希，完成实际审校后将消息记录加入 `reviews.json`，与字典一起验证和提交。

保留全部 ICU 参数名、富文本标签和 `other` 分支；不可直接复制英语复数分支的语义。至少实测计数 0、1、2、1,000 和产品可能显示的 1,000,000；零结果文案使用 `=0`，需要 `many` 的消息按实际法语格式化结果设置。检查 `l’image` 与 ICU 参数相邻时的转义和渲染。

沿用 `formatLocale('fr')`，格式化标签为 `fr-u-nu-latn`；注册表、URL 和 HTML 仍使用 `fr`。日期沿用 UTC 设置。Node、Chromium、Firefox、WebKit 对相同输入须形成一致的可见文本，不产生 hydration 错误；检查小数逗号、分组空格、日期和百分比。只替换必要的格式化实现，不全局清洗字符串来掩盖差异。

### 5.3 内容和媒体

每份 MDX 翻译 title、description、正文、已有 seoTitle/seoDescription 及合集 reasons。保持 `##` 章节、内容 ID 链接、Figure 资源 ID 和 Callout 结构。源文件不存在的可选字段无需凭空补写。

共享字段按覆盖报告补齐，包括 alt/caption、标注 note、输入图片要求、字段 label/help、枚举显示标签、示例 notes 和 taxonomy 标签/别名。模板默认值、输出枚举文本和用户填写的法语文本保持原样；翻译标签不等于翻译输出。

图片说明必须核对实际资产；GIF 的动作和循环描述必须查看动画或足以验证该描述的逐帧证据。记录 asset ID、文件哈希、检查范围和结论，不能从文件名或 Prompt 推断可见细节。已有其他语言的媒体事实证据只有在同一资产哈希和同一事实范围下可复用，法语措辞仍单独审校。

## 6 从源树到可发布批次

### 6.1 冻结范围

1. 读取最新配置和源树，先保存法语报告及全语言基线。报告保存 `sourceRevision`、`scopeFingerprint`、`policyFingerprint`，不能只记 HEAD；当前工作区已有其他内容修改，实施不得覆盖或回退它们。
2. 改为第 3 节的 complete 策略，再运行 `locale:scope` dry-run 与 apply。创建 `production/localization/fr/` 后，`locale:check --all` 会自动包含法语诊断。
3. 从 `items` 和 `fields` 生成批次清单：稳定 key、真实源文件/语言、源与目标指纹、依赖、负责处理的批次。共享字段只安排一次；跨批次引用等待已有依赖就绪。
4. 每批重新比较新增目标、源文变化、目标变化和依赖变化。新公开内容自动进入目标；删除译文、关闭语言或降为 draft 不能缩小范围。正式移除按既有 scope 证据规则处理。

### 6.2 批次顺序与大小

| 批次 | 内容 | 完成条件 |
| --- | --- | --- |
| F0 | 风格规范、术语、完整 UI、全局 taxonomy、About 和 License | 字典验证通过，消息及基础内容审校有效，可启用 preview |
| F1 | 代表性纵向样本及依赖 | 走通导入、审校、promote、浏览、搜索、编辑、复制和下载 |
| F2 | 其余模板、Prompt、媒体、输入说明和运行 notes | 分批 current；共享依赖去重，源 Prompt 与生成事实未变 |
| F3 | 剩余合集、专题、推荐理由、首页和列表实际展示项 | 成员与页面说明均就绪；全量严格检查 ready |

F1 至少包含 `p_005`、`p_012`、`p_111`、`p_115`、`p_151`、`p_217`、`p_224`、`p_290`，以及 `t_001`、`t_002`、`t_017`、`c_001`、`c_002` 和 `topic/style/ink`。这些样本覆盖中文源文、人物/产品、多个参考输入、已有其他语言正文变体、GIF、模板编辑及聚合页。另加入当前首页 `home.featured` 和列表 showcase 的实际展示项；不能删减首页编排来降低翻译工作量。

本次已确认上述 key 均在公开目标中；实施时再核对，如已正式移除，以同类真实条目替换并记录原因。按报告和实际内容链接补齐依赖闭包；`item.dependencies` 主要列共享字段，不是合集成员、专题筛选结果或 MDX 引用的完整清单。还须读取合集定义、taxonomy 关联、正文链接及首页/列表配置，保存实际成员 key。合集至少 2 个可见成员、专题至少 3 个 Prompt 是可浏览下限；获得 indexable 资格要求所有实际可见成员均 indexable，不能只翻译最低数量。

若聚合页依赖超出试点批次，则在 F1 保留草稿并验证 preview 浏览和搜索，将其唯一交付归属记到 F3，待全部实际成员就绪再 promote；不能同时宣称它已通过生产验收。依赖规模扩大时拆成多个事务，试点数量不作为全量发布阈值。

一个内容批次建议最多 20 份 MDX 或 100 个共享字段，以可完整审校为界。页面的全部必需字段与引用依赖应随同一批就绪，或先发布依赖。互相引用的页面放入同一事务；不要在缺依赖时只把状态改成 published。UI 字典完整性优先于这个批次大小建议。

`batch-plan.json` 是执行台账，沿用西语批次表的结构，不替代 importer 的批次输入。顶层保存 `schemaVersion: 1`、`locale: fr` 和生成该表时报告的三个指纹标识；每批至少记录：

| 字段 | 合同 |
| --- | --- |
| `name` | 稳定批次名，如 `F0-foundation`、`F2-prompts-01`，与 64 位 import `batchId` 区分 |
| `itemKeys`、`fieldKeys` | 本批唯一负责交付的目标及字段；UI 427 项也计入 F0，但不送入 importer |
| `referencedFieldKeys`、`memberKeys` | 已由其他批次负责的共享依赖、聚合页实际成员；不重复申领 |
| `dependsOn` | 前置批次名，禁止环；相互依赖的交付项合并为同批 |
| `status` | `planned` → `prepared` → `reviewed` → `promoted` → `verified`；只有当前报告及检查通过才能标 verified |
| `batchIds`、`evidence` | 实际 import ID、原始批次/审校输入及审校、检查证据的仓库路径或 CI artifact 标识 |
| `notes` | 延后项、重新分批、源文变化和异常的具体原因，不用 notes 代替审校记录 |

在 P0、每批 promote 后及 P3 收尾时核对集合：全部 `itemKeys` 的无重复并集等于当前报告 `items[].key`；全部 `fieldKeys` 的无重复并集等于 `fields[].key`。引用和成员不计入所有权总数。新增 key 进入增量批次；指纹变动使受影响批次退回 prepared 并重新审校。保留原执行证据和新旧指纹，不靠改台账状态消除陈旧审校。

### 6.3 导入输入和命令

批次沿用 `scripts/lib/localization/import.ts` 的 `batchSchema`：顶层为 `schemaVersion: 1`、`locale: fr`、`operations`。每个 operation 包含 `key`、`sourceField`、`targetField`、`expectedSourceHash`、`expectedTargetHash` 和 `translation`；按报告补充 `expectedIdentity`。

| 操作 | 字段与指纹来源 |
| --- | --- |
| 页面 | `key = item.key`；sourceField/targetField 都为 `["$page"]`；expectedSourceHash 使用完整 `item.sourceFingerprint`；expectedTargetHash 使用 `item.targetHash` |
| 共享字段 | 直接采用 `field.key/sourceField/targetField/sourceHash/targetHash`；数组字段必须带 `expectedIdentity = field.identity` |
| 新目标 | 明确传 `expectedTargetHash: null`，不能省略 |
| 页面 translation | `{title, description, body}`，有源字段时同时提供 seoTitle、seoDescription、reasons |
| UI 消息 | 不可导入；按第 5.2 节直接维护并记录消息审校 |

MDX frontmatter 的短 `sourceHash` 与完整 prose 指纹用途不同；不要将短哈希作为页面 operation 或审校记录的源指纹。输入必须来自当前报告，不手算目录或复用旧批次哈希。

以下命令在准备文件存在后执行。`FR_BATCH_ID` 必须设为 import 输出的真实 64 位十六进制 batchId；`f1.json` 及其审校文件是本批次准备的文件名：

```sh
npm run locale:import -- --locale fr --file production/localization/fr/batches/f1.json
npm run locale:import -- --locale fr --file production/localization/fr/batches/f1.json --apply
npm run locale:promote -- --locale fr --batch "$FR_BATCH_ID" --reviews production/localization/fr/batches/f1-reviews.json
npm run locale:promote -- --locale fr --batch "$FR_BATCH_ID" --reviews production/localization/fr/batches/f1-reviews.json --apply
npm run --silent locale:check -- --locale fr --json
```

两个 promote 命令必须在第 6.4 节的审校完成后运行。首次 import 可写入 draft，也可能因触及已发布的共享依赖而将整批存为 pending；始终读取返回的 mode 和 manifest，不假设候选已在源树中。发布时工具合并选定字段、页面状态与批准记录，验证受影响的内容和所有 enabled 语言后，事务性应用。

### 6.4 审校与冲突处理

每批审校先比较真实源文和候选，再检查术语、完整语义、SEO、链接、模板输入、媒体描述及保留字段。通过后生成 `reviewSchema` v1 记录：`key`、完整 `sourceHash`、候选 `targetHash`、实际 `reviewer`、带时区的 `completedAt`、`conclusion`，必要时写 `reason`。页面 targetHash 取候选 prose 指纹，共享字段取候选字段指纹；pending 的哈希可从 manifest 对照确认，不能误用源树旧目标哈希。

允许记录真实完成的 AI 审校，reviewer 必须明确标识 AI；不将其描述为母语人士或人工审校。翻译生成、文字审校、看图核验和浏览器操作是不同证据。保留原文的品牌或模型名称要有精确字段和理由，不能用目录级豁免。发现问题记录 `changes-requested`，不得自动批准全部新译文。

| 失败情况 | 下一步 |
| --- | --- |
| source、target、数组 owner 或生命周期指纹冲突 | 保留现有修改，重新取报告、准备批次并审校 |
| 审校者修改了 pending 内容 | 以修改后的内容建立新计划；旧 batchId 和批准不能直接复用 |
| 缺少依赖或已有 enabled 语言门禁失败 | 补齐依赖或修复对应源问题后重试；不降低策略 |
| import/promote 中途失败 | 检查事务是否恢复到操作前状态；不得手工留下半批 published 内容 |
| 换机器后缺少 manifest | 用已保存原批次重新 import；旧候选迁移仅按现有 `--migrate` 合同执行 |

重复应用相同批次和记录应为 no-op。普通人工修改也必须满足相同审校和构建门禁；仅刷新哈希、时间或 scope 不能代替重新审校。

## 7 法语搜索合同

### 7.1 已有能力与必要扩展

当前实现已经折叠拉丁重音、统一大小写，并保留原文 UTF-16 高亮位置；`éclairage` 与分解形式 `e\u0301clairage` 都得到 `eclairage`。实际探针确认 `œuvre/oeuvre`、`cœur/coeur` 还不等价，`l’éclairage` 和 `l'eclairage` 都产生额外 `l` token。现有 AND 检索会要求这个 token，因此仅将两种撇号当作相同分隔符不足以满足检索需求。

| 输入或场景 | 必须满足的行为 |
| --- | --- |
| `éclairage`、`eclairage`、`ÉCLAIRAGE`、`e\u0301clairage` | 归一化一致；同一内容召回，不破坏原文重音高亮 |
| `œuvre/oeuvre`、`cœur/coeur`、`æ/ae` | 仅在法语分析中折叠连字；大写形式同样处理，原文保留 |
| `l’éclairage`、`l'eclairage`、`éclairage` | 相同核心检索词；省音冠词不成为额外 AND 条件 |
| `d’une image`、`d'une image` | 撇号形式等价；去除省音前缀，保留 `une`、`image` |
| `arc-en-ciel/arc en ciel`、`arrière-plan/arriere plan` | 按词组合检索等价，不依赖浏览器 ICU 分词字典 |
| `1 000`、`1 000` | 两类不换行空格均为分隔符，不影响高亮位置 |
| `GPT Image`、稳定 ID、英语专业词 | 继续可检索，不把型号或 ID 当法语词干处理 |

省音规则只作用于法语中紧邻 `'` 或 `’` 的完整前缀 `c`、`d`、`j`、`l`、`m`、`n`、`s`、`t`、`qu`，后面必须有词字符。普通独立字母查询继续工作；不要删除任意撇号前单词，也不引入通用停用词表或激进词干提取。索引、查询、高亮共用 `tokenize.ts` 的同一规则；先在原文上确定 spans，再生成归一化 term，连字展开不能改变原文 start/end。

专业别名放在现有 `profiles.ts` 或 taxonomy aliases，建立小而明确的法语映射：affiche/poster、autocollant/sticker、éclairage/lighting，以及有内容依据的 photographie de produit/photo de produit/packshot。模板 kind 可提供 `modèle de prompt`、`gabarit`、`template`。保留现有字段权重，原词命中优先于低权重 aliases；“摄影”不能反向自动成为“产品摄影”。不用改写文章或堆放关键词来满足测试。

为 `profiles.ts` 增加 `fr` profile 与显式分支；多词别名须匹配原文中连续的归一化词序列，复用已有葡语短语匹配思路。不能用散落在页面不同位置的 `photographie`、`de`、`produit` 触发 packshot，也不能用 `modèle d’IA` 加合成 kind `prompt` 触发模板别名。上述两种假阳性分别加入负例，模板 kind 的别名仅由真实 `kind: template` 赋予。

当前 `SEARCH_ANALYZER_VERSION` 为 **6**；在实现合入时从届时版本递增一次（若无其他变更则为 7），并重新生成全部 built locale 的索引。Node 构建、序列化后载入的引擎和真实浏览器 Worker 必须一致。结构不变时保留 `SEARCH_SCHEMA_VERSION = 2`。旧 build ID 或旧 analyzerVersion 继续走既有过期提示，不混用新旧索引。

### 7.2 冻结检索用例

在 F1 翻译及语义审校完成后、搜索调优前，提交 `production/localization/fr/search-cases.json`。沿用德语文件格式，每例记录 query、expectedKeys、可选 excludedKeys、topK 和 reason；法语用例增加可选 `expectedTotal`，无结果场景必须设为 0，并由测试断言引擎总数及浏览器空态，不能仅传空 expectedKeys 得到空断言。`topK: 5` 指每个实际展示的内容类型分组前五项。不得通过删除难例、修改预期 key 或扩大 topK 来宣称达标。

至少覆盖以下源内容有据的场景，表中同一行的不同查询各占一个用例；法语句式由审校后的术语确定并在调优前冻结：

| 查询 | expectedKeys | 目的 |
| --- | --- | --- |
| `éclairage néon portrait`、`eclairage neon portrait`、全大写及 NFD 形式 | `prompt/p_005` | 重音、大小写、组合字符 |
| `l’éclairage néon portrait`、`l'eclairage neon portrait` | `prompt/p_005` | 省音与两类撇号 |
| `portrait couverture` | `prompt/p_111` | 法语人物与封面说明 |
| `mariage deux personnes` | `prompt/p_115` | 多参考输入场景 |
| `photographie de produit studio`、`packshot studio` | `prompt/p_151` | 产品摄影别名 |
| `affiche Fuji`、`poster Fuji` | `prompt/p_290` | 法英领域词 |
| `modèle affiche produit`、`modele affiche produit` | `template/t_001` | 模板类别和重音 |
| `modèle encre` | `template/t_002` | 中文源说明的法语检索 |
| `singe lanterne` | `prompt/p_224` | GIF 内容 |
| `GPT Image p_111`、`p_217` | 分别为 `prompt/p_111`、`prompt/p_217` | 模型名及稳定 ID |

另补齐 collection 和 topic 各至少 1 例、无结果与相关标签提示、明确的负例，总计至少 24 个冻结查询。`œ/oe`、`æ/ae`、连字符、单独字母和高亮边界必须有确定的单元 fixture；在真实译文自然包含对应词时补充语料用例，不能为覆盖连字测试而制造不实描述。负例至少证明普通人像不会仅因“photographie”被 `packshot` 匹配。

每例同时通过序列化引擎和真实 Worker；浏览器检查 expectedKeys、excludedKeys、分组 topK 和可见原文高亮。`expectedKeys` 检查各分组前 topK，`excludedKeys` 检查所有召回结果，不能因负例掉到第六位就通过。浏览器等待本次 query 完成后断言；负例所在分组有分页时加载全部结果再检查。使用 `tests/support/localization-search.ts` 的 `searchRecord` 解析 `topic/style/ink`，不能把 topic ID 截断成 `style`。

语义别名命中但可见文本没有同词时允许无高亮；不得高亮无关字符。快速搜索与独立搜索页使用相同规则，旧语言的冻结用例继续通过。`expectedTotal` 是本次要接入测试类型与断言的可选字段，现有通用类型尚未提供它；只在 JSON 中写值不算实现完成。

## 8 页面与外部输出验收

### 8.1 浏览和交互

以下流程使用真实法语内容和真实静态构建，不能只把英语标签临时替换为法语：

- 首页与列表进入详情弹层，前后切换、Esc 关闭、刷新成为完整详情，URL 和返回位置正确。
- 搜索、探索与筛选显示法语分类及结果；快速搜索键盘操作、加载失败、无结果提示完整。
- 模板标签、帮助、错误信息和输入图片要求为法语；修改参数后，预览、复制、下载来自同一 render 结果。
- 用 `t_001` 输入含重音和撇号的值，例如 `une lampe d’atelier en laiton`，跨语言切换后用户输入、草稿及分享值不被自动翻译或重置。
- 用 `p_012` 验证中文原 Prompt，用 `p_217` 验证其他语言正文变体不会冒充法语原文；详情、弹层、快捷复制和导出选中一致正文。
- 收藏、取消、撤销和再次打开保留稳定 ID；GIF 播放控制、参考图与生成结果标签正确。
- 语言菜单显示 `Français`，从同一内容切换到法语时保留内容身份；`fr-CA` 等浏览器偏好只推荐，不改根首页及用户主动选择。

正文与标题块的 `lang/dir` 反映实际 `contentLocale`，Prompt 块反映实际 `promptLanguage`。预览中的回退内容不能被标成法语；全量首发不得以回退结果通过本地化检查。

### 8.2 排版和可访问性

Chrome/Chromium、Firefox、WebKit 覆盖 360、768、1024、1440 CSS px 和明暗主题。重点查看 `Ajouter aux favoris`、`Télécharger`、`Réinitialiser`、长模板字段和法式不换行标点。要求页面无横向滚动、必要文本无遮挡、控件不重叠，键盘焦点可见，axe 无 serious/critical 问题。

检查现有 IBM Plex Sans、Fira Sans Extra Condensed 和 Mono 对重音、连字、引号及空格的覆盖；先用现有 latin/latin-ext，不新增远程字体或向英语页面预加载法语资源。至少记录 Chromium 原生 200% 缩放验收，其余浏览器验证 720 CSS px 重排；不能把缩小 viewport 描述为所有浏览器都完成原生缩放测试。

### 8.3 SEO 与机器可读输出

| 输出 | 法语要求 |
| --- | --- |
| HTML | `lang="fr" dir="ltr"`，法语 title/description，canonical 使用自身规范地址 |
| hreflang | 法语使用 `fr`，只关联 indexable 真实版本，包含自身、双向一致；x-default 沿用既有默认语言规则 |
| Open Graph | 使用已有 `fr_FR` 映射；它不改变路由或 hreflang 的语言级标签 |
| sitemap、Markdown、index.md、llms.txt、外部 JSON 导出 | 只包含 indexable 集合，不将预览或回退说明当作法语发布 |
| JSON-LD | 页面说明与实际 Prompt 的语言分别正确，生成与测试事实不因翻译而变化 |
| 首页、列表和分页、合集、专题 | 使用实际展示成员判断收录资格；不能重排或隐藏条目绕过完整覆盖 |
| 搜索、探索、收藏、缺译和错误页 | 保持既有 noindex；语言导航不因此消失 |
| 预览站 | 所有页面 noindex；生产正式域名不能遗留平台 noindex header |

所有路径通过 URL 模块生成，验证 origin、尾斜杠和 basePath。可浏览 JSON、弹层与站内搜索继续使用可浏览集合；外部输出采用 indexable 集合，不能用一种过滤规则替代两种用途。发布后法语首页必须具备 complete 语言首页要求的实际内容与 sitemap 资格。

## 9 可执行实施阶段

| 阶段 | 输入与改动 | 退出条件 |
| --- | --- | --- |
| P0 基线与策略 | 保存新报告；修改法语策略；建立 scope、风格规范、术语和批次清单 | 目标、源语言、依赖和指纹可追溯，其他 enabled 语言基线未退化 |
| P1 基础内容 | 完成 F0；一次加入完整 UI；实际审校；启用 preview | 消息语法/参数校验通过，基础页面和全局字段 current，预览可构建 |
| P2 纵向试点 | 完成 F1 与依赖；冻结检索用例；实施法语搜索规则及测试 | 非聚合试点 current；聚合草稿按 6.2 明确归属 F3；试点可操作、复制/下载一致，单元和 Worker 用例通过 |
| P3 全量内容 | 逐批执行 F2/F3；每批复算 scope 和审校 | `localCurrent = target`、`fieldsCurrent = fieldsTotal`、无 fallback，严格检查 ready |
| P4 生产候选 | 独立候选启用 fr；执行第 10 节矩阵；记录性能与产物成本 | 同一提交 root/subpath 生产验收通过，预览矩阵通过，证据关联 build ID |
| P5 发布与核验 | 沿用现有 CI、部署及 live checker，核对真实线上结果 | 部署提交/build ID 一致，法语路由/SEO/搜索可用，记录可回滚版本 |

P0 → P1 → P2 → P3 → P4 → P5 是发布顺序。F2 的翻译准备可在 P2 搜索工程期间继续，但任何 published 变更必须经过相同审校事务。每个提交应保持可构建；每批报告把完成、待译、需修改、因源变化需重审分别列出。

### 9.1 可直接领取的任务

任务编号用于提交、审校和验收证据关联。工程负责人负责配置与代码，译审负责人负责源文对照和措辞，验收负责人负责实际页面与产物；可由同一执行者承担，但必须分别记录做过的工作。下表定义交付与验收合同；本次 worktree 的实际完成情况和待发布事项见 `production/localization/fr/release-status.json`，不以计划条目代替验收结果。

| 任务 | 前置 | 具体交付 | 验收与证据 |
| --- | --- | --- | --- |
| FR-01 基线与策略（P0） | 无 | 保存改动前后 `fr`/全语言报告及原文事实清单；修改现有 fr 策略；执行 scope dry-run/apply | `evidence/baseline/` 可追溯工作树；既有 enabled 语言 ready，fr 仍 disabled；没有无据移除目标 |
| FR-02 分批与编辑规范（P0） | FR-01 | `batch-plan.json`、`glossary.yaml`、`style-guide.md`；列出 F1 实际成员及跨批次依赖 | 目标/字段各唯一归属、依赖无环；术语、UI 称谓及标点规则有实际审校记录 |
| FR-03 完整 UI 与状态测试（P1） | FR-02 | 全部 `messages/fr/*.json` 与对应字段审校；补 catalog、format、language-match 测试；建立 `french.http.spec.ts` 基础检查及 `support/french.ts` 状态断言 | 所有英语叶子键和 ICU 合同匹配；0/1/2/1000/1000000、区域标签和禁用负例通过；后续基础预览检查可执行 |
| FR-04 基础内容与预览（P1） | FR-03 | 全局 taxonomy、About/License 经 import → review → promote；设置 `preview: true` | 基础目标 current；生产无 fr，预览可用且 noindex；保留基础页面 HTTP 证据 |
| FR-05 纵向内容（P2） | FR-04 | F1 非聚合页面及共享依赖、图片/GIF 核验；聚合页按 6.2 交付；冻结搜索用例 | 真实源文、操作和资产证据完整；集合/专题延期可追踪；调优前保存用例版本 |
| FR-06 法语分析器（P2） | FR-03；语料验收依赖 FR-05 | `tokenize.ts`、`profiles.ts`、版本递增；补重音/省音/连字/spans/短语别名测试 | 原文坐标正确、假阳性负例通过；德/西/葡/韩及通用分词回归通过 |
| FR-07 搜索端到端（P2） | FR-05、FR-06 | `french-search.test.ts`、共享用例类型、`french-search.browser.spec.ts` | ≥24 个冻结查询全部通过序列化引擎与真实 Worker；总数、全部负例及分组 topK 均有断言 |
| FR-08 全量补齐（P3） | FR-05；翻译准备可与 FR-06/07 同期进行 | F2/F3 分事务交付；补新公开内容和陈旧译文；完成 `preservation-audit.json` | 最新 fr 严格 ready，完整覆盖与唯一归属成立；原 Prompt、模板输出值及生成事实对照无越界变化 |
| FR-09 页面与输出测试（P4 前） | FR-07；最终验收依赖 FR-08 | 扩充 FR-03 的 HTTP 基础检查及浏览器交互/布局/a11y；在 CI 接入 10.3 的 `FR_EXPECT_STATE` | 禁用、准备预览、启用三种状态均有正负断言；无语言缺失导致的空跑或整组跳过 |
| FR-10 候选矩阵（P4） | FR-08、FR-09 | 独立候选启用 fr；执行严格检查、完整 CI 和三种静态构建；采集性能、原生缩放及字体证据 | 同一候选提交的三个构建分别通过；填写 10.5 验收记录，阻塞项为零 |
| FR-11 发布与回滚核验（P5） | FR-10 | 按既有 Deploy 发布验收提交；运行 live checker 和法语搜索/复制冒烟；记录上一成功部署 | 实际部署 build ID 与 release commit 对应；正式域名、平台域名规则正确；回滚目标可用 |
| FR-12 维护交接（P5） | FR-11 | 更新 README、通用 workflow 和发布状态；写明新增内容的法语翻译/复审责任 | 文档不把历史 enabled 等同于上线；后续源变更继续受到完整覆盖门禁约束 |

FR-06 的纯分析器 fixture 可提前准备；FR-07 的语料预期必须在 FR-05 译文审校后冻结。FR-08 完成但 FR-07/09 未通过时仍不能启用法语。每个任务只提交其负责的文件；共享 YAML 按字段合并，不覆盖工作区已有模型版本等内容调整。

## 10 验证命令与门禁

### 10.1 准备与每批检查

```sh
npm run --silent locale:check -- --locale fr --json
npm run --silent locale:check -- --all --json
npm run locale:scope -- --locale fr
npm run locale:scope -- --locale fr --apply
npm run content:validate
```

scope apply 仅在已确认目标差异符合源树事实时使用，不是每次检查必须写入。非严格报告允许未完成的 disabled 法语存在；结构错误或发布错误依然阻止。`--locale` 和 `--all` 互斥；参数错误返回 2，校验/严格未就绪返回 1。JSON 报告使用 `npm run --silent`，避免 npm banner 污染 stdout。

### 10.2 全量候选检查

先验证候选 fr，再按注册表逐个调用既有严格检查，自动包括以后新启用的语言：

```sh
npm run locale:check -- --locale fr --strict
node --input-type=module <<'NODE'
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
const registry = YAML.parse(fs.readFileSync('content/locales.yaml', 'utf8'));
for (const locale of registry.locales.filter((entry) => entry.enabled && entry.code !== 'fr')) {
  const result = spawnSync('npm', ['run', 'locale:check', '--', '--locale', locale.code, '--strict'], {
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
npm run storybook:build
```

新增搜索测试至少覆盖第 7 节规则、序列化 round-trip、Worker、原文 spans 和其他语言不受影响。现有 localization 测试覆盖源/目标变更、数组移位、缺审校、重复导入、失败回滚和完整覆盖门禁；仅在法语路径暴露缺口时扩展这些测试，不复制一套仅改 locale 名称的实现镜像。

### 10.3 构建矩阵

FR-03 建立仅用于测试的 `FR_EXPECT_STATE`，FR-07 的浏览器测试复用该断言，FR-09 完成 CI 接入；沿用葡语 HTTP 测试的产物存在性断言模式，不在产品中添加环境开关：

| 值 | 必须断言的产物状态 |
| --- | --- |
| `disabled` | 生产 `BUILD.locales` 无 fr；菜单、hreflang、sitemap、外部导出无 fr；`/fr/`、法语 feed/search 索引返回 404 |
| `preview` | 准备期 fr 为 disabled/preview，预览产物含 fr；About/License 可用，全站 noindex，外部收录输出无 fr |
| `enabled` | `BUILD.locales` 存在 fr 且 `enabled: true`；法语路由和索引存在，冻结用例非空；依据 production/preview 模式验证收录规则 |

未传值的普通回归允许按产物状态运行适用检查；传入值与产物不匹配必须 fail。法语候选及启用后的 CI 作业须显式传 `enabled`，不能只从一个缺失 fr 的产物推断“没有需要运行的测试”。状态检查同时供 HTTP 和浏览器验收使用，单独运行浏览器套件也要拒绝错误产物。

先在 fr.enabled 为 false 的工作区执行生产负向检查；在 FR-04 完成后另做准备期 preview 检查。这两次只要求当时已交付的 HTTP 状态及基础页面检查，不提前要求 F2/F3 完成：

```sh
BASE_PATH= BUILD_MODE=production npm run build
FR_EXPECT_STATE=disabled npm run test:e2e -- tests/e2e/french.http.spec.ts --project=http --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
FR_EXPECT_STATE=preview npm run test:e2e -- tests/e2e/french.http.spec.ts --project=http --workers=1
```

FR-10 在不触发正式部署的 `codex/french-production-candidate` 分支或等价独立检出目录启用 fr。每次构建后立即测试对应 `dist/`，保存 build ID、配置和结果，再构建下一份；不可并发写同一 checkout 的 `.next`、`dist` 和 generated 文件。以下命令使用仓库已配置的 SITE_ORIGIN；发布环境如有覆盖值，候选须使用同一值。每条命令成功后才执行下一条，任何非零退出都停止该轮验收：

```sh
BASE_PATH= BUILD_MODE=production npm run build
FR_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=production npm run build
FR_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
FR_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1
```

基线 CI 只有“root production + subpath preview”；本实现已增加 subpath production 构建、三浏览器作业及对应发布门禁。额外的 **subpath production 必须显式完成**；不能用 preview noindex 的结果证明生产 canonical/hreflang 正确。HTTP 测试针对 nginx 提供的静态产物，不以 `next dev` 代替。环境需 Node ≥24、安装完成的依赖、三种 Playwright 浏览器及 `scripts/nginx.sh` 所需的容器运行环境。缺少环境时记录未验证项，不能将其记为通过。

记录重试和跳过原因；法语已包含在候选产物时，不能因为检测语言失败而整组 skip。保存法语 index 的原始/gzip 大小、输出文件数、HTML 字节、构建时间，以及英语和法语首页/列表/模板的首屏 JS 与字体请求。比较前后使用相同源树和构建配置；继续遵守既有性能预算，不扩大已有例外。普通页面不得预载搜索索引、翻译审校数据或其他语言完整字典。

首屏 JS 复用 `scripts/measure-first-load.ts`，在对应构建由 `npm run serve` 提供时传入实际英/法页面路径；首屏、idle preload 与路由 prefetch 分开记录。模板路径从产物读取，不假定 slug。性能预算及已有例外以[总体设计 §16](prompt-library-website-design.md)为准，保存对照数值及差值；disabled 对照只用于既有语言成本，法语页面单独记录新增成本。

### 10.4 最终完成条件

- [ ] 法语 complete/fingerprint/source-only 策略生效，scope 覆盖最新公开目标且无无据移除。
- [ ] `ready: true`、`blocking: false`；localCurrent、indexable 等于 target；fieldsCurrent 等于 fieldsTotal；missing/draft/unreviewed/outdated/archived/invalid/fallback 均为 0。
- [ ] 每个目标及字段都有对应当前指纹的真实审校，图片与交互证据可追溯，没有将 AI 审校冒充人工。
- [ ] 冻结搜索场景全部通过，其他语言的搜索及发布门禁未退化。
- [ ] 所有规定页面、交互、宽度、主题、浏览器、缩放和无障碍检查完成，原 Prompt 与生成事实保持一致。
- [ ] root/subpath 生产、subpath 预览的产物与输出集合通过验收，性能结果和 CI 关联到同一候选提交。
- [ ] 正式部署通过 build ID 和线上检查，发布摘要记录真实时间、提交、证据及回滚目标。

### 10.5 验收记录的最小字段

`production-acceptance.json` 是事实记录，沿用仓库其他语言的 JSON 证据形式，不新增运行时 schema 或第二套发布判定器。至少包含下列信息，未执行项写 `pending`，失败写 `failed`，不能省略后视为通过：

| 信息 | 必填内容 |
| --- | --- |
| 身份 | `schemaVersion: 1`、`locale: fr`、`status`（pending/failed/passed）、实际记录时间、完整候选/发布 commit |
| 覆盖 | 最新报告的 sourceRevision、scopeFingerprint、policyFingerprint、counts、ready、blocking；报告文件或 CI artifact 位置 |
| 配置 | 每份构建的 mode、origin、basePath、enabled locales、build ID、搜索 schema/analyzer version |
| 验证 | 对应 FR 任务编号、执行命令、退出码、pass/fail/skip 数、浏览器/宽度/主题、证据位置；重试与未执行原因 |
| 译审与保留项 | 批次台账、当前哈希审校、媒体事实、原生缩放、复制/下载对照和 preservation audit 的证据链接 |
| 性能 | disabled/enabled 对照配置、构建时间/文件数/字节、索引 raw/gzip、首屏 JS 和字体请求的前后值 |
| 部署 | 实际 deployment ID、线上 build ID、live checker 与法语冒烟结果、上一成功 deployment/build ID |

P4 通过仅代表候选验收完成，顶层 `status` 在 P5 线上核验结束前保持 pending；各构建可以单独记录 passed。若合并、源树、注册表或生产配置发生变化，更新候选标识并重跑受影响检查；不能把旧提交报告附在新部署上宣称通过。

`preservation-audit.json` 按文件记录前后哈希与变更分类：Prompt/模板原始正文、生成记录的模型/版本/参数/输入顺序/事实字段、资产字节、稳定 ID/slug、模板变量 ID/约束/默认值/枚举值保持一致。允许的法语解释字段按结构比较，不能要求共享 YAML 整文件哈希不变。若其他工作同时修改源树，先重新建立并记录基线；不得撤销已有修改来制造一致性。

## 11 发布后验证与回滚

发布使用既有 `.github/workflows/deploy.yml`，不为法语绕过 CI 或建立独立部署器。部署后按该流程运行 `check:live --expect-build`，并验证 `/fr/`、Prompt、模板、列表第二页、法语搜索索引、sitemap、canonical/hreflang 和实际原 Prompt。平台预览地址使用既有 `--platform` 检查；正式域名核对无意外 noindex header。

以下变量由实际发布记录填入；`FR_PLATFORM_ORIGIN` 不带 basePath，脚本按配置补齐。构建与 live checker 使用相同生产 origin/basePath：

```sh
npm run check:live -- --expect-build "$FR_RELEASE_BUILD_ID"
npm run check:live -- --site "$FR_PLATFORM_ORIGIN" --platform --expect-build "$FR_RELEASE_BUILD_ID"
```

发布摘要记录 release commit、root/subpath build ID、scope/policy 指纹、启用语言、检查结果、法语索引版本及上一成功部署。自动检查成功只证明技术验收，不把它写成搜索引擎已收录或语言效果已获得用户验证。

若出现完整覆盖失效、复制正文错误、搜索版本不匹配、主要路由不可用或错误收录输出，使用现有 `.github/workflows/rollback.yml` 回到已验证的完整部署，并核对恢复后的 build ID。HTML、generated JSON、Worker 和索引必须一起回滚；只回退字典或索引会产生不一致。保留失败版本的译文和证据供修复，并通过可审查的 revert/修复提交处理主分支上的故障变更，避免下次自动部署重新引入。若需长期撤下法语，则另行提交 `enabled: false` 并全量重建，不能直接修改线上静态文件。

上线后新增或修改源内容时继续使用 report changes → 翻译/复审 → promote → 全语言门禁流程。`source-only`、当前指纹审校与 complete 不因赶内容发布而降级。
