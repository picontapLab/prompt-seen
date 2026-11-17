# 繁体中文接入实施规格

状态：全量内容及独立 subagent 审阅已完成，已启用本地生产候选；验收结果与未执行的人工／上线检查见[验收记录](../production/localization/zh-Hant/acceptance.md)。日期：2026-11-17（America/Los_Angeles）。工程基线：`53cbc8ef`；本文数量来自只读覆盖检查，不代表线上状态。

交付可以用繁体中文浏览、检索、阅读使用说明和操作模板的完整站点。首发采用 `complete / fingerprint / source-only`：分批翻译和审校，预览验收，全量公开目标就绪后启用 `zh-Hant`。页面和界面使用繁体中文；可复制的 Prompt 保留条目的原始正文、实际语言和生成事实。

本文细化[语言覆盖计划](language-coverage-assessment.md)与[总体设计第 8 章](prompt-library-website-design.md#8-主流语言覆盖本地化与发布状态)中的繁体中文计划。沿用[通用本地化流程](localization-workflow.md)、[通用规格](general-localization-spec.md)、[正文多语言设计](multilingual-prompt-design.md)和[工程约定](engineering-conventions.md)。历史文档中的语言启用状态以当前注册表为准；本规格规定繁体中文的首发范围、编辑规范及验收，不重复建设已有发布工具。

## 1 范围与固定决策

| 项目 | 实施决定 |
| --- | --- |
| 语言身份 | `code: zh-Hant`、`pathPrefix: zh-hant`、`nativeName: 繁體中文`、`htmlLang: zh-Hant`、`direction: ltr`；保留 `phase: 2` |
| 编辑规范 | 标准书面繁体中文，产品术语采用台湾常用写法，避免地区俚语；不宣称已分别完成香港、澳门的地区本地化 |
| 地区版本 | 首发只有 `/zh-hant/`，不建立 `zh-TW`、`zh-HK`、`zh-MO` 或 `zh-Hant-TW` 的重复页面 |
| 发布策略 | `coverage: complete`、`review: fingerprint`、`promptBodies: source-only`；试点用于验证流程，全量通过后正式启用 |
| 内容范围 | 全部公开 Prompt、模板、合集、专题、About、License 的说明与 SEO，UI 消息、共享解释字段、分类标签和搜索别名 |
| 技术边界 | 保持静态导出、现有 URL 模块、稳定 ID/slug、默认英语根首页和 basePath 合同 |
| Prompt 语言 | 精确匹配语言 code；没有繁体正文变体时使用条目原文，可能为英语、简体中文或其他语言；不将 `zh-Hans` 隐式改为 `zh-Hant` |
| 搜索容错 | 支持繁体检索、全半角、中英混输和有限的简繁/地区术语别名；不承诺任意简体句子都能跨文字检索 |

不新增生图任务、繁体 `prompt-locales/zh-Hant/` 变体、运行时简繁转换服务、地区版路由、拼音/注音/粤拼检索或新的翻译状态横幅。原 Prompt 恰为繁体时正常使用原文；如实施前出现繁体正文变体，先按策略报告冲突，不删除变体来让检查通过。

“全量”按当前公开声明与保留的 scope 历史计算，不翻译普通未公开草稿，不恢复归档内容。启用后新增公开内容也须满足繁体中文完整覆盖。

## 2 已核对基线与工程缺口

基线命令为 `npm run --silent locale:check -- --locale zh-Hant --json`，报告 schemaVersion 2、evaluationMode 为 `candidate-production`。实施前的基线策略为 `incremental / fingerprint / optional`，`enabled: false`，未设置 preview（解析为 false）。报告 `ready: false`、`blocking: false`；普通检查退出 0 仅表示检查成功。

| 目标 | 数量 | 实施前繁体完成数 |
| --- | ---: | ---: |
| Prompt 说明 | 285 | 0 |
| 模板说明 | 75 | 0 |
| 合集说明 | 16 | 0 |
| 专题说明 | 3 | 0 |
| About、License | 2 | 0 |
| 内容说明合计 | 381 | 0 |
| UI 消息 | 427，14 个命名空间 | 0 |
| 共享解释字段 | 1,793 | 0 |

`fieldsTotal: 2220` 包含 UI 消息，不能再加 427。共享字段分布为 Prompt 882、媒体 363、模板 308、示例 206、taxonomy 34。说明源语言为英语 371 份、简体中文 10 份；按每个 item/field 的真实源语言处理。

报告中的 379 个 visible/fallback 是模拟启用时可回退浏览的内容库条目，两个独立页面不回退。`localCurrent` 与 `indexable` 都为 0，不代表当前生产已有 379 个繁体页面。当前 `scopeFingerprint` 为 `sha256:d620cdd8c84f5922167177f3f2ad63ecb6079c2ca44b4b1fae9a6ed6034a2eb2`；开工与验收时重新计算，不能把本文数字写死为测试常量。

全语言只读检查确认已启用 `en`、`zh-Hans`、`es`、`pt-BR`、`ja`、`ko`、`de`，均按各自策略 ready。简体中文采用 incremental 策略，其中 354 个 current、16 个 missing、2 个 draft、9 个 outdated。因此简体目录不能直接作为“已全部审校”的转换源。其现有缺口不作为本次修复简体全站的任务，但不能继承到繁体的 complete 验收。

| 已有实现 | 本轮工作 |
| --- | --- |
| 注册表、大小写正确的 URL、按语言加载消息、候选覆盖分析和 import/promote | 复用，补配置、字典、目标内容和真实审校 |
| `language-match.ts` 已按文字或地区推荐中文版本 | 补齐地区、显式文字优先级和不可用语言的回归用例 |
| `display-cjk.ts` 已配置 Noto Sans TC，依赖已安装，CSS 已有繁体字体栈 | 验证实际子集、字形、断行和请求隔离 |
| SEO 已将 `zh-Hant` 映射为 `zh_TW` | 验证静态产物，保留 HTML/hreflang 的 `zh-Hant` |
| CJK bigram 分词、全半角归一化、原文高亮已实现 | 补繁体语料验收和受控领域别名；不引入浏览器依赖不同的分词字典 |
| 搜索、模板输入和快捷键已有 composition 防护 | 用繁体输入场景验证真实交互，发现缺口时修复共用逻辑 |

## 3 配置、交付文件与阶段状态

准备期修改现有注册表项，不新增同义 locale：

```yaml
- code: zh-Hant
  pathPrefix: zh-hant
  nativeName: 繁體中文
  htmlLang: zh-Hant
  direction: ltr
  enabled: false
  preview: false
  phase: 2
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

| 阶段 | enabled / preview | 进入条件 |
| --- | --- | --- |
| 准备 | false / false | 保存基线，确定术语、scope 和批次；生产不输出繁体路由 |
| 预览 | false / true | 完整 UI、全局 taxonomy、About、License 已审校；允许其余草稿或合格回退，全站 noindex |
| 生产候选 | true / true | 全量严格检查通过，在独立候选分支或检出目录启用，验证生产根路径与子路径 |
| 正式发布 | true / true | 同一候选提交通过构建、浏览器与产物验收，走既有发布流程并核对线上 build ID |

`locale:promote` 只发布译文和匹配的审校记录，不启用语言、不部署。disabled 的 complete 语言可逐批 promote；已启用语言的门禁始终有效。

| 文件或模块 | 交付内容 |
| --- | --- |
| `content/locales.yaml` | 策略及阶段开关 |
| `src/i18n/messages/zh-Hant/*.json` | 与默认英语完整对齐的命名空间、叶子键、ICU 参数与标签 |
| 覆盖报告的 `item.targetFile` | 各类 `locales/zh-Hant.mdx`，不猜测目录结构 |
| 报告的 `field.file/targetField` | YAML 中繁体 alt/caption、标注、输入指导、模板 label/help、枚举显示标签、运行 notes、taxonomy 等解释字段 |
| `production/localization/zh-Hant/` | 以下准备、审校及验收产物 |
| `src/modules/search/profiles.ts`；新增 `src/modules/search/traditional-chinese.ts` | 精确限定 `zh-Hant` 的纯领域别名函数，第 6 节定义行为 |
| `src/modules/search/types.ts` | 搜索行为改变后递增 analyzerVersion；索引结构不变则保持 schemaVersion |
| 新增 `src/modules/search/traditional-chinese.test.ts`、`scripts/lib/localization/traditional-chinese-search.test.ts`；既有 tokenize/engine 测试 | 别名正负例、分词/高亮边界、真实内容序列化引擎验收 |
| `src/i18n/catalog.test.ts`、`format-locale.test.ts`、`src/ui/pages/language-match.test.ts` | 补 ICU、格式化及语言推荐用例 |
| 新增 `tests/e2e/traditional-chinese.browser.spec.ts`、`traditional-chinese.http.spec.ts` | 真实 Worker、输入法、核心交互、繁体语言身份和产物断言；共用既有支持函数 |
| `src/styles/fonts/`、`src/styles/tokens/type.css`、`scripts/emitters/display-fonts.ts` | 仅在实际字体/子集验收发现缺口时修复，不重复添加字体体系 |

实施阶段建立以下目录；本规格不将其视为已存在或已验收：

```text
production/localization/zh-Hant/
  scope.json                  # locale:scope 写入的 v2 快照
  reviews.json                # reviewSchema v1，真实逐项审校
  glossary.yaml               # 首选词、可检索别名、禁用/易混写法及原因
  style-guide.md
  batch-plan.json             # 报告 key、来源、依赖、批次和进度
  batches/                   # 原始 import 批次及审校输入，可重建 manifest
  conversion-audit.json       # 第 4.2 节的转换/参考来源及保留文字记录
  search-cases.json           # 冻结检索输入、预期 key 与负例
  review-evidence.md          # 语义、图片、GIF 与交互的实际审查证据
  acceptance.md               # 各验收项结果、缺口和证据路径
  production-acceptance.json  # 候选提交、build ID、指纹、成本、部署与回滚版本

.artifacts/localization/zh-Hant/
  report.json
  pending/{batchId}/          # 工具生成的候选与 manifest
  transactions/              # 工具维护的事务记录
```

完整报告、浏览器 trace 和截图可存 CI artifacts；提交可追溯摘要与原始批次，不能仅依赖本机 `.artifacts`。审校身份、转换审计与批次信息不进入公开 generated JSON 或客户端包。

需要修改 Next.js 路由或渲染时，先阅读本仓库 `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` 及相关指南。本项目采用静态导出，不添加 Proxy、Cookie 或请求时语言重定向。

## 4 繁体中文编辑与转换合同

### 4.1 术语、语气和标点

以下是首发编辑决定，不是字符替换表。产品句子保持简洁，指令直接描述动作；需要称呼读者时用「你」。内容中的模型、品牌和官方专名按真实名称保留。

| 概念 | 首选繁体用词 | 使用边界 |
| --- | --- | --- |
| Prompt | 提示詞 | 必要时首次写「提示詞（Prompt）」；与页面说明区分 |
| Template / AI model | 範本 / AI 模型 | 不把模板译为「模型」；「模板」可作检索别名 |
| Collection / Topic | 合集 / 主題 | 与分类、风格分别命名 |
| Reference / generated image | 參考圖片 / 生成圖片 | 输入与输出不能混用 |
| Copy / download / reset | 複製 / 下載 / 重設 | 使用动作名；失败与完成状态分别翻译 |
| Favorites / save draft | 收藏 / 儲存草稿 | 收藏按钮不泛称「保存」；实际存储动作使用「儲存」 |
| Search / filter / settings | 搜尋 / 篩選 / 設定 | 地区同义词可用于搜索，不混入同一套按钮 |
| File / video / information | 檔案 / 影片 / 資訊 | 图像语境按需要区分「圖片」「影像」；运行数据可称「資料」 |
| Product photography / portrait | 商品攝影 / 人像 | 「產品攝影」「肖像」为有语义依据的别名 |
| Poster / sticker / lighting | 海報 / 貼圖或貼紙 / 打光 | 数字表情贴图与实物贴纸按用途区分；「燈光」「光線」按上下文使用 |
| Verified / unverified | 已驗證 / 尚未驗證 | 仅反映真实匹配记录，翻译完成不等于繁体 Prompt 已实测 |

正文使用全角中文标点和「」/『』引号；英文产品名、数字、单位保持清楚的边界，不向 URL、ID、代码或固定画面文字插空格。不得用 `word-break: break-all` 修复所有中文换行，或通过插入零宽字符改变复制文本。

逐项处理「發/髮」「後/后」「乾/幹/干」「臺/台」等语义和专名问题。保留台湾/香港等专名的真实官方写法；不进行全局单字替换。来源的未知型号、未经验证的变化、许可和生成限制必须完整保留。

### 4.2 简繁转换只生成候选

1. 每个 item/field 的规范来源是覆盖报告的 `sourceFile/sourceLocale/sourceField`。源为英语时以英语核对含义，不能为了方便转换把 `sourceLocale` 或 source hash 改成简体。
2. 可参考已有合格简体说明来准备繁体草稿，但必须与当前规范源文逐项比对。缺失、draft、outdated 的简体说明不能作为唯一依据。规范源本身为 `zh-Hans` 时，允许直接转换为候选，再审校词汇和语义。
3. 若使用 OpenCC，准备端采用 `s2twp` 作为本项目术语倾向的草稿配置，记录实际工具/版本/配置；工具不是必需的新运行时依赖，转换结果不自动 approved。人工或翻译模型直接编写也执行同样的源文审校。
4. 只处理自然语言叶子文本。MDX 保持标题层级、内容引用、Figure ID、Callout、链接目标、代码块和固定引用；JSON 保持键和 ICU 语法；YAML 只合并目标语言键。禁止把整份 MDX/YAML/JSON 当纯文本全量转换。
5. `conversion-audit.json` 使用 `{schemaVersion: 1, locale: "zh-Hant", records: [...]}`。每条记录包含报告 `key`、规范源的完整 `sourceHash`（页面用 sourceFingerprint）、`targetHash`、`method: direct | conversion`、`reference: {file, field, hash} | null`、`converter: {name, version, config} | null`、`preserved: [{field, text, reason}]`；没有保留片段时 preserved 为空数组。reference 记录参考简体文字，converter 记录实际转换工具，targetHash 对应最终候选。它是审校证据，不扩展现有 import/review schema。
6. promote 前检查规范源和候选指纹；若本批参考简体文字在审校期间变化，重新核对是否影响译文并更新证据。发布后的持续失效判定仍以规范源和目标指纹为准，不把简体目录悄悄变成另一份发布来源。

### 4.3 必须保护的内容

以下内容在本地化前后保持一致：原始 `prompt.txt`、模板 `body.txt`、其他 locale 的 Prompt 变体、示例实际提交正文、运行哈希、模型 ID/版本/验证事实、资产文件、来源链接、许可 ID、稳定 ID/slug、变量名、类型/范围/必填约束、枚举 `value`、默认输出值及用户输入。允许新增运行 `notes.zh-Hant` 等解释字段，不把整个运行 YAML 判为禁止写入。

固定画面文字照录，例如真实图片里的「快乐」不能因为说明是繁体就写成图片显示「快樂」；可在其外部解释含义。模板中 label「秋天」仍对应原 `value: autumn`，切换界面语言不改渲染值。

审校记录中的“原文相同”理由必须定位到具体字段/片段。简繁共用文字（如「水墨」「春」「主題」）可能完全相同，应在语义核对后接受；不能以“含 Han 字符”证明已经繁体化，也不能以“没有发生字符变化”一律判失败。残留检查只检查本轮可翻译字段，固定引文与原 Prompt 按上述证据排除，禁止通过全文零简体字符计数作为发布门禁。

媒体 alt、caption、标注与 GIF 循环说明须核对实际资产。已有证据仅在资产哈希和事实范围一致时可复用，繁体措辞独立审校；静态首帧不足以证明动画动作。保存 asset ID、文件哈希、查验范围及结论。

## 5 分批翻译、审校与发布流程

### 5.1 冻结目标与分批

先保存繁体及全语言报告的 `sourceRevision`、`scopeFingerprint`、`policyFingerprint`，其中包含当前工作区的源树状态；只记录 HEAD 不够。设置第 3 节策略，再运行 `locale:scope` dry-run，核对差异后 apply。已有未提交内容变更保留，不回退它们来制造通过的基线。

从最新报告生成 `batch-plan.json`，将每个 item/field key 分配到唯一内容批次，记录真实来源和依赖；共享字段去重。每批发布前重算新增项、源/目标变化、数组 owner 与依赖变化。新增公开内容纳入范围；删除译文或改 draft 不能缩小目标，正式移除使用现有 scope 证据规则。

| 批次 | 交付范围 | 通过条件 |
| --- | --- | --- |
| H0 | 风格规范、术语、完整 UI、全局 taxonomy、About、License | 字典完整，当前审校有效；可以启用 preview |
| H1 | 代表性纵向样本和依赖；冻结搜索用例 | 导入 → 审校 → promote → 浏览/搜索/编辑/复制/下载全流程通过 |
| H2 | 其余 Prompt、模板、媒体、输入要求、示例 notes 等 | 每批 current，生成事实和非目标语言字段保留 |
| H3 | 剩余合集、专题、成员推荐理由、首页实际展示项 | 页面及成员就绪，全量严格检查 ready |

H1 至少包括 `p_005`、`p_012`、`p_111`、`p_115`、`p_151`、`p_217`、`p_224`、`p_290`，`t_001`、`t_002`、`t_017`，`c_001` 和 `topic/style/ink`，覆盖中文原 Prompt、多参考图、不同语言正文、GIF 和参数编辑。另包含当前 `home.featured` 与列表 showcase 的实际展示项。补齐内容引用和共享字段的依赖闭包，合集至少 2 个可见成员，专题至少 3 条 Prompt；不得删减编排来降低覆盖要求。

建议每内容批次不超过 20 份 MDX 或 100 个共享字段，按可完成审校的规模拆分；互相引用的内容合批或先准备依赖。UI 完整性优先：默认目录现有 14 个命名空间，必须在准备目录完成后一次加入 `src/i18n/messages/zh-Hant/`。`validateBuildMessages` 会检查已经存在的字典目录，即使语言仍 disabled；不得提交半套字典。

### 5.2 输入和命令合同

复用 `scripts/lib/localization/import.ts` 的 `batchSchema` v1，顶层 `{schemaVersion: 1, locale: "zh-Hant", operations: [...]}`。不新增繁体专用 CLI。

| 操作 | 必填输入 |
| --- | --- |
| 页面 | `key = item.key`，sourceField 与 targetField 都为 `["$page"]`，expectedSourceHash 为完整 `item.sourceFingerprint`，expectedTargetHash 为 `item.targetHash` |
| 共享字段 | 使用报告的 `key/sourceField/targetField/sourceHash/targetHash`；数组项带 `expectedIdentity = field.identity` |
| 缺失目标 | 显式填写 `expectedTargetHash: null` |
| 页面 translation | `{title, description, body}`，原文存在时同时提供 seoTitle、seoDescription、reasons；不复制旧翻译状态 |
| UI 消息 | 不走 importer；完整 JSON 直接维护，检查后取消息指纹，实际审校记录随字典提交 |

页面 frontmatter 的短 sourceHash 不能代替完整页面指纹。所有路径、指纹和 owner 身份来自最新报告，不手算或复用旧批次的 hash。

以下命令在相应文件已准备后执行；`ZH_HANT_BATCH_ID` 设为 import 返回的真实 64 位十六进制 batchId：

```sh
npm run locale:import -- --locale zh-Hant --file production/localization/zh-Hant/batches/h1.json
npm run locale:import -- --locale zh-Hant --file production/localization/zh-Hant/batches/h1.json --apply
# 完成候选审校后，再执行以下发布命令。
npm run locale:promote -- --locale zh-Hant --batch "$ZH_HANT_BATCH_ID" --reviews production/localization/zh-Hant/batches/h1-reviews.json
npm run locale:promote -- --locale zh-Hant --batch "$ZH_HANT_BATCH_ID" --reviews production/localization/zh-Hant/batches/h1-reviews.json --apply
npm run --silent locale:check -- --locale zh-Hant --json
```

import 可能写 draft，也可能因触及已发布共享依赖而整批 pending；以返回的 mode 和 manifest 为准。promote 在锁内验证来源、目标、生命周期、依赖及所有 enabled 语言，并事务性写入。发生冲突时保留现有修改，重新准备和审校；不要直接改 manifest、覆盖审校者修改或手工留下半批 published。

### 5.3 审校证据与重试

审校文件沿用 `scripts/lib/localization/check.ts` 的 `reviewSchema` v1：每条记录包含 `key/sourceHash/targetHash/reviewer/completedAt/conclusion`，必要时加 `reason`。时间带时区，哈希对应实际审查的完整源文和最终候选；pending 的候选哈希取 manifest，而非源树旧目标。

生成草稿不等于审校。审校至少核对源文完整语义、繁体字形与地区术语、SEO、链接、输入约束、受保护字段、媒体事实和操作文案。实际使用 AI 审校时明确标记 AI 身份，不称作母语人士或人工审校；发现问题记录 `changes-requested`，修改后重新审查。

重复应用同一批次和审批应 no-op；中途失败验证回滚；候选编辑后建立新计划及批准。跨机器缺 manifest 时用已保存批次重建，旧候选仅按既有 `--migrate` 合同迁移。不得靠刷新审校时间、哈希或 scope 把过期内容标为通过。

## 6 搜索行为合同

### 6.1 复用分词，显式扩展别名

继续使用 `tokenize.ts` 的 CJK bigram：索引保存重叠双字和单字，查询按既有规则分组；NFKC 处理全半角，原文 spans 保留 UTF-16 位置。不在普通页面加载 OpenCC、整套繁简字典或全文索引，不采用 Node 与浏览器 ICU 字典可能不同的 `Intl.Segmenter` 作为新的分词前提。

新增纯函数 `traditionalChineseAliases(text: string, kind?: SearchKind): string`，由 `profiles.ts` 的 `domainAliases` **仅在 code 为 `zh-Hant` 时**调用。不能以 `locale.split('-')[0] === 'zh'` 让简体检索一起改变。别名在索引构建时进入已有低权重 `aliases` 字段；查询保持用户输入，显示标题、摘要和复制内容不改写。

首批受控词组如下；具体词组由 glossary 和同一组测试维护。taxonomy 已有可覆盖的别名优先放在对应分类数据中，不给无关条目添加全站关键词。

| 条件或词组 | 索引扩展 | 限制 |
| --- | --- | --- |
| `人像 / 肖像 / portrait` | 同组互相召回 | 不把任意「人物」全部当作肖像摄影 |
| `海報 / 海报 / poster` | 同组互相召回 | 仅在存在对应语义时扩展 |
| `商品攝影 / 產品攝影 / 商品摄影 / 产品摄影 / product photography / packshot` | 同组及较宽的 `攝影 / 摄影 / photography` | 普通「攝影」不得反向获得商品摄影别名 |
| `參考圖片 / 參考圖 / 参考图片 / 参考图 / reference image` | 同组互相召回 | 不修改参考图需求的真实取值 |
| `燈籠 / 灯笼` | 同组互相召回 | 不逐字转换其他词 |
| `範本 / 模板 / template` | template kind 获得类别别名 | 「AI 模型」不能让 Prompt 成为模板命中 |
| collection / topic kind | 分别增加 `合集` / `主題`（及简体 `主题`） | 维持原内容类型和分组 |

多字词组必须在输入文本中连续出现；不能因为散落的单字或 bigram 都存在就推断出完整词组。拉丁词按词边界匹配，避免 `posterior` 触发 `poster`。从原始文本一次计算别名，不对新生成的别名反复扩展。保留 title 4、terms 2.5、model 2、description 1.5、body 0.5、aliases 0.1 的现有权重；用受控 fixture 验证相同条件下原词命中优先。

通用繁简折叠不在范围内：「發」与「髮」、「後」与「后」不得因单字转换相互匹配；以独立 fixture 断言。别名命中但可见文本没有相同字词时允许没有高亮，不能错误标亮无关字符。emoji、组合字符和 CJK 扩展字符测试保证不截断代理对或组合序列。

当前 `SEARCH_ANALYZER_VERSION` 为 6、schemaVersion 为 2。实施时从当时最新 analyzerVersion 递增（如仍为 6 则升为 7），重建全部 built locale 索引；结构不变时保留 schemaVersion 2。Node、序列化引擎和浏览器 Worker 使用同一版本，过期索引走既有 stale 提示。

### 6.2 冻结真实语料用例

H1 语义审校完成后、搜索调优前提交 `search-cases.json`，沿用 `{schemaVersion: 1, locale: "zh-Hant", cases: [...]}`。每例有 `query/expectedKeys/topK/reason`，可有 `excludedKeys/expectedTotal`；测试必须实际断言这些字段。`topK: 5` 指每个展示类型分组前五项，不是四类合计五项。下表同一行不同 query 各为一例：

验收 key 使用覆盖报告的斜线形式；搜索引擎的 `prompt:p_005`、`topic:style:ink` 分别映射为 `prompt/p_005`、`topic/style/ink`，不能仅替换第一个冒号而漏掉专题层级。

| 查询 | expectedKeys | 验证目标 |
| --- | --- | --- |
| `霓虹 人像`、`霓虹人像`、`霓虹 肖像` | `prompt/p_005` | 无空格查询及领域别名 |
| `水墨 梅枝`、`水墨梅枝` | `prompt/p_012` | 英语原 Prompt 的繁体说明检索 |
| `雙人 婚紗` | `prompt/p_115` | 多参考图说明 |
| `商品攝影 棚拍`、`產品攝影 棚拍`、`产品摄影 棚拍`、`packshot 棚拍` | `prompt/p_151` | 受控简繁/中英同义词 |
| `富士山 海報`、`富士山 海报`、`富士山 poster` | `prompt/p_290` | 繁简与英语领域词 |
| `商品 海報 範本`、`商品 海报 模板` | `template/t_001` | 类型标签及词组组合 |
| `水墨 範本`、`水墨 模板` | `template/t_002` | 範本与模板术语 |
| `猴子 燈籠`、`猴子 灯笼` | `prompt/p_224` | 动画内容与词组异体 |
| `GPT Image p_111`、`ＧＰＴ Image p_111` | `prompt/p_111` | 全半角和模型名 |
| `p_217` | `prompt/p_217` | 稳定 ID |
| `海報 合集` | `collection/c_001` | 合集分组 |
| `水墨 主題` | `topic/style/ink` | 专题分组 |

以上 24 例以源文已有事实为依据；首批译文自然表达对应概念，不为搜索堆砌词。若 key 已正式移除或内容事实发生变化，在冻结前记录同类替代及依据；冻结后不得删难例、放宽 topK 或替换 expectedKeys 来宣称通过。

另加入至少 1 个确定无结果查询（例如 `zzqvnoresult984731`，`expectedTotal: 0`）和 2 个负例，证明普通人像不会仅因「攝影」命中 packshot、AI 模型不会获得模板别名。负例分别在受控 fixture 与实际语料验证；`excludedKeys` 在语料测试中检查全部结果，避免无关项只被排到第六名后漏检。无结果例必须断言总数、浏览器空态和建议区域，不能仅使用空 expectedKeys。

每例通过序列化引擎和真实 Worker，并检查链接语言、分组、高亮及快速搜索/独立搜索页一致性。保留其他语言的冻结用例；不把检索成功解释为已实现任意简繁语句互搜。

## 7 界面、输入法与字体验收

### 7.1 消息、数字和语言推荐

UI 覆盖默认英语当前全部命名空间和键；当前为 `common/detail/explore/favorites/feed/geo/home/pages/popup/primitives/search/shell/shortcuts/templates`。保留 ICU 参数、富文本标签、select 键和 `other` 分支；计数 0、1、2、1,000、1,000,000 都有正确繁体输出，零结果按产品语义处理，不机械复制英语单复数。

继续用 `formatLocale('zh-Hant')`，其格式化 tag 为 `zh-Hant-u-nu-latn`；注册表与 HTML 不加格式化扩展。日期沿用 UTC，不擅自改为民国纪年。验证 Node 和三种浏览器的日期、数字、百分比及 hydration，无客户端二次简繁转换。

| 浏览器偏好 | 在目标语言可选时的建议 |
| --- | --- |
| `zh-Hant`、`zh-Hant-TW`、`zh-Hant-HK`、`zh-Hant-MO` | `zh-Hant` |
| `zh-TW`、`zh-HK`、`zh-MO` | `zh-Hant` |
| `zh`、`zh-CN`、`zh-SG`、`zh-Hans` | 保持现有 `zh-Hans` 行为 |
| `zh-Hans-TW` / `zh-Hant-CN` | 显式文字优先，分别为 `zh-Hans` / `zh-Hant` |
| 繁体不在当前可选语言集合中 | 不推荐未启用/未构建繁体，也不把该偏好强行折成简体；继续考虑后续偏好 |

菜单显示「繁體中文」，直接访问的 URL 与用户手选优先。推荐不自动跳转；切换同一内容保留稳定 ID，缺译时继续现有浏览/缺译规则，不新增地区 URL 别名。

### 7.2 必须走通的用户流程

- 首页或列表打开详情弹层、前后切换、Esc 关闭、刷新完整页及返回列表，URL 和滚动位置正确；完整页与弹层说明同源。
- 搜索和探索显示繁体分类、加载失败和空态；键盘导航与鼠标可达同一结果。
- `t_001` 输入「霧面陶瓷馬克杯」与「台灣製造」等值，`t_002` 选择本地化枚举标签，预览、复制和下载使用同一渲染结果；输入文本及枚举真实值不被转换。
- 用 `p_012` 检查英语原 Prompt，用 `p_217` 检查简体原 Prompt：详情、弹层、快捷复制、下载和 Markdown 中的正文与既有 resolver 结果一致；繁体页面不应选择 `p_217` 的英语正文变体，也不应把简体原文转换成繁体。
- 收藏、取消、撤销、跨语言再次打开使用同一稳定 ID；模板切换语言后仍遵守现有草稿/分享值保留合同。
- 参考图片与生成图片标签清楚，GIF 可播放/暂停，静态海报和动画说明一致。

搜索框和模板 token 输入中模拟 `compositionstart → update → end`，包括 `isComposing` 与 Safari 的 `keyCode: 229`。候选确认 Enter 不提前提交查询、跳转结果或新增 token，候选阶段 Esc 不关闭弹层；输入 C/S/斜线不触发站点快捷键。composition 结束后只提交完整词，快速连续输入的旧 Worker 响应不能覆盖新查询。

自动化事件验证之外，至少实际走查一种注音输入和一种繁体拼音或仓颉输入环境，记录系统、浏览器、输入法和步骤。尚未完成的真实输入法检查明确记为未验收，不能用事件模拟冒充。

### 7.3 排版、字体与可访问性

Chromium、Firefox、WebKit 在 360、768、1024、1440 CSS px、明暗主题下检查首页、列表、详情/弹层、模板、搜索、合集、专题和独立页。要求无意外水平滚动、控件重叠或关键文本遮挡，焦点可见，axe 无 serious/critical 问题。检查全角标点、长标题、含模型名/比例的中英混排与窄屏按钮。

复用 Noto Sans TC 标题子集与 PingFang TC/Microsoft JhengHei/Noto Sans CJK TC 正文字体栈。检查「範本、複製、儲存、參考圖片、髮絲、燈籠」等实际字符无缺字，标题子集覆盖实际标题和 display 消息键，Prompt 内层按其真实 lang 使用字体。首次普通繁体页面不下载 SC/JP/KR 子集；英语首屏不预载 TC 子集，明确显示其他语言文本的组件按实际内容判断。

至少记录 Chromium 原生 200% 缩放；其他浏览器验证重排，不能把减小 viewport 写成所有浏览器均完成原生缩放。记录截图、字体请求和无障碍检查范围；有问题时在现有字体/组件模块修复。

## 8 路由、SEO 与机器可读输出

| 输出 | 验收合同 |
| --- | --- |
| HTML/路由 | `/zh-hant/`、`lang="zh-Hant" dir="ltr"`，title/description 为繁体；路径通过 URL 模块产生 |
| canonical | 每个繁体正式页面指向自身规范地址；不 canonical 到简体或英语；默认根首页与英语别名关系保持 |
| hreflang | 用 `zh-Hant`，仅包含 indexable 的真实对应版本、自引用且双向一致；不输出 `zh_TW` 或虚构地区版本 |
| Open Graph | 复用 `og:locale: zh_TW`，它不代表建立台湾路由或更改 HTML lang |
| JSON-LD | 说明语言与实际 Prompt 语言分别准确；翻译不增加实测或型号事实 |
| sitemap、Markdown、index.md、llms.txt、外部 JSON 导出 | 仅 indexable 集合；回退页不作为繁体版本对外发布 |
| 详情 JSON、卡片、搜索、收藏 | 使用可浏览集合，保留实际 contentLocale/promptLanguage；不能误用 sitemap 过滤导致交互断链 |
| 聚合页 | 首页、分页、合集、专题依据实际展示成员判断收录资格，不改排序或隐藏条目降低覆盖 |
| 非索引页面 | 搜索、探索、收藏、缺译、错误页保持既有 noindex；语言切换仍可用 |
| preview / disabled | preview 全站 noindex；disabled 繁体不进入生产路由、菜单、sitemap 或导出 |

预览回退的标题、正文和共享字段按实际来源标记语言，不能仅因外壳繁体就标成 `zh-Hant`。若未来因内容变更出现合格回退浏览，其生产 canonical 指向自身并 noindex，无 hreflang、内容 JSON-LD 或外部导出；complete 门禁阻止将该状态作为新的繁体发布。

分别验证根路径与 `/prompt-seen` 子路径的 origin、尾斜杠、资源地址、语言切换、弹层 fetch 和 Worker URL。不得硬编码 `/zh-hant/` 字符串绕过 URL 模块。生产繁体首页必须进入 sitemap；站点部署检查确认正式域名无意外 noindex 响应头。

## 9 实施拆分与依赖

| 阶段 | 可交付改动 | 退出条件 |
| --- | --- | --- |
| P0 基线与策略 | 新报告、complete 策略、scope、术语、风格规范、批次清单 | 来源/依赖/工作区状态可追溯；其他 enabled 语言门禁未退化 |
| P1 基础内容 | H0 完整 UI、taxonomy、独立页及真实审校；启用 preview | 完整字典校验通过，基础内容 current，预览可构建 |
| P2 纵向试点与搜索 | H1、转换证据、受保护内容对比；冻结用例；搜索别名及必要回归测试 | 真实内容全流程可操作；序列化引擎/Worker、输入法模拟和正文一致性通过 |
| P3 全量内容 | H2/H3 分批 import、审校、promote | current/target 和 fieldsCurrent/fieldsTotal 相等，无未解决缺口；严格检查 ready |
| P4 发布候选 | 独立候选启用，执行第 10 节矩阵、实际输入法和视觉检查 | 根/子路径生产与预览验收通过，证据绑定同一候选提交及各 build ID |
| P5 发布与核验 | 既有部署流程、线上检查与回滚记录 | 线上版本/路由/搜索/SEO 正确；发布摘要可追溯 |

发布顺序为 P0 → P1 → P2 → P3 → P4 → P5。P2 搜索工作期间可继续准备后续翻译，进入 published 仍须相同的审校事务。每批提交保持可构建；共享 schema/API 变更若确有必要，按工程约定单独提交，不混进大批译文。

## 10 验证命令与完成标准

### 10.1 准备及每批验证

```sh
npm run --silent locale:check -- --locale zh-Hant --json
npm run --silent locale:check -- --all --json
npm run locale:scope -- --locale zh-Hant
# 核对 scope 差异及移除证据后，才更新快照。
npm run locale:scope -- --locale zh-Hant --apply
npm run content:validate
```

`--locale` 与 `--all` 互斥；CLI 参数错误退出 2，校验失败或严格未就绪退出 1。JSON 输出使用 `--silent`。`--all` 包含 enabled、preview 和有准备目录的语言，因此不能要求尚未准备的阿拉伯语或其他候选也 ready；要求全部 enabled 语言按各自策略通过，繁体另外执行严格检查。

### 10.2 全量候选验证

```sh
npm run locale:check -- --locale zh-Hant --strict
npm run --silent locale:check -- --all --json
npm run content:validate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run tokens:check
npm run storybook:build
```

每项记录真实结果。新增测试聚焦繁体差异：精确 code 分派、别名正负例、分词/高亮、格式化、文字优先推荐、真实正文保护与 Worker。通用事务、数组 owner、源变更失效和回滚沿用既有测试，只有发现覆盖缺口才扩展，不复制仅替换 locale 名称的整套实现测试。

### 10.3 构建矩阵

先在 `enabled: false, preview: true` 阶段验证生产排除繁体、预览包含繁体且全站 noindex。随后同一完成候选设为 `enabled: true, preview: true`，顺序构建并立即测试各自 `dist/`：

```sh
BASE_PATH= BUILD_MODE=production npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=production npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1
```

使用发布环境的 SITE_ORIGIN；测试由现有 Playwright 配置通过 nginx 服务静态产物，不用 `next dev` 证明静态部署正确。同一 checkout 不并发构建，避免 `.next`、generated 和 dist 互相覆盖。每份产物保存配置、提交和 build ID 后再构建下一份。现有 CI 为根路径 production + 子路径 preview，额外的子路径 production 必须显式完成。

繁体已包含在候选中时，语言测试不能因检测失败整组 skip。保存重试、跳过和失败原因；涉及旧语言的已知基线问题单列，不以它们掩盖本轮回归。

比较同源树、同配置的接入前后构建，记录繁体索引原始/gzip 大小、文件数、HTML 字节、构建耗时，以及英语/繁体首页、列表、模板的首屏 JS 和字体请求。沿用现有性能预算与记录过的例外，不新增预算豁免；普通页面不得预载搜索索引、转换字典、审校数据或其他语言完整消息。

### 10.4 完成条件

- [x] 策略为 complete/fingerprint/source-only，scope 对应最新公开目标，无无据移除。
- [x] 繁体报告 `ready: true`、`blocking: false`，localCurrent 与 indexable 等于 target，fieldsCurrent 等于 fieldsTotal；missing/draft/unreviewed/outdated/archived/invalid/fallback 均为 0。
- [x] 每个目标和字段具备当前指纹的真实审校；转换来源、共用字/固定文字理由、图片/GIF 和交互证据可追溯。
- [x] 原 Prompt、模板输出合同、用户输入、生成与许可事实保持一致；新增繁体解释字段未覆盖其他语言。
- [ ] 冻结搜索用例及负例、真实 Worker、语言推荐、格式化、输入法、字体、布局和无障碍验收通过。
- [x] 全部 enabled 语言门禁与既有搜索用例无本轮回归；disabled/preview 负向检查和三个候选构建矩阵通过。
- [ ] 生产候选的性能、静态输出及 SEO 证据绑定提交与 build ID；不存在以预览 noindex 结果代替生产验收。
- [ ] 正式部署的 build ID 和线上检查通过，记录部署时间、提交、证据及上一成功部署。完成候选验收与完成正式上线分别记录。

## 11 发布、回滚与持续维护

沿用 `.github/workflows/deploy.yml`，部署后运行既有 `check:live --expect-build` 检查，并核对繁体首页、Prompt、模板、列表第二页、搜索索引、sitemap 和 canonical/hreflang。平台预览使用既有 `--platform` 合同。注册表 enabled、构建通过或本地浏览成功均不能代替线上部署证据，也不能证明搜索引擎已收录。

`production-acceptance.json` 记录 release commit、scope/policy 指纹、启用语言、各构建的 build ID/config、测试结果、索引版本、性能结果、线上核对时间与上一成功部署。若复制正文错误、主要路由失效、版本不匹配或收录输出错误，使用既有 `.github/workflows/rollback.yml` 回到完整的已验证部署；HTML、Worker、generated JSON 和索引一起回滚。

保留失败候选的译文和证据以便修复。长期撤下繁体需提交 `enabled: false` 并重新构建，不手改线上文件。后续新增或修改公开源内容继续执行报告差异 → 翻译/复审 → promote → 全语言门禁；不因简繁接近而跳过审校或降低 complete 策略。

### 实施补充：纯类别查询排序

`zh-Hant` 查询经 trim、NFKC 和大小写归一后，若完整匹配已注册的类别词（如「範本」「模板」「template」），对应类别组按稳定 ID 顺序浏览，不以别名字段长度决定排序。其余类别仍保留原相关度、总数和高亮；复合查询、前缀和其他 locale 不受影响。此规则不特判具体内容 ID。
