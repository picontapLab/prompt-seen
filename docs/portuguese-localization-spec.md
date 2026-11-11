# 巴西葡萄牙语完整接入实施规格

状态：实施与验收中；实际进度见 [acceptance.md](../production/localization/pt-BR/acceptance.md)。日期：2026-11-11（America/Los_Angeles）。首发范围已确认：全部公开内容完成葡语翻译和审校后再启用。工程基线为 `ec6051f3ac7c` 及当前工作区；下述数量来自本地只读覆盖检查，不代表线上状态。

交付 `pt-BR` 巴西葡语站点，使用 `/pt-br/` 路径与 `Português (Brasil)` 名称。界面、内容说明、操作指导、搜索和对外元数据完整本地化，分批准备，整体上线。沿用日语和德语的正文策略：实际可复制的 Prompt 保留原始正文及真实语言，首版不新增葡语 Prompt 变体。

本规格供工程、翻译、审校和发布维护者执行。[通用本地化流程](localization-workflow.md)定义已有工具合同，[正文多语言设计](multilingual-prompt-design.md)定义正文与模板语义，[工程约定](engineering-conventions.md)和[运维手册](operations.md)定义实现与部署要求。本规格增加葡语范围、语言规则、实施顺序和验收条件；不重新实现通用本地化框架。

## 1 交付范围

### 1.1 必须完成

- 完整 UI 字典，涵盖首页、导航、列表与筛选、搜索、详情、弹层、模板编辑、收藏、错误及空状态、快捷键、辅助技术名称。
- 动态目标集合中的全部 Prompt、模板、合集、专题、About 和 License：标题、摘要、说明正文，以及源文已有的独立 SEO 文案和推荐理由。
- 所有实际展示的解释字段：分类与搜索别名、模板字段和选项标签、输入要求、参考图槽位说明、媒体 alt/caption、图像标注说明、示例观察及来源解释。
- 葡语查询、重音和 Unicode 归一化、领域别名、数字日期与复数格式、桌面和移动端排版。
- 指纹审校、生产候选、SEO/GEO 与导出一致性、上线核验和后续增量维护。

### 1.2 保持不变的语义

保留稳定 ID、英文 slug、默认语言、根首页、URL 生成器和静态导出架构。注册表使用 `pt-BR`，文件名与翻译字典键使用同一大小写；只有 URL 前缀使用 `pt-br`。不新增通用 `pt` 或 `pt-PT` 页面，后续欧洲葡语需独立本地化。

不翻译 `prompt.txt`、模板 `body.txt`、模板变量 ID、约束、实际枚举值、默认值、用户输入及运行参数；不改模型标识、来源链接、许可标识、时间、Prompt 哈希和生成结果。可以翻译这些事实的解释文字。首版没有新的生图任务、运行时翻译服务或正文语言选择器。

`locale` 是路由及界面语言，`contentLocale` 是说明实际语言，`promptLanguage` 是选定 Prompt 的实际语言，三者不得混用。原始正文恰为葡语时保留原文；不得把英文或中文 Prompt 标成葡语，或因说明翻译而声称该正文已用葡语实测。

## 2 当前基线与工程缺口

### 2.1 覆盖快照

基线命令为 `npm run --silent locale:check -- --locale pt-BR --json`。当前注册策略是 `incremental / fingerprint / optional`，`enabled: false`，未设置预览。只读内存模拟改为本规格的 `complete / fingerprint / source-only` 后，目标及字段总量相同，未发现葡语正文变体冲突。

| 内容 | 目标数 | 葡语 current |
| --- | ---: | ---: |
| Prompt 说明 | 285 | 0 |
| 模板说明 | 75 | 0 |
| 合集 | 16 | 0 |
| 专题 | 3 | 0 |
| About 与 License | 2 | 0 |
| 内容单元合计 | 381 | 0 |
| UI 消息 | 427，14 个命名空间 | 0 |
| 共享解释字段 | 1,793 | 0 |
| 报告 fieldsTotal | 2,220，含 UI 消息 | 0 |

说明来源为 371 个英语单元和 10 个简体中文单元。共享字段为 Prompt 882、模板 308、媒体 363、示例 206、taxonomy 34；同一字段只计一次。专题 key 为 `topic/category/landscape`、`topic/category/poster`、`topic/style/ink`。

报告中 379 个内容单元可回退浏览，另两个独立页面尚不可用；`ready: false`、`indexable: 0`。可浏览数不计入翻译完成数。此时普通检查退出 `0` 只代表检查执行成功，不能作为启用条件。

以上数量不写入业务代码或固定总量测试。P0、每批发布及生产候选前均重新计算；以最终候选的动态目标为准。

### 2.2 复用与新增

| 范围 | 现状 | 本轮动作 |
| --- | --- | --- |
| 策略和路由 | 已注册 `pt-BR`；en、zh-Hans、ja、de 已启用 | 调整葡语策略，依阶段设置 preview/enabled；不改其他语言状态 |
| 覆盖、审校、导入和发布 | 通用 CLI、report v2、scope v2、batch/reviews v1 已实现 | 复用现有工具，增加葡语数据和回归用例 |
| UI 与内容 | 尚无葡语字典、说明和准备目录 | 新增完整字典、全部说明、共享字段及真实审校 |
| 搜索 | 共用分词已支持拉丁重音折叠；领域 profile 目前只有德语 | 增加葡语领域别名和冻结验收集；仅在用例证明有缺口时修改归一化 |
| SEO | `ogLocale('pt-BR')` 已映射为 `pt_BR` | 验证真实产物，不重复添加映射 |
| CI | 已按配置输出全语言报告并执行构建门禁 | 纳入葡语准备目录与用例，补生产子路径验收 |

历史文档中“德语仍未启用”和“需要新增通用 CLI”的描述不作为本轮工程现状；以注册表和当前实现为准。

## 3 配置与发布状态

P0 将葡语注册项明确设为以下准备态：

```yaml
- code: pt-BR
  pathPrefix: pt-br
  nativeName: Português (Brasil)
  htmlLang: pt-BR
  direction: ltr
  enabled: false
  preview: false
  phase: 1
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

`complete` 实现已确认的全量上线要求；`source-only` 将首版保留原始 Prompt 的范围转为可检查约束。如发现既有葡语正文变体，报告冲突并单独处理，不能静默删除或自动改选正文。

| 阶段 | enabled | preview | 进入条件与效果 |
| --- | --- | --- | --- |
| 准备 | false | false | 建立 scope、词表与翻译批次；生产不生成葡语 |
| 内部预览 | false | true | 完整 UI 字典、必需独立页面及全局分类字段完成审校；允许内容库尚未齐全 |
| 生产候选 | true | true | 在隔离候选分支满足全量 strict ready，再构建验证；尚未部署 |
| 正式发布 | true | true | 发布已通过验收的实际提交；每次后续构建继续执行完整覆盖门禁 |

preview 构建的全部页面保持 noindex，不输出可索引集合。准备期的缺译不阻止现有语言生产发布；结构错误、已经加入字典目录的不完整字典，以及其他 enabled 语言的既有门禁仍需通过。

不能用 `enabled: false` 的生产产物验收葡语，也不能用 preview 产物证明生产 sitemap 和 hreflang 正确。不能为绕过缺口降级为 incremental、metadata，或删减 scope。

## 4 动态目标与交付文件

### 4.1 目标计算

直接使用 `locale:check` 的 `items`、`fields`、`dependencies`、`changes` 和报告指纹。目标包含当前公开声明、葡语自身的公开内容及保留的 scope 历史；按稳定 key 去重。真实来源使用报告的 `sourceLocale` 和 `sourceFile`，不把英语回退版本当成统一翻译源。

逐页追踪模板、历史示例、媒体、输入契约、图像标注、分类及合集成员等实际依赖。合集、专题和首页的收录资格还依赖实际展示成员，不能只批准其标题和正文。全局分类与 UI 字段无论是否落入首批样本都必须完成。

新增公开目标自动进入范围；源文、译文或依赖变化必须重新审校受影响部分。正式归档或删除按现有 scope 证据规则记录移除原因；隐藏源内容或禁用源语言不能缩小目标。

### 4.2 需要新增或修改的文件

| 路径 | 责任与内容 |
| --- | --- |
| `content/locales.yaml` | 葡语策略、预览和最终启用开关 |
| `src/i18n/messages/pt-BR/*.json` | 完整 14 个命名空间，后续随默认字典增量更新 |
| `content/{prompts,templates,collections,pages}/…/locales/pt-BR.mdx` | 按报告 targetFile 写入说明和 SEO 文案 |
| 专题的报告 targetFile | 写入三个现有专题及后续新增专题的葡语说明，不猜测目录结构 |
| 依赖 YAML 的 `pt-BR` 文本键 | 仅写报告允许的目标字段，不复制整份源文件 |
| `production/localization/pt-BR/scope.json` | `locale:scope --apply` 生成的全量 scope v2 |
| `production/localization/pt-BR/glossary.yaml`、`style-guide.md` | 术语、地区用法、大小写、UI 与内容表达规则 |
| `production/localization/pt-BR/reviews.json` | 真实的逐页、逐字段和 UI 指纹审校记录 |
| `production/localization/pt-BR/batches/*.json` | 仅保存现有 batch schema 的导入输入；依赖、批次 ID 和审校结论另记 review-evidence.md |
| `production/localization/pt-BR/search-cases.json` | schemaVersion 1 的冻结查询和稳定 expectedKeys |
| `production/localization/pt-BR/review-evidence.md`、`acceptance.md` | 文案、媒体、交互证据；最终提交、构建配置、测试及发布结果 |
| `src/modules/search/profiles.ts` 及相关测试 | 葡语别名；分析行为变更时更新 analyzerVersion |
| `tests/e2e/portuguese.http.spec.ts`、`portuguese.browser.spec.ts` | 新增真实葡语产物与交互验收 |

`production/localization/pt-BR/` 的出现会使葡语进入现有 `locale:check --all` 报告，无须增加语言白名单。`.artifacts/localization/pt-BR/pending/{batchId}/` 存放导入器候选和 manifest，属于临时产物；需要长期保存的批次输入、审校和验收证据放在 production 目录。

## 5 巴西葡语编辑规范

### 5.1 术语与语气

采用现代巴西葡语，操作指导使用 `você` 的自然表达，按钮使用简短动词。首批统一以下术语；P1 结合真实页面审校后写入 glossary，后续变更同步所有用例和文本。

| 概念 | 默认表达 | 使用约束 |
| --- | --- | --- |
| Prompt | prompt / prompts | 保留产品领域常用词，不译成模型名称 |
| Template | template / templates | 与 AI model 的 `modelo` 区分；搜索仍支持 `modelo de prompt` |
| Collection | coleção / coleções | 保留重音 |
| Reference image | imagem de referência | 明确参考输入与生成结果的区别 |
| Generate / Copy / Download | Gerar / Copiar / Baixar | 实际功能不是在线生成时，不用 Gerar 暗示可在线生图 |
| Search / Filter / Favorites | Buscar / Filtrar / Favoritos | 导航、提示与 aria 名称一致 |
| File / Screen / Mobile phone | arquivo / tela / celular | 巴西用语，避免无意混入 ficheiro / ecrã / telemóvel |
| Background / Lighting | fundo / iluminação | 与画面和具体参数含义对应 |

保留人名、品牌、模型名、URL、代码以及画面中有意指定的文字。对于可审校解释字段中有意保留的原文，记录精确 key 和理由，不使用目录级豁免。来源不确定性、生成失败和效果限制必须保留；译文不能把示例观察改成模型能力保证。

### 5.2 字典与格式

命名空间以默认字典为准，当前为 common、detail、explore、favorites、feed、geo、home、pages、popup、primitives、search、shell、shortcuts、templates。键、ICU 变量和富文本占位符完整对齐；翻译显示文案，不改变量名。

部分字典先在准备目录完成；通过完整性校验后，一次加入 `src/i18n/messages/pt-BR/`。该目录即使 disabled 也参与结构检查，不能提交半套字典破坏其他语言构建。

使用既有 `formatLocale('pt-BR')` 和固定时区设置，渲染时保留 `pt-BR` 的地区规则。数字示例 `1234.56 → 1.234,56`，长日期示例 `2026-11-11 → 11 de novembro de 2026`，具体页面继续沿用原有格式选项；不额外引入货币转换或自动切换巴西时区。

复数至少验收 0、1、2；不能复制英语的分支语义。当前 Intl 的 pt-BR 将 0 和 1 归为 one，可用明确的 `=0` 表达零项状态；保留 other，涉及百万数量时检查 many 或其合法回退。Node、Chromium、Firefox、WebKit 的实际显示须一致，不能只验证 ICU 可解析。

## 6 翻译与审校闭环

### 6.1 建立基线

完成第 3 节的策略调整后执行：

```bash
mkdir -p .artifacts/localization/pt-BR
npm run --silent locale:check -- --locale pt-BR --json > .artifacts/localization/pt-BR/report.json
npm run locale:scope -- --locale pt-BR
npm run locale:scope -- --locale pt-BR --apply
```

scope 保存全量目标，首批样本另行列在 acceptance.md，不覆盖 scope。保存报告的 sourceRevision、scopeFingerprint 和 policyFingerprint；sourceRevision 包含工作区内容信息，单独的 Git commit 不能替代源指纹。

### 6.2 准备和导入批次

按共享依赖分组，每批建议 25–40 个 Prompt 或 10–15 个模板；首批按第 10 节覆盖复杂场景。批次规模只影响审阅成本，不改变全量发布范围。先处理全局术语与共享字段，再发布依赖它们的页面；已经有效的共享批准可复用。

沿用 batch schemaVersion 1，顶层为 `schemaVersion`、`locale: "pt-BR"`、`operations`。每条 operation 的合同如下：

| 字段 | 页面操作 | 共享字段操作 |
| --- | --- | --- |
| key | 报告 item.key，如 `prompt/p_101` | 报告 field.key |
| sourceField / targetField | 均为 `["$page"]` | 原样使用报告字段路径 |
| expectedSourceHash | item.sourceFingerprint，完整页面指纹 | field.sourceHash |
| expectedTargetHash | item.targetHash，缺失时显式 null | field.targetHash，缺失时显式 null |
| expectedIdentity | 不需要 | 含数字数组索引时必须提供 field.identity |
| translation | title、description、body；源文存在时带 seoTitle、seoDescription、reasons | 与源字段一致的字符串或字符串数组 |

页面 translation 是完整文案集合，遗漏可选文案会移除旧值，更新时不能只传局部标题。导入器自动维护 translation 元数据；不能把页面 `sourceHash` 的短哈希误用于 `expectedSourceHash`。UI JSON 不走此导入器，作为完整字典编辑并按报告字段指纹审校。

```bash
npm run locale:import -- --locale pt-BR --file production/localization/pt-BR/batches/batch-001.json
npm run locale:import -- --locale pt-BR --file production/localization/pt-BR/batches/batch-001.json --apply
```

先检查 dry-run 的目标、冲突和其他语言差异，再 apply。新页面默认 draft / machine-draft；涉及已发布葡语页面或共享依赖时整批进入 pending。保存 apply 返回的 64 位十六进制 batchId，检查对应 manifest 和候选；不能把 pending 文件直接覆盖进内容树。

哈希过期、数组实体移动、重复字段、越界路径或并发编辑均须重新生成批次并复核。候选被人工修改后原 manifest 与批准不再适用；新批次必须包含实际修改，不能覆盖审校者修改来恢复旧哈希。

### 6.3 审校和发布内容

每页检查自然表达、事实、来源、许可解释、输入步骤、MDX 链接和已有 SEO 文案；每个媒体字段结合实际资产核对。GIF 涉及动态描述时观看动画并检查相关帧、时序和源资产，不能用封面审校代替动画审校。模板说明结合真实表单、参数与渲染结果验收。

reviews.json 沿用 schemaVersion 1、locale、records；记录含 key、sourceHash、targetHash、reviewer、真实 completedAt、conclusion（approved 或 changes-requested），可选 reason。页面 sourceHash 取完整 sourceFingerprint，共享字段和 UI 取对应 sourceHash。targetHash 必须对应实际审阅的译文：pending 页面和字段取 manifest 的 candidateHash，已落盘草稿和 UI 取重新检查后的 targetHash；不能用尚未更新的工作区 targetHash 批准 pending 译文。

审校者须能判断巴西葡语表达。AI 审校明确记录为 AI，不能声称为人工或母语者审校。翻译生成与质量复核分开记录，完成生成不自动产生 approved；浏览器和资产核验另附证据。源文或译文变更后，旧批准失效，不能仅替换哈希或时间续期。

```bash
npm run locale:promote -- --locale pt-BR --batch "$PT_BR_BATCH_ID" --reviews "$PT_BR_REVIEW_FILE"
npm run locale:promote -- --locale pt-BR --batch "$PT_BR_BATCH_ID" --reviews "$PT_BR_REVIEW_FILE" --apply
npm run --silent locale:check -- --locale pt-BR --json > .artifacts/localization/pt-BR/report.json
```

上述变量分别取 apply 返回的 batchId 和本批真实审校记录路径。promote 在写锁内重新检查源、目标、候选、生命周期及批准，一次合并本批字段和记录，失败回滚；重复相同发布为 no-op。disabled complete 语言可逐批发布文件，仍不能公开启用语言。每批核对 current 增量、剩余缺口及其他 enabled 语言门禁；整批验证失败则修复依赖后重试，不手工改状态跳过。

UI 字典及其批准随同一可审阅提交维护；发布页面前先完成该批的必要共享字段批准。导入和 promote 均不部署站点。

## 7 葡语搜索和界面适配

### 7.1 搜索合同

复用 MiniSearch、现有说明正文索引及构建端与 Worker 共用的 tokenizer。`ç`、`ã`、`õ`、`á`、`é`、`ê`、`í`、`ó`、`ô`、`ú` 的无重音输入应召回同一相关目标，NFC/NFD 和大小写变化不影响召回。归一化只作用于检索，显示、复制及高亮保留原文；高亮范围不得截断组合字符或使用归一化后长度。

在 `profiles.ts` 中增加限于葡语的领域词表，复用现有 aliases 低权重字段，不将新增词表应用到其他语言。首版至少覆盖 retrato / portrait、cartaz / pôster / poster、adesivo / sticker、fotografia de produto / foto de produto / packshot、composição / composition、fundo / background、iluminação / lighting、template / modelo de prompt、coleção / collection，以及相关复数形式。

别名按语义定向扩展：产品摄影可关联摄影，普通摄影不能因此成为 packshot；`modelo` 单独出现不能把 AI 模型与模板全部混为一类。已有 AND 查询语义保持，停用词如 de 不在全站一刀切删除。首版通过真实查询验证短语及单复数，不引入通用词干算法或声称支持任意词形。

精确原词匹配优先于低权重别名；模型 ID、英文技术词和稳定内容 ID 仍可检索。修改 analyzer 行为须更新 `SEARCH_ANALYZER_VERSION` 并全量重建索引，Worker 继续校验 schemaVersion、analyzerVersion 和 buildId；版本不匹配走既有 stale 恢复流程。

### 7.2 冻结查询集

P1 在 `search-cases.json` 冻结至少 32 条、绑定真实稳定 key 的场景，P3 调优不能删除失败用例或把 expectedKeys 改成当前错误结果。沿用 `{schemaVersion: 1, locale: "pt-BR", cases: [...]}`；每条含 query、expectedKeys、topK，必要时 excludedKeys 和 reason。topK 默认为 5，按实际 UI 各 content-kind 分组独立计算。

| 场景 | 最少条数 | 必需例子和断言 |
| --- | ---: | --- |
| 有重音和无重音 | 8 | composição/composicao、iluminação/iluminacao、referência/referencia、coleção/colecao；每对命中同一相关 key |
| 大小写和 Unicode | 4 | 大写 RETRATO、PÔSTER，NFD 的 composição、iluminação；与规范形式召回一致 |
| 领域词与中英葡混合 | 12 | 产品摄影、海报、肖像、贴纸、背景、光照、参考图、GIF、template、coleção、英文技术词、葡语加模型 ID |
| 单复数 | 4 | retrato/retratos、adesivo/adesivos；预期目标一致 |
| 排除与边界 | 4 | 普通摄影不因别名命中产品专属样例、AI modelo 不等于模板、稳定 ID 定位、无结果查询 |

每条 expectedKeys 必须对应源文实际支持的内容，reason 说明相关性。无结果用例允许 expectedKeys 为空，并断言实际结果为空；不能只遍历空数组造成测试恒通过。纯语言小 fixture 检查归一化和负例；真实语料测试加载序列化后索引，浏览器测试再通过实际 Worker 验证同一查询集。

### 7.3 字体与交互

复用现有拉丁字体；验收 `á à â ã é ê í ó ô õ ú ü ç` 及其大写形式，无缺字、意外字体回退或重复字体下载。不为葡语新增整套字体库。

检查长导航、筛选项、模板字段、复制结果、下载提示、移动端操作栏和弹层。保留完整可访问名称，使用自然换行，不以截掉关键动作文字通过布局验收。参考输入、多输入、GIF、键盘操作和复制失败状态必须使用真实葡语字典，不能靠测试中临时替换英文标签验收。

浏览器 `pt-BR`、`pt`、`pt-PT` 偏好沿用现有推荐规则，可建议 `Português (Brasil)`；页面明确地区名称，不自动重定向，也不宣称提供了欧洲葡语。切换语言、刷新、直接打开链接及收藏返回保持既有偏好行为。首页没有葡语原始 Prompt 时允许选用其他语言原文，说明仍为葡语；不为凑同语言展出伪造正文变体。

## 8 路由与对外输出

| 项目 | 生产合同 |
| --- | --- |
| 地址 | `/pt-br/` 及已有资源路径；保持稳定英文 slug，由 URL 模块生成并支持 basePath |
| 语言 | HTML `lang="pt-BR"`、`dir="ltr"`；实际 Prompt 块按真实语言设置 lang |
| SEO 文案 | 葡语 title/description；canonical 自指当前正式地址，不指向英文页 |
| alternate | hreflang 使用 `pt-BR`，Open Graph 使用 `pt_BR`；仅输出双方真实可索引版本，保持既有 x-default 规则 |
| sitemap 和 GEO | sitemap、Markdown twin、llms 与导出按同一 indexable 判定输出；正文语言事实保持一致 |
| 系统页 | 搜索、收藏、错误等维持各自既有 noindex 策略，不因全量翻译全部改为 index |
| 预览和缺译 | 预览无可索引输出；缺译 fixture 的回退地址自 canonical、noindex，无 hreflang/结构化数据/Markdown twin |

全量上线不意味着每个 URL 都能被收录，分页、筛选、系统页和归档仍遵守既有规则。全部正式目标必须 current；首页及内容聚合页按实际展示集合核验，不能通过剔除回退卡片改变浏览顺序来通过 SEO 检查。

在 complete 葡语生产候选中人为移除一个目标译文或必要依赖，构建应被门禁拒绝。回退页面的完整 HTTP 行为使用独立 incremental fixture 验证，不修改真实葡语策略以生成缺译生产站点。

## 9 自动化验收矩阵

在现有配置、localization、search、home、SEO 测试中补充葡语边界；不复制整套通用测试。葡语 E2E 测试在未构建该语言时允许明确跳过，但 P5 必须确认候选包含 enabled 的 pt-BR 且葡语必测项实际执行。

| 编号 | 输入或操作 | 必须结果 |
| --- | --- | --- |
| PT01 | 准备、preview、生产三种配置 | 构建集合正确；生产中不会提前出现葡语入口和产物 |
| PT02 | 字典缺键、空字符串、ICU 参数变化 | 验证在替换生成目录前失败；正确字典按 pt-BR 渲染 0/1/2 |
| PT03 | 移除一个译文或共享依赖 | 缺口明确定位到 key；complete strict 和启用后的构建失败 |
| PT04 | 改源文、译文、独立 SEO 或合集理由 | 对应批准失效，未变的无关字段不失效 |
| PT05 | 仅使用 preview 草稿或其他语言回退 | current 不增加；生产候选不能通过全量门禁 |
| PT06 | 导入错误哈希、数组移动或批次冲突 | 整批拒绝且无部分写入，其他语言字段保持不变 |
| PT07 | promote 缺批准、候选被修改或目标并发归档 | 拒绝或回滚；合法重试幂等；保留审校记录 |
| PT08 | 新增非原文 `prompt-locales/pt-BR/` 变体 | source-only 冲突，不能自动删除或改选正文 |
| PT09 | 模板编辑后复制、下载、详情弹层 | 同模板版本和参数输出一致；用户输入、枚举输出值和历史运行哈希不变 |
| PT10 | 葡语偏好及语言切换 | 使用正确 code/prefix；pt-PT 仅可推荐巴西葡语；直接地址无偏好重定向 |
| PT11 | 冻结搜索集及重音高亮 | 序列化引擎与 Worker 均通过；UTF-16 范围完整；无结果断言有效 |
| PT12 | 旧 analyzerVersion/buildId | stale 后按既有刷新路径恢复，不混用索引 |
| PT13 | 根路径和 `/prompt-seen` 生产 HTML | 葡语 title/lang、canonical、互相 hreflang、OG 与实际 indexable 一致 |
| PT14 | 全量集合与机器可读输出对比 | indexable 地址集合一致，无 draft/回退/错误页泄漏；预览无索引输出 |
| PT15 | 无葡语原始 Prompt 的首页 | 仍有可用展出，说明及标注葡语化，原文语言标识真实 |
| PT16 | 360/768/1024/1440 宽、两主题、键盘和缩放 | 无页面横溢、关键动作裁切、严重/致命 axe 问题、hydration 错误或未捕获异常 |
| PT17 | 新增公开内容或修改共享源字段 | pt-BR、ja、de 等 enabled complete 语言均被纳入门禁，补齐后恢复 |
| PT18 | 浏览原有中英日德页面，预览阿拉伯语 | 既有路由、搜索、格式和 RTL 无回归，不提前加载葡语索引或审校数据 |

## 10 实施阶段和完成条件

所有阶段均以可独立审阅的提交组织，内容批次可多次提交。表中角色是工作职责，可由同一维护者承担，但生成、审校和验收的结果分别留存。

| 阶段 | 主要责任 | 工作与输出 | 完成条件与依赖 |
| --- | --- | --- | --- |
| P0 基线与策略 | 工程 | 调整为 complete/fingerprint/source-only；记录最新报告、scope 和缺口 | 葡语仍 disabled；已有语言状态不变；目标与依赖可追踪；PT01、PT08 的策略边界通过 |
| P1 语言基础 | 翻译、审校 | 词表、风格指南、全部 UI、About/License、全局 taxonomy；冻结搜索用例及首批稳定 key | UI 和全局字段指纹审校有效；独立页面 current；字典校验通过后开启 preview；依赖 P0 |
| P2 代表批次 | 翻译、工程、审校 | 至少 20 个 Prompt、3 个模板、2 个合集、1 个专题及其依赖 | 完整走通 import → review → promote；真实页面流程通过；依赖 P1；成员依赖可能扩大样本数量 |
| P3 搜索与界面 | 工程、审校 | 葡语 profile、格式/高亮测试、真实 Worker 与页面检查 | 32 条冻结查询及 PT09–PT12、PT15–PT16 通过；依赖 P2，搜索目标须包含在已译样本中 |
| P4 全量内容 | 翻译、审校 | 逐批补齐动态目标与所有依赖，重算源变更差异 | strict ready，items 全部 current，fields 全部 current，缺译/草稿/过期/未审校为 0；依赖 P2，生产候选还依赖 P3 |
| P5 生产候选 | 工程、验收 | 隔离候选提交 enabled:true；根路径、生产子路径和 preview 构建；保存完整证据 | 第 9、11 节通过，发布提交及产物可追溯，回滚目标已记录；依赖 P3、P4 |
| P6 发布与核验 | 发布维护者 | 发布验收过的实际提交，检查线上 buildId、葡语首页/详情/搜索和 SEO | 平台、正式域名核验通过；记录部署和回滚 ID；依赖 P5 |

P2 样本必须覆盖中英文真实源、字面 Prompt、模板派生、不同模板字段类型、多个参考输入、带标注图片、GIF、历史运行、长文本以及合集/专题成员。P1 在 acceptance.md 固定样本 key 和覆盖关系；P2 不能仅选最短、最简单的内容。样本用于验证流程，不能作为缩小首发范围的依据。

每批完成都保留剩余缺口；P4 完成前只宣称“预览完成”或“内容批次完成”。所有阶段直到 P6 通过才算葡语接入交付完成。

## 11 生产候选与发布操作

### 11.1 进入候选的门禁

P4 的报告必须满足 `ready: true`、`blocking: false`、`localCurrent === target`、`fieldsCurrent === fieldsTotal`，所有活动目标与字段的审校为 current。missing、draft、unreviewed、outdated、invalid 为 0，移除项有合法证据。先检查当前源变化，再更新 scope；scope 快照本身不是审校证据。

```bash
npm run locale:check -- --locale pt-BR --strict
npm run --silent locale:check -- --all --json
npm run content:validate
npm run typecheck
npm run lint
npm run format:check
npm test
```

`--all` 报告仍包含 ar 等未完成预览语言，不使用 `--all --strict` 要求所有准备语言同时 ready。全语言结构/发布错误必须处理；现有 enabled complete 语言不得降级。UI 或样式有变更时补跑 tokens、Storybook 和对应浏览器检查，CI 继续执行其完整既有检查。

### 11.2 同一提交的构建矩阵

在不触发正式自动部署的 `codex/portuguese-production-candidate` 分支或等价隔离工作区创建完整候选，包含 `pt-BR.enabled: true`、内容、审校和配置。不要携带与本轮无关的未提交修改。`PT_BR_RELEASE_COMMIT` 取该候选完整提交 SHA；以下命令只用于候选已经 ready 后的验收。

```bash
BUILD_ID="$PT_BR_RELEASE_COMMIT" BUILD_MODE=production BASE_PATH='' npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e

BUILD_ID="$PT_BR_RELEASE_COMMIT" BUILD_MODE=production BASE_PATH=/prompt-seen npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e

BUILD_ID="$PT_BR_RELEASE_COMMIT" BUILD_MODE=preview BASE_PATH=/prompt-seen npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e
```

每个构建完成后先运行该产物的测试并归档证据，再替换 dist；按现有 Playwright/nginx 配置使用 Node 24、Docker 和已安装的浏览器。保持仓库已验证的浏览器运行时配置，包括 CI 中现有 Firefox 兼容安排。

现有 CI 的子路径矩阵为 preview，不能替代上述 production 子路径测试。必要时可将专门的候选测试写入 CI，验收要求保持相同。生产 HTTP 必测 metadata、sitemap、Markdown/JSON、404、静态资源 MIME、分页及子路径地址，不能只看内部 JSON 或 next dev 页面。

真实葡语浏览器流程覆盖 Chromium、Firefox、WebKit，360/768/1024/1440 CSS px、明暗主题、键盘、焦点、可访问名称和 axe。至少在 Chromium 验证原生 200% 缩放；其他浏览器的等效 reflow 与原生缩放结果分别记录，不能将窄视口测试写成原生缩放证据。

### 11.3 性能与证据

使用同一代码、内容和配置对比葡语 disabled/enabled 产物，记录构建用时、文件数、HTML/JSON 总字节、各语言搜索索引 gzip、代表页首屏 JS 和实际字体请求。沿用总体设计第 16 章和 `scripts/measure-first-load.ts` 的测量方式及已记录预算例外；新增葡语不能导致普通页面预载所有语言字典/索引，审校记录不能进入客户端包。

P5 的 acceptance.md 至少记录：

- 完整 commit、buildId、sourceRevision、scopeFingerprint、policyFingerprint、构建模式、origin、basePath 和生成时间。
- 最终动态数量、strict 报告、译文审校证据、冻结搜索结果及实际 Worker 结果。
- 各构建和浏览器的命令、退出码、通过/失败/跳过数、失败重试、截图或 trace 路径；葡语必测项无条件性跳过。
- 格式、字体、媒体、模板复制下载一致性和性能比较结果；仍有阻塞项时不写验收通过。
- 上一成功部署的标识与恢复方式。机器生成的详细结果可放相邻 JSON，文档链接到实际文件。

基线报告与最终报告区分保存。最终报告基于最新源树生成，不能复用准备期数字或其他语言历史验收记录。

### 11.4 正式发布与回滚

按现有部署流程发布已验收提交。若合并产生新提交、上游内容变化或生产配置不同，重新执行对应候选检查，以实际部署提交为准。HTML、搜索索引及其他生成数据作为一套产物切换，不混用不同 buildId。

部署后执行现有平台与正式域名检查：

```bash
npm run check:live -- --site "$PT_BR_PLATFORM_URL" --platform --expect-build "$PT_BR_RELEASE_COMMIT"
npm run check:live -- --expect-build "$PT_BR_RELEASE_COMMIT" --wait 180
```

上述变量来自实际部署 URL 和验收提交；构建与检查使用同一生产 origin/basePath 配置。确认葡语首页、代表 Prompt/模板、第二页列表、sitemap、canonical、hreflang 和静态资源，再执行葡语搜索及复制的线上冒烟。平台域名继续 noindex，正式域名遵守生产索引规则；记录最终 buildId 和部署 ID。

出现核心流程不可用、语言产物缺失、错误收录或正文/运行事实损坏时，使用[既有回滚流程](operations.md#rolling-back)恢复上一成功静态部署，并处理触发问题的提交，防止下次部署再次上线。验收回滚后的 buildId 和核心页面；不以把 coverage 降为 incremental 作为应急修复。

## 12 上线后的维护与最终完成定义

新增公开内容进入动态目标后，葡语说明、依赖和真实批准须随内容一起就绪；源内容可先在候选批次准备。源文或共享字段变化只撤销受影响的批准，维护者依据报告变化重新翻译或复核，不批量刷新审校时间。

新增 UI key 必须同时补齐所有 buildable 字典，葡语仍执行逐字段指纹审校；新术语和查询进入 glossary 与搜索回归集。归档、链接变更和合集成员调整重新计算目标及聚合页收录资格。正式部署持续使用同一构建门禁。

交付完成需同时满足：全量 current 内容、真实语言与资产审校、完整葡语操作流程、冻结搜索用例通过、生产根路径和子路径验收、实际部署版本核验及可用回滚记录。仅创建字典、翻译部分内容、strict ready 或改 enabled 开关，均不能单独表示已完成上线。
