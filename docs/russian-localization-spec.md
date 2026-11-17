# 俄语接入实施规格

状态：实施中，见[实施记录](../production/localization/ru/implementation-status.md)。日期：2026-11-17（America/Los_Angeles）。工程基线：`53cbc8ef` 及当前工作区。本文交付实施合同，不表示俄语已启用、已完成翻译或已经上线。

将[语言覆盖计划](language-coverage-assessment.md)中第二批靠前的俄语接入，落实为可分批交付的内容、工程、审校和发布流程。沿用近期语言接入的全量首发方式：先分批准备并在预览中验证，全部公开目标完成后启用 `ru`。界面与说明使用俄语，可复制的 Prompt 保留原始正文和实际语言。

复用[本地化流程](localization-workflow.md)、[通用规格](general-localization-spec.md)、[正文多语言设计](multilingual-prompt-design.md)、[工程约定](engineering-conventions.md)及[运维手册](operations.md)。历史规格中的语言启用状态不作为当前事实；实际配置、源树和最新报告决定实施范围。

## 1 交付范围与固定决策

| 项目 | 实施合同 |
| --- | --- |
| 语言身份 | `code: ru`、`pathPrefix: ru`、`nativeName: Русский`、`htmlLang: ru`、`direction: ltr`；保留 `phase: 2` |
| 受众与编辑规范 | 面向俄语读者的通用书面俄语，不按国家推定读者；首发不拆 `ru-RU` 等地区站 |
| 发布策略 | `coverage: complete`、`review: fingerprint`、`promptBodies: source-only` |
| 内容范围 | 全部公开 Prompt、模板、合集、专题、About、License 的说明及 SEO 文案；相关共享解释字段和完整 UI |
| 使用流程 | 浏览、搜索、筛选、详情及弹层、参考图要求、模板编辑、复制、下载、收藏和语言切换 |
| 工程重点 | `ё/е` 检索兼容且保留 `й/и` 区别；受控词形别名；ICU 复数；西里尔字体；俄语键盘输入 |
| 路由与默认语言 | 保留稳定 ID、英文 slug、英语根首页和 URL 模块；俄语首页为 `/ru/`，子路径由 URL 模块添加 |
| 浏览器偏好 | 在可选语言集合包含 ru 时，`ru`、`ru-RU`、`ru-BY`、`ru-KZ` 推荐 ru；不自动跳转，不把 `uk` 或 `be` 推定为 ru |

首发不新增 `prompt-locales/ru/` 正文变体、生图任务、运行时翻译或自动音译。模板变量 ID、约束、实际枚举值、默认值、用户输入、运行参数、模型版本、来源、许可、日期、媒体和 Prompt 哈希均保持原有语义。可以翻译这些事实的解释文字。原文恰为俄语时正常保留原文；发现既有俄语正文变体与 source-only 冲突时先报告，不能删除文件或改选正文来消除告警。

全量针对动态公开目标和保留的 scope 历史；未公开草稿与已证明移除的条目不因本次接入被重新发布。俄语启用后，新增公开内容也必须同步补齐俄语说明及依赖。

## 2 已核对的基线与实际缺口

### 2.1 内容数量

2026-11-17 执行只读命令 `npm run --silent locale:check -- --locale ru --json`，报告 schemaVersion 为 2，evaluationMode 为 `candidate-production`。当前注册策略仍为 incremental/fingerprint/optional，`enabled: false`，未设置 preview；没有俄语字典和准备目录。

| 目标 | 数量 | 俄语 current |
| --- | ---: | ---: |
| Prompt 说明 | 285 | 0 |
| 模板说明 | 75 | 0 |
| 合集 | 16 | 0 |
| 专题 | 3 | 0 |
| About、License | 2 | 0 |
| 内容单元合计 | 381 | 0 |
| UI 消息 | 427，14 个命名空间 | 0 |
| 共享解释字段 | 1,793 | 0 |
| fieldsTotal（已包含 UI） | 2,220 | 0 |

说明来源为英语 371 份、简体中文 10 份，按每项真实 sourceLocale 翻译。共享字段分布为 Prompt 882、模板 308、媒体 363、示例 206、taxonomy 34；同一字段只分配一次。报告中的 379 个 visible/fallback 是模拟候选下可回退浏览的库条目，另外两个独立页面不回退；不能把它们视为已翻译或正式生成的俄语页面。

本次 `ready: false`、`blocking: false`、`localCurrent: 0`、`indexable: 0`。普通检查退出 0 仅说明检查成功；发布要检查 ready 并使用 strict。基线指纹为：

```text
sourceRevision: 53cbc8efce854f8f067acef8372daf49be82f9c3:7107c605512ae5b36817289fa3a6529fd2071652a0b8c78a90d527b725ab39ca
scopeFingerprint: sha256:4a73a04c54301a5132468f49991ba0f17c20cdfb50ba42e52869d1a493aae345
policyFingerprint: sha256:dcedc10f1845b90bbf4acfe68b922f6a9d9b88c80589fe6e6b60726e40b1392a
```

这些指纹描述检查时的工作区，包含未提交内容；切换策略后必须重新计算，不能作为最终放行证据。数量只用于估算，开工、每批 promote 前及发布候选前重算，测试不写死总量。

当前 enabled 集合为 `en`、`zh-Hans`、`es`、`pt-BR`、`ja`、`ko`、`de`。同次全语言检查中这七种语言均 ready；五种 complete 语言均为 381 个 current 单元、2,220 个 current 字段。简体中文为 incremental，已有 16 个 missing、2 个 draft、9 个 outdated，仍符合其当前策略；不将这部分基线缺口误报为俄语引入的退化。阿拉伯语仅预览、未 ready。注册表状态不证明线上部署状态。

### 2.2 已有能力与需要实现的部分

| 范围 | 核对结果 | 本轮工作 |
| --- | --- | --- |
| 配置、路由与工具 | ru 已注册；check/scope/import/promote 支持注册语言 | 复用工具，新增俄语数据和验收，不新增俄语专用 CLI |
| 搜索归一化 | 当前 `normalizeTerm('ёлка', 'ru')` 得到 `елка`；但 `й`、`и` 均得到 `и`，`май` 得到 `маи` | 修复俄语的字母区分并保留组合字符高亮位置 |
| 领域搜索 | profiles 尚无 ru；模糊匹配不能代替俄语词形支持 | 增加小而明确的专业词、词形和类别别名 |
| 索引协议 | 当前 `SEARCH_SCHEMA_VERSION = 2`、`SEARCH_ANALYZER_VERSION = 6` | 行为改变时从实施时最新 analyzerVersion 递增；结构不变不升 schemaVersion |
| 字体 | 已含 IBM Plex Sans 400/500/600、Fira Sans Extra Condensed 600/700、IBM Plex Mono 400/500 的本地 cyrillic 子集 | 先验证字形、字重、回退和请求；只修实际缺口 |
| 格式与 SEO | 现有 Intl、UTC 日期、`ru_RU` Open Graph 映射可复用 | 增加真实俄语消息与产物断言 |
| 快捷键 | 搜索组合键仅按 `event.key === 'k'` 判断 | 补俄语键盘的 Ctrl/Cmd+K 物理键兼容，详见第 8 节 |

## 3 状态转换与发布边界

P0 修改现有 ru 条目，不增加第二个注册项：

```yaml
- code: ru
  pathPrefix: ru
  nativeName: Русский
  htmlLang: ru
  direction: ltr
  enabled: false
  preview: false
  phase: 2
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

| 阶段 | enabled | preview | 进入条件与输出 |
| --- | --- | --- | --- |
| 准备 | false | false | 保存基线、策略、scope、术语和批次；生产无俄语路由 |
| 预览 | false | true | 完整 UI、全局分类、About、License 已审校；其余草稿/回退可用于验证，全站 noindex |
| 生产候选 | true | true | 在隔离候选分支或检出目录中启用；全量 strict ready，构建并验收生产产物 |
| 正式发布 | true | true | 验收的同一提交进入既有部署流程，线上 build ID 与验收记录一致 |

`locale:promote` 仅发布译文及审校记录，不改变 enabled/preview，也不部署。disabled complete 语言允许逐批 promote，不必等待全量完成；所有 enabled 语言的门禁仍然生效。preview 构建也不能绕过已启用 complete 语言的门禁。

候选提交在验收完成前不进入会自动部署的分支。合并产生新提交或源树变化后，重新构建并验收实际将部署的版本。保留 `phase: 2` 不构成等待法语部署的技术依赖；以当时真实 enabled 集合执行回归。

## 4 文件与交付物

| 文件/目录 | 必须交付的改动 |
| --- | --- |
| `content/locales.yaml` | 俄语策略及阶段开关 |
| `src/i18n/messages/ru/*.json` | 与英语完整叶子键、参数、标签对应的俄语 UI |
| 报告列出的 `content/**/locales/ru.mdx` | 各类说明、SEO、合集 reasons；由 importer 按 targetFile 落地 |
| `content/{prompts,templates,media,examples,taxonomy}/` 中的共享 YAML | 仅合并目标 ru 解释字段与必要别名 |
| `production/localization/ru/` | 下列范围、批次、审校与验收交付物 |
| `src/modules/search/tokenize.ts`、`profiles.ts`、`types.ts` | 俄语归一化、受控别名及版本更新 |
| `src/modules/search/tokenize.test.ts`、`engine.test.ts`，新增 `scripts/lib/localization/russian-search.test.ts` | 字母区分、词形正负例、原文 spans、序列化后真实语料查询 |
| `src/ui/search/highlight-parts.ts` 及对应测试 | 复用原文位置；仅在俄语用例暴露缺口时改实现 |
| `src/ui/search/SearchLauncher.tsx`、必要的纯键盘判定 helper | 俄语键盘组合键与输入保护 |
| `src/i18n/catalog.test.ts`、`format-locale.test.ts`、`src/ui/pages/language-match.test.ts` | ICU 编译和复数、格式化、区域标签推荐及负例 |
| 新增 `tests/e2e/russian.browser.spec.ts`、`russian.http.spec.ts` | 真实 Worker、交互、字体、俄语输出及启用前后断言；复用通用 HTTP/SEO 测试 |
| `tests/support/localization-search.ts` 及测试消费者 | 为无结果用例增加可选 expectedTotal，并实际断言总数 |
| `.storybook/messages.ts`、`.storybook/samples.ts`、`.storybook/preview.tsx` | 纳入 ru 字典、长标签/数量样本及语言工具栏选项 |

```text
production/localization/ru/
  scope.json                   # locale:scope 生成的 v2 快照
  glossary.yaml                # 概念、用词、有限词形/别名、使用说明
  style-guide.md
  batch-plan.json               # 每个稳定 key 的来源、依赖和所属批次
  batches/                     # 原始 batch v1 输入及对应 review v1 输入
  reviews.json                 # 工具消费的当前指纹审校记录
  search-cases.json             # schemaVersion 1，调优前冻结
  review-evidence.md            # 文字、媒体核验和实际交互证据
  implementation-status.md      # 已完成、待译、需修改、源变更待重审
  production-acceptance.json    # 提交/配置/build ID/检查结果/回滚目标

.artifacts/localization/ru/
  report.json
  pending/{batchId}/            # importer 维护候选与 manifest
  transactions/                # 工具维护事务
```

`batch-plan.json` 是实施清单，不冒充已有 CLI 输入：至少记录 locale、基线 sourceRevision/scopeFingerprint/policyFingerprint，以及每批 ID、稳定 keys、依赖批次和状态；可由脚本生成后审阅。批次原文件必须可重建 manifest，不能把仅在本机的 `.artifacts` 当作唯一存档。大体积报告、截图和 trace 保存为可追溯构建 artifact；验收摘要提交到仓库。审校信息不得进入公共 generated 数据或浏览器包。

继续使用静态导出和按 namespace 下发消息；修改 Next.js 相关代码前阅读本仓库 `node_modules/next/dist/docs/` 对应指南，尤其 static-exports 和字体指南。不引入依赖服务器的 Proxy、Cookie 语言路由或请求时翻译。

## 5 俄语文本、复数与内容合同

### 5.1 编辑规范

正文使用礼貌的 `вы`，通常小写；操作按钮用不定式，说明步骤可用礼貌祈使句。标题采用句式大小写，保留正确的 `ё`，不将检索归一化形式写回正文。自然语言引号使用 `«…»`，嵌套引号使用 `„…“`；使用正确破折号，必要的不换行空格仅用于编辑文本，不批量替换 URL、代码、Prompt、占位符或用户输入。

| 概念 | 初始俄语术语 | 使用约束 |
| --- | --- | --- |
| Prompt | промпт | 首次解释可用 `инструкция для модели`；不与页面说明混同 |
| Template / AI model | шаблон промпта / модель ИИ | 导航可简写 `Шаблоны`；不把 AI 模型称为模板 |
| Collection / Topic | подборка / тема | 分类标签另按 taxonomy 语义翻译 |
| Reference image / Generated image | референсное изображение / сгенерированное изображение | 输入图与结果图分清；槽位要求保留约束 |
| Copy / Download / Reset | Копировать / Скачать / Сбросить | 状态提示使用对应已完成动作 |
| Save to favorites | Добавить в избранное | 已收藏、移除、撤销各自有准确文案 |
| Product photography | предметная съёмка | 产品摄影；不能让所有“摄影”查询都等同产品摄影 |
| Poster / Sticker / Lighting | постер / стикер / освещение | `плакат`、`наклейка` 可按语境作别名 |
| Not verified | Не проверено | 不把来源声明或无匹配运行的内容写成已实测 |

用词须在 R0 完成语义审校后冻结。品牌、模型名、固定图中文字和许可标识保持原文；保留来源的不确定性及测试范围。About、License 不增加来源没有的授权承诺。

### 5.2 UI 与 ICU

当前命名空间为 `common`、`detail`、`explore`、`favorites`、`feed`、`geo`、`home`、`pages`、`popup`、`primitives`、`search`、`shell`、`shortcuts`、`templates`，实施时按英语目录重新核对。`validateBuildMessages` 会检查字典目录已存在的 disabled 语言，因此在准备目录完成整套字典后整体加入 `src/i18n/messages/ru/`，不提交只有部分 namespace 的不可构建状态。

UI JSON 不走 `locale:import`。直接维护完整字典，取得报告中的消息 source/target 指纹，完成实际审校后写入 reviews.json；字典和对应记录一起校验。

保留英语消息的参数名和富文本标签；数量相关名词使用 ICU 的 `one/few/many/other`，不直接套用英语 one/other。零结果消息用 `=0` 表达空态。以结果数为例：

```text
{count, plural, =0 {Нет результатов} one {# результат} few {# результата} many {# результатов} other {# результата}}
```

| 测试数量 | 俄语 cardinal 分类 | 必须验证 |
| --- | --- | --- |
| 1、21、101 | one | 单数形式；21 不能误用 many |
| 2、4、22 | few | 少量复数形式 |
| 0、5、11、12、14、25、111 | many | 11–14 的例外；显式 =0 优先 |
| 1.5 | other | 编译及格式化保留合法小数分支，不向整数计数 UI 伪造小数 |

搜索数、收藏数、作品数、模板字段数及剩余输入名额分别审校整句的格变化，不能仅验证 PluralRules 返回值。实际运行预编译消息，确认客户端无需 ICU parser。沿用 `formatLocale('ru') = ru-u-nu-latn` 和 UTC 日期；注册表、HTML、hreflang 仍为 ru。验证小数逗号、分组空格及月份词形，Node 与三种浏览器可见文本一致且无 hydration 错误。

### 5.3 说明、媒体和模板

每份 MDX 翻译 title、description、正文及源文件已有的 seoTitle/seoDescription、合集 reasons；保留章节、内部内容 ID、Figure 资源引用与 Callout 结构。共享字段按报告补齐 alt/caption、标注 note、输入图片说明、字段 label/help、选项显示标签、示例 notes 和 taxonomy 标签/别名。

图片说明须核对实际资产，记录 asset ID、文件哈希、核验范围和结论；GIF 的动作及循环描述需要动画或足以证明描述的逐帧证据。同资产哈希、同事实范围的既有媒体证据可复用，俄语措辞单独审校。不能从 Prompt、文件名或其他语言译文直接推断画面内容。

模板显示标签可翻译，枚举实际值、默认值和用户输入不自动翻译。页面为俄语不代表复制正文为俄语，也不代表俄语生图已验证。

## 6 批次实施与审校闭环

### 6.1 范围与依赖

先保存 ru 与全语言报告，再调整策略、执行 scope dry-run，核对后 apply。建立 batch-plan，覆盖每个 item 和 field 的稳定 key、真实源语言/文件、源及目标指纹、数组 identity、依赖和所属批次。共享字段去重，依赖先就绪；相互引用的页面合入同一事务。

每批前比较新增目标、源文变化、译文变化和依赖变化。删除翻译、降为 draft、隐藏展示项或关闭其他语言不能缩小全量目标；确需移除时按通用 scope 规则保存归档或删除证据。工作区已有其他内容修改，实施只合并本批次字段，不覆盖或回退无关修改。

| 批次 | 工作内容 | 退出条件 |
| --- | --- | --- |
| R0 基础 | 术语、风格、完整 UI、全局 taxonomy、About、License | 字典及实际审校通过，基础页面与字段 current，可以开 preview |
| R1 纵向样本 | 代表内容及依赖、搜索用例、模板和媒体操作 | import → 审校 → promote → 预览操作闭环可用，冻结检索用例 |
| R2 全量说明 | 其余模板、Prompt、媒体、输入要求和运行 notes | 逐批 current；原 Prompt、用户值和生成事实保留 |
| R3 聚合与收口 | 合集/专题、推荐理由、首页和 showcase 依赖、源变更补译 | 全量 strict ready，展示集合不因缺译被人为削减 |

R1 至少包括 `p_005`、`p_012`、`p_111`、`p_115`、`p_151`、`p_217`、`p_224`、`p_290`，以及 `t_001`、`t_002`、`t_017`、`c_001`、`c_002`、`topic/style/ink`、`topic/category/poster`，并纳入实施时 `home.featured` 和列表 showcase 的实际展示项。它们覆盖中英文源文、人物及产品、多个参考输入、其他语言正文变体、GIF、模板编辑和聚合页。

样本须连同报告依赖和实际内容引用一起就绪；合集至少两个可见成员、专题至少三个 Prompt。若某 key 已按 scope 规则正式移除，以同类真实条目替换并记原因。一个内容批次建议不超过 20 份 MDX 或 100 个共享字段，以可完整审校为界；依赖闭包及 UI 完整性优先于建议批量。试点不是首发范围。

### 6.2 批次输入与操作

沿用 batchSchema v1：顶层 `schemaVersion: 1`、`locale: ru`、`operations`。每个 operation 包含 key、sourceField、targetField、expectedSourceHash、expectedTargetHash、translation；数组字段还必须带 expectedIdentity。

| 操作 | 输入来源 |
| --- | --- |
| 页面 | key 取 item.key；两个 Field 均为 `["$page"]`；源指纹用完整 item.sourceFingerprint，目标用 item.targetHash |
| 页面译文 | `{title, description, body}`，源文件存在时加 seoTitle、seoDescription、reasons |
| 共享字段 | 完全采用报告 field 的 key/sourceField/targetField/sourceHash/targetHash；数组 identity 取 field.identity |
| 缺失目标 | 明确 `expectedTargetHash: null`，不能省略 |
| UI 消息 | 不在 importer 支持范围，按第 5.2 节直接维护 |

frontmatter 的短 sourceHash 不等同完整 prose 指纹，不可混用。输入来自当批最新报告，不手写推测路径或沿用过期哈希。下列命令在文件准备后执行；`RU_BATCH_ID` 设为 import 返回的真实 64 位十六进制 ID：

```sh
npm run locale:import -- --locale ru --file production/localization/ru/batches/r1.json
npm run locale:import -- --locale ru --file production/localization/ru/batches/r1.json --apply

# 检查 manifest 和候选，完成下节审校后再执行 promote。
npm run locale:promote -- --locale ru --batch "$RU_BATCH_ID" --reviews production/localization/ru/batches/r1-reviews.json
npm run locale:promote -- --locale ru --batch "$RU_BATCH_ID" --reviews production/localization/ru/batches/r1-reviews.json --apply
npm run --silent locale:check -- --locale ru --json
```

import 可能写入 draft，也可能因涉及已发布消费者而整批 pending；读取 manifest 的 `mode`，不假定候选已进入源树。pending 的媒体/交互预览在隔离副本中进行，证据绑定候选哈希，不以旧源树截图证明候选正确。

### 6.3 审校与异常路径

逐项比较真实源文和候选，检查完整语义、俄语术语/格变化、SEO、链接、输入约束、媒体事实和保留字段。reviewSchema v1 顶层包含 schemaVersion、locale、records；每条记录包含 key、完整 sourceHash、候选 targetHash、实际 reviewer、带时区的 completedAt、conclusion，必要时加 reason。conclusion 为 approved 或 changes-requested。候选 targetHash 对照 manifest 的 candidateHash，不能取源树旧目标哈希。

翻译生成不等于审校。允许如实记录 AI 审校，reviewer 必须明确标为 AI；不声称母语人士或人工参与。保留原文的模型/品牌名称须有精确字段理由，不能目录级豁免。文字、媒体和实际浏览器操作分别记录证据；没有通过的项不自动批量批准。

| 情况 | 处理方式 |
| --- | --- |
| 源/目标指纹、数组 owner 或生命周期冲突 | 保留当前修改，重新取报告、生成批次并审校 |
| 审校中修改候选 | 重新 import 建立新计划及 batch ID，旧批准不能套用 |
| 缺依赖或 enabled 语言门禁失败 | 补依赖、修复真实问题后重试，不降低 coverage/review |
| 应用中途失败 | 确认事务恢复原状；不手工留下半批 published 内容 |
| 换机器缺 manifest | 用保存的原始 batch 重建；遗留候选仅按现有 `--migrate` 合同处理 |
| 同批重复应用 | 应为 no-op；不重复写审校或产生内容漂移 |

## 7 俄语搜索合同

### 7.1 字符归一化与高亮

规则放在构建器和 Worker 共用的 tokenize.ts；仅对 ru 增加必要分支，保持其他语言的已验证语义。先以原文确定 UTF-16 spans，再归一化 term，禁止用归一化字符串的偏移切原文。

| 输入 | 必须结果 |
| --- | --- |
| `съёмка`、`съемка`、`СЪЁМКА`、含 `е\u0308` 的分解形式 | 同一检索形式；显示和复制保留原来的 ё |
| `й`、`и\u0306`、`Й` | 都归一为 й；不能变为 и |
| `май` / `маи`，`и` / `й` | 不同词项；短词精确 fixture 不能互相召回 |
| `по́ртрет` / `портрет` | 可忽略附加的重音符；高亮包括原组合字符 |
| `объект` / `обьект` | 不折叠硬音符与软音符；长词的现有模糊匹配不等同归一化 |
| 拉丁 `a` / 西里尔 `а`、拉丁 `c` / 西里尔 `с` | 不做视觉同形字替换；模型名和 ID 保持可检索 |
| `научно-фантастический` / `научно фантастический` | 按词组合等价；连字符、破折号、两类不换行空格作为分隔符 |
| `GPT Image p_111`、`p_217` | 仍能命中指定稳定 ID，不对 ID 或模型名做俄语词干处理 |

实现可在 NFD 折叠时保留俄语 `и + U+0306` 并重组为 й，同时允许 `е + U+0308` 折叠为 е；不使用“去掉全部西里尔变音符”作为俄语规则。将 NFC/NFD、大写及 emoji 前缀下的原文 spans 都纳入测试。语义别名命中而可见文本没有同词时允许无高亮，不能高亮无关字符。

### 7.2 词形与专业别名

首版采用有限词形组，放入现有 profiles.ts 或 taxonomy aliases；不引入全俄语词典、自动词尾截断、全局停用词表、自动音译或错键盘布局纠正。词形表由 glossary 维护，以真实语料和冻结用例为范围。

| 概念 | 至少覆盖的形式/别名 |
| --- | --- |
| 人像 | портрет、портрета、портреты、портретов、portrait |
| 霓虹 | неоновый、неоновая、неоновое、неоновой、неонового、неоновым、неоновые、neon |
| 模板 | шаблон、шаблона、шаблоны、шаблонов、template |
| 海报 | постер、постера、постеры、постеров、плакат、плакаты、poster |
| 贴纸 | стикер、стикеры、наклейка、наклейки、sticker |
| 产品摄影 | предметная съёмка、предметной съёмки、предметную съёмку、съёмка товаров、packshot、product photography |
| 照明 | освещение、освещения、lighting |
| 摄影棚 | студия、студии、студийный、студийная、студийное、studio |

按实际句子补充其他明确词形，不能宣称覆盖任意屈折词。类别别名使用 промпт、шаблон、подборка、тема 及明确复数形式。多词触发要求连续短语；不能因文章分别出现“предмет”和“съёмка”就添加产品摄影别名。产品摄影可扩展到通用摄影，反向不成立；也不能让独立 `модель` 自动等于模板或人像。

保留现有 AND 查询和字段权重，别名使用现有低权重 aliases 字段，不向查询追加多个必须同时命中的同义词。原词命中优先于别名。分析器从实施时最新版本递增（本次基线为 6），全部 built locale 索引重新生成；Node、序列化后引擎、实际 Worker 一致，旧 analyzerVersion/buildId 走 stale 恢复。

### 7.3 冻结验收用例

R1 翻译语义通过后、搜索调优前，提交 search-cases.json，格式为 `{schemaVersion: 1, locale: "ru", cases: [...]}`；每例包含 query、expectedKeys、topK、reason，可选 excludedKeys、expectedTotal。topK 固定为各实际展示类型分组前 5 项，不是全局前 5。无结果用例必须 `expectedTotal: 0` 并断言总数/空态，不能只对空 expectedKeys 循环。

以下查询与已核对源内容对应；同一行的不同查询各占一例，俄语用词在 R1 审校时校正并留原因，调优后不删难例或扩大 topK：

| 查询 | expectedKeys |
| --- | --- |
| `неоновый портрет`、`НЕОНОВЫЙ ПОРТРЕТ`、NFD 形式、`неонового портрета`、`neon portrait` | `prompt/p_005` |
| `портрет обложка` | `prompt/p_111` |
| `свадьба два человека` | `prompt/p_115` |
| `предметная съёмка студия`、`предметная съемка студия`、NFD 形式、`предметной съёмки студия`、`packshot studio` | `prompt/p_151` |
| `постер Фудзи`、`плакат Фудзи` | `prompt/p_290` |
| `шаблон постера`、`шаблоны постеров` | `template/t_001` |
| `шаблон тушь` | `template/t_002` |
| `обезьяна фонарь` | `prompt/p_224` |
| `GPT Image p_111`、`p_217` | 分别为 `prompt/p_111`、`prompt/p_217` |
| `подборка постеров` | `collection/c_001` |
| `тема тушь` | `topic/style/ink` |

至少 24 个冻结查询；在上述场景外加入明确无结果、相关标签提示和负例。用独立 fixture 证明“普通人像只含通用摄影”不会获得 packshot 别名，并验证真实结果的 excludedKeys。`й/и` 和同形字区别用短词 fixture 排除模糊匹配干扰；不为了字符测试给真实文章制造内容。

所有冻结用例在全量译文完成后重新运行，避免小试点通过却在完整语料中排名退化。序列化引擎与真实 Worker 均检查 expectedKeys、excludedKeys、topK、expectedTotal；快速搜索和独立搜索页共用规则。保留其他语言的冻结用例，记录各受影响索引的 gzip 变化。

## 8 页面、输入与西里尔排版

### 8.1 交互验收

- 首页/列表进入详情弹层，前后切换、Esc 关闭、刷新成整页、返回恢复位置，URL 和内容身份一致。
- 搜索和筛选显示俄语结果及分类；键盘导航、加载失败、重试、空态和旧索引提示均可操作。
- 在 `t_001` 输入 `настольная лампа «Тёплый свет» № 2`，验证 `ё/й`、引号、№、数字及换行在编辑、草稿恢复、分享、复制和 UTF-8 下载中保留；切换 UI 语言不自动翻译或重置输入。
- 用 `p_012` 验证中文原 Prompt，用 `p_217` 验证其他语言正文变体不会冒充俄语；详情、弹层、快捷复制、下载和外部导出选择相同实际正文。
- 多参考输入标签、图片放大、GIF 播放、收藏/取消/撤销及重新打开正确；来源和测试状态不因翻译升级。
- 语言菜单显示 `Русский`，同资源切换保留稳定身份；浏览器偏好仅建议，俄语输入不改变根首页语言。

HTML 页面使用 ru/ltr，说明块按 contentLocale、Prompt 块按 promptLanguage 标注实际 lang/dir。预览回退内容不得标成俄语译文；正式全量验收不能用 fallback 充数。

### 8.2 俄语键盘

俄语键盘的 K 物理键通常产生 `л`。搜索组合键保留现有字符 `k` 行为，并增加 `code === 'KeyK'` 的物理键兼容，要求 Ctrl 或 Meta，排除 Alt、Shift、composition、keyCode 229、repeat、defaultPrevented。沿用现有组合键在输入框也可打开搜索的行为，不能将普通 `л` 输入拦截为搜索。

单键 C/S 继续按实际拉丁字符匹配和单键偏好开关执行；不把西里尔 `с`（形似 C）当作复制，也不把任意俄语字母映射为收藏。俄语快捷键说明须写清 C/S 为拉丁字母，页面按钮始终可用。`/`、`?`、方向键和 Esc 按实际字符/键义工作。增加 key/code 不同、正在输入、输入法合成及关闭单键偏好的正负例；模拟 KeyboardEvent 的结果不冒充已完成操作系统真实布局验收。

### 8.3 字体与布局

Chromium、Firefox、WebKit 覆盖 360、768、1024、1440 CSS px 和明暗主题。检查 `Добавить в избранное`、长字段、复数计数及窄屏过滤面板，无页面横向溢出、关键文案裁切、重叠或不可见焦点，axe 无 serious/critical 问题。

以 `Ёё Йй Ъъ Ьь Ыы № «»`、组合重音、粗体标题和等宽元数据检查已有本地字体的实际字形及字重，不以文件存在作为字体通过证据。记录 `document.fonts`、请求与截图，检查切换字体时位移；优先复用现有 unicode-range，不默认增加远程字体或全局 preload。

英语页面因语言菜单显示 Русский 而按需加载西里尔子集，应与基线对照记录，不将其误判为整个俄语字典或字体包泄漏；普通页面不得无条件预载俄语搜索索引。至少验证 Chromium 原生 200% 缩放，其余浏览器测试 720 CSS px 重排并如实标注方法。浏览器控制台无 hydration 错误及未捕获异常。

## 9 SEO、机器可读输出与搜索引擎

| 输出 | 必须满足 |
| --- | --- |
| HTML | `lang="ru" dir="ltr"`，俄语 title/description，自身规范 canonical |
| hreflang | 使用 `ru`，只关联真实 indexable 版本，包含自身且互相返回；x-default 沿用默认语言规则 |
| Open Graph | 复用现有 `ru_RU`，不因此把 URL 或 hreflang 改成 ru-RU |
| sitemap、index.md、llms.txt、JSON/Markdown 外部导出 | 只包含 indexable 集合；文本/链接与页面一致，不发布预览或回退说明 |
| JSON-LD | 页面说明与实际 Prompt 的语言分别正确，模型、来源、许可和运行事实保留 |
| 首页、列表分页、合集、专题 | 以实际展示成员判断收录资格，不隐藏或重排条目规避完整覆盖 |
| 搜索、探索、收藏、错误页 | 保留已有 noindex；可浏览集合仍服务搜索、弹层和收藏 |
| 预览与未启用状态 | preview 所有页面 noindex；ru disabled 的 production 无俄语路由/导航/收录/外部导出 |

origin、basePath、尾斜杠和路径均由 URL 模块生成。根路径生产与 `/prompt-seen` 子路径生产分别验收；preview 的 noindex 结果不能替代生产 SEO 验证。正式域名无残留平台 noindex header。

上线后按运维手册完成 Yandex Webmaster 验证：使用既有 `searchEngines.verification.yandex`，提交真实站点 sitemap；复用既有 IndexNow 发布流程，不新建俄语提交器。账号/验证令牌未就绪时在发布记录中标为外部待办，不伪造已验证或已提交；网站技术上线与搜索引擎收录分开记录，不承诺收录时间。

## 10 实施阶段、责任与退出条件

责任表示工作角色，可以由同一维护者承担；审校记录必须写实际执行者。每阶段提交可独立审阅，依赖顺序为 P0 → P1 → P2 → P3 → P4 → P5。

| 阶段 | 主要责任与工作 | 退出条件 |
| --- | --- | --- |
| P0 范围与策略 | 工程/内容：新报告、ru 策略、scope、术语、batch-plan；保存未启用生产基线 | 每个目标及字段有来源/依赖/批次；其他语言策略不退化；未启用输出断言通过 |
| P1 基础预览 | 翻译/审校：R0；工程：整套字典、格式用例、Storybook 样本及 preview | UI 和基础页 current，ICU 编译/数量测试通过，预览可构建且 noindex |
| P2 纵向与俄语工程 | R1；冻结搜索用例；归一化、别名、键盘及字体验证 | 样本全流程可操作；字符正负例、序列化查询、真实 Worker 通过 |
| P3 全量收口 | 内容/审校：R2/R3，源变化复审，媒体证据，完整语料搜索回归 | ru strict ready，目标/字段全 current、indexable 完整、fallback 为 0 |
| P4 生产候选 | 工程/QA：隔离候选启用 ru，运行构建矩阵、HTTP/浏览器和成本检查 | 同一候选提交全部门禁通过，证据绑定配置、产物和 build ID |
| P5 发布与维护 | 发布维护者：既有部署、live 检查、回滚记录及站长工具待办 | 实际部署提交/build ID 一致，俄语路由/搜索/输出通过线上检查 |

R2 翻译准备可以与 P2 工程重叠，但 published 变更都经过同一事务和审校流程。阻塞项在 implementation-status 中标明具体 key、原因及下一步，不以刷新哈希、降低策略或“已翻译比例”代替退出条件。

## 11 检查命令与验收矩阵

### 11.1 准备及每批

```sh
npm run --silent locale:check -- --locale ru --json
npm run --silent locale:check -- --all --json
npm run locale:scope -- --locale ru
# 核对差异后才写入 scope。
npm run locale:scope -- --locale ru --apply
npm run content:validate
```

保存报告前检查命令退出码；`--locale` 与 `--all` 互斥，参数错误为 2，校验/strict 未就绪为 1。scope apply 不是每次检查的必要写入。建立 ru 准备目录后，`--all` 会自动包含 ru；它也包含未 ready 的 ar 预览语言，因此不能用 `--all --strict` 作为启用语言门禁。对候选的所有 enabled 语言按其当前策略逐个检查 strict，并另外显式检查 ru。

### 11.2 候选检查

```sh
npm run locale:check -- --locale ru --strict
npm run --silent locale:check -- --all --json
npm run content:validate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run tokens:check
npm run storybook:build
```

使用仓库既有测试验证范围、指纹、导入和事务；仅为俄语新增行为或发现的缺口增加用例，不复制一套只换 locale 名称的通用工具测试。

| 验收编号 | 动作/输入 | 必须结果 |
| --- | --- | --- |
| RU01 | ru disabled 的生产构建；ru preview 的预览构建 | 前者无 ru 输出，后者可浏览且 noindex，外部输出不泄漏草稿 |
| RU02 | 候选缺一份说明、必需字段或有效审校；源/目标发生变化 | strict/build 拒绝；补译或真实复审后才恢复 |
| RU03 | ё/е、й/и、NFD、重音、同形字和短词负例 | 第 7.1 节成立，高亮原文完整 |
| RU04 | 冻结搜索集、别名负例、旧索引 | 全量引擎/Worker 都通过；旧版本 stale，不静默混用 |
| RU05 | 数量矩阵、日期及格式 | 真实消息格变化正确，三引擎无 hydration 错误 |
| RU06 | 俄语输入、KeyK、单键关闭与 composition | 输入不受干扰，组合键有效，键盘焦点正确 |
| RU07 | 模板切语言、保存/分享/复制/下载；中英文原 Prompt | 用户值与实际 Prompt 一致，语言标记准确，生成事实不变 |
| RU08 | 字体、全部宽度/主题、缩放、axe | 无缺字/裁切/页面溢出/严重无障碍问题，证据说明验证方法 |
| RU09 | HTML/SEO/Markdown/导出/分页及子路径 | 集合、文本和规范地址一致，无错误收录或 404 |
| RU10 | 源/目标冲突、候选改动、重复应用、事务失败 | 拒绝过期批准、无部分写入、幂等；既有语言仍可发布 |
| RU11 | 所有 enabled 语言回归、搜索与资源加载成本 | 不降低策略，冻结用例通过，无新增无解释预算超限 |
| RU12 | 部署、live 验证及回滚 | 实际 build ID 对应验收版本；整套静态产物可回退 |

### 11.3 构建矩阵

先在 `ru.enabled: false` 的生产构建及 `ru.preview: true` 的预览构建中完成 RU01。P4 的候选启用 ru 后，使用与发布相同的 SITE_ORIGIN/urlPattern 配置，依次构建并立即测试对应 dist，再生成下一份；不能并发覆盖同一 checkout 的 `.next`、generated 或 dist：

```sh
BASE_PATH= BUILD_MODE=production npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=production npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1
```

前置条件为 Node >=24、已安装依赖、Playwright 三种浏览器和可用的参考 nginx/Docker。测试读取产物 build.json，而非 next dev。现有 CI 的 root production + subpath preview 不能覆盖 subpath production，后者必须显式补验。俄语已在产物内时，俄语验收组不能因错误检测而整组 skip；记录重试、失败和有理由的跳过。

对比同一源树、相同配置下启用前后的构建时间、文件数、HTML/JSON 大小、各受影响索引原始/gzip 大小及英语/俄语首页、列表、模板首屏 JS/字体请求。遵守总体设计 §16.1 和 [first-load-js](first-load-js.md) 的预算及已记录例外，不新增整包语言字典、审校数据或所有语言索引加载。翻译成本增长与运行时资源增长分别记录。

### 11.4 完成条件

- [ ] ru 策略为 complete/fingerprint/source-only，scope 对应最新公开目标，移除有证据。
- [ ] `ready: true`、`blocking: false`；localCurrent 和 indexable 等于 target，fieldsCurrent 等于 fieldsTotal；missing/draft/outdated/unreviewed/invalid/archived/fallback 均为 0。
- [ ] 每项当前指纹都有真实审校；文字、媒体及交互证据可追溯，AI/人工身份准确。
- [ ] RU01–RU11、完整语料搜索及所有 enabled 语言回归通过，原 Prompt/模板值/生成事实不变。
- [ ] root/subpath 生产、subpath 预览的实际产物通过验收，证据关联同一候选提交及各配置 build ID。
- [ ] RU12 完成，正式站实际版本和回滚目标已记录；外部站长工具未完成事项明确列出。

## 12 发布、回滚与持续维护

使用现有 `.github/workflows/deploy.yml`；部署后运行 `check:live --expect-build`，核对 `/ru/`、代表 Prompt/模板、列表第二页、俄语搜索 index、sitemap、Markdown、canonical/hreflang 及复制正文。平台地址使用既有 `--platform` 检查，正式域名验证没有意外 noindex。

production-acceptance.json 至少记录验收时间、release commit、sourceRevision、scope/policy 指纹、启用语言、各矩阵的配置/build ID/结果/证据位置、索引版本与成本、实际线上检查和上一成功部署。发布状态与翻译完成状态分开；自动检查不证明搜索引擎已收录或真实用户满意。

主要路由不可用、复制正文错误、搜索版本不匹配或收录输出错误时，使用现有 rollback 工作流恢复上一份成功静态部署，并检查恢复后的 build ID。HTML、Worker、generated JSON、索引和字体资源作为完整产物回退，保留失败版本证据；同步修复触发问题的提交，避免下次部署再次发布错误版本。长期撤下 ru 通过配置变更和全量构建处理，不直接编辑线上文件。

后续维护执行“报告变化 → 翻译/复审 → promote → 所有 enabled 语言门禁 → 构建验收 → 发布”。新内容先准备候选；俄语缺译、过期或待审校时不降低 complete/fingerprint/source-only。发布后按语言观察站内无结果查询、复制/模板使用及可取得的搜索曝光，在 6–8 周复盘词形别名与内容需求；这是观察窗口，不是收录承诺。
