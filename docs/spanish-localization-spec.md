# 西班牙语接入实施规格

状态：本地实施完成，P6 本地验证已记录（含 Firefox 默认后台标签环境限制）；按用户要求仅本地提交，远程 CI 与 P7 发布未执行。日期：2026-11-11（America/Los_Angeles）。工程基线：`ec6051f3` 及当前工作区。本文的数量来自本地覆盖分析，不是线上发布统计。

下一种接入语言为通用西班牙语 `es`。先完成界面和 30 个内容单元的预览试点，再分批完成全部公开内容及依赖的翻译、审校和搜索验收，最后启用正式发布。首发采用 `complete + fingerprint + source-only`，与日语、德语的发布要求一致。

沿用静态导出、语言注册表、next-intl、文件内容库、MiniSearch 和现有 locale CLI。主要交付物是西语字典、说明、共享解释字段、审校证据和验收用例；工程增量集中在西语搜索规则和测试覆盖。

## 1 范围与适用规则

本规格承接[通用本地化规格](general-localization-spec.md)、[本地化流程](localization-workflow.md)和[工程约定](engineering-conventions.md)，细化西语的实施顺序和通过条件。正文变体规则继续遵守[正文多语言设计](multilingual-prompt-design.md)。旧文档中“德语尚未启用”“CLI 仅支持日语”等历史状态不能作为本轮工程基线。

本轮包含界面、内容说明、SEO 文案、媒体 alt/caption、模板字段帮助、输入指导、示例备注、分类与检索词、语言入口、搜索、排版、构建和上线验收。解释性文案的可写范围以检查报告和导入器 allowlist 为准。

首发保留 Prompt 的原始语言、字节、模板变量与参数值、生成记录、模型事实、图片、许可标识、稳定 ID 和 slug。`source-only` 不等于“全部使用英语”：原始中文、日文 Prompt 仍使用原文。西语界面中的用户输入可以包含西语，模板继续按现有约束渲染，不自动翻译输入，也不据此宣称生成效果已经验证。

在线翻译、翻译 SaaS、新数据库、新的生图验证、地区版西语站和其他新语言发布不属于本轮。保持默认语言、根首页及 `/en/` 别名关系；语言推荐沿用现有机制，不增加按 IP 或请求头强制跳转。

## 2 当前基线与工作量

注册表已启用 `en`、`zh-Hans`、`ja`、`de`；`ar` 用于预览。`es` 当前为 disabled、非 preview，策略为 `incremental + fingerprint + optional`。现有 `locale:check`、`locale:scope`、`locale:import`、`locale:promote` 均支持注册语言。

| 对象             |         当前目标数 | 西语就绪数 |
| ---------------- | -----------------: | ---------: |
| Prompt 说明      |                285 |          0 |
| 模板说明         |                 75 |          0 |
| 合集             |                 16 |          0 |
| 专题             |                  3 |          0 |
| About 与 License |                  2 |          0 |
| 内容单元合计     |                381 |          0 |
| UI 消息          | 427，14 个命名空间 |          0 |
| 共享解释字段     |              1,793 |          0 |
| 审校字段合计     |              2,220 |          0 |

共享字段按实际路径去重：Prompt 882、媒体 363、模板 308、示例 206、taxonomy 34。页面说明来源为 371 个英语、10 个简体中文单元；共享字段各自使用报告记录的来源，不能继承页面的 sourceLocale。

同一次本地分析中，日语、德语均为 381/381 个 current 内容单元、2,220/2,220 个 current 字段，`ready=true`、`blocking=false`。西语为 `ready=false`、`blocking=false`；候选生产分析中的 379 个 fallback 只说明内容库可以回退浏览，不代表已有西语翻译或线上西语地址。

这些数量只用于估算。实施、合并和发布前均从实际提交重新生成报告；验收比较动态 `target` 与 `fieldsTotal`，不能把 381 或 2,220 写成固定测试断言。

## 3 语言配置与发布阶段

准备期将 `content/locales.yaml` 中已有的西语项改为下列策略，不新增重复语言项：

```yaml
- code: es
  pathPrefix: es
  nativeName: Español
  htmlLang: es
  direction: ltr
  enabled: false
  preview: false
  phase: 1
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

| 阶段           | enabled | preview | 进入条件与构建行为                                                                     |
| -------------- | ------- | ------- | -------------------------------------------------------------------------------------- |
| 准备           | false   | false   | 设置最终策略并记录 scope；生产和预览均不生成西语页面                                   |
| 试点及全量准备 | false   | true    | 完整 UI 字典、基础页面和全局字段已审校；预览生成西语，所有页面 noindex；生产仍排除西语 |
| 生产候选       | true    | true    | 在隔离候选分支完成全部严格门禁；生产产物包含西语，尚未进入自动部署分支                 |
| 正式发布       | true    | true    | 发布已验收提交；preview 构建仍保持 noindex                                             |

准备阶段即可设置 complete。未启用的 complete 语言允许分批 promote；它的缺口不会因回退而消失，也不应通过降低策略解决。启用后，每次内容发布都必须满足西语完整覆盖。

浏览器偏好 `es-ES`、`es-MX`、`es-AR`、`es-419` 应在西语可选时推荐 `es`，不产生对应的地区 URL 或 hreflang。数据匹配使用 `es`，格式化使用既有 `formatLocale('es')`，HTML 使用 `lang="es" dir="ltr"`。语言切换、收藏和深链接继续使用稳定 ID 与 URL 模块。

## 4 文件与证据组织

| 位置                                                              | 交付物与写入方式                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/i18n/messages/es/{namespace}.json`                           | 完整 UI 命名空间；直接维护 JSON，不经 locale importer        |
| `content/prompts/*/locales/es.mdx`                                | Prompt 标题、description、正文及独立 SEO 文案                |
| `content/templates/*/locales/es.mdx`                              | 模板说明                                                     |
| `content/collections/*/locales/es.mdx`                            | 合集说明及以成员 ID 为键的推荐理由                           |
| `content/taxonomy/{categories,styles,use-cases}/*/locales/es.mdx` | 按实际报告中的 targetFile 写专题，不能推导复数目录名         |
| `content/pages/{about,license}/locales/es.mdx`                    | 独立页面，无跨语言说明回退                                   |
| 报告中的共享 YAML 文件与 targetField                              | 只增加或更新允许的 `es` 文本键，复用已有媒体和内容事实       |
| `production/localization/es/scope.json`                           | `locale:scope --apply` 生成的 schema v2 范围快照             |
| `production/localization/es/reviews.json`                         | schema v1 的真实逐项审校记录                                 |
| `production/localization/es/glossary.yaml`、`style-guide.md`      | 术语、表达、来源保留和例外规则                               |
| `production/localization/es/batch-plan.json`                      | 本轮新增的工作清单，schema v1；不进入运行时或现有 CLI schema |
| `production/localization/es/search-cases.json`                    | schema v1 的冻结检索场景，见第 9 节                          |
| `production/localization/es/review-evidence.md`                   | 实际文本、图片和交互审校范围、结果与证据位置                 |
| `production/localization/es/implementation-status.md`             | 各阶段完成情况、实际提交、未完成事项和已知基线问题           |
| `production/localization/es/production-acceptance.json`           | 最终候选身份、检查结果、性能比较和部署结果                   |
| `.artifacts/localization/es/`                                     | 临时报告、批次输入、候选、事务日志和浏览器产物               |

内容路径始终来自 `items[].targetFile`、`fields[].file` 和 `targetField`。新增工作清单只组织任务，不能替代 scope 或成为缩小检查范围的第二个来源。

`batch-plan.json` 至少保存 `schemaVersion: 1`、`locale: es`、`sourceRevision`、`scopeFingerprint`、`policyFingerprint` 和 `batches`。每批记录 `name`、`itemKeys`、去重后的 `fieldKeys`、`dependsOn`、`status`（planned、draft、reviewed、promoted）及已生成的 CLI `batchIds`。人工可读 name 与 64 位 CLI batch ID 是两种标识。每个目标及必需字段都能追溯到一批，已审校的共享字段由后续批次引用，不重复翻译。

scope、最终译文、reviews、术语和验收用例进入仓库。大体积截图、录屏和帧图可以保留在 CI artifact；提交中的证据索引须记录提交、路径或链接、资产 hash、检查范围和结论，发布不能依赖另一台机器上未保存的临时批准记录。

## 5 西语编辑合同

使用通用标准西语，面向读者使用 `tú`，以简洁的第二人称说明操作。按钮使用动词不定式，标题使用自然句式；保留 `á é í ó ú ü ñ` 和必要的 `¿ ¡`。地区常见同义词进入检索别名，不为同一内容生成地区副本。

以下是首版术语合同；P1 在实际上下文中审校后写入 glossary，词形随语法变化：

| 概念                                | 首选表达                          | 约束                                         |
| ----------------------------------- | --------------------------------- | -------------------------------------------- |
| Prompt                              | prompt                            | 首次必要时解释为给模型的指令；与页面说明区分 |
| Template                            | plantilla                         | 指可由参数生成 Prompt 的模板                 |
| Collection                          | colección                         | 不与 plantilla 混用                          |
| Reference image                     | imagen de referencia              | 输入图                                       |
| Output image                        | imagen generada                   | 生成结果，与参考图区分                       |
| Copy / Download / Reset             | Copiar / Descargar / Restablecer  | 按钮使用这些动词                             |
| Favorites                           | Favoritos                         | 收藏动作可用 Guardar                         |
| Product photography                 | fotografía de producto            | 不把所有 fotografía 解释为商品摄影           |
| Portrait                            | retrato                           | 根据内容区分肖像、人物与人像摄影             |
| Poster                              | póster                            | cartel 为检索别名及适当上下文用词            |
| Sticker                             | pegatina                          | sticker 为检索别名                           |
| Lighting / Background / Composition | iluminación / fondo / composición | 使用自然语法与专业含义                       |
| Not verified                        | sin verificar                     | 保留原始不确定性，不改成效果保证             |

保留品牌、模型版本、代码、URL、模板变量、记录中的原文及指定画面文字。许可说明可翻译，许可标识和法律效力范围保持来源含义；改编、来源缺失和独立复现声明不得弱化。图片 alt 必须基于实际素材；GIF 的动画描述须播放或按实际帧序检查，不从文件名或 Prompt 推断可见结果。

参数标签和帮助可以译成西语，默认值、枚举值、示例 values、取值边界、必填性和输入顺序按原合同保留。原字段保持英文品牌等合法不变文本时，在对应 hash 审校记录中给出具体原因，不能批量豁免未翻译解释文字。

## 6 UI 字典与格式化

从英语字典实时枚举命名空间和 key，翻译当前全部消息。当前 14 个命名空间为 `common`、`detail`、`explore`、`favorites`、`feed`、`geo`、`home`、`pages`、`popup`、`primitives`、`search`、`shell`、`shortcuts`、`templates`。新增英语 key 同时进入西语工作范围。

`validateBuildMessages` 会检查任何已经存在字典目录的语言，即使该语言尚未 enabled 或 preview。因此先在 `.artifacts/localization/es/catalog/` 准备完整字典，再在同一实施变更中放入 `src/i18n/messages/es/`；不能把半套字典提交为可合并状态。P0 的 scope 和工作目录不会触发此问题。

必须满足：key 集合与基准一致，字符串非空，ICU 语法有效，参数名和富文本标签一致；复数分支按西语及实际数量范围编写，保留 `other`。验证 0、1、2、较大计数以及使用小数的消息；不能只对比英语复数分支。日期、数量和相对时间沿用现有固定时区与编号系统，并比较 Node 与三种浏览器的实际显示和 hydration 结果。

JSON 字典不属于 `locale:import` 的可写对象。写入完整字典后重新运行 check，从 UI `fields` 取真实 key、sourceHash、targetHash，逐项审校。其记录可以与 P1 的基础页面／taxonomy 批次一起传给 `locale:promote`：现有 promote 接受报告中其他有效 key 的当前批准记录，并将其合并到 reviews；它不会代写 JSON 字典。不要为了保存 UI 批准构造一个空 operations 批次。

仅在完整字典通过结构检查、实际审校已保存、About/License 和全局 taxonomy 字段就绪后开启 preview。启用预览前保留已有语言的发布检查；es 全库尚未 ready 属于预期的准备状态。

## 7 试点选择与全量批次

### 7.1 固定的 30 个试点单元

| 类型         | 稳定 ID                                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20 个 Prompt | `p_001`、`p_003`、`p_012`、`p_050`、`p_067`、`p_101`、`p_107`、`p_108`、`p_110`、`p_111`、`p_115`、`p_124`、`p_134`、`p_140`、`p_152`、`p_200`、`p_209`、`p_224`、`p_273`、`p_315` |
| 5 个模板     | `t_001`、`t_002`、`t_003`、`t_018`、`t_075`                                                                                                                                        |
| 2 个合集     | `c_001`、`c_017`                                                                                                                                                                   |
| 1 个专题     | `topic/style/ink`                                                                                                                                                                  |
| 2 个独立页面 | `page/about`、`page/license`                                                                                                                                                       |

该集合覆盖普通图片、模板生成的 Prompt、多参考图、GIF、中文／日文原始 Prompt、改编说明和不同内容类型。P0 核对上述目标仍在 scope 内；仅在源内容正式移除时更换对应样本，记录理由和同类替代项。

30 个单元是编辑与 UI 样本集，不是依赖闭包。每个单元的媒体、字段、输入指导、分类和示例依赖从报告扩展并去重。比如 `p_101`、`p_152` 引用的模板版本依赖不能因模板未列入五个样本而遗漏。

试点的 20 个 Prompt、5 个模板和 2 个独立页面必须达到 current。两个合集和专题先以草稿验证预览布局，成员未就绪时维持 draft。`c_001` 包含八个成员，`c_017` 包含 `p_312` 至 `p_315`，ink 专题也有试点外成员；只有所有实际可见成员及自身依赖就绪后才 promote。此处不要求为了凑足“30 个已发布单元”提前扩大试点到全库。

### 7.2 分批推进顺序

| 批次组         | 工作                                                         | 前置条件与完成条件                                      |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| B0 基础        | 全部 UI、34 个当前 taxonomy 字段、About、License、术语与文风 | 完整字典先落地；基础页面及全局字段审校并 promote        |
| B1 试点        | 上述其余 28 个样本及其依赖                                   | 25 个单体 current，3 个聚合草稿可预览，核心操作验收通过 |
| B2 全部模板    | 其余模板、所有引用版本的解释字段、输入与示例依赖             | 按真实依赖选字段；模板 current                          |
| B3 其余 Prompt | 按内容系列或类型分批；覆盖说明、SEO、标注和媒体／运行备注    | 每批约 30–50 个页面；高依赖量时再拆为字段批与页面批     |
| B4 聚合内容    | 全部合集和公开专题，包含试点中的三个聚合草稿                 | 成员先完成；推荐理由、正文、SEO 和可见集合一致          |
| B5 差异清理    | 新增源内容、变化依赖、过期译文和零散字段                     | 最终动态报告全部 current，严格检查通过                  |

批次大小是工作组织建议，不改变 scope。共享字段优先于消费者页面或与之同批 promote；页面不能先声明 published 再等待依赖审校。每批结束核对新增 current 数、待处理依赖和重复字段，不能把 operations 数等同页面数。

## 8 导入与审校操作流程

### 8.1 记录基线

以下命令在实施阶段执行。先应用第 3 节准备期策略，再在仓库根运行：

```bash
mkdir -p .artifacts/localization/es
npm run --silent locale:check -- --locale es --json > .artifacts/localization/es/baseline.json
npm run locale:scope -- --locale es
npm run locale:scope -- --locale es --apply
npm run --silent locale:check -- --all --json > .artifacts/localization/all-baseline.json
```

首次缺译时 `ready=false` 是预期状态。普通检查退出 0 不等于可以发布；`blocking=true`、结构错误或已发布未审校内容须先解决。`--all` 会自动包含有 `production/localization/es/` 准备目录的西语；不修改现有 CI 为所有准备语言统一加 `--strict`，以免把阿拉伯语等草稿当成正式语言门禁。

### 8.2 生成批次

每批从最新报告选取 key 并读取完整源文本。使用既有 batch schema v1：`schemaVersion`、`locale`、非空 `operations`。operation 的字段规则如下：

| 字段                          | 页面                                                                               | 共享 YAML 字段                                |
| ----------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------- |
| `key`                         | `items[].key`                                                                      | `fields[].key`                                |
| `sourceField` / `targetField` | 均为 `["$page"]`                                                                   | 报告中的精确字段路径                          |
| `expectedSourceHash`          | `item.sourceFingerprint`                                                           | `field.sourceHash`                            |
| `expectedTargetHash`          | 当前 `item.targetHash`，缺失显式 null                                              | 当前 `field.targetHash`，缺失显式 null        |
| `expectedIdentity`            | 不需要                                                                             | 数字数组路径必须携带报告中的 `field.identity` |
| `translation`                 | `title`、`description`、`body`，以及适用的 `seoTitle`、`seoDescription`、`reasons` | 与源类型一致的字符串或非空字符串数组          |

页面 `expectedSourceHash` 不能误用 MDX 元数据使用的短 `sourceHash`。独立 SEO 文案和合集理由属于页面 prose 指纹；更新页面时省略可选字段会删除已有对应文本，因此每次提交完整的目标页面文本，而非片段 patch。

先 dry-run，检查文件、字段和 conflicts，再 apply：

```bash
npm run locale:import -- --locale es --file .artifacts/localization/es/batches/BATCH_NAME.json
npm run locale:import -- --locale es --file .artifacts/localization/es/batches/BATCH_NAME.json --apply
```

用实际批次文件替换 `BATCH_NAME`。apply 的结果返回 64 位十六进制 `batchId`，保存到工作清单。首次译文可能写成 draft；触及已发布译文或其共享依赖时，整批进入 pending。两种模式都以 `.artifacts/localization/es/pending/{batchId}/manifest.json` 为依据，不按目录名猜测是否已发布。

### 8.3 审校与批准

审校逐项检查自然表达、完整含义、术语、SEO、输入约束、来源和不确定性。打开实际图片；对动画陈述检查相关完整动画。图像、文字和浏览器交互证据分别记录，不用生成草稿成功替代任一种审校。

批准文件遵守现有 review schema v1：顶层 `schemaVersion: 1`、`locale: es`、`records`；每条包含 `key`、`sourceHash`、`targetHash`、`reviewer`、带时区的真实 `completedAt`、`conclusion`，必要时附 `reason`。AI 审校者明确写 AI，不代填人类身份；`changes-requested` 必须保留，修改后重新核验当前文本。

批次内容的批准使用 manifest 中 `sourceHash` 与 `candidateHash`。pending 模式下正式报告的 targetHash 仍可能是旧版本，不能拿它批准候选。UI 等非批次字段使用最新报告中已落地的真实 hash。后续批次不复用另一份文本的批准。

### 8.4 Promote 与批后检查

把 `BATCH_ID` 替换为 apply 返回的完整 ID，把审校路径替换为本批实际文件：

```bash
npm run locale:promote -- --locale es --batch BATCH_ID --reviews .artifacts/localization/es/reviews/BATCH_NAME.json
npm run locale:promote -- --locale es --batch BATCH_ID --reviews .artifacts/localization/es/reviews/BATCH_NAME.json --apply
npm run --silent locale:check -- --locale es --json > .artifacts/localization/es/after-batch.json
npm run content:validate
npm run locale:check -- --locale ja --strict
npm run locale:check -- --locale de --strict
```

promote 复用内容锁、身份与生命周期检查、依赖验证和可回滚事务，检查所有 enabled 语言；不要手工将页面改为 published 以绕过它。每批最终译文和 matching reviews 放在同一个可构建提交。

源文或数组实体变化时，丢弃过时计划，重新读取报告、翻译并审校；不改写 expected hash 强行通过。候选被审校者修改后，必须重新生成包含修正的批次和批准，不覆写原 manifest。相同批次的无变更重试使用既有幂等行为。scope 更新仅记录新增、变化或有证据的移除，不生成批准，也不能清除过期状态。

## 9 西语搜索合同

### 9.1 工程改动边界

继续使用共享 `tokenize.ts`、`profiles.ts`、`engine.ts`、`documents.ts` 和实际 Worker。保留现有索引字段权重、AND 组合、最后词前缀匹配和长词模糊匹配。说明正文已进入搜索，无需再次实现；不引入全语言词干库或通用分词重构。

`normalizeTerm` 当前会折叠所有拉丁附加符号，包含 `ñ`。本轮为语言主标签为 `es` 的情况保留 ñ，同时继续折叠元音重音和 ü。其他语言的现有行为保持兼容。下列行为必须有小 fixture 验证：

| 输入与条件                                                    | 预期                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `fotografía`、`fotografia`、大写及分解形式 `fotografi\u0301a` | 相同检索词，能命中同一真实文本                           |
| `póster`、`poster`；`pingüino`、`pinguino`                    | 各组归一化相同                                           |
| `año` 与分解形式 `an\u0303o`                                  | 相同检索词                                               |
| `año` 与 `ano`、`caña` 与 `cana`                              | 主检索词不同；仅含另一词的短词 fixture 不能命中          |
| `¿Retrato?`、`¡Póster!`                                       | 标点不进入检索词                                         |
| 真实结果高亮                                                  | 保留原文重音和 ñ，组合字符及原始位置正确，不改写显示文本 |

不增加把所有 ñ 自动替换为 n 的别名。较长词的已有低权重 typo 匹配仍可工作，不能把它误描述为主词相同。

西语领域别名在 `profiles.ts` 的 es 分支维护，参考 glossary：`póster/cartel/poster`、`pegatina/sticker`、`plantilla/template`、`retrato/portrait` 及商品摄影常见表达；显式维护需要的单复数，不任意截去词尾。别名继续使用低权重字段。商品摄影可扩展为摄影，泛化的家庭摄影不能因此获得 `packshot` 或商品图别名；添加负向 fixture。包含 `de` 等功能词的冻结查询必须按完整查询通过，不让测试自行删词。

语言分析行为改变时提升 `SEARCH_ANALYZER_VERSION`，以实施时版本递增；仅当序列化结构变化才改 `SEARCH_SCHEMA_VERSION`。重建全部语言索引，Worker 对旧 analyzerVersion、schemaVersion 或 buildId 按既有 stale 恢复流程处理。同步检查查询、高亮和建议使用同一归一化合同。

### 9.2 冻结的 32 个真实查询

P1 根据下表创建 `production/localization/es/search-cases.json`，在搜索调优前固定 query 和 expectedKeys。schema 沿用 `{schemaVersion: 1, locale: "es", cases: [...]}`；每条含 `query`、`expectedKeys`、`topK: 5`、`reason`，需要时增加 `excludedKeys`。自然翻译可以调整，不能为了测试往说明中堆砌关键词，也不能删除失败场景。

| 编号 | query                                                       | expectedKeys 中必须包含 |
| ---- | ----------------------------------------------------------- | ----------------------- |
| 01   | calle Japón                                                 | `prompt/p_107`          |
| 02   | calle Japon                                                 | `prompt/p_107`          |
| 03   | CALLE JAPÓN                                                 | `prompt/p_107`          |
| 04   | fotografía de producto estudio                              | `prompt/p_151`          |
| 05   | fotografia de producto estudio                              | `prompt/p_151`          |
| 06   | `fotografi\u0301a de producto estudio`，JSON 转义解码后执行 | `prompt/p_151`          |
| 07   | retrato portada revista                                     | `prompt/p_111`          |
| 08   | retrato boda dos personas                                   | `prompt/p_115`          |
| 09   | producto flotante                                           | `prompt/p_154`          |
| 10   | producto vista cenital                                      | `prompt/p_156`          |
| 11   | producto uso cotidiano                                      | `prompt/p_158`          |
| 12   | retrato ascensor traje                                      | `prompt/p_315`          |
| 13   | retrato lago luz de luna                                    | `prompt/p_314`          |
| 14   | retrato parabrisas mapa                                     | `prompt/p_313`          |
| 15   | póster Fuji                                                 | `prompt/p_290`          |
| 16   | poster Fuji                                                 | `prompt/p_290`          |
| 17   | cartel Fuji                                                 | `prompt/p_290`          |
| 18   | pegatina lunes                                              | `prompt/p_287`          |
| 19   | sticker lunes                                               | `prompt/p_287`          |
| 20   | póster Coliseo                                              | `prompt/p_289`          |
| 21   | póster Lisboa                                               | `prompt/p_170`          |
| 22   | muñeco de nieve barroco                                     | `prompt/p_239`          |
| 23   | gato oficina pegatina                                       | `prompt/p_221`          |
| 24   | iluminación neón retrato                                    | `prompt/p_005`          |
| 25   | fondo salvia té                                             | `prompt/p_003`          |
| 26   | plantilla póster producto                                   | `template/t_001`        |
| 27   | plantilla tinta                                             | `template/t_002`        |
| 28   | plantilla retrato neón                                      | `template/t_003`        |
| 29   | GPT Image p_111                                             | `prompt/p_111`          |
| 30   | p_217                                                       | `prompt/p_217`          |
| 31   | colección cuatro retratos cotidianos                        | `collection/c_017`      |
| 32   | tinta                                                       | `topic/style/ink`       |

`topK` 指每个实际展示的内容类型分组前五项，不是合并全部分组后取五项。使用同一场景文件分别验证序列化后重载的引擎与浏览器 Worker；全量语料完成后要求 32 条全部通过。试点阶段仅对已有对应西语内容的场景记录局部结果，不宣称全套通过。

验收 key 统一使用内容报告形式。搜索 ID 为 `prompt:p_111`、`collection:c_017` 和 `topic:style:ink`；测试辅助函数须显式转换为 `prompt/p_111`、`collection/c_017` 和 `topic/style/ink`，不能只替换第一个冒号。浏览器测试通过四种内容类型的模型解析实际 URL；现有 German 测试仅在 Prompt／template 中查找记录，不能直接复制该限制。`excludedKeys` 在引擎和浏览器两端均检查对应 topK。

另验证中英文原始 Prompt 的词仍可搜索、GIF 和模型／稳定 ID 查询、快速搜索与搜索页一致、空结果与跨语言建议、清空及连续输入、不加载无关语言索引。原有德语冻结查询和其他语言分词回归必须通过。

## 10 页面行为与 SEO

路由 locale、说明的 contentLocale、实际 promptLanguage 保持分离。西语外壳中的原始 Prompt、回退内容、图片 alt、分类和模板标签使用各自真实语言及正确字体角色。西语首发不新增状态横幅或 Prompt 语言选择器。

预览允许草稿及合格回退，但所有 HTML noindex，外部可索引输出为空。生产候选要求西语全部 current；额外 fixture 继续验证 fallback/outdated 页面可浏览、自 canonical、noindex，并从 hreflang、内容结构化数据、Markdown twin 和 sitemap 排除。显式归档不能被回退复活。

列表、首页和分页按实际显示内容决定收录，不为了获得 indexable 重排内容。complete 西语的生产首页须满足现有首页门禁；其他 incremental 语言首页可能按实际内容合法 noindex，不能将所有首页强制改为 index。验证西语 canonical、双向 hreflang、既有 x-default 规则、sitemap、JSON-LD、`index.md`、`llms.txt` 和导出集合一致。

普通 slug 和资源 ID 保持不变。生产未启用阶段不输出西语链接或索引地址；生产候选中的语言入口、切换、分页、弹层、收藏和深链接均使用 URL 模块，根路径和 `/prompt-seen` 子路径都无断链。未知地址 404，移除地址遵守现有 410／静态托管降级规则。

## 11 验收矩阵与证据

| 编号 | 检查对象      | 通过条件                                                                                               |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------ |
| ES01 | 策略及阶段    | es 使用 complete/fingerprint/source-only；阶段与生成语言集合一致                                       |
| ES02 | 动态范围      | 所有报告目标和必需字段进入计划；新增、变化、移除有解释，无人工缩小 scope                               |
| ES03 | UI 字典       | 全部命名空间和 key 齐全，ICU 参数与标签正确，真实审校有效                                              |
| ES04 | 试点          | 27 个单体／独立页面 current，三个聚合样本可预览且不提前发布                                            |
| ES05 | 完整覆盖      | `localCurrent=target`、`fieldsCurrent=fieldsTotal`、`indexable=target`，`ready=true`、`blocking=false` |
| ES06 | 审校真实性    | 当前源与目标 hash 匹配；AI 身份、时间、图片与动画证据完整，无伪造批准                                  |
| ES07 | 变更冲突      | 既有 importer/promoter 的源变更、目标变更、数组身份、拒绝与事务回滚回归通过                            |
| ES08 | Prompt 与模板 | 原文／事实未因翻译改动；编辑预览、复制、下载和 `renderTemplate` 结果一致                               |
| ES09 | 搜索字符规则  | 第 9.1 节 fixture 全部通过，ñ 区分、组合字符和高亮正确                                                 |
| ES10 | 检索场景      | 32 个冻结查询在重载引擎与真实 Worker 的每种浏览器中全部通过                                            |
| ES11 | 别名边界      | 家庭摄影不因泛化别名命中商品摄影专用词；原词权重与既有语言召回无回归                                   |
| ES12 | 语言选择      | es 地区偏好推荐正确；生产未启用时不展示；切换保留内容身份；无强制地区跳转                              |
| ES13 | 页面与交互    | 字典文案实际显示；导航、筛选、弹层、收藏、复制、下载、模板输入及空状态正常                             |
| ES14 | 排版与无障碍  | 无页面横向溢出、关键按钮裁切、严重／致命 axe 问题；键盘焦点可达                                        |
| ES15 | 格式化与字体  | 重音、ñ、¿、¡ 正常；Node/浏览器格式一致；混合语言字体、等宽元数据无回归                                |
| ES16 | 预览输出      | 全部 noindex；无外部可索引条目；ar RTL 和既有语言通过回归                                              |
| ES17 | 生产 SEO      | 根路径和子路径的 canonical、hreflang、sitemap、结构化数据与导出集合一致                                |
| ES18 | 性能与缓存    | 性能比较留档，遵守既有预算及已记录例外；按需加载与 stale 恢复正确                                      |
| ES19 | 候选一致性    | 最终内容、reviews、配置和全部验证绑定同一发布提交；不得用 disabled 产物验收 es                         |
| ES20 | 上线与回滚    | 正式与平台地址检查通过，线上 buildId 对应验收提交，保留上一个可用发布产物                              |

ES05 对正式目标要求 missing、draft、unreviewed、outdated、invalid 为 0；合法的全局移除由 scope 的正式证据处理。既有警告逐项列出并说明是否受影响，不把没有阻断错误表述成“没有任何警告”。

浏览器覆盖 Chromium、Firefox、WebKit，宽度 360、768、1024、1440，两种主题。至少覆盖首页、列表及第二页、普通 Prompt、多参考图、GIF、模板、合集、专题、搜索和 About/License；高风险交互样本执行全部宽度与主题组合，其余页面执行手机／桌面代表组合。无 hydration 错误或未捕获异常。

200% 缩放至少在 Chromium 验证实际浏览器缩放，并保存缩放 API／实际状态证据；Firefox 和 WebKit 可以记录等效 reflow 验证，不能把缩小 viewport 写成原生缩放通过。剪贴板等能力按既有浏览器支持分别记录；候选验收不能因为 es 未构建而跳过整套西语测试。

性能使用同一工具链、站点配置、内容与构建模式比较四语言基线和增加 es 的五语言候选。记录构建耗时及缓存条件、文件数、HTML/JSON 总量、每语言搜索索引原始及 gzip 大小、普通页面首屏 JS、字体请求。沿用[首屏 JS 预算及例外](first-load-js.md)，新增例外必须说明原因与处理；单次有不同缓存温度的构建不能据此声称提速或回归。字典按命名空间、搜索索引按需加载，审校记录不进入客户端。

`production-acceptance.json` 使用本轮证据 schema v1，至少含 `locale`、`releaseCommit`、`sourceRevision`、`scopeFingerprint`、`policyFingerprint`、`recordedAt`、各构建的 `buildId/buildMode/basePath`、检查命令与退出结果、浏览器矩阵与跳过原因、搜索结果、性能前后值和证据位置。部署完成后追加实际部署地址、servedBuildId、live-check 结果与回滚版本；未执行的项标 pending，不预填 passed。文本批准仍只由 reviews 表达。

## 12 实施任务与依赖

| 任务            | 文件与交付物                                                                                                        | 依赖                         | 完成门槛                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------- |
| P0 准备         | `content/locales.yaml` 的 es 策略，scope、batch-plan、实施状态；同步文档当前语言状态                                | 无                           | ES01、ES02；保留全部既有语言策略        |
| P1 基础内容     | 完整 es 字典、术语和文风、基础页面、taxonomy、reviews；冻结 32 个查询文件；开启 preview                             | P0                           | ES03，基础内容 current，现有构建通过    |
| P2 试点         | 30 个样本及依赖、实际图片审校和试点浏览器用例                                                                       | P1                           | ES04、ES08、ES13–ES15 的试点部分        |
| P3 全量内容     | B2–B5 的 MDX、共享字段与批准记录                                                                                    | P2                           | ES05、ES06；现有 enabled 语言仍通过门禁 |
| P4 搜索适配     | `src/modules/search/tokenize.ts`、`profiles.ts`、`types.ts`；必要的高亮适配；搜索测试与结果                         | P1 定义合同，完整验收依赖 P3 | ES09–ES11、ES18 中搜索部分              |
| P5 完整预览验收 | `scripts/lib/localization/spanish-search.test.ts`、`tests/e2e/spanish.browser.spec.ts` 及必要测试辅助函数；预览证据 | P3、P4                       | ES07–ES16；原有测试和样本继续有效       |
| P6 生产候选     | 隔离的 es enabled 提交，根路径／子路径生产产物，acceptance 记录                                                     | P5                           | ES17–ES19；CI 与必要的额外生产矩阵通过  |
| P7 发布         | 正常部署流程、线上检查、状态文档与回滚记录                                                                          | P6                           | ES20，线上确认验收版本                  |

P3 翻译与 P4 搜索实现可在 P2 后交错推进；最终排名验收必须使用完整实际语料。P1 只新增场景数据，依赖全量语料的严格测试应在对应内容就绪时启用，避免把准备阶段的预期缺译当成已通过或永久跳过。

沿用模块边界：语言配置在 registry，UI 在 messages，内容和审校在 content/production，检索在 search，测试在既有 Vitest/Playwright 目录。只有复现出的语言适配问题才改 UI 或字体。无需重写通用导入、发布或 SEO 判定；若发现合同缺口，补充最小修复与行为回归，并在实施状态中说明。编写任何 Next.js 相关代码前，按 AGENTS.md 阅读安装版本的 `node_modules/next/dist/docs/` 相关指南；保持现有 static export 合同，不引入 Proxy 等服务端特性。

P0 同步 `docs/localization-workflow.md` 的德语当前状态，将通用规格的原始德语基线明确标为历史快照，保留既有审校和发布事实。西语启用后，P7 更新本地化流程、内容维护说明和总体设计的实际语言集合。

## 13 构建检查与发布流程

### 13.1 完整内容就绪后的检查

```bash
npm run locale:check -- --locale es --strict
npm run locale:check -- --locale ja --strict
npm run locale:check -- --locale de --strict
npm run --silent locale:check -- --all --json > .artifacts/localization/all-final.json
npm run content:validate
npm run typecheck
npm run lint
npm run format:check
npm run tokens:check
npm test
npm run storybook:build
```

这组命令不替代实际浏览器和生产构建验收。仓库格式检查默认忽略 `docs/`，新增规格需单独检查 Markdown 结构、链接和示例命令；不要因 format:check 通过就宣称规格已被它校验。

### 13.2 三种必要构建

先在 es preview 状态验证预览，再在隔离分支准备 es enabled 的最终候选。为每个实际构建设置 `BUILD_ID` 为被验收的完整提交 SHA，保持来源与生成产物对应：

```bash
BUILD_MODE=preview BASE_PATH=/prompt-seen npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e
```

在 enabled 候选上执行以下两组，每次 build 后立即验收相应产物并保存证据，再生成下一组：

```bash
BUILD_MODE=production BASE_PATH= npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e
```

```bash
BUILD_MODE=production BASE_PATH=/prompt-seen npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e
```

本地需安装测试所需浏览器并可运行参考 nginx/Docker；使用仓库当前验证的浏览器运行方式，包含 CI 已记录的 Firefox runtime 兼容配置。现有 CI 矩阵是“根路径生产 + 子路径预览”，不包含子路径生产；P6 必须额外执行上面的子路径生产验收并保存证据，不能用子路径预览结果替代。

构建和测试共享 `dist/` 等生成目录，同一 checkout 中顺序执行；不同配置需要并行时使用独立工作区。不可混用预览 HTML、生产 JSON、旧搜索索引或不同提交的 artifact。

### 13.3 部署与失败处理

发布经过验收的同一提交，正常部署任务再次执行完整构建。合并或其他变更产生新 SHA 时，重新验证实际发布版本；记录之前的成功构建只作为历史证据。

部署后对正式地址与平台地址分别执行，使用实际发布 SHA 和平台 URL 替换示例参数：

```bash
npm run check:live -- --expect-build RELEASE_SHA --wait 180
npm run check:live -- --site https://PLATFORM_HOST --platform --expect-build RELEASE_SHA --wait 180
```

正式域名须具有正确 canonical、可索引西语输出和对应 sitemap；平台地址继续具有平台 noindex。沿用现有 live checker 通过实际 sitemap 判断首页收录资格的规则。补充实际西语页面、模板交互和搜索 Worker 的线上抽查；check:live 的 HTTP 成功不代替浏览器交互检查。

任一发布前门禁失败则保留现有线上版本，修复并重新验收候选。部署后出现关键错误，通过既有回滚流程恢复上一份完整成功产物，HTML、索引和数据一起回滚，不在线单独修改 enabled 标记或搜索文件。回滚后重新检查 servedBuildId 和关键路径，保留失败记录。

## 14 上线后的内容维护

新公开内容会扩展日语、德语和西语的 complete 范围。内容生产先准备源语言候选及三种语言的解释文本与真实审校，再进入可发布提交；生产 apply 仍执行所有 enabled 语言门禁。源修改后按报告复核受影响字段和消费者，不自动更新 hash 或批量续签审校。

上线第一周检查抓取、索引输出、语言入口及真实使用问题；随后按可用数据观察西语搜索曝光、站内零结果查询和 Prompt 复制行为。若尚无相应分析事件，记录数据缺口，另立分析任务，不把未采集的指标或 SEO 增长承诺作为本轮发布通过条件。下一语言的顺序保留为巴西葡语、法语、韩语，由维护成本与实际结果调整。
