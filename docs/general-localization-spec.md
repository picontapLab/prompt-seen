# 通用多语言适配与德语接入实施规格

状态：历史实施规格；以下原始基线与准备期描述保留为 2026-11-10 的历史快照。2026-11-11 当前注册表已启用德语；实时覆盖以 locale:check 为准，启用状态不代表线上部署证据。日期：2026-11-10（America/Los_Angeles）。工程基线：`225f6320` 及当前工作区；本文中的数量是源文件快照，不是线上统计。

交付一套按语言配置、可重复执行的本地化流程，并用德语完成从翻译准备到正式发布的完整接入。沿用静态导出、语言注册表、文件内容库和 next-intl；新增语言主要增加配置、字典、译文与验收用例。语言特有的搜索、字体和 RTL 适配通过已有模块扩展。

德语首发覆盖当前全部公开内容，分批翻译、在预览环境验收，通过生产检查后启用。通用机制同时支持其他语言按条目逐步发布。内容库继续允许跨语言浏览；“页面可访问”“本地化完成”“允许搜索引擎收录”分别判定。

## 1 范围与既有规则

本规格是本轮通用本地化实施的依据。它更新[总体设计](prompt-library-website-design.md)第 8 章以及第 9、13、14 章中与语言发布、回退和输出集合有关的规则；未涉及部分继续遵守[工程约定](engineering-conventions.md)。

- [日语上线规格](japanese-localization-spec.md)中的语言质量要求和真实审校证据保留；其写死 `ja` 的工程流程迁入通用机制。
- [正文多语言设计](multilingual-prompt-design.md)中的正文选择、模板参数和生成记录规则保留。页面说明本地化与 Prompt 正文变体仍是独立能力。
- 早期文档中“缺少说明就没有该语言详情页”与当前内容共享实现不一致。本轮以第 4、5 节的浏览与索引规则为准，实施对应步骤时同步修订旧文档。
- 保留稳定 ID、slug、默认语言、根首页及默认语言首页别名的现有地址关系。地址仍统一由 URL 模块生成。
- 保留按需加载的字典、搜索索引、字体和详情数据。翻译与审校工具只在构建端运行。
- 翻译操作可以修改解释性文字；生成记录、Prompt 哈希、模型事实、许可标识、参数约束、模板变量 ID 和真实输出不属于其写入范围。

本轮包含通用发布策略、覆盖分析、翻译导入和发布、SEO 输出一致性、德语搜索与排版、迁移、CI 和上线验收。在线翻译服务、翻译管理 SaaS、数据库、新的生图任务和其他语言的实际上线不在本轮范围内。

## 2 当前基线与要修复的问题

注册表已启用 `en`、`zh-Hans`、`ja`，德语 `de` 已注册但未启用。德语覆盖分析得到：

| 内容             |                      数量 | 德语现状 |
| ---------------- | ------------------------: | -------- |
| Prompt 说明      |                       285 | 全部缺失 |
| 模板说明         |                        75 | 全部缺失 |
| 合集             |                        16 | 全部缺失 |
| 专题             |                         3 | 全部缺失 |
| About 与 License |                         2 | 全部缺失 |
| UI 消息          | 427，分布于 14 个命名空间 | 全部缺失 |
| 共享解释字段     |                     1,793 | 全部缺失 |

381 个内容单元不包含系统页和分页。说明来源为 371 个英语、10 个简体中文单元。共享字段分布为 Prompt 882、媒体 363、模板 308、示例 206、taxonomy 34；字段按真实文件和字段路径去重。实施后新增消息、依赖和内容会改变这些数字，测试不得固定总量。

| 现状                                                              | 实施要求                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `locale:check` 接受注册语言，导入 CLI 和 batch schema 只接受 `ja` | 检查和写入使用同一注册表及策略                                           |
| 构建门禁、CI 报告仅针对日语                                       | 按策略检查所有相关语言，包含手动部署                                     |
| 说明回退复用了 `published` 和目标 `locale`                        | 记录说明的实际语言，独立计算本地化状态与收录资格                         |
| 检查器从回退后的可见集合判断页面已发布                            | 直接验证目标文件、状态、源指纹和依赖，回退不能增加翻译完成数             |
| 德语缺 381 份说明，但现有 `locale.page` 只报告 2 项               | 每个缺译单元都必须获得缺译状态及对应 finding；不能依赖未审校告警间接发现 |
| 新内容生产配方只接受中英文说明与 alt                              | 发布流程加入通用翻译步骤，说明新增内容对完整覆盖语言的影响               |
| 德语搜索缺少稳定的拼写变体和复合词召回                            | 第 10 节定义确定的匹配行为与测试集                                       |

## 3 语言策略与配置合同

### 3.1 注册表仍为唯一来源

扩展 `content/locales.yaml` 的每个 locale 项，增加必填 `localization`。保留现有 `enabled`、`preview`、`phase` 等字段的语义；`phase` 只用于计划分组。

```yaml
- code: de
  pathPrefix: de
  nativeName: Deutsch
  htmlLang: de
  direction: ltr
  enabled: false
  preview: false
  phase: 1
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

| 字段           | 可选值                    | 合同                                                                                                        |
| -------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `coverage`     | `incremental`、`complete` | incremental 允许公开目标存在未翻译项；complete 要求全部目标完成，启用后成为每次构建的发布条件               |
| `review`       | `metadata`、`fingerprint` | metadata 使用现有页面审校元数据和发布依赖校验；fingerprint 额外要求页面、消息及共享字段的当前指纹审校记录   |
| `promptBodies` | `optional`、`source-only` | optional 沿用现有正文变体选择；source-only 要求该语言使用原始正文，发现非原文变体时报冲突，不自动删除或切换 |

校验规则：

1. `complete` 必须搭配 `fingerprint`，未知值、未知字段和未注册语言均报配置错误。
2. 所有注册语言显式声明策略。加载器不根据语言 code 或是否存在审校文件推断策略。
3. `source-only` 是发布约束，不修改 resolver。原文恰好为该语言时正常使用；发现变体后由内容变更显式解决冲突。
4. `enabled: false, preview: false` 表示准备期；预览构建包含 enabled 或 preview 的语言，生产构建仅包含 enabled 的语言。
5. 新策略进入 config schema、loader、生成配置和构建信息。运行时仅接收必要的策略和派生状态，审校人及记录不进入客户端包。

初始迁移配置：

| 语言           | coverage    | review      | promptBodies | 启用状态                            |
| -------------- | ----------- | ----------- | ------------ | ----------------------------------- |
| en、zh-Hans    | incremental | metadata    | optional     | 保持当前值                          |
| ja             | complete    | fingerprint | source-only  | 保持当前值                          |
| de             | complete    | fingerprint | source-only  | 准备期 disabled，字典就绪后 preview |
| 其他已注册语言 | incremental | fingerprint | optional     | 保持当前值                          |

`metadata` 是现有内容的显式兼容模式，不能在德语或日语遇到审校缺口时自动降级。它不声称具备逐字段指纹审校能力。后续将中英文迁到 fingerprint，应作为独立的内容审校迁移。

### 3.2 语言身份

数据匹配使用注册表 code；URL 使用 pathPrefix；HTML 使用 htmlLang 和 direction；日期、数量继续使用 `formatLocale`，客户端匹配前用 `registryCode` 去除格式化扩展。

德语先使用 `de`，不复制为 `de-DE`、`de-AT`、`de-CH`。浏览器偏好的这些区域标签可推荐 `de`，页面说明和 Prompt 变体仍按精确 code 匹配。语言入口提供建议和手动选择，保留已有偏好行为。

## 4 内容选择与本地化状态

### 4.1 统一派生模型

在内容构建中增加一个共享的本地化判定模块，供索引生成、检查器与发布门禁使用。判定输入为已读取的内容、配置、审校记录和依赖；返回纯数据。模块不读取文件、不写文件、不调用 buildIndex 或 CLI。

扩展摘要及详情的共享模型：

```typescript
type LocalizationState = {
  contentLocale: string; // 实际采用的标题、摘要和 MDX 说明语言
  localStatus: 'current' | 'missing' | 'draft' | 'unreviewed' | 'outdated';
  presentation: 'local' | 'fallback' | 'draft';
  indexable: boolean; // 含构建模式、语言启用与依赖资格的最终判定
};
```

保留已有 `locale` 表示当前路由与界面语言，保留 `promptLanguage` 表示实际 Prompt 语言。新增 `localization` 字段承载上述状态；不能由字符串内容猜语言。归档和不可用内容由内部结果表示，没有可访问模型时不强行填 contentLocale。

`current` 必须满足：目标文件真实存在、明确 published、页面发布规则通过、源版本有效、按该语言 review 策略完成审校、全部必需依赖就绪。文件存在或地址可访问均不足以成为 current。

fingerprint 模式还检查独立 SEO 文案、合集理由、共享字段和消息的当前审校。源语言自身的页面也需要相应的编辑审校记录，sourceHash 和 targetHash 可以相等；缺少 translation block 不免除该策略。

状态优先级为：显式归档、缺文件、draft、未审校、outdated、current。fingerprint 模式下，只有“当前目标文本曾获批准，目标哈希仍相同，但来源已变化”才可归为 outdated；目标文本被改动或最新记录要求修改均归为 unreviewed，不能借 outdated 直接公开未经批准的新译文。共享字段按相同规则判断。

### 4.2 生产与预览行为

| 目标说明状态                                 | 生产浏览                                        | 本地化完成 | 生产收录             | complete 语言发布 |
| -------------------------------------------- | ----------------------------------------------- | ---------- | -------------------- | ----------------- |
| current                                      | 使用目标说明                                    | 是         | 满足第 5 节时允许    | 该单元通过        |
| missing                                      | 内容库可使用合格的其他语言说明                  | 否         | 不允许该回退地址收录 | 阻止              |
| draft 或 machine-draft                       | 内容库可回退，草稿正文不进入生产                | 否         | 不允许               | 阻止              |
| published 但未达到必需审校或缺少发布必填字段 | 报发布错误，修复后构建                          | 否         | 不允许               | 阻止              |
| 目标文本仍是已批准版本，但来源指纹变化       | incremental 可继续展示该既有说明，标为 outdated | 否         | 不允许               | 阻止              |
| 明确 archived                                | 维持 410 或已有显式重定向，禁止回退复活         | 否         | 不允许               | 依第 6 节处理移除 |

预览优先展示目标语言草稿；没有目标草稿时可回退到已有合格版本。所有预览页面均 noindex。覆盖分析仍模拟生产规则，预览可见不能增加完成数。

说明回退限于 Prompt、模板、合集和专题，About、License 等独立页面保持按语言发布。无目标说明且无合格回退时不生成该详情 URL；语言切换使用已有缺译页。未知路径保持 404。

回退只从真实、本地、可公开的说明版本中选取：默认语言优先，其次真实源语言，再按注册表顺序选择。一次完成选择，禁止从另一个回退模型继续回退。不能使用其他语言的草稿、归档版本或未通过其发布要求的版本。

### 4.3 展示文本的真实语言

标题、摘要、MDX 及其 TOC 作为一组选择，使用 contentLocale；正文区域设置对应 `lang`、`dir`，界面外壳继续使用路由语言。详情弹层、卡片、收藏和搜索结果传递同一信息。

共享解释字段的内部选择结果统一为 `{value, locale}`；优先当前语言，其次已选说明语言、默认语言和注册表顺序中的其他显式值。图片 alt/caption、标注 note、输入指导、字段 label/help、示例 notes 和分类标签都要保留来源语言。投影到 UI 模型时，为这些文本增加伴随的语言字段或复用局部文本对象；实现不得只丢弃 locale 留下字符串。由文本实际所属元素设置语言，alt 的语言设置在图片元素上。

对源数据本就不存在的可选字段返回 null，不创造占位译文。对已声明可发布的本地版本，必需字段缺译仍是发布错误；回退仅服务浏览，不用于通过 current 判定。

不新增翻译状态横幅或正文语言选择器。既有 Prompt 语言说明继续表示 Prompt 的实际语言，不能改成页面说明语言。

### 4.4 Prompt 正文

沿用现有 resolvePrompt、resolveTemplate：有对应正文变体则按原合同选择，否则使用条目原文；原文不固定为英语。source-only 策略在构建前拦截冲突，不能静默绕过已存在变体。

显示、复制、快捷键、下载、模板默认输出、弹层和导出的正文来自同一选择结果。参数值和用户输入按既有规则保留。切换界面语言本身不产生新的生成证明；匹配测试记录继续基于真实正文、模板契约和运行记录。

## 5 SEO 与各类输出集合

### 5.1 浏览地址与语言关联分开

详情模型的 `alternates` 改为仅包含可索引的真实语言版本；新增 `languageLinks`，供语言切换使用全部可访问的浏览地址及其 contentLocale。导航不得继续借用 SEO alternates 判断能否切换语言。

把 `isIndexable(locale, visibility)` 改为消费统一派生的本地化结果。不能在 sitemap、Markdown 或导出中继续仅以 `visibility === 'published'` 过滤。

| 输出                                            | 数据集合与规则                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| HTML 详情、卡片、站内搜索、弹层 JSON、收藏数据  | 当前语言可浏览集合；允许回退，保留实际说明语言                                                  |
| HTML robots                                     | indexable 为 false 的浏览页为 noindex；生产回退页允许 follow，预览沿用全站预览 robots           |
| canonical                                       | 详情和列表指向自身规范地址；根首页与默认语言别名保留现有关系，不把德语页面统一 canonical 到英语 |
| hreflang                                        | 仅 indexable 的真实对应版本，包含自身且双向一致；非 indexable 页不输出语言关联                  |
| x-default                                       | 首页指向已有默认语言根首页；详情仅在默认语言真实版本可索引且关联有意义时输出                    |
| sitemap、llms.txt、index.md、面向外部的内容导出 | 只包含 indexable 集合，不发布回退说明的“德语版本”                                               |
| 用于交互的 generated JSON                       | 保留所有可浏览模型，不能误用外部导出的过滤规则导致弹层断开                                      |
| JSON-LD                                         | 只为可索引内容输出内容实体；语言分别反映页面说明和实际 Prompt，不把原文标为德语                 |

默认语言首页别名与根首页的处理通过现有 URL 和 SEO 模块完成。全部 URL 包含正确的 origin、basePath、尾斜杠；hreflang 使用 htmlLang。Open Graph 已有 de_DE 映射，仍需验证输出。

noindex 页面保持可抓取，使爬虫能够读取 noindex；不以 robots.txt 禁止抓取替代它。

### 5.2 首页与聚合页

界面、标题、摘要和主要展示说明必须是合格的当前语言文本。首页可在没有精选作品时展示完整的本地化站点介绍和有效入口；存在主要作品区域时，其实际展示项也须满足本地化要求，才能收录该首页。

列表、列表分页、模板列表和合集列表保持现有浏览排序与分页。一个聚合页可索引的条件是：当前语言已启用、生产模式、系统文案就绪、非空，且该页实际展示的主要内容项均 indexable。否则保留浏览地址但 noindex，从 sitemap 排除。不能为了 SEO 另排一套分页，让 HTML、feed 和 sitemap 对不上。

合集与专题自身需 current；其实际展示的主要成员也需 indexable，且至少达到现有的 2 个合集成员、3 条专题 Prompt 阈值。其浏览可见性继续按可浏览成员计算。栏目计数分别使用对应集合，报告中明确区分。

搜索、探索、收藏、缺译及错误页维持既有 noindex 规则。系统页的语言切换链接不因此消失。

## 6 目标集合与覆盖计算

### 6.1 从发布意图计算

目标集合独立于回退、indexable 过滤和新门禁的结果，避免缺译使目标自身消失：

1. 按生产配置读取源树。收集当前已启用语言中明确 published 的本地内容声明，按 kind 与稳定 key 去重；结构或发布声明有错仍保留为目标并报告错误。
2. 对 disabled 的候选语言，也纳入该语言自身明确 published 的内容；其独有源内容不能被忽略。其他语言均未公开的普通草稿不进入全量目标。
3. 加入既有 scope 快照中的未正式移除目标。关闭源语言、改成 draft、删除译文不能自动缩小范围。
4. 独立页面 About、License 为公开语言的必需页面；其 source 缺失是源问题。首页、列表等系统文案通过 UI 及全局依赖计算，不伪装成 MDX 单元。
5. 按目标的真实展示和引用追踪依赖，包括历史运行的图片与说明、正文 Figure、模板输入和字段、合集推荐理由、内容链接、首页和列表编排、可显示 taxonomy 与搜索别名。
6. 目标自身的 declaredStatus、真实文件语言、源哈希、审校结果与依赖分别检查，不从模拟路由是否存在推导翻译状态。

对确已移除或归档的公开内容，scope 记录 key、原因以及归档／删除清单证据。目标专属的 archived 译文不免除 complete 覆盖要求，除非该内容本身已正式退出公开目标。

初次迁移会比较“旧检查器目标”和“新目标”，逐项说明差异。采用更准确的依赖追踪后数量增加属于新增工作，不通过保留旧数量绕过。

### 6.2 字段、源与指纹

每条 MDX 使用其唯一真实源语言。共享字段优先使用显式默认语言值，否则按固定顺序选取显式来源，并在报告中记录。该来源与引用它的页面语言无关；禁止对同一个字段重复指定不同源。

字段 key 沿用文件相对路径及结构字段路径；数组路径变化必须使旧批次冲突，不能误写到另一项。批次计划同时保存其所属稳定实体 ID（例如 taxonomy term ID、字段 name、运行 ID）；即使移动后的字段文案恰好相同，所属 ID 变化也必须冲突。共享字段按 key 去重。保留现有完整 prose 指纹算法，覆盖 title、description、body、独立 SEO 和合集 reasons；不以较短的 MDX sourceHash 代替 prose 指纹。

状态、审校者和审校时间不参与文本指纹，真实译文变更才使 targetHash 失效。YAML 键顺序变化不使审校失效。来源 hash 与目标 hash 的当前匹配共同决定审校有效性。

新 report 包含 policyFingerprint，策略变化要求重新执行验收，但不凭空撤销内容未变的历史文本审校。变更依赖集合时，仅复核新增或变化字段及受影响单元的完整性。

## 7 检查模块和 CLI

### 7.1 模块分工

| 位置                                        | 职责                                               |
| ------------------------------------------- | -------------------------------------------------- |
| src/config/schema.ts、load.ts、generate.ts  | 解析与生成语言策略，验证组合                       |
| scripts/lib/content/ 下的新本地化判定模块   | 纯函数判定真实版本、依赖和浏览选择                 |
| scripts/lib/localization/                   | 读取 scope/reviews，计算目标、指纹、报告和批次计划 |
| scripts/lib/content/load.ts、build-index.ts | 共享内容快照，形成一致的浏览模型和索引资格         |
| scripts/locale-*.ts                         | CLI 参数与退出码适配，复用内部模块                 |
| src/modules/seo、geo 与 scripts/emitters/   | 根据已算好的集合输出，不重新判断审校               |

一个构建只解析一次源内容和共享字段；按所有目标语言批量计算。checkLocale 不反向调用带本地化门禁的 loadContent，buildIndex 也不调用 CLI，避免循环依赖和每语言重复解析全库。

内部至少提供“从快照分析一个／多个语言”“规划批次”“应用或发布批次”三个调用能力；根路径和依赖由外层传入。运行时内容模型不包含文件系统路径、完整审校清单或翻译批次。

### 7.2 命令合同

以下新增参数和命令均为待实现接口：

```bash
npm run locale:check -- --locale de
npm run locale:check -- --locale de --strict
npm run --silent locale:check -- --locale de --json
npm run --silent locale:check -- --all --json
npm run locale:scope -- --locale de
npm run locale:scope -- --locale de --apply
```

- `--locale` 与 `--all` 互斥。`--all` 处理 enabled、preview 或已存在本地化准备目录的语言；明确指定可检查任意注册语言。
- 普通模式报告全部缺口；严格模式按 coverage 策略判定 ready。complete 的任意目标缺口阻止；incremental 的尚未发布缺译只报告，但 UI、必需页面、已声明发布项和全局结构错误仍阻止。
- 检查始终只读，模拟目标语言启用后的生产状态，不修改 locale 配置或生成网站。
- `locale:scope` 默认输出新增／变化／移除差异；`--apply` 才记录快照。拒绝未经证明的移除，更新快照不能消除缺译或撤销 reviews。
- JSON stdout 只含一个 JSON 值；诊断写 stderr。退出码 0 表示检查完成且未违反当前退出策略，1 表示结构错误或严格模式未就绪，2 表示参数错误。写操作失败或冲突返回 1。

report 升为 schemaVersion 2，`--all` 返回带版本的 reports 数组封套。单语言报告包含：

| 字段                                                        | 内容                                                                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| locale、sourceRevision、scopeFingerprint、policyFingerprint | 实际源树及策略身份；未提交变化进入指纹                                                                                                                |
| policy、evaluationMode、ready、blocking                     | 有效策略、固定为 candidate-production 的评估模式、是否满足发布条件、是否存在全局结构／发布错误                                                        |
| counts                                                      | target、visible、localCurrent、fallback、missing、draft、outdated、unreviewed、archived、invalid、fieldsTotal、fieldsCurrent、indexable；按 kind 分项 |
| items                                                       | 稳定 key、来源与目标文件、源与目标指纹、declaredStatus、localStatus、presentation、依赖缺口                                                           |
| fields                                                      | 唯一字段 key、源与目标路径、值、指纹和审校状态                                                                                                        |
| findings                                                    | code、severity、locale、key、file、field、reason、fix、blockingForRelease                                                                             |
| changes                                                     | 新增、源变化、目标变化、依赖变化、移除及证据                                                                                                          |

counts 中各状态是否可重叠须由字段说明明确：localStatus 分类互斥；visible、fallback、indexable 为独立投影，不能相加当总数。缺文件必定 missing；present draft 不能因回退地址已 published 变成 current。

报告的 visible 和 indexable 表示在内存中启用该目标语言后的生产候选结果，不表示语言已上线。items 的内部状态可包含 archived、invalid；这两类没有可访问模型时不产生第 4 节的 LocalizationState。

稳定 finding 至少包括 locale.page-missing、locale.page-draft、locale.outdated、locale.review、locale.field、locale.message、locale.scope-removal、locale.prompt-variant、content.invalid。有效内容的 source/target 指纹必须非空；target 缺失永远不能获批准。

## 8 翻译批次与真实审校

### 8.1 文件组织

```text
src/i18n/messages/{code}/{namespace}.json
content/{kind}/{id}/locales/{code}.mdx
production/localization/{code}/
  scope.json
  reviews.json
  glossary.yaml
  style-guide.md
  search-cases.json
.artifacts/localization/{code}/
  report.json
  pending/{batch-id}/
  transactions/
```

共享 YAML 继续在原文件的 locale 文本键中维护，不复制媒体、模板或运行事实。topic 和独立 page 保持现有实际目录布局；上图的内容路径仅表示普通条目模式。

scope、reviews、术语表与验收用例提交到仓库；临时报告和候选批次为本地产物，不能作为部署时唯一可取得的证据。发布内容及批准记录必须进入同一个可构建提交。

scope 写入格式升为 schemaVersion 2，保留 v1 的 locale、sourceRevision、scopeFingerprint、items、fields，并增加 policyFingerprint。items 继续记录 key、完整 sourceHash 和 dependencies；fields 记录 key、sourceHash、sourceFile 和 sourceField。removals 每项包含 key、reason、evidence，evidence 指向仓库内正式归档声明或删除清单的文件、条目 key 和内容指纹。读取 v1 时保留全部旧目标，缺少移除证据的历史记录列为待核对；只读检查不自动重写文件。

### 8.2 导入合同

```bash
npm run locale:import -- --locale de --file translations.json
npm run locale:import -- --locale de --file translations.json --apply
```

保留 batch schemaVersion 1 的结构，将 locale 从 ja 字面量推广为已注册 code。每个 operation 继续包含 key、sourceField、targetField、expectedSourceHash、expectedTargetHash 和 translation；页面以 `["$page"]` 寻址，使用完整 prose 指纹。目标不存在时 expectedTargetHash 必须显式 null。

只允许写入报告中该语言的解释字段和 MDX 译文。调用者不提供任意文件路径；内容 ID、模型、生成记录正文、Prompt 变体、模板参数值、启用配置和审校状态不能通过翻译批次写入。内容导入继续要求仓库标准 content 目录；CONTENT_DIR 覆盖下可只读检查，写入明确报错。

若目标语言就是页面或字段的真实源语言，该项仍纳入覆盖与审校，但标为不可翻译导入；源文通过既有内容编辑流程修改。导入器必须拒绝将源页改写成引用自身的 translation，或通过翻译操作修改共享字段的来源值。

UI JSON 本轮仍通过完整字典文件变更维护，不扩展该导入器。新语言字典先在准备目录完整生成、检查，再整批加入 messages；现有字典一旦变更，相关 fingerprint 审校必须随同更新。

导入复用既有内容写锁、字段合并、暂存校验、事务日志和回滚。锁内重新读取源及目标指纹；源已改变即拒绝，目标与期望不符即冲突；源匹配且目标已等于期望译文时返回 no-op。禁止覆盖其他语言或并发修改的其他字段。

新增草稿使用 draft / machine-draft，不生成审校结论。若任一操作影响已公开的目标内容或其共享依赖，整个批次进入 pending，不覆盖当前公开版本。批次内部任一操作冲突，整批不应用。

暂存校验检查结构、MDX、引用、ICU 之外的内容契约及其他语言影响；本批次尚未完成的目标语言审校是待完成状态，不阻止合法草稿进入准备流程。不能因“德语尚未 ready”而使修复德语的导入器自身无法工作。

### 8.3 审校记录

沿用 reviews.json schemaVersion 1：locale、records；每条记录包含 key、sourceHash、targetHash、reviewer、completedAt、conclusion，可选 reason。保留已完成的日语历史记录和实际时间。

- sourceHash 为报告中的完整 sourceFingerprint 或字段 sourceHash，targetHash 必须对应真实待发布译文。
- 最新记录控制结论；同时间以 changes-requested 优先。未来时间、空哈希、无法对应当前或历史 scope 的 key 和语言不符均报错。正式移除目标的历史记录保留供追溯，不作为当前批准。
- 变更源文或译文后旧记录失效；不得仅更新哈希或时间冒充重新审校。
- 实际进行的 AI 审校明确标识 AI；语言审校、浏览器验收和图像描述核验分别保存证据，不能由翻译生成成功代替。
- 合法不翻译的品牌、模型名等字段可保留原文值，但记录精确字段和理由。目录级豁免、空值占位和“所有英文都允许”不构成批准。

新增德语术语表和风格规范先于批量翻译。页面审校检查自然表达与事实一致性；图片 alt/caption 结合实际资产检查；模板与输入说明结合真实参数和页面操作检查。

## 9 候选批次发布与并发保护

增加一个发布候选批次的入口，使已公开内容更新有完整闭环：

```bash
npm run locale:promote -- --locale de --batch BATCH_ID --reviews reviewed-records.json
npm run locale:promote -- --locale de --batch BATCH_ID --reviews reviewed-records.json --apply
```

batch 只接受合法 ID，解析到该语言的 pending 目录，不接受任意候选目录。reviewed-records.json 使用第 8 节记录格式。默认输出拟合并的字段、页面发布状态和审校记录；apply 执行同一内容事务。

每次成功 apply 均在 `pending/{batch-id}/manifest.json` 记录 schemaVersion 1 清单，batch ID 使用规范化输入批次的 SHA-256 十六进制值。清单包含 locale、batchId、mode（pending 或 applied-draft）、原始 batch、逐操作的稳定实体身份、源指纹、写入前目标指纹、候选指纹及发布时预期目标指纹；页面操作另含源与目标生命周期元数据的前置指纹。内容导入和清单持久化属于同一事务。候选内容、清单和提供的批准三者必须匹配。

发布操作按顺序执行：

1. 读取不可歧义的批次清单、源／目标前置指纹和候选内容指纹。候选若被编辑，原批准失效；重新生成计划并审校，不照搬旧批准。
2. 在写锁内重新读取工作区；逐字段核对 expectedSourceHash、expectedTargetHash。保留批次之外的内容与并发字段，禁止整文件覆盖旧候选快照。
3. 核对候选页面及所有变更字段的有效批准；未变且仍有效的依赖批准可复用。页面的前置与后置状态也写入计划，防止覆盖并发归档或其他生命周期变化。
4. 在完整暂存树中合并目标字段、批准记录和必要的 published / reviewed 元数据。页面文本指纹不包含这些状态元数据。
5. 校验本批次单元、全部受影响的公开内容及其他语言。disabled 的完整覆盖语言允许逐批发布本地文件而全站尚未 ready；enabled 的 complete 语言必须通过整套发布门禁。
6. 使用同一事务应用内容与审校记录，失败全部回滚。重复发布同一内容和记录为 no-op；任何其他差异为冲突。

首次导入已直接落在源树的 draft，也需要可发布清单：导入器在 apply 时记录 batch ID、当前草稿指纹和状态。promote 对此按“源树已有草稿”模式验证，不能把 draft 的写入前 null 指纹当成发布时前置值。既有 pending 和已落盘 draft 使用同一发布计划逻辑。

已落盘 draft 的发布前置值是 apply 后的目标指纹与 draft 状态；pending 的发布前置值是尚未改变的工作区目标。一个 batch ID 下内容不匹配时拒绝覆盖并提示重新准备批次，保留审校者的修改。旧 pending 没有清单时，先依据原 batch 与当前源树重建可审阅计划，验证候选无歧义后显式迁移；不直接采信旧候选的整文件内容。

本入口只发布翻译与页面元数据，不启用语言、不修改远端站点。普通人工编辑仍可用内容提交维护，但必须满足相同指纹与构建检查。

## 10 通用界面能力与德语适配

### 10.1 字典和格式

所有 buildable 语言的消息与默认字典对齐：命名空间、叶子键、非空字符串、ICU 语法和参数集合均校验。已存在但未启用的字典目录继续纳入检查，避免把坏字典推迟到启用时才发现。

复数分支按目标 locale 的规则及实际产品数量范围验收，保留 other；参数名相同不代表英语句序或复数规则可以照搬。日期和数字在 Node 与浏览器一致，使用已有固定时区与编号系统。

德语采用自然的标准书面德语，面向创作工具使用场景统一使用 du，按钮优先简短动作词；Prompt、Vorlage、Sammlung 等术语以德语 glossary 的最终审校版本为准。模型名、品牌、代码、URL 和画面中有意指定的文字保持真实含义。

### 10.2 搜索

保留 MiniSearch、按语言索引和共享分词实现。站内搜索服务可浏览集合，可以找到回退内容；其 contentLocale 与页面一致。外部收录规则不能使站内检索丢失仍可访问的内容。

德语首版必须满足：

- Straße / Strasse / STRASSE 可互相检索；Größe / Groesse、Porträt / Portraet 及已有无重音输入可找到同一目标。
- NFC、NFD 输入一致；大小写变化不影响召回。
- 建立领域别名，至少覆盖产品摄影、肖像、海报、贴纸、构图、背景、光照、模板等高频概念。Produktfotografie 的领域样本可通过 Fotografie、Produktfoto 召回。
- 复合词首版使用已维护的 taxonomy aliases 与术语映射，不承诺任意德语词都可拆解。通用词干提取和大字典拆词留待真实查询证明需要后扩展。
- 原词匹配优先于扩展别名；模型 ID 和英文技术名仍能搜索。

拼写归一化及别名扩展在构建端与 Worker 共用。不能把同一个词的多个候选拼写当成 AND 条件；高亮保留原始 UTF-16 范围，ß 扩展为 ss 后也不能截错文字。映射只作用于检索，不修改显示、复制或源数据。

搜索文件增加 schemaVersion 和 analyzerVersion；Worker 校验二者及现有 buildId。版本不匹配返回 stale，走既有刷新／重试流程，不混用旧索引与新分析器。所有索引随完整构建重建，客户端只加载当前需要的语言。

`search-cases.json` 采用 schemaVersion 1、locale、cases 数组；每条包含 query、expectedKeys、topK，必要时 excludedKeys、reason。expectedKeys 使用 kind/稳定 ID。德语至少 30 个真实检索场景，必需项位于前 5；冻结验收集后调优，不能通过删掉失败用例通过验收。另设纯语言小 fixture 验证无内容总量依赖的归一化行为。

### 10.3 排版、可访问性及其他语言

德语复用现有拉丁字体，检查 ä、ö、ü、ß 和大写形式。对长标签采用自然换行、合理收缩和可访问的完整名称；正文可按 lang 使用 hyphens，Prompt、代码和用户输入保持原文及既有换行语义。

验收真实德语页面的导航、筛选器、模板字段、空状态、复制提示、手机操作栏和弹层。已有 applyGermanLabels 仅作为额外压力测试，不能代替真实字典与内容验收。

通用接口保留 script、region 和 direction 语义；用现有阿拉伯语预览验证 RTL、双向文本与混合输入，用中文和日语回归 CJK 分词与字体。以后增加语言时可补相应搜索 profile、字体子集和语言用例，不添加按语言复制的页面或发布脚本。

## 11 德语内容实施顺序

1. 建立 glossary、style-guide、scope 和第一版搜索用例；确认 381 个基线单元与当前源树差异。完成条件：每个目标和共享字段都有来源、目标路径及分类。
2. 完成全部 UI 字典及审校，补齐 About、License 和全局可见分类标签；再开启 de.preview，保持 de.enabled 为 false。完成条件：预览构建无缺键、语言切换和系统页可用。
3. 选取约 20 个 Prompt、3 个模板、2 个合集作为预览样本，覆盖中英文源文、字面 Prompt、模板派生、参考图、多输入、图像标注、历史运行、长标签和 GIF。完成条件：从浏览到搜索、编辑、复制、下载与弹层的完整流程通过。
4. 按依赖批量补齐全部目标，优先复用共享字段译文。每批导入、审校、发布候选并重新计算差异。完成条件：动态目标全部 current，字段审校有效，德语 strict ready。
5. 执行第 13 节生产候选验收。实际启用 de 的提交包含最新内容、审校记录和配置；在该提交上构建部署。完成条件：线上版本与批准提交一致，德语地址和索引输出通过检查。

首批样本是流程验证集，不是德语公开发布范围。德语首发不增加德语 Prompt 正文变体；需要本地化实际 Prompt 时，另行将该语言策略调整为 optional 并完成对应正文测试与证据更新。

## 12 构建与持续维护

`content:validate` 和 `content:build` 使用同一多语言分析结果；所有阻塞检查在清空或替换生成目录之前完成。原子翻译事务与构建目录替换是不同职责，不能将失败构建写出部分新语言数据。

对每个 enabled 语言：

- UI、必需独立页面和已声明发布内容的结构错误始终阻止构建。
- complete 的目标缺译、过期、未审校、依赖缺口和 source-only 冲突均阻止。
- incremental 的未发布缺译形成报告；已声明发布但未经要求的审校形成发布错误；已批准内容因来源变化而 outdated 可保留浏览但退出索引。

preview-only 的 incomplete 翻译不阻止其他语言生产发布；它的结构错误及已加入 messages 的无效／不完整字典仍按现有规则处理。即使 BUILD_MODE=preview，enabled complete 语言的生产发布条件仍检查，预览模式不能绕过正式语言门禁。

CI 将 ja 专用报告替换为按配置的全语言报告，产物按 code 保存，失败时也保留诊断。自动部署与手动部署都执行相同 build；禁用门禁、静默改成 metadata 或移除 scope 不作为修复方式。

新内容生产保持生成事实与翻译解耦：已有中英文生产配方可继续使用，准备后的内容接入 locale 检查及翻译批次。公开内容进入目标后，ja、de 等 complete 语言必须随同补齐才能合并可发布提交；尚未补齐时保留内容候选。后续语言若采用 incremental，可在其新内容未翻译时继续发布其他更新，但相关回退地址 noindex。

源修改时报告具体受影响语言、页面和共享字段，保留未变化的有效审校。部署前重新计算目标；排期中的旧报告不是放行依据。

## 13 验收矩阵

### 13.1 自动化用例

回退浏览的生产测试使用 incremental 的独立 fixture；真实德语保持 complete。对 complete 语言先验证纯判定能识别回退与缺译，再断言发布门禁拒绝输出，不能为跑用例降低实际语言策略。

| 编号 | 输入或动作                                     | 必须结果                                                               |
| ---- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| A01  | 注册新测试语言并填完整 UI                      | 路由、菜单、检查、导入均无需修改语言白名单                             |
| A02  | 德语缺文件，英语可公开                         | 德语可回退浏览；missing 计数增加；不进入德语 sitemap/hreflang/index.md |
| A03  | 德语草稿，英语可公开                           | 生产不泄露草稿；预览可见草稿；两者都不算 current                       |
| A04  | published 德语缺审校或必需输入说明             | 报发布错误，不能因英语字段回退通过                                     |
| A05  | 已批准页面源文、独立 SEO、合集理由或译文变化   | 对应指纹审校失效；不影响无关字段                                       |
| A06  | 德语 archived 且英语存在                       | 保持 410／显式重定向，不生成回退详情                                   |
| A07  | scope 目标被隐藏、源语言被禁用                 | 报告未证明的移除，不能减少全量缺口                                     |
| A08  | source-only 语言已有 Prompt 变体               | 报冲突，既有文件及 resolver 选择保持不变                               |
| A09  | 同批重复 key、过期源、目标并发变化、越界路径   | 整批拒绝，工作区及已发布内容无部分写入                                 |
| A10  | 翻译更新命中已公开共享字段                     | 整批 pending；当前线上候选源树不被修改                                 |
| A11  | promote 批准缺失、候选被改、并发归档、写入故障 | 拒绝或全部回滚；有效重试幂等；其他语言字段保留                         |
| A12  | 翻译只改 YAML 顺序或非文案元数据               | 不虚假撤销文本审校                                                     |
| A13  | preview 构建含 enabled 语言                    | 所有 HTML noindex，外部可索引输出为空；正式语言门禁仍执行              |
| A14  | 回退页面点语言切换、收藏打开或详情弹层         | 浏览链接可用，不能因 SEO alternates 缺少语言而失效                     |
| A15  | 模板填入用户值后切换 UI 语言                   | 保持既有输入语义，显示／复制／下载一致，原始运行记录不变               |
| A16  | Straße、Groesse、Portraet、领域复合词、NFD     | 命中预期条目，高亮完整；英文模型 ID 与 CJK/RTL 回归通过                |
| A17  | 搜索 analyzerVersion 或 buildId 不同           | 返回 stale 并恢复，不能用旧索引产生错误结果                            |
| A18  | enabled complete 语言新增公开目标或共享依赖    | 普通、CI、手动部署构建均发现缺口；补齐后恢复                           |
| A19  | 全局结构错误导致索引无法生成                   | 检查失败，不能报告空目标 ready                                         |
| A20  | 聚合页混有回退卡片                             | 浏览分页不变；该页 noindex 且不进入 sitemap，其他合格页按实际集合输出  |
| A21  | 独有的目标语言 published 内容                  | 检查其页面及字段，不能因其他语言无对应版本而漏检                       |
| A22  | 字典缺 key、ICU 参数不同、空译文               | 构建在替换生成产物前失败，上一成功产物保留                             |
| A23  | 通过翻译批次修改目标语言自己的源页／源字段     | 拒绝，不制造自引用 translation；源内容编辑流程仍可使用                 |
| A24  | 数组重排后同一路径上恰有相同文案               | 稳定实体身份不符导致冲突，不能写入另一字段或条目                       |

### 13.2 生产候选

完成实现后运行适用检查：typecheck、lint、内容验证、单元测试、完整生产构建，以及对构建产物的 HTTP／浏览器测试。UI 变化增加 tokens、Storybook 和 axe 检查；复用仓库现有脚本，不以 next dev 验证静态托管行为。

根路径与 /prompt-seen 子路径都验收生产语义；至少一个预览构建覆盖 de 准备态和 ar RTL。浏览器覆盖 Chromium、Firefox、WebKit，宽度 360、768、1024、1440，两种主题，包含键盘操作和 200% 缩放。无页面横向溢出、关键按钮裁切、严重／致命 axe 问题、hydration 错误或未捕获异常。

德语全量候选检查 strict ready、真实德语页面和元数据、双向 hreflang、sitemap／Markdown／导出集合一致、复制下载正文一致、链接状态正确。源码模型检查和 HTTP 产物检查都要通过，不能只检查生成 JSON。

P6 在隔离的候选分支／工作区准备包含 `de.enabled: true` 的完整发布提交，构建并验收生产产物；此时不合并到自动部署分支。disabled 配置的生产构建不会生成德语，不能作为德语生产验收。P7 发布已验收的同一提交；如果合并或其他变更产生新提交，重新构建并验收实际部署版本后再部署。预览平台继续通过平台配置 noindex。

记录相同配置下增加德语前后的构建耗时、产物数量、HTML／JSON 大小、搜索索引 gzip、首屏 JS 和字体请求。沿用总体设计及 first-load-js 的性能预算和已记录例外；不能通过加载所有语言索引或审校数据换取实现便利。

线上使用现有 check:live 检查部署 buildId、德语首页和代表详情、canonical、robots、sitemap、静态文件及子路径地址。回滚使用上一份成功静态部署，并同步处理触发错误发布的提交，避免下一次构建再次上线。

## 14 实施拆分与完成条件

| 步骤                | 改动范围                                                                    | 完成条件与依赖                                                                      |
| ------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| P0 配置及迁移基线   | config schema/load/generate、locale 注册表、快照                            | 策略组合有测试；旧启用状态不变；记录旧新目标差异；不启用 de                         |
| P1 判定与覆盖       | content 的纯判定模块、localization check/dependencies、report v2、scope CLI | A02–A07、A12、A19、A21 通过；无回退冒充翻译；无循环调用；依赖 P0                    |
| P2 翻译闭环         | 通用 import、batch manifest、promote、review 校验                           | A08–A11、A23、A24 通过；ja v1 批次／记录可读；新增任意注册语言无需改白名单；依赖 P1 |
| P3 渲染及输出一致性 | content types、feed/search/favorites/popup 模型、UI lang、SEO/GEO/导出      | A02、A13–A15、A20 通过；浏览集合与收录集合分开；依赖 P1                             |
| P4 构建与 CI        | content:validate/build、全语言报告、部署前检查、文档                        | A18、A22 通过；一次读取、多语言复用；enabled complete 门禁覆盖全部入口；依赖 P1–P3  |
| P5 德语预览样本     | de 字典、术语、必需页、代表内容、搜索适配                                   | A01、A16、A17 及第 11 节样本流程通过；依赖 P2–P4                                    |
| P6 德语全量候选     | 动态目标全部译文与批准、生产产物、浏览器证据                                | 第 13 节通过，strict ready；依赖 P5                                                 |
| P7 正式发布         | 已验收的 de enabled 发布提交、部署、线上检查                                | 线上 buildId 对应验收提交，回滚产物可用；依赖 P6                                    |

各步骤形成可独立审阅的提交或 PR，核心合同变更先合并；实现期按代码改动运行必要测试。本次规格文档提交本身不表示上述步骤已完成。

## 15 迁移兼容与最终交付

reviews.json 和既有 translation frontmatter 保留格式及真实证据。scope v1 可经显式迁移写为 v2；补上策略与新增依赖时不得批量生成“已批准”。report 输出升版，更新其 CI／脚本消费者；batch v1 结构保留，仅推广 locale 和添加独立的批次清单。

旧 generated 模型不在运行时猜默认值兼容；构建完整重生成，buildId 和搜索版本控制缓存，部署原子切换整套产物。禁止混合新 HTML 与旧语言数据。

修复判定后若发现已有日语缺口，列出实际缺口并补译／复核，再接入新门禁；不通过关闭 ja、改策略或删除 scope 躲开。中英文维持显式 metadata 模式，但所有语言的回退地址都遵守新的 noindex 规则。

P3/P4 同步更新 content/README.md、japanese-localization-tooling.md、japanese-localization-spec.md、multilingual-prompt-design.md、home-language-seo-spec.md 和总体设计中的冲突段落；保留历史记录的日期、完成范围与事实。工程约定仅更新受影响的配置、集合和工具合同。

交付完成必须同时具备：通用策略与 CLI、准确的覆盖报告、安全的翻译发布闭环、一致的浏览与 SEO 输出、德语完整内容及真实审校、自动化与浏览器证据、通过验证的生产部署，以及新增内容可持续执行的翻译流程。仅添加字典、通过类型检查或把 de.enabled 改为 true 均不构成交付完成。
