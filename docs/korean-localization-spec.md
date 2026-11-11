# 韩语完整接入实施规格

状态：全量内容与工程接入已完成，自动验收已执行并记录失败及复核结果；生产发布条件尚未全部满足，未启用或部署。日期：2026-11-11（America/Los_Angeles）。最初规划基线：`ec6051f3` 及当时工作区；独立实施 worktree 基线：`0306b74b66ab9bf1f76eb5061bc466c3ebf86325`。实际结果与剩余门禁见 [acceptance.md](../production/localization/ko/acceptance.md)。

将韩语作为 `ko` 接入现有静态多语言站点，完成界面、全部公开内容说明、共享解释字段、韩文搜索、输入法、排版和 SEO 的完整上线流程。首发采用与日语、德语一致的完整覆盖策略：分批翻译和审校，在预览环境验证，全部发布条件满足后一次启用。Prompt 与模板正文保留各自原始语言。

本规格细化[语言覆盖评估](language-coverage-assessment.md)中的韩语计划，复用[通用本地化规格](general-localization-spec.md)和[本地化工作流](localization-workflow.md)的配置、指纹、导入、发布及回退合同。韩语范围与验收以本文为准；工程组织遵守[工程约定](engineering-conventions.md)。旧文档中的德语准备期描述是历史状态，不能作为当前能力清单。

## 1 交付范围与固定决策

| 项目 | 本次决策 |
| --- | --- |
| 语言身份 | code、pathPrefix、htmlLang 均为 `ko`，nativeName 为 `한국어`，direction 为 `ltr`；不新增 `ko-KR` 内容目录或第二套路由 |
| 内容覆盖 | `coverage: complete`；所有生产目标及其依赖完成后启用，首屏样本只用于验证流程 |
| 审校策略 | `review: fingerprint`；页面、UI 消息、共享字段均有与当前源文和译文匹配的真实审校记录 |
| Prompt 正文 | `promptBodies: source-only`；原文为韩语的条目正常使用原文，本轮不新增韩语正文变体 |
| 语言体验 | 页面说明、导航、筛选、模板字段、无障碍名称和错误反馈使用自然韩语；原始 Prompt 与模型名称保留准确语言标记 |
| 发布架构 | 沿用注册表、next-intl、文件内容库、静态导出、MiniSearch Worker 和现有部署流水线 |
| 排除范围 | 自动在线翻译、重新生图、韩国地区专属内容策略、独立域名、运行时服务端搜索、完整韩语形态分析、初声搜索、键盘布局纠错 |

复制、下载、弹层、快捷键和模板预览必须使用同一个正文解析结果。翻译不得修改稳定 ID、slug、模型版本、许可标识、生成时间、Prompt 哈希、运行记录、模板变量名、选项值或参数约束。用户在模板中输入的韩语原样保留，不自动翻译。

## 2 当前基线与工程缺口

2026-11-11 对当前源树执行 `npm run --silent locale:check -- --locale ko --json`，得到以下候选生产报告。注册表当前启用 `en`、`zh-Hans`、`ja`、`de`；`ko` 未启用，未设置 preview，策略仍为 incremental / fingerprint / optional。

| 对象 | 目标数量 | 韩语现状 |
| --- | ---: | --- |
| Prompt 说明 | 285 | 全部缺失 |
| 模板说明 | 75 | 全部缺失 |
| 合集说明 | 16 | 全部缺失 |
| 专题说明 | 3 | 全部缺失 |
| About、License | 2 | 全部缺失 |
| UI 消息 | 427，14 个命名空间 | 全部缺失 |
| 共享解释字段 | 1,793 | 全部缺失 |

页面共 381 个，真实说明来源为 371 个英语、10 个简体中文单元。共享字段按文件和字段路径去重，分布为 Prompt 882、媒体 363、模板 308、示例 206、taxonomy 34。报告的 `fieldsTotal=2220` 已包含 427 条 UI 消息，不能再重复相加。

当前 `localCurrent=0`、`indexable=0`、`ready=false`；379 个可浏览单元全部来自其他语言回退，另外两个独立页面不能回退。`blocking=false` 及普通检查退出码 0 只表示没有触发该检查的阻塞错误，不能作为韩语可以上线的证据。数量是实施前快照；实施、验收和持续维护均从最新报告计算，不在测试中写死 381 或 2,220。

| 能力 | 已有实现 | 韩语增量 |
| --- | --- | --- |
| 语言策略与内容发布 | 通用 `locale:check/scope/import/promote`、事务、候选清单、指纹审校均已存在 | 配置韩语策略，准备 scope、字典、翻译和证据；不另写韩语导入器 |
| 字典校验 | `scripts/lib/localization/messages.ts` 检查所有 enabled、preview 或已有字典目录的语言 | 必须一次加入完整字典，不能先提交半套 `messages/ko` |
| 搜索 | Hangul 与汉字、假名同用 CJK 字符双字切分；领域 profile 目前只有德语 | 单独处理韩语规范化、领域词、助词和空格变体，保持其他语言行为 |
| 搜索版本 | `types.ts` 与 Worker 有分析器版本，emitter 仍写死 `2` | 改为共享常量，并随韩语分析规则升级版本、重建索引 |
| 输入法 | `useCommittedQuery` 会冻结查询；部分快捷键已处理 `keyCode=229` | 补齐快捷搜索、搜索页提交、URL 和历史记录的组合输入保护 |
| 字体 | `Noto Sans KR` 依赖、韩语字体栈及构建子集映射均已存在 | 验证真实韩文标题覆盖、断行和按语言加载，无需再引入整套字体 |
| SEO | 已有 `ko_KR` Open Graph 映射及 Naver verification 配置 | 验证韩语原始 HTML、各输出集合及上线后的抓取 |

现有分词的可复现差异：`queryTerms('한글', 'ko')` 得到 `['한글']`，其 NFD 形式则得到拆散的 Jamo token；`제품 사진을` 额外要求匹配 `진을`，不能稳定召回只写 `제품 사진` 的内容。这两项进入第 6 节的强制回归用例。

实施基线差异：新 worktree 已包含西班牙语搜索 profile，分析器实际由版本 3 升为 4；emitter 已引用共享版本常量，无需重复修改。以上基线表保留规划时的观察，验收以当前代码和最新覆盖报告为准。

## 3 配置与发布状态

实施首个提交将 `content/locales.yaml` 中韩语项改为以下准备状态。其他语言配置保持原值。

```yaml
- code: ko
  pathPrefix: ko
  nativeName: 한국어
  htmlLang: ko
  direction: ltr
  enabled: false
  preview: false
  phase: 1
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

| 阶段 | enabled | preview | 进入条件与结果 |
| --- | --- | --- | --- |
| 准备 | false | false | 固定策略、范围和术语，允许逐批导入；正式构建没有 `/ko/` |
| 预览 | false | true | 完整 UI 字典校验通过，About、License、全局 taxonomy 文本及纵向样本完成审校；预览构建包含韩语，全部 noindex |
| 发布候选 | true | true | 在候选提交中启用；韩语 strict、现有已启用语言门禁和生产产物验收全部通过，尚不代表已部署 |
| 正式上线 | true | true | 部署已验收的完整产物并验证线上 build ID；生产语言入口和 SEO 输出正式包含韩语 |

生产构建只使用 enabled 语言；预览构建使用 enabled 或 preview 语言。`BUILD_MODE=production` 不会自动包含 disabled 的韩语，也没有 `--force-locale` 参数。上线验收应在独立候选 checkout 或候选提交中设置 enabled，再进行生产构建。

浏览器偏好 `ko`、`ko-KR` 推荐同一个 `ko` 入口；已保存的明确选择优先，不强制跳转。切换语言保留能够对应的页面，缺少独立页面时沿用缺译页。内部 URL 继续由 URL 模块生成，验证根路径与 `/prompt-seen` 子路径；不引入 Proxy、请求期 Cookie 或服务端语言协商。

实现路由或布局前阅读本仓库安装的 `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` 和 `internationalization.md`；本项目保持 `output: 'export'` 与现有 `[locale]` 结构。

## 4 翻译范围与韩语编辑约定

### 4.1 文件与字段

| 位置 | 翻译内容 |
| --- | --- |
| `src/i18n/messages/ko/{namespace}.json` | 以英语完整 key 集合为准，包括占位符、aria 名称、错误、状态、空态和 SEO 系统消息 |
| `content/prompts/{id}/locales/ko.mdx` | title、description、MDX 正文及原文已有的独立 SEO 字段 |
| `content/templates/{id}/locales/ko.mdx` | 用途、输入说明、版本说明和注意事项 |
| `content/collections/{id}/locales/ko.mdx` | 合集说明与已有成员推荐 reasons，成员 ID 不变 |
| `content/taxonomy/{categories,styles,use-cases}/{slug}/locales/ko.mdx` | 报告中实际公开的专题说明；不能假设存在 `content/topics` 目录 |
| `content/pages/{about,license}/locales/ko.mdx` | 关于、测试方法与许可说明，保持事实和许可约束 |
| 报告 `fields` 指向的共享 YAML | taxonomy labels/aliases、图片 alt/caption、标注 note、参考输入说明、模板 label/help、示例 notes 等已存在的解释字段 |

14 个现有命名空间为 `common`、`detail`、`explore`、`favorites`、`feed`、`geo`、`home`、`pages`、`popup`、`primitives`、`search`、`shell`、`shortcuts`、`templates`。开始翻译与发布前重新读取英语目录，纳入新增 key 和命名空间。

页面从报告的 `sourceFile/sourceLocale` 翻译，不一律从英语或日语转译。共享字段使用报告指定的唯一来源。可选字段在源数据中不存在时保持不存在；禁止用空串、复制英语或自动回退冒充韩语完成。

### 4.2 术语与语气

先建立 `production/localization/ko/glossary.yaml` 和 `style-guide.md`，再开始批量翻译。以下为初始编辑约定，须在实际语言审校中确认；术语表本身不授予内容批准。

| 概念 | 韩语约定 |
| --- | --- |
| Prompt、Template、Collection | 프롬프트、템플릿、컬렉션 |
| Reference image、Output image | 참조 이미지、생성 이미지，明确区分输入与真实输出 |
| Copy、Download、Reset | 복사、다운로드、초기화 |
| Favorites | 즐겨찾기 |
| Product photography、Portrait | 제품 사진、인물 사진；搜索可接受 제품사진、포트레이트 |
| Poster、Sticker、Background、Lighting | 포스터、스티커、배경、조명 |
| 未验证 | 검증되지 않음；不能把原文的未知、未测试改写成已验证 |

说明使用一致的礼貌书面语，操作指引用 `…하세요`，按钮使用短动作词。专有名称、模型名、代码、URL 和原文刻意要求出现在图中的文字保留原拼写；不把源画面的日文、中文等擅自改为韩文。

避免把不确定的动态值直接接在 `은/는`、`이/가`、`을/를` 前。例如用 `선택한 모델: {model}`，而不是拼接固定助词。本轮不为 UI 引入运行时助词引擎。完整消息保留 ICU 参数名、富文本标签和语义分支；韩语计数允许使用 `other`，保留源文中有独立业务含义的精确数量分支。验证 0、1、2、1,000 和日期的服务端／客户端一致性，沿用 `formatLocale`。

图片文字结合实际资产审校；不能仅根据文件名或 Prompt 猜测可见细节。模板字段结合真实输入与生成预览审校。语言质量、图片核验和浏览器验收分开记录。

## 5 可重复执行的内容流程

### 5.1 范围和产物

在第 3 节策略变更后运行：

```bash
mkdir -p .artifacts/localization/ko
npm run --silent locale:check -- --locale ko --json > .artifacts/localization/ko/report.json
npm run locale:scope -- --locale ko
npm run locale:scope -- --locale ko --apply
```

第一次检查允许 `ready=false`，但必须查看 findings，不能忽略结构错误。`locale:scope --apply` 记录当前目标和依赖，不生成批准、不减少未完成项。之后每批开始前重跑报告，源文变化使原批次失效时重新准备；删除、降为 draft 或关闭源语言不能用来缩小范围。

提交到仓库的产物包括 `production/localization/ko/scope.json`、`reviews.json`、`glossary.yaml`、`style-guide.md`、`search-cases.json`，以及实际译文。新增 `production/localization/ko/acceptance.md` 记录每项验收的实际结果、源 revision、构建 ID、环境、执行者、时间与证据位置；未执行项明确为 pending。大型截图、临时报告和候选清单留在 `.artifacts/localization/ko/` 或 CI artifacts，记录可追溯的地址。

### 5.2 字典先行

1. 在 `.artifacts/localization/ko/messages/` 准备完整字典，对照英语所有 key，检查韩语表达、参数和 ICU。
2. 将完整的 14 个命名空间及新增命名空间一起加入 `src/i18n/messages/ko/`。当前校验器只要发现该目录就会检查完整性，即使 ko disabled 也一样。
3. 重跑报告，按真实 sourceHash/targetHash 对每条 UI 消息进行审校，记录到 `reviews.json`。UI JSON 不通过 `locale:import` 写入；字典与对应批准作为同一个内容变更维护。
4. 通过 `npm run content:validate`。只有缺失翻译已经补齐才进入 preview；不放宽消息校验来容纳半套字典。

### 5.3 内容批次合同

沿用 `scripts/lib/localization/import.ts` 的 batch schema v1。每个批次针对一个 locale；每个 operation 按当前报告寻址。

| 字段 | 页面 operation | 共享字段 operation |
| --- | --- | --- |
| `key` | `items[].key`，如 `prompt/p_151` | `fields[].key` |
| `sourceField`、`targetField` | 均为 `["$page"]` | 原样使用报告路径数组 |
| `expectedSourceHash` | `sourceFingerprint`，不是 MDX 的短 `sourceHash` | `sourceHash` |
| `expectedTargetHash` | 当前 `targetHash`；缺失时显式 `null` | 同左 |
| `expectedIdentity` | 无需填写 | 数组索引路径必须使用报告的 `identity` |
| `translation` | `{title, description, body}`，加上源内容实际需要的 `seoTitle/seoDescription/reasons` | 与字段类型匹配的字符串或字符串数组 |

封套为 `{schemaVersion: 1, locale: "ko", operations: [...]}`，不接受自行指定的目标文件路径或额外状态字段。每批按依赖闭包组织：先批准全局 taxonomy 和 UI，再处理共享解释字段，最后发布引用它们的页面；相关页面和依赖也可以放入同批。相同字段只导入一次，跨批引用已批准依赖。

```bash
npm run locale:import -- --locale ko --file .artifacts/localization/ko/batch.json
npm run locale:import -- --locale ko --file .artifacts/localization/ko/batch.json --apply
```

检查 dry-run 的文件、字段和 conflicts 后应用。新增译文落为 draft / machine-draft；影响已公开译文或共享依赖时，整批进入 pending。apply 返回的 `batchId` 是 64 位 SHA-256 十六进制值，候选和 manifest 位于 `.artifacts/localization/ko/pending/{batchId}/`。后续命令中的 `BATCH_ID` 必须替换为该真实值。

### 5.4 审校与发布

审校记录沿用 `{schemaVersion: 1, locale: "ko", records: [...]}`，每条包含 `key/sourceHash/targetHash/reviewer/completedAt/conclusion`，必要时增加 `reason`。页面使用完整 prose 指纹；pending 的目标哈希来自实际候选，而不是旧的线上译文。

每批先完成源文与译文逐项对照、术语和韩语自然度审校，再完成该批涉及的图片与交互核验。AI 审校明确标记 AI；禁止伪称母语人工审校、复制日语／德语批准，或只刷新哈希和时间。合法保留原文的品牌等解释字段需要精确到字段的理由，不能设置目录级豁免。`changes-requested` 必须修正并重新审校后再批准。

```bash
npm run locale:promote -- --locale ko --batch BATCH_ID --reviews .artifacts/localization/ko/reviewed-records.json
npm run locale:promote -- --locale ko --batch BATCH_ID --reviews .artifacts/localization/ko/reviewed-records.json --apply
npm run --silent locale:check -- --locale ko --json > .artifacts/localization/ko/report.json
```

promote 在同一事务中合并译文、published / reviewed 元数据和匹配批准。禁用中的 complete 语言允许逐批发布文件而尚未全量 ready；每批仍须通过依赖和其他已启用语言的门禁。源文、目标、数组所属实体或生命周期发生变化时停止该批，重建计划并重新审校；不使用手工改为 published 来绕过检查。

### 5.5 批次顺序

| 批次 | 内容 | 完成条件 |
| --- | --- | --- |
| K0 | scope、术语、风格、完整字典、全局 taxonomy、About 与 License | 校验通过；真实批准完整，预览基础可用 |
| K1 | `p_151`、`p_005`、`p_012`、`t_001`、`t_002` 及其全部依赖；再选择一组真实合集／专题成员 | 覆盖英语源与中文源、参考输入、原始正文、模板编辑和图片说明，跑通 import → review → promote |
| K2 | 当前 `home.featured`、`feed.showcase/interludes` 引用内容、合集／专题实际成员及依赖 | 首页与聚合页展示内容可用；不得改变展示配置来隐藏缺译 |
| K3 | 剩余 Prompt、模板、合集、专题和共享解释字段 | 当前 scope 的全部条目和字段 current；搜索用例在真实完整语料上通过 |

K1 中没有覆盖的参考图、GIF、多图输出和长说明从最新报告补选实际条目，写入 acceptance 清单。每个内容批次以约 10–20 个页面为起点，按依赖和审校工作量调整；这一批量不改变首发全量门槛。

## 6 韩文搜索与输入法合同

### 6.1 搜索模块边界

保留 MiniSearch、按语言索引和 Worker 通信协议。新增 `src/modules/search/korean.ts`，由 `tokenize.ts` 和 `profiles.ts` 调用；只在 registry code 为 `ko` 时启用韩语词汇规则。该模块为纯函数，不读 YAML、不访问网络、不依赖浏览器／Node 的 `Intl.Segmenter` 词典版本。

| 接口或位置 | 实现合同 |
| --- | --- |
| 新增 `hangulUnits(text: string)` | 返回 `{term: string, start: number, end: number}[]`，包含规范化音节及其原始 UTF-16 范围；组合 Jamo 的源范围归属于完整音节 |
| 新增 `normalizeKoreanQuery(text: string): string` | 只对第 6.2 节白名单中的词组、空格变体和助词做规范化；未知词保持原意，不扩展出一串必须同时匹配的同义词 |
| 现有 `spans/tokenize/queryTerms/cjkRuns` | 保留公共签名；Hangul 使用独立音节处理，索引与查询共享规范化；高亮坐标始终对应原始文字 |
| 现有 `domainAliases` | 增加韩语领域词组和内容 kind 名称；别名写入低权重 aliases 字段，不修改可见文案 |
| `engine.ts`、`highlight-parts.ts` | 搜索使用规范化查询，UI 保留用户原始输入；高亮只标记原文中实际对应的范围 |
| `types.ts`、`scripts/emitters/search.ts` | emitter 引用共享的 schema/analyzer 常量；本轮升级 `SEARCH_ANALYZER_VERSION`，同步更新固定旧版本的测试 fixture |

不修改 SearchIndexFile 的字段形状时保留 schemaVersion；分析规则变化升级 analyzerVersion。全量重建各语言索引，Worker 继续拒绝旧 build ID 或旧分析器版本，显示已有重试／刷新反馈，不能把过期索引当成零结果。

### 6.2 最小分析规则

1. **规范化音节。** 识别 Unicode Hangul L/V/T 组合边界，将同一音节的 Jamo 整体规范化后再分词，不能逐 code point 做 NFKC。预组音节与其 NFD 形式得到相同 token；保留每个音节对应的原始范围。兼容宽度的拉丁字母和模型名继续走现有 NFKC／大小写处理。
2. **保留可预测的基础召回。** 韩文文档按规范化音节生成单音节和相邻双音节 token；查询用不重叠的双音节、奇数末尾补最后一对，单音节查询用自身。Hangul 不使用模糊编辑距离。汉字、假名及现有其他语言规则不随这一步改变。
3. **空格变体仅覆盖明确词组。** 为 `제품 사진/제품사진`、`인물 사진/인물사진`、`제품 포스터/제품포스터` 等术语声明规范形式；按最长词组匹配，索引别名与查询使用同一规则。不得删除所有空格或声称可以识别任意复合词。
4. **助词仅处理已知词根。** 初始后缀集合为 `은/는/이/가/을/를/의/에/에서/로/으로/와/과`。只有“完整已知名词或词组 + 一个后缀”位于词边界时，才去掉末尾助词；长后缀优先，完整词条匹配优先，不递归剥离。`사진을 → 사진`、`제품사진을 → 제품사진`；`종이` 等完整词不能因结尾是 `이` 被截短。动词活用、复合助词和未知词不猜测处理。
5. **领域别名有边界和方向。** 从完整词、已知词组或 taxonomy 身份识别概念，不能靠散落的双字 token 判定同义词。首批覆盖 제품 사진 / product photography / packshot，인물 사진 / 포트레이트 / portrait，포스터 / poster，스티커 / sticker，수묵화 / ink wash，조명 / lighting，템플릿 / template。普通 `사진/photography` 不反向扩展成产品摄影。模型名和稳定 ID 继续参与检索。
6. **高亮不改变文本。** NFC 查询可高亮 NFD 标题中对应的整个音节，反向亦然；`parts.map(p => p.text).join('')` 必须逐字等于原文。emoji、组合字符和相邻标点不被拆坏。仅通过语义别名召回而没有直接可见匹配时允许不高亮，不能在标题插入别名。

`production/localization/ko/glossary.yaml` 保存编辑用词和例外；运行时领域词维护在 `profiles.ts` 或新韩语模块中，避免把生产审校数据打进客户端。两者的核心词组由冻结搜索用例约束。原始标题、分类、模型、摘要与正文继续使用现有权重，aliases 保持次要权重。

### 6.3 冻结搜索用例

新增 `production/localization/ko/search-cases.json`，沿用 `{schemaVersion: 1, locale: "ko", cases: [...]}`；每条包含 `query`、`expectedKeys`、`topK`、`reason`，必要时包含 `excludedKeys`。`topK` 按每个内容 kind 分组计算，首批统一为 5。以下每个独立查询均写成一条 case，在调整算法和批量翻译之前固定；不能为了让测试变绿而移除查询或改成当前第一条结果。

| 查询组 | 预期 key | 覆盖目的 |
| --- | --- | --- |
| `제품 사진 스튜디오`、`제품사진 스튜디오`、`제품 사진을 스튜디오` | `prompt/p_151` | 产品摄影、空格与助词；内容为真实棚拍产品图 |
| `제품 사진 스튜디오` 的 NFD 形式 | `prompt/p_151` | 分解 Jamo 查询与 NFC 查询结果顺序一致 |
| `product photography studio` | `prompt/p_151` | 英文领域术语可检索同一韩语内容 |
| `네온 인물 사진`、`네온 인물사진`、`네온 포트레이트`、`neon portrait` | `prompt/p_005` | 韩语词组、外来词及混合语言别名 |
| `수묵화 매화`、`수묵화 매화` 的 NFD 形式 | `prompt/p_012` | 中文真实源内容的韩语检索 |
| `제품 포스터 템플릿`、`제품포스터 템플릿`、`제품 포스터를 템플릿` | `template/t_001` | 模板 kind、空格和助词 |
| `수묵화 템플릿` | `template/t_002` | 原始正文保留时仍可按韩语说明找到模板 |
| `p_151`、`GPT Image p_151`、`ＧＰＴ Image p_151` | `prompt/p_151` | 稳定 ID、模型名称和兼容宽度字符 |

以上为 18 条必需正向场景。另以固定小型 fixture 测试：单音节查询 `빛`；`종이` 不被错误截词；只有普通人像摄影的文档不能仅凭 `사진` 获得产品摄影别名；输入无匹配词时真正返回空结果。对这类隔离语义的用例使用合成文档，避免真实 Prompt 正文恰好包含相同词导致错误排除。

在 `scripts/lib/localization/korean-search.test.ts` 新增真实内容测试：从韩语内容模型建立索引，序列化后重新加载，再执行所有 cases。新增 `tests/e2e/korean.browser.spec.ts`，通过实际静态产物的 Worker 验证同一份 cases；不得只测试 tokenizer 返回值。韩语 preview 启用前允许专用测试明确 skip；进入韩语候选验收时必须断言产物含 ko 且所有韩语场景实际运行，零用例通过不算验收。

### 6.4 组合输入与快捷键

搜索页和快捷搜索共享以下行为：

- `compositionstart` 后输入框实时显示正在组合的文字，检索、结果数量、空态播报、URL `q` 和最近搜索保持上一次已提交值；不发送半成品查询。
- `compositionend` 后以最终完整值检索，重复 input 事件不重复提交同一查询；只展示最新请求的结果。
- `isComposing` 为 true、`keyCode=229`，或组合状态仍未结束时，Enter 不跳转、不提交、不选中结果；首次 Enter 只确认输入法候选，确认后的下一次 Enter 才执行正常动作。
- 组合期间 Escape 优先服务输入法，不关闭快捷搜索；`/`、⌘K、Ctrl+K 及单键快捷键不得劫持组合输入。既有普通键盘行为保持不变。
- 搜索记录保存用户确认后的原始文本，不保存规范化别名；取消组合不留下半个词。切换 locale 和快速连续查询继续遵守 seq/build ID 的响应保护。

重点修改位置为 `use-search.ts`、`SearchPage.tsx`、`QuickSearch.tsx`、`SearchLauncher.tsx`，复用 `src/ui/shortcuts/keys.ts` 已有保护。组合状态需要提供给提交、URL 更新和关闭处理，不能只冻结 Worker 查询。

自动化覆盖 Chromium、Firefox、WebKit 的 composition 事件及 Safari 风格 `229`；另外在真实韩语两套式输入法上走查浏览器与移动端候选确认、退格、取消和连续输入，记录操作系统／浏览器／输入法。合成事件通过不能代替真实输入法记录。

## 7 界面与 SEO 验收

### 7.1 排版和功能

韩语说明继续使用系统正文字体与已有 Noto Sans KR 展示字体子集。只为本次构建的 ko 生成 `public/generated/fonts/ko.css` 和所需 woff2；非韩语页面不得新增韩语字体请求，首屏不预取韩语搜索索引。

对韩语说明、标题和普通按钮优先按词断行；如需新增 `word-break: keep-all`，仅作用于韩语解释文本，并以 `overflow-wrap` 处理长 URL／连续字符。不能全局覆盖 Prompt、代码和用户输入的换行规则。遵守现有韩语行高与零负字距 token，不通过缩小正文到现有字号下限以下解决溢出。

固定视口 360、768、1024、1440，覆盖浅色／深色、200% 原生缩放、键盘和读屏器。检查首页、列表与筛选、详情、图片放大、弹层、模板、搜索、收藏、合集、专题、About、License、错误与缺译页。验收包含：

1. 无页面级横向溢出、遮挡或按钮关键文字丢失；长标题、字段错误和完整可访问名称可读。
2. 韩语外壳 `lang="ko" dir="ltr"` 正确；原文 Prompt、回退说明与共享字段保留真实 `lang/dir`，不把所有后代都标成 ko。
3. 列表打开弹层、复制、收藏、刷新详情和返回列表形成完整流程；模板修改韩语输入后，预览、复制与下载输出一致。
4. aria 名称、toast、加载、重试和无结果提示来自韩语字典；刷新和 hydration 不闪回英语，无新增页面错误或严重无障碍问题。
5. 首屏字体没有重复下载、缺字或整套 CJK 字体加载；记录韩语索引原始／压缩体积、首次加载与查询耗时，按总体设计第 16 节既有性能目标验收。对已启用语言用相同语料比较前后体积与结果，异常增长必须解释和修正。

### 7.2 输出集合

| 输出 | 韩语候选的必要行为 |
| --- | --- |
| HTML 与交互 JSON | 路由 locale 为 ko，说明 contentLocale 如实记录；复制内容的 promptLanguage 仍为原始正文语言 |
| canonical | 使用自身规范 URL，包括 origin、basePath 和尾斜杠；不统一指向英语 |
| hreflang | `ko`，仅关联真实可索引版本，包含自身且双向一致；沿用默认首页与 x-default 规则 |
| Open Graph、JSON-LD | `og:locale=ko_KR`；页面说明与 Prompt 的语言字段符合各自语义 |
| sitemap、llms.txt、index.md、外部内容导出 | 只包含可索引韩语内容，不发布回退译文；sitemap 使用现有 `ko/sitemap-pages.xml` 路由 |
| 聚合页 | 实际展示成员、首页精选与展示带全部满足既有本地化收录条件；计数和分页与 HTML 一致 |
| 搜索、探索、收藏、缺译、错误页 | 保持既有 noindex；未知地址为真实 404，归档继续使用既有 410／重定向 |
| 预览与平台域名 | 预览全部 noindex；平台域名限制与规范主机行为沿用现有部署策略 |

准备期的回退继续可供预览，不算完成。回归 fixture 验证 fallback 页为 noindex、无 hreflang 和外部导出；韩语 complete 候选若还有缺译或过期项，应在构建前失败，不能上线这些回退页。robots.txt 不能代替 noindex。

## 8 实施拆分与依赖

以下每项均是可独立审阅的交付单元。K03 可以与内容准备交错推进；K06 依赖所有内容和工程验收完成。

| 编号 | 负责角色 | 文件与交付 | 前置条件 | 完成条件 |
| --- | --- | --- | --- | --- |
| K01 | 内容维护／工程 | 韩语注册策略、scope、glossary、style-guide、冻结 search-cases、acceptance 清单 | 无 | 基线可复现，范围和事实保护规则确定 |
| K02 | 韩语编辑／工程 | 完整消息、About、License、taxonomy、K1 纵向样本、真实 reviews；开启 preview | K01 | import/promote 闭环可复现，现有语言构建通过，韩语预览可操作 |
| K03 | 搜索／前端工程 | 韩语分析模块、领域别名、版本常量、输入法保护、单元与 Worker 回归 | K01；真实内容测试依赖 K02/K04 | 第 6 节契约全部通过，中日德等原有搜索不回退 |
| K04 | 韩语编辑／审校 | K2、K3 批次全部译文、共享字段、批准与图片核验 | K02 | 最新 scope 全量 current，韩语 strict 通过 |
| K05 | 前端／QA | 韩语浏览器和 HTTP 验收、字体与布局修正、性能记录、真实输入法走查 | K03、K04 | 第 9 节矩阵通过，所有未执行项有明确状态，放行必需项没有 pending |
| K06 | 发布维护 | enabled 候选提交、生产构建、部署记录、线上核验及回滚产物标识 | K05 | 同一 build ID 的线上产物通过验收；正式入口可用 |

无需重写配置 schema、内容状态机或发布事务；若发现通用合同缺口，应在对应模块修复并增加针对失败场景的回归。不要把韩语条件散落到页面组件、导入 CLI 或 SEO emitter 中。

## 9 验收矩阵与执行命令

| 编号 | 场景 | 判定条件与证据 |
| --- | --- | --- |
| KO-01 | 注册、偏好、路由 | 准备／预览／生产集合正确；`ko-KR` 推荐 ko；根和子路径正确，无重复 locale |
| KO-02 | 范围与完整性 | 最新报告 `ready=true`、`blocking=false`、`localCurrent=target`、`fieldsCurrent=fieldsTotal`；无 missing/draft/outdated/unreviewed/invalid，所有目标均达到索引资格 |
| KO-03 | 字典与格式 | key、ICU 参数和标签一致；数量与日期无 hydration 差异；无运行时英语回退 |
| KO-04 | 事实与正文 | source-only 冲突被拒绝；翻译变更不触及原始正文、生成事实、变量 ID／值及其他语言文本；复制和下载等于 resolver 结果 |
| KO-05 | 导入和审校事务 | 新草稿可 promote；重复操作 no-op；源／目标／数组身份变化拒绝；无批准、未来时间、changes-requested 均不能发布 |
| KO-06 | 韩语召回 | 18 条冻结场景在序列化引擎和真实 Worker 各自全部通过，含阴性 fixture；同组 NFC/NFD 的结果 key 顺序一致 |
| KO-07 | 高亮与字符 | NFC/NFD 双向匹配，高亮不截断音节／组合字符，拼接还原原文；别名不伪造可见文字 |
| KO-08 | 输入法 | 三浏览器自动用例和真实两套式输入记录通过；组合期间无查询、导航、历史污染或错误关闭 |
| KO-09 | 页面交互与排版 | 第 7.1 节视口、主题、缩放与可访问性检查通过，截图来自实际韩语内容 |
| KO-10 | SEO 与导出 | 原始 HTML、robots、canonical、hreflang、JSON-LD、sitemap、Markdown 与导出集合一致 |
| KO-11 | 版本与性能 | 旧索引明确报 stale；新版本可恢复；按需加载无额外韩语首屏下载，现有语言回归与预算检查通过 |
| KO-12 | 发布与回滚 | 生产候选、部署产物和线上 build ID 一致；旧产物可恢复，URL 状态与索引文件一致 |

实施期间按变更运行相关测试；最终候选执行现有 CI 全套门禁。以下韩语测试文件已由 K03/K05 实现，执行结果见 acceptance.md。

测试落点：分词与阴性 fixture 放入 `src/modules/search/tokenize.test.ts`、`engine.test.ts`，高亮放入 `src/ui/search/search-ui.test.ts`；真实语料使用新增的 `scripts/lib/localization/korean-search.test.ts`。新增 `tests/e2e/korean.browser.spec.ts` 覆盖 Worker、输入法与界面，新增 `tests/e2e/korean.http.spec.ts` 覆盖生产语言集合和 SEO 输出。事务保护优先复用 `scripts/lib/localization/localization.test.ts`，仅为韩语带来的新失败场景补充测试。

```bash
npm run locale:check -- --locale ko --strict
npm run --silent locale:check -- --all --json
npm run content:validate
npm run typecheck
npm run lint
npm run format:check
npm run tokens:check
npm test
npm run storybook:build
```

`--all` 会包含尚未就绪的其他 preview／准备语言，不把这些语言一并设为 strict；韩语必须单独 strict，已启用语言仍由构建门禁检查。真实审校、图片和输入法记录也须复核，命令退出成功不能代替它们。

以下构建和 E2E **逐组顺序执行**，每次测试使用刚刚打包的 dist，避免后一构建覆盖前一组产物。Playwright 通过仓库现有 nginx／Docker 服务测试；浏览器项目使用 `PW_BROWSERS` 选择。第 2、3 组在 ko.enabled=true 的候选提交执行。

```bash
# 1. ko 为 preview-only 时，检查实际预览与子路径
BUILD_MODE=preview BASE_PATH=/prompt-seen npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e

# 2. 发布候选，生产根路径
BUILD_MODE=production BASE_PATH= npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e

# 3. 同一候选，生产子路径
BUILD_MODE=production BASE_PATH=/prompt-seen npm run build
PW_BROWSERS=chromium,firefox,webkit npm run test:e2e
```

现有 CI 已覆盖生产根路径与预览子路径；K05 补充韩语生产子路径验收并保留证据。最终对外构建使用实际部署的 origin、basePath、urlPattern 和媒体配置重新验证，不能直接部署示例配置产物。源码和批准记录进入同一个可构建提交，临时 pending 目录不能成为部署的必需输入。

## 10 发布与持续维护

1. 在同一候选 revision 上重跑 scope 差异和 strict，处理期间新增内容与源变更。保留源 revision、policy/scope 指纹、构建 ID 及验收报告；范围扩大就补译，不能继续使用旧的全通过报告。
2. K05 通过后，由发布维护者按[运维流程](operations.md)部署已验收产物。发布前保存上一份已验证产物的 build ID／部署标识；HTML、消息、JSON、搜索索引和字体必须作为整份产物更新。
3. 运行现有 `npm run check:live -- --expect-build "$BUILD_ID" --wait 180`，其中 BUILD_ID 为此次真实部署值；另检查韩语首页、说明详情、模板、搜索及 `ko/sitemap-pages.xml`。确认规范主机可索引页面没有平台域名的 noindex 响应头，搜索使用同一版本索引。
4. 按现有 `searchEngines.verification.naver` 流程验证 Naver Search Advisor 并提交 sitemap，记录实际提交状态。需要账号持有人执行的站外动作单独记为待办，不伪造提交成功；它不替代站点技术上线验收，也不保证收录或排名。
5. 发布后首次核验与 24 小时复查记录韩语 URL 的 404、客户端错误、资源加载及已配置的搜索信号；若没有相关遥测，用明确的人工巡检记录，不为本次接入暗中新增追踪。

发现错误事实、关键操作失效、资源版本混用或严重路由／SEO 问题时，优先回滚整份上一稳定产物。需要长期撤下韩语时，再将 enabled 改为 false、保留 preview，并完整重建，使语言入口、hreflang、sitemap 与实际 URL 同步撤下；不删除译文、scope 或审校历史，不把旧 `/ko/` 地址统一软跳转到英语首页。

上线后，新增公开条目或共享字段会扩大韩语 complete 范围。源文或译文变化使对应指纹失效时，在同一发布变更中补译和重新审校；仅更新 scope 或把策略降为 incremental 不能恢复放行。修改搜索术语或分析器时更新冻结测试、升级必要版本并验证 Worker。UI 新增 key 必须同时补齐韩语消息与审校。

完成标准为：韩语全量内容和依赖通过真实审校，搜索与输入法专项通过，页面与 SEO 产物符合合同，已验收的完整生产产物上线且可回滚。仅添加字典、开启 preview 或把 enabled 改为 true 均不算完成接入。
