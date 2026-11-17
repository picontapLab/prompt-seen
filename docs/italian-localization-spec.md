# 意大利语接入实施规格

状态：独立 worktree 已完成全量译文、指纹审校及搜索实现；候选启用，产物验收中，尚未部署。日期：2026-11-17（America/Los_Angeles）。工程基线：`53cbc8efce854f8f067acef8372daf49be82f9c3`。

实现分支：`codex/italian-localization`。本地化证据位于 `production/localization/it/`。严格检查已达到 381 个 current 页面、2,220 个 current 字段和零回退；实际部署与最终验收以该目录的验收记录为准。下文第 2 节保留开工时的历史基线。

交付可用意大利语浏览、搜索、理解参考输入和操作模板的完整站点。首发采用 `complete/fingerprint/source-only`：分批翻译和审校，在预览环境验证，全部公开目标就绪后启用 `/it/`。界面与内容说明使用意大利语，可复制的 Prompt 保留条目的原始正文及实际语言。

本文细化[语言覆盖计划](language-coverage-assessment.md)中的第二批意大利语接入，沿用[通用本地化流程](localization-workflow.md)、[通用规格](general-localization-spec.md)、[正文多语言设计](multilingual-prompt-design.md)和[工程约定](engineering-conventions.md)。早期文档的语言启用清单可能落后于注册表，以实际配置、源树和新报告为准。覆盖计划中的纵向样本用于准备期验证；意大利语正式首发执行本文的全量门禁。

实施任务见第 9 节，批次操作见第 6 节，候选验收命令见第 10 节。下文定义交付要求；当前实现与验收状态见文首及第 10.4 节，候选分支启用不表示已部署。

## 1 范围与固定决策

| 项目 | 本次决定 |
| --- | --- |
| 语言身份 | `code: it`、`pathPrefix: it`、`nativeName: Italiano`、`htmlLang: it`、`direction: ltr` |
| 编辑规范 | 标准书面意大利语，简洁直接，以第二人称单数指导操作；首发不拆 `it-IT`、`it-CH` 地区页面 |
| 发布策略 | 完整覆盖、当前指纹审校、原始 Prompt 正文；继承所有已启用语言的发布门禁 |
| 内容范围 | UI、全部公开内容说明及 SEO、共享解释字段、taxonomy、专业检索别名、About、License |
| 地址 | 保留稳定 ID、现有 slug、默认英语根首页及 `/en/` 首页别名规则；URL 统一经 URL 模块生成 |
| 浏览器偏好 | `it`、`it-IT`、`it-CH` 在当前构建包含意大利语时建议 `it`；不依据浏览器或 IP 自动跳转 |
| 部署 | 沿用 Next.js 静态导出及现有 CI、部署和回滚流程 |

本轮不新增 `prompt-locales/it/` 正文变体、生图任务、在线翻译服务、地区内容副本或翻译状态横幅。原文恰为意大利语时正常使用原文；若开工时发现意大利语正文变体，报告与 `source-only` 的冲突，明确处置后继续，不静默删除。

“全量”是当前公开目标与保留的 scope 历史，不要求翻译未公开草稿或恢复归档内容。新增公开内容也必须满足意大利语完整覆盖要求。模型名称、精确版本是否已知、生成参数、输入顺序、版权与许可、原始 Prompt 哈希、模板变量 ID/默认值/枚举值/约束、资产字节均保持原有事实。

## 2 已核对基线与工程缺口

2026-11-17 实际运行 `npm run --silent locale:check -- --locale it --json`，报告 schemaVersion 2，`evaluationMode: candidate-production`、`ready: false`、`blocking: false`。当前策略仍是 `incremental/fingerprint/optional`，`enabled: false`，未设置 preview；意大利语字典、译文和准备目录尚不存在。普通检查退出 0 只说明检查完成，不能据此启用语言。

| 内容类型 | 目标数 | 意大利语完成数 |
| --- | ---: | ---: |
| Prompt 说明 | 285 | 0 |
| 模板说明 | 75 | 0 |
| 合集说明 | 16 | 0 |
| 专题说明 | 3 | 0 |
| About、License | 2 | 0 |
| 内容说明合计 | 381 | 0 |
| UI 消息 | 427，分布于 14 个命名空间 | 0 |
| 共享解释字段 | 1,793 | 0 |

`fieldsTotal: 2220` 已包含 427 条消息；共享字段为 Prompt 882、媒体 363、模板 308、示例 206、taxonomy 34，按真实文件与字段去重。内容说明源语言为英语 371 份、简体中文 10 份，不能一律从英语或另一份欧洲语言译文转译。报告的 379 个 `visible/fallback` 是候选模式可回退浏览的内容库条目；两个独立页面不回退。`localCurrent`、`indexable` 均为 0，正式构建尚不包含 `/it/`。

本次只读报告标识：

```text
sourceRevision: 53cbc8efce854f8f067acef8372daf49be82f9c3:42b3ebba0afe616448e6581ffbb5e516dcb6a47b48d55f8dfa4f3c64ea709105
scopeFingerprint: sha256:ce69610862a5337435465b876b191198ae06aab4408ff75e6f5839e3b963bd86
policyFingerprint: sha256:dcedc10f1845b90bbf4acfe68b922f6a9d9b88c80589fe6e6b60726e40b1392a
```

数量用于估算，测试不得写死。改变策略、开工、每批 promote 前和最终验收都重新取报告。`sourceRevision` 包括实际源树指纹，不能只记 HEAD；工作区已有其他内容修改，实施不得回退或覆盖。

同次 `--all --json` 检查中，已启用的 `en`、`zh-Hans`、`es`、`pt-BR`、`ja`、`ko`、`de` 均 ready。五个 complete 语言各有 381 个 current 目标和 2,220 个 current 字段；简体中文沿用 incremental 策略，其既有缺译与回退作为基线记录。仅供预览的 `ar` 尚未 ready 且不 blocking，不能使用 `--all --strict` 将其完整翻译变成意大利语上线前置任务。

| 已有能力 | 本轮处理 |
| --- | --- |
| 通用 check/scope/import/promote、事务恢复和指纹门禁 | 直接复用，不新增意大利语 CLI 或发布判定器 |
| 注册表路由、字典按需加载、`formatLocale`、浏览器区域标签匹配 | 补字典和用例，优先不改通用行为 |
| `src/modules/seo/build.ts` 已有 `it: 'it_IT'` | 验证产物，URL 与 hreflang 仍使用 it |
| 搜索已有拉丁重音折叠和原文 spans | 复用；补意大利语省音前缀与受控领域别名 |
| 本地字体已有 Latin/Latin Extended 子集 | 验证实际字形、字重与加载，不默认引入新字体 |
| CI 已构建 root production、subpath preview | 增加候选 subpath production 验收及明确的意大利语存在性断言 |

## 3 注册表与阶段状态

准备阶段修改现有 `it` 项，不新增重复 locale：

```yaml
- code: it
  pathPrefix: it
  nativeName: Italiano
  htmlLang: it
  direction: ltr
  enabled: false
  preview: false
  phase: 2
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

| 阶段 | enabled | preview | 进入条件和产物行为 |
| --- | --- | --- | --- |
| 准备 | false | false | 保存策略前后报告、scope、术语及批次清单；生产无意大利语路由 |
| 基础预览 | false | true | 完整 UI、全局 taxonomy、About、License 已审校；可浏览其余草稿/回退，预览全站 noindex |
| 生产候选 | true | true | 在不触发部署的候选分支或独立检出目录启用；全部目标严格检查通过后构建验收 |
| 正式发布 | true | true | 同一候选通过门禁并进入既有部署流程；核验实际 deployment/build ID |

`locale:promote` 仅发布所选译文与审校记录，不启用 locale，也不部署。disabled 的 complete 语言允许逐批 promote，不要求第一批就全量 ready；每批仍须满足被发布条目的依赖及所有 enabled 语言门禁。预览构建也不会绕过已启用语言的 complete 检查。

## 4 文件改动与交付物

| 文件或目录 | 实施内容 |
| --- | --- |
| `content/locales.yaml` | 修改 it 策略并按第 3 节切换状态 |
| `src/i18n/messages/it/*.json` | 全部命名空间、叶子键、ICU 参数及标签 |
| 报告 `items[].targetFile` 指定的 `locales/it.mdx` | Prompt、模板、合集、专题、独立页的说明和 SEO |
| 报告 `fields[]` 指定的共享 YAML | 仅合并意大利语解释字段、标签与必要别名 |
| `src/modules/search/tokenize.ts`、`profiles.ts`、`types.ts` | 省音、领域别名、短语防误召回及分析器版本更新 |
| `src/modules/search/tokenize.test.ts`、`engine.test.ts` | 字符、spans、别名与负例；不依赖模糊搜索碰巧通过 |
| 新增 `scripts/lib/localization/italian-search.test.ts` | 冻结真实语料检索，序列化再加载后的引擎验收 |
| `src/i18n/catalog.test.ts`、`format-locale.test.ts`、`src/ui/pages/language-match.test.ts` | ICU 编译一致性、复数、数字日期和语言建议 |
| 新增 `tests/e2e/italian.http.spec.ts`、`italian.browser.spec.ts`、`tests/e2e/support/italian.ts` | 状态、SEO、真实 Worker、交互和排版；HTTP/浏览器共用状态断言 |
| `tests/support/localization-search.ts` | 复用现有 case 类型和 `searchRecord`；需要时共享完整结果负例断言 |
| `.github/workflows/ci.yml` | 候选及启用后显式要求 it 存在，留存报告与验收产物 |
| `README.md`、`docs/localization-workflow.md`、总体设计 §8 | 实施完成时同步实际状态与维护合同 |

准备目录在实施时创建，以下文件不是本次已完成的翻译或验收证据：

```text
production/localization/it/
  scope.json                    # locale:scope 写入的 v2 快照
  reviews.json                  # reviewSchema v1，当前指纹对应的真实审校
  batch-plan.json               # v1 台账，目标唯一归属、依赖和执行状态
  glossary.yaml
  style-guide.md
  batches/                      # 原始 import 输入、逐批审校输入，可重建 manifest
  search-cases.json              # v1，冻结查询、稳定 key、topK 和负例
  review-evidence.md             # 文字、媒体、交互实际核验范围
  preservation-audit.json        # 正文、事实、资产和约束前后对照
  evidence/baseline/
  evidence/{candidate}/          # 配置、日志、截图、指标或 CI artifact 索引
  production-acceptance.json     # 候选与线上核验结果，未执行项保持 pending

.artifacts/localization/it/
  pending/{batchId}/             # importer 维护的候选和 manifest
  transactions/                 # 工具事务记录
```

原始批次和证据索引应可跨机器恢复，不以 `.artifacts/` 作为唯一存档。审校人、审校记录和候选路径不得进入 public/generated 或客户端包。若要改动 Next.js 路由、渲染或字体代码，先阅读本仓库 `node_modules/next/dist/docs/` 对应指南；当前 16.4.2 的 `01-app/02-guides/static-exports.md` 不支持以 Proxy、Cookie 或请求时重定向实现此静态站的语言选择。

## 5 意大利语文本与数据合同

### 5.1 术语和编辑规范

以下是首批采用的术语，译审在 `glossary.yaml` 中记录适用语境；调整时同步 UI、说明和搜索别名。

| 概念 | 意大利语 | 使用规则 |
| --- | --- | --- |
| Prompt | prompt | 外来词单复数不变，首次需要时解释为模型指令 |
| Template | modello di prompt | 紧凑导航可用 Modelli；AI 模型明确写 modello di IA |
| Collection / Topic | raccolta / tema | 不与模板或 taxonomy 分类混用 |
| Reference image / Output image | immagine di riferimento / immagine generata | 区分用户输入和生成结果 |
| Copy / Download / Reset | Copia / Scarica / Reimposta | 操作按钮用祈使式，状态分别写 Copiato 等 |
| Save to favorites | Aggiungi ai preferiti | 已收藏、移除、撤销分别给出准确文案 |
| Product photography | fotografia di prodotto | 可维护 foto di prodotto、packshot 等等义检索词 |
| Portrait / Poster / Sticker | ritratto / poster / adesivo | ritratto、adesivo 有复数；poster、prompt、layout 不加英语复数尾缀 |
| Lighting / Background | illuminazione / sfondo | 作为领域词统一使用 |
| Not verified | non verificato | 不能把观察或无匹配运行记录升级为已验证 |

正文采用句首大写；保留 `à è é ì ò ù` 及其大写，尤其 `È` 不能写成 `E'`，`perché` 与 `è` 的重音不能混用。自然语言省音使用 `’`，如 `l’immagine`、`un’immagine`、`dell’illuminazione`；书写 `un’immagine` 与 `un esempio` 要符合性别和省音规则。代码、URL、占位符、用户输入和 Prompt 不做智能标点替换。法语式冒号/问号前空格不用于意大利语；引号统一用 `«…»`，内部不添加法式空格。

避免从中英文片段拼接出意大利语句子；带名词的计数和错误提示按整句翻译。来源不确定性、输入限制、未经测试的改写、GIF 合成方式和模型版本未知等含义必须保留。About、License 不新增法律承诺，许可代码和品牌名称保持原样。

### 5.2 UI、ICU 与格式化

当前命名空间为 `common`、`detail`、`explore`、`favorites`、`feed`、`geo`、`home`、`pages`、`popup`、`primitives`、`search`、`shell`、`shortcuts`、`templates`；以实施时英语字典为准。逐键对齐命名空间、叶子键、参数、rich-text 标签和语义，不以复制英语占位来通过完整性检查。

`validateBuildMessages` 会检查字典目录已存在但语言尚未启用的情况，因此先在准备目录完成并检查整套字典，再一次性移入 `src/i18n/messages/it/`。UI 不经过 `locale:import`；直接维护 JSON，并按报告中的消息 key/sourceHash/targetHash 将真实审校合入 `reviews.json`，保留已有记录。

计数使用 ICU，例如 `search.count`：

```text
{count, plural, =0 {Nessun risultato} one {# risultato} many {# risultati} other {# risultati}}
```

意大利语 cardinal 不采用“末位为 1 就单数”的规则：`0→other`、`1→one`、`2/21/1.5→other`。本次 Node ICU 78.3 对 `1000000` 返回 `many`；计数文案的 many 和 other 均须使用正确复数。不得只测试 1/3/12，也不自行实现复数算法；补 0、1、2、21、1.5、1,000,000 的编译器与运行时比较，并验证真实浏览器显示一致。

继续通过 `formatLocale('it')` 得到 `it-u-nu-latn`，通过 `registryCode` 还原身份。数字 `12345.6` 显示 `12.345,6`；在 UTC 下长日期 `2026-11-17` 显示 `17 novembre 2026`。schema、JSON、CSS 和模板参数中的数值格式不改变。日期固定已有时区，禁止手工替换小数点或依赖浏览器当前时区。ICU 撇号不能吞掉 `{label}`、`{count}` 或 rich-text 标签，检查 `L’immagine «{label}»` 一类真实消息。

### 5.3 内容、媒体与模板

每个页面翻译 title、description、正文和存在的 seoTitle/seoDescription/reasons，保留 MDX 内容引用、链接目标和结构。共享字段包含 alt、输入标签与帮助、模板字段标签/描述/分组、示例 notes、标注说明、taxonomy labels/aliases 等，以报告为唯一字段清单。

模板只翻译用户可见解释；用户填写的 `caffè`、`città`、`l’immagine` 等字符串必须原样进入现有编译器。没有匹配生成记录的输出仍标为未验证。详情页、弹层、快速复制、下载、Markdown 导出使用相同实际 Prompt 语言和正文，不因页面 it 而假装正文已翻译。

图片 alt 必须核对实际资产；GIF 动作和循环描述须看动画或足以证明描述的逐帧证据。记录 asset ID、资产哈希、检查范围和结论。其他语言的媒体事实证据只有在同一资产哈希、同一事实范围下可复用，意大利语措辞仍单独审校。保留原文品牌/模型名时写精确字段理由，不能用目录级豁免覆盖整段说明。

## 6 批次实施与审校闭环

### 6.1 冻结范围和依赖

先保存 it 和全语言报告，再修改策略并重新取报告；确认差异后执行 scope dry-run/apply。创建准备目录后 `locale:check --all` 会自动包含 it。`scope.json` 保留公开意图，不能靠删除译文、改 draft 或关闭语言减少目标；正式删除/归档按现有 scope 证据合同处理。

从报告生成 `batch-plan.json`，顶层为 schemaVersion 1、locale it、sourceRevision、scopeFingerprint、policyFingerprint 和 batches。每批记录 `name`、`itemKeys`、`fieldKeys`、依赖批次、实际内容引用/成员 key、处理人角色、输入文件、import 返回的 batchId、审校输入和状态。每个页面/字段唯一归属；集合并集覆盖最新报告，不漏项、不重复计数。UI 消息也计入台账，但不放进 importer 的 operations。

| 批次 | 交付内容 | 退出条件 |
| --- | --- | --- |
| I0 基础 | 术语、完整 UI、全局 taxonomy、About、License | 基础内容审校有效、字典校验通过，可打开 preview |
| I1 纵向试点 | 代表性 Prompt、模板及依赖，验证完整操作流程 | 导入→审校→promote→浏览→搜索→编辑→复制/下载可复现 |
| I2 内容扩展 | 其余 Prompt、模板、媒体、输入说明、运行 notes | 各批 current，原始正文与事实保持一致 |
| I3 聚合与收尾 | 剩余合集、专题、推荐理由、首页与列表实际展示项 | 实际可见成员全部就绪，严格检查全量 ready |

I1 至少覆盖 `p_005`、`p_012`、`p_111`、`p_115`、`p_151`、`p_217`、`p_224`、`p_289`、`p_290`，以及 `t_001`、`t_002`、`t_017`，并走查 `c_001`、`c_002`、`topic/style/ink`。这些真实目标覆盖中文源文、人物/产品、多参考输入、中文原始 Prompt、现有其他语言正文变体、GIF、模板和聚合页。`p_289` 是罗马斗兽场合成 GIF，适合检查意大利语地名与原始生成事实没有混淆；不能据此改写模型版本或合成方式。

依赖闭包不能只用 `item.dependencies`：它主要列共享字段，尚须读取 MDX 引用、合集成员、专题筛选、`home.featured` 和列表 showcase。不能删除首页编排来降低工作量。合集至少 2 个、专题至少 3 个 Prompt 只是可浏览下限，indexable 要求全部实际可见成员就绪。依赖未齐的聚合页在 I1 保持预览，并将唯一发布归属留给 I3。

每批建议不超过 20 份 MDX 或 100 个共享字段，以可完整审校为界；UI 字典完整性优先于该建议。共享依赖先准备，互相引用的页面放同一事务；超大闭包拆成依赖批次。每批重新比对新增目标、源/目标改动、数组身份及依赖变化。

### 6.2 导入合同与命令

使用 `scripts/lib/localization/import.ts` 的 batchSchema v1：顶层仅 `schemaVersion: 1`、`locale: it`、`operations`。每个 operation 的值从当前报告取得：

| 操作 | 必填内容 |
| --- | --- |
| 页面 | key 为 item.key；sourceField/targetField 均为 `["$page"]`；expectedSourceHash 为完整 item.sourceFingerprint；expectedTargetHash 为 item.targetHash |
| 页面 translation | `{title, description, body}`，源文有可选字段时包含 seoTitle、seoDescription、reasons，不能遗漏后意外删除 |
| 共享字段 | 采用 field.key/sourceField/targetField/sourceHash/targetHash；数组字段同时传 expectedIdentity = field.identity |
| 新目标 | 明确传 expectedTargetHash: null，不得省略 |
| UI 消息 | 按第 5.2 节直接维护，importer 不支持导入 |

frontmatter 的短 sourceHash 与完整 prose 指纹用途不同，不能替代页面 operation 或审校的完整源指纹。目标文件从报告读取，不手算专题/模板目录。

下面命令在 I1 批次文件准备好后执行；`IT_BATCH_ID` 由操作人设为 import 实际返回的 64 位十六进制 batchId。命令逐条成功后继续，两个 promote 命令必须在审校完成之后执行：

```sh
npm run locale:import -- --locale it --file production/localization/it/batches/i1.json
npm run locale:import -- --locale it --file production/localization/it/batches/i1.json --apply
npm run locale:promote -- --locale it --batch "$IT_BATCH_ID" --reviews production/localization/it/batches/i1-reviews.json
npm run locale:promote -- --locale it --batch "$IT_BATCH_ID" --reviews production/localization/it/batches/i1-reviews.json --apply
npm run --silent locale:check -- --locale it --json
```

首次 import 可写入 draft，也可能因触及已发布的共享依赖而把整批存为 pending。读取输出 mode、manifest 和候选文件，不能默认译文已进源树。promote 在锁内核对源/目标、身份、生命周期和审校，合并选定字段及发布元数据，检查受影响消费者和全部 enabled 语言，再事务性写入。

### 6.3 审校与异常路径

采用 `scripts/lib/localization/check.ts` 的 reviewSchema v1：顶层 schemaVersion、locale、records；每条包含 key、完整 sourceHash、候选 targetHash、真实 reviewer、带时区的 completedAt、conclusion（approved/changes-requested），必要时 reason。页面 targetHash 是候选 prose 指纹，字段使用候选字段指纹；不能批准源树里的旧目标哈希。

审校须比较真实源文与候选，检查语义、术语、SEO、链接、输入要求和事实保留项。AI 审校可以记录，但 reviewer 必须明确标识 AI，不能冒充母语人士或人工。翻译生成、语言审校、看图和浏览器操作分别记录证据；批量刷新哈希或时间不是审校。

| 异常 | 处理 |
| --- | --- |
| 源、目标、数组 owner 或生命周期已变化 | 保留现有修改，重新取报告和生成批次，重新核对受影响译文 |
| 审校修改 pending 内容 | 生成新计划及 batchId，旧批准不能直接复用 |
| 依赖缺失或已启用语言门禁失败 | 补齐依赖/修复源问题，不能降级策略或只改 published |
| import/promote 失败 | 检查事务已恢复，不留下半批发布状态 |
| 跨机器丢失 manifest | 从已存原始批次重新 import；旧候选仅按现有 `--migrate` 合同处理 |
| 后续审校否决 | 记录 changes-requested，修订并复审，不覆盖历史证据 |

同一合法批次重复执行应为 no-op。人工直接编辑也必须满足相同发布门禁。

## 7 意大利语搜索合同

### 7.1 重音、省音和原文高亮

实际探针确认 `qualità`、`qualita`、`QUALITÀ`、分解形式 `qualita\u0300` 已归一为 qualita；NFD 高亮跨度仍覆盖原文的 8 个 UTF-16 code unit。当前 `l’illuminazione` 和 `l'illuminazione` 均产生 `[l, illuminazione]`，`dell’immagine` 产生 `[dell, immagine]`。引擎使用 AND，因此额外前缀会造成漏召回；两种撇号都能分词并不等于省音支持完成。

| 输入 | 本轮必须满足的行为 |
| --- | --- |
| qualità/qualita、caffè/caffe、perché/perche、大小写及 NFC/NFD | 同一核心 term；显示和复制保留原文拼写 |
| l’illuminazione / l'illuminazione / illuminazione | 相同核心 term，不额外要求 l |
| dell’immagine / dell'immagine / immagine | 相同核心 term；all’、dall’、nell’、sull’同理 |
| un’immagine / un'immagine / immagine | 去除紧邻撇号的 un，独立词 un 不删除 |
| d’inchiostro / d'inchiostro / inchiostro | 去除满足省音条件的 d |
| bianco-nero / bianco nero | 仍按两个词检索，不引入复合词猜测 |
| DALL·E、GPT-Image-2、p_217、O’Reilly | 品牌和 ID 保持现有分词合同，不误删普通词 |

仅在 language 为 it 时，对紧邻 `'`（U+0027）或 `’`（U+2019）的完整词前缀 `l`、`d`、`un`、`all`、`dall`、`dell`、`nell`、`sull` 应用省音规则，忽略大小写，且撇号后须紧接 Unicode 字母。独立 `l`、`d`、`un`、`dall`，带空格的 `l ’immagine`、末尾 `l’`、数字 `l’123` 仍保留原词；`rock’n’roll`、`O’Reilly` 不套用规则。不扩展成通用停用词表，不自动去词尾，不删除任意撇号前字符串。

索引、查询、高亮必须共享同一规则。先在原文上确定 spans，再过滤省音前缀，禁止先改写整段文字造成位移。`l’illuminazione` 的核心跨度为 `[2,15)`，`dell’immagine` 为 `[5,13)`；测试前置 emoji、NFD 组合符和多次命中，不能截断组合符或 surrogate pair。普通独立字母查询继续工作。搜索可折叠 è/e、sì/si；该宽松行为仅作用于检索，不改写任何可见文本。

### 7.2 受控词形与领域别名

`profiles.ts` 当前只配置 de/es/pt 和专用 ko 分支，it 的 domainAliases 返回空。新增 it profile，沿用低权重 aliases 字段及既有排序：

| 别名组 | 约束 |
| --- | --- |
| ritratto、ritratti、portrait、portraits | 明确列举单复数，不能靠模糊匹配代替 |
| adesivo、adesivi、sticker、stickers | 仅等义领域词 |
| poster、manifesto、manifesti | 仅在原始索引文本已命中 poster 时追加 manifesto/manifesti；不由裸 manifesto 反推海报 |
| modello di prompt、modelli di prompt、template、templates | template kind 可提供这些词；modello、modelli 本身不作为 template 同义词 |
| raccolta、raccolte、collection；tema、temi、topic | 与真实 kind 对应 |
| illuminazione、lighting；sfondo、sfondi、background | 保留常用英文检索入口 |
| fotografia di prodotto、fotografia di prodotti、foto di prodotto、foto di prodotti、product photography、packshot | 仅在完整产品摄影短语或 packshot 已命中时互扩；可附加上位词 fotografia，反向不成立 |

it 的多词别名须在归一后的原始索引文本中连续出现，不能用词集合凑短语，不能把自动加入的 kind 词并入触发判断。`modello di IA` 加上 synthetic kind prompt 不能触发 template；互不相邻的 fotografia、di、prodotto 不能触发 packshot。意大利语产品摄影短语的词间仅接受空白分隔，不能把 `fotografia. Di prodotto…` 当作同一句短语；用 fixture 验证直空格、换行、不换行空格与句号负例。只有自然描述或 taxonomy 提供语义依据时才添加别名，不向正文堆词。

改动 tokenizer/profile 行为后，从实施时当前值递增 `SEARCH_ANALYZER_VERSION`（本次基线为 6），重新生成全部构建语言索引及 Worker；数据结构未变则保留 schemaVersion 2。其他语言同期适配如已修改同一文件，合并规则并重跑回归，不覆盖其版本或 profile。

### 7.3 冻结真实语料用例

在调优前保存 schemaVersion 1、locale it、cases；每例沿用现有 `LocalizationSearchCase` 的 query、expectedKeys、可选 excludedKeys、topK（默认场景取 5）。以下为必须覆盖的初始场景，同一行的多个查询分别成例，译审后冻结最终自然措辞：

| 查询 | expectedKeys | 目的 |
| --- | --- | --- |
| ritratto neon / ritratti neon | prompt/p_005 | 单复数、领域别名 |
| l’illuminazione neon / l'illuminazione neon / illuminazione neon | prompt/p_005 | 省音、直弯撇号 |
| ritratto copertina | prompt/p_111 | 编辑人像 |
| matrimonio due persone | prompt/p_115 | 多输入语义 |
| fotografia di prodotto studio / foto di prodotto studio / packshot studio | prompt/p_151 | 产品摄影短语 |
| modello di prompt prodotto / template prodotto | template/t_001 | 模板 kind，避免模型歧义 |
| modello di prompt inchiostro | template/t_002 | 中文源说明的意大利语检索 |
| scimmia lanterna | prompt/p_224 | GIF 内容 |
| poster Colosseo / manifesto Colosseo | prompt/p_289 | 本地地名和海报别名 |
| poster Fuji | prompt/p_290 | 外国地名不误改 |
| raccolta poster | collection/c_001 | 合集 kind |
| tema inchiostro | topic/style/ink | topic key 保留 taxonomy 段 |
| GPT Image p_111 / p_217 | 分别为 prompt/p_111、prompt/p_217 | 品牌、模型与稳定 ID |

补足至少 24 个冻结查询，包含无结果、相近标签建议和 excludedKeys 负例。重音、NFD、独立字母、省音边界及歧义必须另有确定的单元 fixture；真实译文自然含这些词时再加语料用例，不为测试制造描述。普通人像 fixture 不得仅因 fotografia 被 packshot 召回；模型 fixture 不得仅因 modello di IA 与 kind prompt 被 template 召回。负例 fixture 不包含反例词本身，否则无法证明别名误扩展。

每例通过序列化引擎与真实浏览器 Worker，快速搜索和独立搜索页一致。expectedKeys 检查每个内容分组前 topK；excludedKeys 检查全部召回结果，不能只查前五名。引擎以覆盖全部文档的上限额外查询负例，浏览器加载相应分组全部分页后断言。空 expectedKeys 且无 excludedKeys 的用例必须断言 total 为 0；不需要新增未消费的 expectedTotal 字段。

复用 `searchRecord` 解析 `topic/style/ink`，不把 ID 截成 style。浏览器等待本次 query 返回后检查结果和可见原文高亮；别名命中而显示文字无同词时允许无高亮，不高亮无关字符。其他已启用语言的冻结检索用例继续通过。

## 8 页面、排版与外部输出

### 8.1 必须完成的用户流程

1. 从 `/it/` 浏览首页展示项、用途入口、列表及第二页，筛选后打开详情，返回恢复位置；详情深链和刷新可用。
2. 快速搜索与独立搜索页使用第 7 节相同查询；验证 loading、空态、无结果建议、键盘选择和关闭后焦点恢复。
3. 在 t_001/t_002/t_017 编辑必填、多选/token、数值、枚举和参考输入，检查错误、重置、复制和下载；提交包含重音和撇号的用户值，对照编译结果。
4. 在英文、中文原始 Prompt 与其他语言已有变体的样本上，检查详情/弹层/快速复制/下载/外部导出；it 页面仍使用 source-only 的相同正文。
5. 检查图片 alt、放大、GIF 播放、多参考输入标签、收藏/取消/撤销/刷新恢复以及来源跳转。语言切换保留稳定资源身份。
6. it-IT/it-CH 仅产生可用语言建议；根首页不会因 Accept-Language 改成意大利语。意大利语键盘的重音、撇号和 AltGr 输入不触发复制、收藏或搜索快捷键；本轮不新增键位映射。

HTML 外壳为 it/ltr，说明块按实际 contentLocale、Prompt 块按实际 promptLanguage 设置 lang/dir。准备期回退内容不能标成意大利语译文，正式验收不能以 fallback 充数。

### 8.2 排版、字体与可访问性

Chromium、Firefox、WebKit 覆盖 360、768、1024、1440 CSS px 及明暗主题。重点检查 `Aggiungi ai preferiti`、`Immagine di riferimento`、错误提示、复数计数和模板字段，无页面横向溢出、关键文案裁切、重叠或不可见焦点；axe 无 serious/critical 问题。

使用 `À È É Ì Ò Ù à è é ì ò ù «» ’ €`、组合重音、粗体标题和等宽元数据核对实际字体与字重，记录 document.fonts、请求和截图。可见译文采用 NFC，搜索仍接受 NFD 用户输入；已有源文不作批量规范化。优先复用本地 Latin 子集，意大利语不新增全局字体 preload。至少检查 Chromium 原生 200% 缩放，其他浏览器补 720 CSS px 重排并标明方法；重排不冒充原生缩放。控制台无 hydration 错误或未捕获异常。

### 8.3 SEO 和机器可读输出

| 输出 | 验收合同 |
| --- | --- |
| HTML | `lang="it" dir="ltr"`，本地化 title/description，self canonical；原始 Prompt 独立标记真实语言 |
| hreflang | it，包含自身且互相返回，仅关联真实 indexable 版本，x-default 沿用默认语言规则 |
| Open Graph | 复用 it_IT；不因此生成 /it-it/ 或改成 it-IT hreflang |
| sitemap、Markdown twin、llms.txt、JSON/Markdown 外部导出 | 仅输出 indexable 集合，文本/链接与页面一致 |
| 搜索、feed、详情 JSON、语言菜单 | 沿用可浏览集合；搜索记录实际 contentLocale，不能拿可浏览等同已翻译 |
| 预览 | 全站 noindex；不向外部收录输出混入 preview、草稿或回退说明 |
| 生产回退/过期页 | 通用策略仍为 self canonical、noindex, follow，排除 hreflang/结构化数据/Markdown twin/sitemap；complete 候选出现该状态必须阻止发布 |
| 地址与托管 | root/subpath 一致使用 URL 模块；/it-it/、/it-IT/、/it-ch/ 等未注册路径为 404，无语言自动跳转 |

首页、列表页、合集及专题按实际展示成员判断 indexable，不改变浏览排序或分页以通过 SEO。站点地图、详情/弹层 JSON、搜索 Worker/索引必须来自同一次构建。

## 9 可执行任务与依赖

任务按可审查提交推进；角色可以由同一实施者承担，但译审和实际核验记录必须与工作相符。

| 编号 | 工作和责任角色 | 依赖 | 完成条件 |
| --- | --- | --- | --- |
| IT-01 | 工程：基线、策略、scope、批次与保留项清单 | 无 | 保存前后报告，目标唯一归属，it 保持 disabled |
| IT-02 | 本地化：术语、编辑规范、完整 UI 与 I0 内容审校 | IT-01 | 消息完整、ICU/格式化通过、基础内容 current |
| IT-03 | 工程/QA：状态 helper、disabled HTTP 负例、preview 路由检查 | IT-01 | 状态与产物不符必 fail；生产禁用态通过 |
| IT-04 | 内容/QA：I1 及依赖，开启基础 preview | IT-02、IT-03 | 纵向操作闭环有实际证据，未齐聚合页不冒充可收录 |
| IT-05 | 搜索：省音、profile、版本和单元负例 | IT-01、术语确定 | 第 7.1/7.2 节通过，既有语言无回归 |
| IT-06 | 内容：I2/I3 分批译审与 promote | IT-04 | 最新范围全部 current，保留项结构对照通过 |
| IT-07 | 搜索/QA：冻结真实语料、序列化引擎与 Worker 验收 | IT-04、IT-05，最终依赖 IT-06 | 至少 24 例通过，负例查全量，真实高亮正确 |
| IT-08 | 前端/QA：完整交互、字体、排版、无障碍及存在性断言 | IT-04，最终依赖 IT-06 | 第 8 节矩阵完成；必要修复有回归验证 |
| IT-09 | 工程/QA：CI、候选启用、三种构建、成本与验收摘要 | IT-06、IT-07、IT-08 | 严格检查、产物和性能门禁通过，候选提交固定 |
| IT-10 | 发布维护：正式部署、线上核验、回滚目标及文档同步 | IT-09 | build ID 一致，线上冒烟通过，最终记录 passed |

其他语言规格可以独立实施；it 不等待 fr/ru/zh-Hant 上线。若它们先启用，则自动纳入最新 enabled 门禁；共享 tokenizer、profile、字典键和 CI 的改动须合并最新实现。技术候选完成与正式上线分别记录，IT-09 不能替代 IT-10。

## 10 检查命令和完成标准

### 10.1 准备及每批检查

```sh
npm run --silent locale:check -- --locale it --json
npm run --silent locale:check -- --all --json
npm run locale:scope -- --locale it
# 核对范围差异与移除证据后再写快照。
npm run locale:scope -- --locale it --apply
npm run content:validate
```

scope apply 不属于每次检查必做动作。`--locale` 与 `--all` 互斥；参数错误退出 2，校验错误或 strict 未就绪退出 1。纯 JSON 使用 `npm run --silent`，避免 npm banner 污染文件。准备期使用非严格诊断；全量候选单独 strict 检查 it 和动态读取的所有 enabled 语言，不要求 disabled 草稿语言 ready。

### 10.2 全量候选质量检查

以下脚本已使用现有 CLI；逐条成功后继续，任何非零退出停止该轮验收：

```sh
npm run locale:check -- --locale it --strict
node --input-type=module <<'NODE'
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
const registry = YAML.parse(fs.readFileSync('content/locales.yaml', 'utf8'));
for (const locale of registry.locales.filter((entry) => entry.enabled && entry.code !== 'it')) {
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

源/目标变化、数组移位、缺审校、重复导入、事务失败恢复、source-only 冲突和完整覆盖门禁优先复用现有 localization 测试；只针对暴露出的缺口增加测试，不复制一套仅替换 locale 的工具实现镜像。

### 10.3 构建状态与测试矩阵

IT-03 新增仅用于测试的 `IT_EXPECT_STATE`，供 HTTP 和浏览器套件共用；不是产品运行开关：

| 值 | 必须断言 |
| --- | --- |
| disabled | BUILD.locales 无 it；入口、hreflang、sitemap、外部导出无 it；/it/ 及 generated/it/feed、search 代表路径返回 404 |
| preview | BUILD.buildMode 为 preview，构建包含 it 且 it.enabled 为 false（注册表 preview=true）；it 路由、完整 UI、About、License 存在；全站 noindex，外部收录输出不含 it |
| enabled | BUILD.locales 包含 it 且 enabled 为 true；路由、索引和非空冻结用例存在，按实际 production/preview 模式检查收录规则 |

状态不符必须 fail。普通回归未传值时可按实际构建做适用检查；IT-09 候选及启用后 CI 必须显式传 enabled，禁止缺失 it 时跳过整组而显示成功。浏览器单独运行也执行此存在性断言。

先在 it.enabled=false 的工作区执行禁用态，再在 I0 就绪、preview=true 后执行基础预览检查；此时只运行已交付的状态和基础页面断言，不要求 I2/I3 已完成：

```sh
BASE_PATH= BUILD_MODE=production npm run build
IT_EXPECT_STATE=disabled npm run test:e2e -- tests/e2e/italian.http.spec.ts --project=http --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
IT_EXPECT_STATE=preview npm run test:e2e -- tests/e2e/italian.http.spec.ts --project=http --workers=1
```

全量就绪后，在不触发正式部署的 `codex/italian-production-candidate` 分支或等价独立检出目录启用 it。候选使用与发布一致的 SITE_ORIGIN；每次构建立即测试该份 dist，保存配置/build ID 后再构建下一份，不并发写同一目录的 `.next`、dist 或 generated：

```sh
BASE_PATH= BUILD_MODE=production npm run build
IT_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=production npm run build
IT_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
IT_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1
```

现有 CI 的 subpath 是 preview，额外的 **subpath production 必须完成**，不能用 noindex 预览结果证明生产 hreflang/canonical。E2E 针对 nginx 提供的静态产物；环境需要 Node ≥24、依赖、三种 Playwright 浏览器及 `scripts/nginx.sh` 所需容器运行环境，不能以 next dev 代替。缺环境的项目记录 pending，重试与 skip 写明原因。

记录相同源树/配置下 disabled 和 enabled 构建的时间、文件数、HTML 字节、it 搜索索引 raw/gzip，以及英/意首页、列表和模板的首屏 JS 与字体请求。复用 `scripts/measure-first-load.ts`，由 `npm run serve` 提供对应构建，路径取实际产物；首次必要加载、idle preload、路由 prefetch 分开记。继续遵守[总体设计 §16](prompt-library-website-design.md)的预算与已有明确例外，不因增加语言放宽。普通页面不得预载完整意大利语搜索索引、其他语言字典或审校数据。

### 10.4 完成条件与证据

- [ ] it 为 complete/fingerprint/source-only，scope 覆盖最新公开目标，移除均有证据。
- [ ] 最新报告 ready=true、blocking=false；localCurrent=indexable=target；fieldsCurrent=fieldsTotal；missing/draft/outdated/unreviewed/archived/invalid/fallback 均为 0。
- [ ] 页面、字段和消息均有当前指纹的真实审校；媒体、交互和事实保留项有可追溯证据。
- [ ] 冻结搜索、重音、省音、别名负例和高亮通过，其他语言搜索及发布门禁未退化。
- [ ] 第 8 节用户流程、浏览器/宽度/主题/缩放/无障碍验收完成，原始 Prompt 和生成事实保持一致。
- [ ] root/subpath 生产及 subpath 预览通过，成本记录符合既有预算，CI 结果关联同一候选提交。
- [ ] 正式部署的实际 build ID、线上冒烟、上一成功部署和文档状态均已记录。

`production-acceptance.json` 是事实记录，顶层至少含 schemaVersion 1、locale it、status（pending/failed/passed）、实际时间和完整候选/发布 commit。每份构建记录 mode、origin、basePath、enabled locales、build ID、搜索 schema/analyzer 版本、命令/退出码、pass/fail/skip 数和证据位置；同时保存覆盖报告三个指纹、counts、译审台账、保留项对照、媒体与交互证据、性能对照、deployment ID、线上结果和上一成功 deployment/build ID。大型日志和 trace 可放 CI artifact，但摘要必须提供可追溯位置。

IT-09 通过后各候选构建可写 passed，顶层 status 在 IT-10 完成前保持 pending。合并后源树、注册表或部署配置变化，应更新候选身份并重跑受影响检查，不把旧报告挂到新部署上。`preservation-audit.json` 对纯正文/资产用字节哈希，对共享 YAML 按字段做结构比较：允许 it 解释字段，原始事实保持一致。其他工作先改了源树时重新确认基线，不能撤销用户修改来制造一致性。

## 11 发布、回滚和持续维护

通过候选验收后沿用 `.github/workflows/deploy.yml` 发布完整产物。按发布记录设置下列变量；`IT_PLATFORM_ORIGIN` 为不带 basePath 的平台 origin，检查器使用与部署相同的 origin/basePath 配置：

```sh
npm run check:live -- --expect-build "$IT_RELEASE_BUILD_ID"
npm run check:live -- --site "$IT_PLATFORM_ORIGIN" --platform --expect-build "$IT_RELEASE_BUILD_ID"
```

再执行意大利语线上冒烟：`/it/`、一个英文原 Prompt 详情、一个中文原 Prompt 详情、t_001 模板、列表第二页、it 搜索索引、sitemap、canonical/hreflang、复制/下载。核对正式域名没有意外 noindex header，部署与验收 build ID 一致。技术验证通过不等于搜索引擎已收录。

主要路由不可用、正文复制错误、complete 失效、Worker/索引版本不一致或收录输出错误时，使用现有 `.github/workflows/rollback.yml` 回到上一已验证完整部署并核对 build ID。HTML、generated JSON、Worker、索引和字典一起恢复；保留失败版本译文及证据，通过可审查 revert/修复提交处理主分支，避免下一次部署重引问题。若长期撤下 it，另行提交 enabled=false 并完整重建，不直接手改线上文件。

上线后源内容新增或变化，继续执行报告差异→翻译/复审→promote→所有 enabled 语言门禁。新增公共消息键时同步 it，依赖变化时重算 scope 和审校。不得为赶内容发布而降低 complete、fingerprint 或 source-only 策略。
