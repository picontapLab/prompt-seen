# 阿拉伯语接入实施规格

状态：待实施。日期：2026-11-17（America/Los_Angeles）。工程基线：`53cbc8ef` 及当前工作区。本文定义完整接入的实施与验收合同；阿拉伯语目前仅用于预览，尚未达到公开发布条件。

采用现代标准阿拉伯语（MSA）和单一 `ar` locale，分批准备、全量审校后启用。完整接入包括界面、内容说明、共享字段、搜索、RTL、双向文字、SEO、机器可读输出及发布维护。页面本地化不改变经验证的原始 Prompt，不代表模型已通过阿拉伯语提示词或图中文字生成测试。

复用[通用本地化规格](general-localization-spec.md)、[本地化流程](localization-workflow.md)、[正文多语言设计](multilingual-prompt-design.md)、[工程约定](engineering-conventions.md)及[运维手册](operations.md)。本文补充阿拉伯语专属合同，实际范围以最新注册表、源树和报告为准。

## 1 范围与固定决策

| 项目       | 实施合同                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| 语言身份   | `code: ar`、`pathPrefix: ar`、`nativeName: العربية`、`htmlLang: ar`、`direction: rtl`、`phase: 2`             |
| 编辑规范   | 通用现代标准阿拉伯语，不按国家推定读者，不拆重复的 `ar-SA`、`ar-EG` 等站点                                    |
| 发布策略   | `coverage: complete`、`review: fingerprint`、`promptBodies: source-only`                                      |
| 内容范围   | 所有公开 Prompt、模板、合集、专题、About、License；标题、摘要、正文、SEO、推荐理由及全部可审校共享说明字段    |
| 使用流程   | 首页、列表及分页、筛选、搜索、详情及弹层、参考图、模板编辑、复制/下载、收藏、语言切换、错误页                 |
| 数字与日期 | 延续 `formatLocale('ar') = ar-u-ca-gregory-nu-latn`，界面使用 `0–9`；日期采用公历和现有 UTC 语义；搜索接受两组阿拉伯数字 |
| URL        | `/ar/` 为阿拉伯语首页；共用稳定 ID 和英文 slug，地址由 URL 模块生成；根首页继续为英语                         |
| 语言推荐   | 可选集合包含 ar 时，`ar`、`ar-SA`、`ar-EG`、`ar-MA`、`ar-AE` 推荐 ar；不自动跳转；`fa`、`ur`、`he` 不匹配 ar  |
| 架构       | 保留 Next.js 静态导出、按 namespace 下发字典、按需加载当前语言搜索索引及字体子集                              |

首发不新增 `prompt-locales/ar/` 正文变体，不翻译模板实际枚举值、默认值、变量 ID 或模型参数，不转换用户输入，不改写图片内文字或重做媒体。模型、版本、来源、许可、原始日期、运行事实、媒体字节、参考输入顺序和原始 Prompt 保持原有语义。翻译其解释文字时保留“未验证”“有缺陷”“来源声称”等限定。

原文自身为阿拉伯语时按原文正常展示。已有目标语言正文变体若与 source-only 冲突，先报告并按既有策略解决，不能删除正文或偷偷更换被复制的版本来通过门禁。未公开草稿不因本次接入自动发布。

## 2 已核对基线

### 2.1 当前覆盖

2026-11-17 执行 `npm run --silent locale:check -- --locale ar --json`。报告为 schemaVersion 2、`candidate-production`，模拟启用候选语言，不表示线上已有这些阿拉伯语页面。当前策略为 incremental/fingerprint/optional，`enabled: false`、`preview: true`。

| 类型           | 目标数量 | 已有阿语草稿 | 当前合格 |
| -------------- | -------: | -----------: | -------: |
| Prompt 说明    |      285 |            6 |        0 |
| 模板说明       |       75 |            1 |        0 |
| 合集           |       16 |            0 |        0 |
| 专题           |        3 |            0 |        0 |
| About、License |        2 |            0 |        0 |
| 内容单元合计   |      381 |            7 |        0 |

7 份草稿为 `p_012`、`p_015`、`p_024`、`p_045`、`p_050`、`p_067`、`t_001`；其余 374 份缺失。说明源文为英语 371 份、简体中文 10 份，必须按每项真实 `sourceLocale` 翻译。

| 字段范围     |             目标数量 | 状态                                                       |
| ------------ | -------------------: | ---------------------------------------------------------- |
| UI 消息      | 427，14 个 namespace | 已有全部文本，当前指纹审校均未通过；不能直接当成可发布译文 |
| 共享解释字段 |                1,793 | 已有 80 个文本，缺 1,713 个；全部需要当前指纹审校          |
| fieldsTotal  |                2,220 | 已包含 UI；fieldsCurrent 为 0，不能重复加总                |

共享字段分布：Prompt 882、模板 308、媒体 363、示例 206、taxonomy 34。报告中的 `visible: 379`、`fallback: 379` 是候选生产下可回退浏览的库条目；About、License 不回退。`localCurrent: 0`、`indexable: 0`、`ready: false`、`blocking: false`。普通检查退出 0 仅表示检查成功，发布必须看 ready 并执行 strict。

```text
sourceRevision: 53cbc8efce854f8f067acef8372daf49be82f9c3:9651afac25415beb914ee3d56bc7edb49c9335ea819d7e334702303807bd053a
scopeFingerprint: sha256:2e9ca457be0b96ce5c93567e5c71e38d21a449f933e04c9e1b6803ba518af813
policyFingerprint: sha256:dcedc10f1845b90bbf4acfe68b922f6a9d9b88c80589fe6e6b60726e40b1392a
```

指纹包含检查时未提交的源树，切换策略、修改源内容后必须重新取报告。数量用于工作量估算，不写死为测试阈值。当前没有 `production/localization/ar/`，报告含 scope-missing。

同次全语言检查中 `en`、`zh-Hans`、`es`、`pt-BR`、`ja`、`ko`、`de` 均 ready。简体中文为 incremental，354/381 个 current 符合其现行策略；其基线缺口不算本轮回归。以上是仓库状态，不证明实际部署状态。

### 2.2 已有能力与工程缺口

| 已核对位置                             | 当前能力或缺口                                                                                                 | 本轮要求                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `RootDocument.tsx`、两个 i18n Provider | HTML 已按注册表设置 lang/dir；next-intl 固定 latn，React Aria 使用 htmlLang                                    | 验证首次 HTML、hydration、Portal、跨语言导航方向一致；所有数字控件遵守同一格式合同 |
| `PromptSheet.tsx`、`language.ts`       | 已按 Prompt 实际语言设置方向                                                                                   | 保留；补混合变量、行内代码、模型名和用户查询的隔离                                 |
| `DetailPopup`、`ScrollRow`、Dialog     | 已有 RTL 箭头、滑动、滚动及动效处理                                                                            | 用阿语真实长文和键盘验收，不再整体镜像一次                                         |
| `QuickSearch.tsx`、`SearchPage.tsx`    | 搜索 input 没有显式 `dir="auto"`                                                                               | 支持阿英查询切换、粘贴和光标操作                                                   |
| `TemplateEditor.tsx`、`TokenInput.tsx` | 自由文本固定为原 Prompt 方向；TokenInput 仅标 lang；插值 span 未隔离                                           | 按第 5 节调整自由输入及插值；不改变实际值                                          |
| `tokenize.ts`                          | 已做 NFKC、去音标/延长线、alef 变体及 `ى → ي`；未折叠 `٢٠٢٦`、`۲۰۲۶`                                           | 补数字归一化、原文位置回归；保留字母区分边界                                       |
| `profiles.ts`                          | 没有 ar 专业词、词形及类别 profile                                                                             | 新增受控词表，不做通用词根提取                                                     |
| 字体与 `tokens/type.css`               | 本地 Plex Sans Arabic 400/500/600；零 tracking、较宽行高；display 候选仍有未提供的 Noto Kufi，display 默认 700 | 固定可交付字体及真实字重，核验元数据/Prompt 中阿语的字体回退                       |
| `SearchLauncher.tsx`                   | Ctrl/Cmd+K 只判断 `event.key` 为 k                                                                             | 兼容阿语键盘的 `event.code === 'KeyK'`，保留 composition 与修饰键保护              |
| Storybook、通用 E2E                    | 已有 ar 选项及部分 RTL 用例                                                                                    | 补真实语料、双向输入、字体和候选状态硬断言                                         |

`SEARCH_SCHEMA_VERSION` 当前为 2，`SEARCH_ANALYZER_VERSION` 为 6。修改分析器时从实施时最新版本递增，不硬编码“必须改到 7”；索引结构不变不升 schemaVersion。其他语言工作如已实现通用键盘或测试支持，直接复用。

## 3 状态转换与文件交付

### 3.1 注册配置

准备期修改现有 ar 条目，保持既有预览可用：

```yaml
- code: ar
  pathPrefix: ar
  nativeName: العربية
  htmlLang: ar
  direction: rtl
  enabled: false
  preview: true
  phase: 2
  localization:
    coverage: complete
    review: fingerprint
    promptBodies: source-only
```

| 阶段      | 状态与输出                                                       | 进入下一阶段的条件                                      |
| --------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| 准备/预览 | disabled + preview；生产无 ar；预览可显示草稿/回退，全站 noindex | 基础内容、RTL 和端到端试点完成                          |
| 全量候选  | 隔离候选分支/检出目录设 `enabled: true`；暂不进入自动部署分支    | 全量 strict ready，root/subpath 生产及 preview 验收完成 |
| 正式发布  | 验收提交进入既有部署流程                                         | 线上 build ID、路由、输出、复制及搜索核验完成           |

`locale:promote` 只发布批次与审校记录，不启用 locale、不部署。disabled complete 语言可逐批 promote；预览和批次发布都不能绕过其他 enabled 语言的门禁。合并改变了提交、源树或配置时，重新验收实际部署版本。

### 3.2 交付目录

```text
production/localization/ar/
  scope.json                    # locale:scope 生成的 v2 范围
  glossary.yaml                 # 概念、阿语用词、受控搜索别名
  style-guide.md                # MSA、标点、双向文字与保留项
  batch-plan.json                # key 所有权、依赖、真实批次 ID 和状态
  batches/                      # batch v1 输入与对应 review v1 输入
  reviews.json                  # 工具消费的当前指纹审校记录
  search-cases.json              # schemaVersion 1，调优前冻结
  review-evidence.md             # 文本、看图和实际操作审校证据
  rtl-acceptance.md              # 页面/控件、浏览器、主题、宽度及人工结果
  preservation-audit.json        # 原始正文/事实/资产的前后对照
  implementation-status.md       # 完成、待译、重审及失败项
  production-acceptance.json     # 候选/线上构建、命令、证据、回滚目标

.artifacts/localization/ar/
  report.json
  pending/{batchId}/             # importer 维护的 manifest 与候选
  transactions/                 # 工具维护，不能手工伪造
```

批次原文件须可在另一台机器重建 manifest；大体积报告、截图和 trace 放可追溯 CI artifact，仓库保存摘要与链接。审校身份、内部台账不得进入公共 generated 数据或浏览器包。新增测试和产品文件落点见第 10 节。

## 4 文本、消息与内容合同

### 4.1 阿语编辑规范

使用自然、简洁的标准书面语；按钮采用一致的祈使表达，说明避免地区俚语和阿拉伯字母转写英语的堆砌。不根据语言推定宗教、国家或人物身份，不为“本地化”改变原案例的主体、用途或媒体事实。段落保持正常连写，不用手工倒排、presentation forms、延长线或空格装饰字形。

| 概念                        | 初始术语                    | 约束                                               |
| --------------------------- | --------------------------- | -------------------------------------------------- |
| Prompt                      | أمر نصي；上下文明晰时 الأمر | 与现有 الأوامر 导航统一；修订草稿中 الموجّه 等混用 |
| Template                    | قالب；复数 قوالب            | 与 AI 模型区分                                     |
| AI model                    | نموذج ذكاء اصطناعي          | 品牌和版本保持原文                                 |
| Collection / Topic          | مجموعة / موضوع              | 与 taxonomy 标签保持语义一致                       |
| Reference / Generated image | صورة مرجعية / صورة مولّدة   | 明确参考输入与输出，不能互换                       |
| Copy / Download / Reset     | نسخ / تنزيل / إعادة ضبط     | 成功、失败、撤销各有准确反馈                       |
| Product photography         | تصوير المنتجات              | 不将普通 تصوير 自动等同产品摄影                    |
| Poster / Sticker            | ملصق إعلاني / ملصق لاصق     | 避免单独 ملصق 把两类搜索完全合并                   |
| Not verified                | غير متحقق منه               | 不把翻译完成表述为生图测试完成                     |

术语在 A0 审校后冻结。普通正文使用 `،`、`؛`、`؟`，引号采用 `«…»`；不得将标点替换扩散至 URL、代码、Prompt、模型 ID 或用户输入。含英文词的句子按语义顺序写入，显示方向由 DOM 处理。

### 4.2 UI、复数与格式化

维护 `src/i18n/messages/ar/{common,detail,explore,favorites,feed,geo,home,pages,popup,primitives,search,shell,shortcuts,templates}.json`。以当前英语叶子键为全集，检查 JSON、非空值、ICU 参数和标签；427 是本次快照，不是永久键数。

阿语 cardinal plural 覆盖 `zero/one/two/few/many/other`。允许 `=0` 精确分支覆盖零，但不能照搬英语 one/other。测试 `0, 1, 2, 3, 10, 11, 99, 100, 101, 102, 103, 111, 1.5`：分别验证分类、实际词形、插值和预编译/runtime 结果；100/101/102 属于 other，103 属于 few。数量不同导致格变化时使用完整短句，不拼接“数字 + 固定名词”。

数字保留 latn 是站点明确选择；输入数字不等于显示数字。机器数据继续为原数值/ISO 日期。将日期的 Gregorian 约束落实到共享格式入口或调用选项，并验证 Node 与三种浏览器；不要把 locale 改成 ar-SA 而引入不同日历。React Aria 若渲染数字也须经 `formatLocale` 或显式等价选项，HTML lang 与路由仍为 ar，不能带 `-u-` 扩展。

`query`、`model`、文件名、快捷键等插值需按第 5 节隔离；可见富文本与纯文本 aria-label 分开验证。不得在消息或复制值中注入 LRM/RLM、LRE/RLE、LRO/RLO 等控制字符来修补布局。发现既有源文含控制字符时报告，不能擅自清理原 Prompt；应用新插入的字符必须为零。

UI 字典不通过 locale importer 写入；按报告中的消息字段记录真实指纹审校。若增加富文本标签或修改共享英语消息，必须同步所有受影响的已启用/预览字典及需要重审的字段，不仅修 ar 后忽略其他语言门禁。

### 4.3 内容及媒体

逐页翻译 title、description、源文存在的 seoTitle/seoDescription、完整正文和合集 reasons。链接保留目标语义，只有已存在的目标语言页面才链接到对应阿语路径；不能机械替换 URL 前缀。About、License 独立完成，不借英语回退冒充覆盖。

共享字段以报告 `fields[]` 为准，包括 taxonomy 标签、模板标签/help/optionLabels、参考输入说明、媒体 alt、标注 notes 和运行 notes。看图核验 alt 与标注，注明实体位置时按原图左右坐标，不因 RTL 对调“左/右”。尺寸、比例、帧数、时长和输入约束准确保留；图中文字可解释，不能写成已存在阿语版本。

## 5 RTL 与双向文字合同

### 5.1 方向来源

方向分成页面、文本块、未知输入三层。页面来自 locale 注册表；说明块来自 `contentLocale`；Prompt 来自 `promptLanguage`；自由输入和未知行内文本用自动方向。保留 `textDirection` / `languageAttributes` 的共用实现，不在组件内散布 `locale === 'ar'`。

| 对象                                  | 必须行为                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 页面、弹层、菜单、Toast               | 初始 HTML 为 `lang="ar" dir="rtl"`；Portal 和 React Aria 同向；从 en/ja 切换 ar 再切回时同步更新 |
| 阿语说明或英语回退说明                | 容器按真实 contentLocale 标 lang/dir，不能仅继承页面语言                                         |
| 原始 Prompt                           | 英语正文保持 LTR；真正的阿语正文 RTL；标题、操作栏仍随页面                                       |
| 已知模型名、ID、URL、版本、比例、尺寸 | 使用 LTR 隔离边界；`GPT Image 2.6`、`16:9`、`1024×1536`、负号和括号顺序正确                      |
| 未知标题、用户查询、Token 文本        | `<bdi dir="auto">` 或等价 isolated DOM 边界；纯文本无障碍名称保持语义可读                        |
| 行内 code 与代码块                    | 代码 LTR 并隔离；代码内的用户字符串按实际内容显示；不把自然语言说明整个强制 LTR                  |
| 图片、GIF、参考图、标注坐标           | 不镜像；叠加定位沿用物理 x/y；图中文字与标注字母保留原意                                         |

`bdi` 用于完整字段或语义片段，不把阿语逐字符拆 DOM；高亮采用完整词与原文 spans，防止连接字形被拆坏。普通链接的阿语标签仍为 RTL，仅在展示实际 URL 时 LTR 隔离。禁止全局 `bdo` 或用 CSS transform 翻转整页。

### 5.2 布局及交互矩阵

| 范围                      | RTL 合同                                                                        | 验收动作                                                             |
| ------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Shell、面包屑、卡片、筛选 | 用 margin/padding/inset/border-inline 与 text-align start/end；首项位于阅读起点 | Tab 顺序与视觉顺序一致，不用双重 row-reverse 重排                    |
| 返回、上/下一项           | 语义箭头随方向；外链、播放、下载、复制、品牌图标不机械翻转                      | RTL 详情弹层 ArrowLeft=下一项、ArrowRight=上一项；输入中不拦截光标键 |
| 详情手势与过渡            | 复用现有逻辑：RTL 向右滑进入下一项，向左滑进入上一项                            | 键盘、点击、滑动到达同一稳定 key；reduced motion 无多余位移          |
| 抽屉、弹层、底部操作栏    | 横向抽屉从 inline-end 进入；底部弹层保持垂直；关闭控件可达                      | Escape 关闭、焦点恢复、滚动锁及嵌套 Portal 正常                      |
| ScrollRow 与 chips        | 起点在右，滚动按钮/渐隐跟随真实溢出；不改变选项业务顺序                         | 三引擎检查两端、触摸、选中项可见；不假设 scrollLeft 总为正           |
| Tabs、radio、Select       | 继承 React Aria 的方向和键盘约定，不手工再次反转                                | 左右键、Home/End、展开/关闭、长选项和焦点描边                        |
| 图片标注、对比与缩放      | 坐标系保持物理方向；若控件表示图片坐标，不按阅读顺序翻转                        | 同一标注前后框住同一内容；放大、拖动、命中区域正确                   |
| 表格与长内容              | 文本列随语言，数字/技术值隔离；内容在自身容器滚动                               | 页面不横向溢出；完整 Prompt 和表格仍可读取                           |

不要机械替换所有 `left/right`：标注坐标、DOMRect、图像几何是合法物理方向。审计每处用途，修改阅读语义相关样式，并为保留项记录理由。

### 5.3 搜索与模板混合输入

两个搜索输入使用 `dir="auto"`；空值以页面方向呈现提示。可输入 `إضاءة neon 16:9`、`GPT Image ٢` 和英文开头的混合文本，支持选择、删除、Home/End、粘贴与 composition。URL `q`、最近搜索及恢复值保留用户文本；归一化只用于检索副本，不写回输入框。

模板自由 string/textarea 与 TokenInput 使用自动方向；标签/help 保持 ar，枚举 label 使用各自语言，value 不变。未知用户值不能因原模板为英语就声明其一定为英语；已知的 Prompt 外壳继续标 `promptLanguage`。Token 单独隔离，移除按钮的可访问名称保持完整。不新增“必须输入英语”限制。

模板预览在变量语义边界隔离未知方向的值，保留原有点击变量定位字段、选择文本和标注行为。以英语模板输入 `زجاجة عطر (Rose 50 ml)`、`خصم 20%`、阿语/英语列表，验证：

1. 预览的可见顺序正确，光标不跳动，校验和字符计数按现有 grapheme 规则。
2. `renderTemplate` 返回值、复制值、下载值一致，且与加入方向适配前的同输入结果一致。
3. 导出/分享/草稿恢复后值不变，语言切换不翻译或重置用户输入；选项排序不改变模板变量顺序。
4. 分隔符仍采用字段合同；不能将阿语逗号自动当新分隔符，或改写用户标点来适应布局。

组合快捷键接受 `key.toLowerCase() === 'k'` 或物理 `code === 'KeyK'`；保留 Ctrl/Meta、无 Alt/Shift、非重复、非 composition/229、未被 preventDefault 的保护。单字符 `/`、`C` 等仍按实际字符及既有偏好运行，不把阿语字母映射成潜在破坏输入的全局操作。

## 6 字体、排版与无障碍

阿语正文与标题固定使用已随仓库交付的 IBM Plex Sans Arabic 400/500/600。首发从 ar display 栈去掉未提供的 Noto Kufi 候选，display weight 使用真实 600；不依赖浏览器合成 700。英文 Prompt 内仍使用其实际语言字体和字重，确保嵌套 `lang` 能恢复相应 tokens，避免继承 ar 的覆盖后无法复原。

阿语连写文本的 letter-spacing 为 0；正文行高沿用 1.8、标题至少 1.35，紧凑控件和多行截断另做真实文本检查。保留连字、音标和上下延伸空间；不使用 word-break: break-all、按码点截断或强制全大写。检查 mono 元数据、错误提示、Token、按钮及原始阿语 Prompt 的 Arabic 字体 fallback，不能只看大标题。

验收字体须同时检查加载响应、computed style、代表字形和截图：`لا`、`لأ`、`لإ`、`لآ`、`العَرَبِيَّة`、`مُوَلَّد` 及英数混排不能出现断连、裁切或缺字。字体仍按 unicode-range 加载；英语页面仅因可见的 العربية 语言名称触发阿语字形是合理的，不要求含阿语文本的页面绝不请求阿语字体。不能给每种语言全量预加载三种字重。

页面覆盖 360/768/1024/1440px、深浅主题、正常/减少动画；另做 320 CSS px reflow 与真实浏览器 200% 缩放。检查键盘、焦点恢复、触摸、VoiceOver 或 NVDA 的阿语阅读顺序、控件名称和数量播报。无 serious/critical axe 问题、页面级横向溢出、关键按钮裁切、hydration 错误或未捕获异常。截图与 axe 不能替代屏幕阅读器和实际缩放检查。

## 7 阿语搜索合同

### 7.1 归一化与别名

构建端、浏览器 Worker、主线程回退共用现有分析器。搜索说明正文、标题、taxonomy、模型标识及原始 Prompt，沿用原文字段较高、别名和正文较低的权重。高亮输出原文，禁止显示归一化后的阿语拼写。

| 输入                                            | 搜索行为                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `إضاءة`、`إضاءة`、`إِضَاءَة`、`إضــاءة`        | 使用相同检索形式；保留原文的音标和延长线位置                      |
| `أ/إ/آ/ٱ`、`ى/ي`                                | 保留既有折叠；明确是检索宽容，不用于正文、ID、翻译审校或去重      |
| `٢٠٢٦`、`۲۰۲۶`、`2026`                          | 在 ar 分析器内折叠为相同数字；`GPT-image-٢` 与 `GPT-image-2` 等价 |
| `ة/ه`、`ؤ/و`、`ئ/ي`、独立 `ء`                   | 保留区别，不扩大为全局字母替换                                    |
| `قالب/قوالب/القالب/القوالب`                     | 维护有限、审校过的同概念词形；同样处理需要的专业名词              |
| `ال`、`و`、`ب` 等词缀                           | 不对任意词机械剥离；需要时把完整词形加入词表                      |
| `ملصق إعلاني`、`poster`；`ملصق لاصق`、`sticker` | 各自对应概念；不得因共享 ملصق 将两组全部互为同义词                |
| `تصوير المنتجات`、`product photography`         | 单向扩展到更宽的摄影；普通 تصوير 不扩展为产品摄影                 |

新增数字映射限定 ar 的检索副本，覆盖 U+0660–0669 与 U+06F0–06F9；外观相似的波斯/乌尔都字母不作额外合并。暂不引入通用 stemmer、停用词删减、Arabizi 转写或外部搜索服务。模糊匹配不能代替上述字形和词表合同。

多词别名须在真实文本中连续出现，不能将不同位置的词或合成的 kind 标签凑成短语。例如“产品说明”与另一句“人物摄影”不能凭词集合触发“产品摄影”。需要调整 `profiles.ts` 的短语匹配时，对现有 de/es/pt/ko 进行回归，保持既有语义。

索引维持 `contentLocale` 以标记预览/回退结果的真实语言。source-only 只限制可复制正文的选择，不阻止阿语说明进入检索。阿语启用后的 current 全量语料不可依赖英语 fallback 才命中。

### 7.2 冻结用例与质量门槛

A1 在搜索调优前生成 `search-cases.json`：复用 schemaVersion 1、locale、cases；每条包含 query、expectedKeys、可选 excludedKeys、topK、reason。`topK: 5` 按每个内容 kind 分组计算，与快速搜索一致，不解释为全站混排前五名。

至少冻结 30 条真实语料用例：8 条字形/音标/数字变体、8 条领域及词形、6 条多词/混合查询、4 条模板/合集/专题、4 条无结果或误匹配负例。以下为必含锚点，A1 语义审校时可修正阿语措辞并记录；冻结后不得为通过测试删除难例或替换预期 key：

| 查询或场景                                        | 预期                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `غصن برقوق بالحبر` 及带音标形式                   | `prompt/p_012` 出现在 prompt 前五                                            |
| `ملصق شاي أخضر`                                   | `prompt/p_024` 出现在 prompt 前五                                            |
| `ملصق نادي جاز`                                   | `prompt/p_045` 出现在 prompt 前五                                            |
| `تصوير منتجات استوديو`                            | `prompt/p_151` 出现在 prompt 前五                                            |
| `قالب ملصق منتج` 及 القوالب 变体                  | `template/t_001` 出现在 template 前五                                        |
| `حملة منتجات 3x3` 与 `حملة منتجات ٣x٣`            | `template/t_017` 出现在 template 前五                                        |
| `فرصة سوق 2026`、`فرصة سوق ٢٠٢٦`、`فرصة سوق ۲۰۲۶` | `prompt/p_217` 出现在 prompt 前五                                            |
| `فوجي GIF`                                        | `prompt/p_290` 出现在 prompt 前五                                            |
| `GPT Image 2.6`、`GPT Image ٢.٦`                  | 同配置下分组结果和顺序一致；冻结与真实模型字段一致的 key，不修改数据迎合查询 |
| 合集 `c_001`、专题 `topic/style/ink`              | 按其真实译文各冻结至少一个查询；成员未齐时不能宣称通过完整语料验收           |
| poster/sticker、普通摄影/产品摄影混淆             | 用固定独立夹具验证别名不越界；真实语料设置有依据的 excludedKeys              |
| 审校确认的无匹配输入                              | `expectedTotal: 0`，仍显示阿语无结果说明和可用导航                           |

扩展 `tests/support/localization-search.ts` 的可选 `expectedTotal`，并在阿语序列化测试和浏览器消费者中实际断言。仅 `expectedKeys: []` 不构成无结果验证。字母区分负例用 tokenizer/精确分析器断言，不能要求允许模糊匹配的全站搜索绝无近似结果。

用例必须同时通过完整语料的序列化→重载引擎和真实 Worker；检验 `spans` 及高亮拼接后与原文本完全相同，音标不被单独截出。所有预期 key 必须存在且 current；不允许通过过滤未完成条目缩小用例数。额外验证 Worker 失败时主线程回退、旧 analyzer/build ID 的失效提示及切换语言后的查询隔离。

## 8 翻译批次与审校流程

### 8.1 范围及批次所有权

先保存 ar 和全语言报告，再设置 complete 策略，执行 `locale:scope` dry-run/apply。`batch-plan.json` 至少保存 locale、三个基线指纹，每批的 name、itemKeys、fieldKeys、referencedFieldKeys、memberKeys、dependsOn、status、batchIds、evidence。

全部 itemKeys 的无重复并集必须等于最新 `items[].key`，全部 fieldKeys 的无重复并集等于 `fields[].key`；UI 字段也入台账，但不送 importer。共享字段只分配一次，其他批次引用依赖。状态为 planned→prepared→reviewed→promoted→verified；源、目标或依赖变化后退回需重审状态并保存历史，不只更新时间。

| 批次          | 交付物                                                                                                    | 完成条件                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| A0 基础       | 术语/风格、427 条 UI、全局 taxonomy、About、License                                                       | 消息/内容有效审校，阿语基础页面可用；复数和混排样本完成      |
| A1 纵向试点   | 现有 7 份草稿；新增 `p_111`、`p_115`、`p_151`、`p_217`、`p_224`、`p_290`、`t_002`、`t_017`；合集/专题样本 | 导入→审校→promote→浏览→搜索→编辑→复制/下载闭环；冻结搜索用例 |
| A2 全量内容   | 其余 Prompt、模板及输入说明、媒体、标注、运行 notes                                                       | 每批及其依赖成为 current，原始正文和事实对照通过             |
| A3 聚合与收尾 | 全部合集、专题、推荐理由、首页和 showcase 实际展示项；增量源变更                                          | 成员闭包完成，strict ready，进入生产候选                     |

A1 另纳入当时 `home.featured`、feed showcase 的实际展示项，不删减编排来降低翻译量。合集至少取 `c_001`，专题取 `topic/style/ink`。`item.dependencies` 主要列共享字段，不能替代合集成员、专题实际筛选结果、MDX 链接和首页引用的完整闭包。成员超出 A1 时，聚合页保留预览草稿并归 A3 唯一负责，不能把“可预览”记为“已通过生产收录验收”。

建议每批最多 20 份 MDX 或 100 个共享字段，以完整审校能力为界；UI 完整性优先。先发布依赖，互相依赖的交付项并为同一事务。开工、每批 promote 前后和候选前重算范围；新增公开内容进入增量批次，正式移除必须满足 scope 的原因和指纹证据要求。

### 8.2 导入与审校输入

使用既有 batch schema v1：`{schemaVersion: 1, locale: ar, operations: [...]}`，不新增阿语专用 CLI。

| 操作             | 输入合同                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 页面             | key=item.key；sourceField/targetField 均为 `["$page"]`；expectedSourceHash=item.sourceFingerprint；expectedTargetHash=item.targetHash |
| 页面 translation | `{title, description, body}`，按真实源字段带 seoTitle、seoDescription、reasons                                                        |
| 共享字段         | 直接使用报告的 key/sourceField/targetField/sourceHash/targetHash；数组字段带 expectedIdentity=field.identity                          |
| 缺失目标         | 明确 expectedTargetHash 为 null，不能省略                                                                                             |
| UI               | 直接维护完整 JSON namespace；按消息字段单独提交审校记录                                                                               |

页面操作用完整 sourceFingerprint，不使用 MDX frontmatter 的短 sourceHash。Apply 后读取返回 mode 和 manifest；触及已发布的共享依赖时整批可能进入 pending，不假设内容已写回源树。候选保存在 `.artifacts/localization/ar/pending/{batchId}`。

审校逐项比较真实来源、候选、媒体及交互。review schema v1 记录 key、完整 sourceHash、候选 targetHash、真实 reviewer、带时区 completedAt、conclusion 和必要 reason。页面 targetHash 是候选 prose 指纹，不能拿旧源树哈希代替；目标经审校修改后重新生成计划和批准。

文字生成不等于审校。AI 审校必须明确标 AI，不冒充母语人士；图片说明必须实际看图，操作说明必须实际操作。首发设置一次能阅读标准阿拉伯语的人工语言与屏幕阅读复核，覆盖全 UI、术语、A1、所有内容类型及疑难标记项；记录真实身份和范围，其余内容仍须逐字段有效审校。人工未完成时保留 pending，不把自动化通过解释为人工质量确认。

保持品牌/模型名原文的字段须有精确理由。冲突时保留现有更改，重新取报告、准备候选及审校；不得强行覆盖目标或刷新哈希绕过复核。导入/提升失败检查事务回滚，相同输入重试应为 no-op。缺 manifest 时用已保存原批次重建；只有满足现有迁移合同才使用 `--migrate`。

## 9 路由、SEO 与机器可读输出

| 状态/页面                       | 输出合同                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| disabled 的生产构建             | 不生成 ar 页面、feed/search 索引；语言菜单、sitemap、hreflang、外部导出无 ar                                       |
| 准备期 preview                  | ar 草稿/回退可浏览；全站 noindex；不因存在预览 URL 产生生产收录资格                                                |
| current 且可索引的生产内容页    | 阿语 title/description、实际正文和 alt；self canonical；自身及其他合格版本互返 hreflang，值为 ar                   |
| fallback/outdated 库条目        | 按既有策略可浏览，self canonical、noindex follow；不进 sitemap、hreflang、JSON-LD、Markdown twin；全量首发不得遗留 |
| 首页、列表、合集、专题          | 以实际展示项及成员的 indexability 决定资格；不能只翻译壳文案或改变排序/分页来通过                                  |
| 搜索、筛选、收藏、内部错误页    | 保持既有 noindex/错误状态；不因 ar 启用全部放开收录                                                                |
| Markdown、Prompt JSON、llms.txt | 同一 indexable 集合驱动；阿语说明与实际 promptLanguage 分开；原 Prompt 保持一致；审校资料不外泄                    |

canonical、hreflang、sitemap、JSON-LD 统一经 URL 模块生成绝对地址，覆盖根部署与 `/prompt-seen` 子路径。`x-default` 复用既有规则：首页对应英语根首页，详情仅指向真实合格默认版本，不能凭空生成英文替代页。Open Graph 复用现有 `ar_AR` 映射并加断言，该值不用于 HTML lang、hreflang 或地区路由。

验证页面 lang/dir、说明 contentLocale、JSON-LD 的语言字段和 Prompt 的语言字段分别准确。Markdown 中原文块的标记与内容一致，HTTP canonical 指回对应 HTML。真实 404/410 保持正确响应码和阿语帮助导航，不把缺页重定向到首页当成功。

保留静态导出。修改 Next.js 代码前阅读仓库 `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` 及对应字体/布局指南；不增加 Proxy、请求时翻译、Cookie 路由或 Server Actions。每个布局/页面继续显式 `enterLocale`，metadata 显式传 locale。

## 10 可领取的实施任务

职责是实施角色，不预设具体人员。任务完成以证据和行为为准；只改代码或只翻译文本均不能单独完成接入。

| 编号  | 负责人角色 / 文件落点                                                                                                                                                               | 工作及完成条件                                                                              | 前置          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------- |
| AR-01 | 本地化维护；`content/locales.yaml`、`production/localization/ar/`                                                                                                                   | 保存基线，策略改 complete，建立 scope、全量批次所有权、保留项基线                           | 无            |
| AR-02 | 阿语编辑；`src/i18n/messages/ar/*.json`、A0 内容/共享 YAML                                                                                                                          | 统一术语、消息和基础页面，完成有效审校及 ICU 编译；英语消息变化同步其他语言                 | AR-01         |
| AR-03 | UI 工程；`src/styles/tokens/type.css`、`src/styles/fonts/index.ts`、各受影响 CSS                                                                                                    | 固定阿语字体/字重，检查逻辑属性与嵌套 lang；补 Storybook 阿语长文/音标样本                  | AR-01         |
| AR-04 | UI 工程；`src/ui/search/{QuickSearch,SearchPage,SearchLauncher,ResultRow,NoResults}.tsx`、`src/ui/template-editor/{TemplateEditor,TokenInput}.tsx`、`src/ui/rich-text/RichText.tsx` | 完成 auto 输入、变量/元数据隔离、键盘兼容；共享隔离 helper 只在确有复用时提取；无复制值变更 | AR-01         |
| AR-05 | 搜索工程；`src/modules/search/{tokenize,profiles,types}.ts` 及测试、`src/ui/search/highlight-parts.ts` 及测试                                                                       | 数字、词表、短语边界、版本升级；原文位置/负例/多语言回归通过                                | AR-02         |
| AR-06 | 内容与审校；A1、`search-cases.json`                                                                                                                                                 | 完成纵向试点及依赖；调优前冻结用例；看图/操作与保留项证据齐全                               | AR-02、03、04 |
| AR-07 | QA；新增 `scripts/lib/localization/arabic-search.test.ts`、`tests/e2e/arabic.{http,browser}.spec.ts`、`arabic-rtl.browser.spec.ts`、测试 support                                    | 状态硬断言、真实 Worker、复制/下载、RTL/无障碍矩阵；补可选 expectedTotal 的消费者           | AR-04、05、06 |
| AR-08 | 内容与审校；A2/A3、`content/**/locales/ar.mdx`、共享字段、reviews                                                                                                                   | 全量 current、依赖闭包与增量源变更清零，strict ready                                        | AR-06         |
| AR-09 | 工程/QA；`src/i18n/{catalog,format-locale}.test.ts`、语言推荐/SEO 测试、`.storybook/`、`.github/workflows/ci.yml`                                                                   | 跨引擎格式、语言切换、SEO/外部输出、回归和构建矩阵；CI 明确要求 ar 候选存在                 | AR-03、07、08 |
| AR-10 | 发布维护；候选配置与 `production-acceptance.json`                                                                                                                                   | 隔离启用、生产候选验证、人工复核、部署和线上核验；记录回滚目标                              | AR-09         |

阶段交付：P0=AR-01；P1=AR-02～06 的基础及试点；P2=AR-07～08 的全量与测试；P3=AR-09 生产候选验收；P4=AR-10 线上验收。UI 与内容可在范围冻结后独立推进，候选发布必须等待所有依赖；不把翻译工期与工程工期简单合并为一个未经测量的日期承诺。

## 11 验证命令与发布门禁

### 11.1 准备与逐批执行

以下 apply 命令供实施阶段使用；先准备真实批次和审校文件，`AR_BATCH_ID` 设为 importer 返回的真实 64 位十六进制 ID。每条命令成功后才执行下一条：

```sh
npm run --silent locale:check -- --locale ar --json
npm run --silent locale:check -- --all --json
npm run locale:scope -- --locale ar
npm run locale:scope -- --locale ar --apply

npm run locale:import -- --locale ar --file production/localization/ar/batches/a1.json
npm run locale:import -- --locale ar --file production/localization/ar/batches/a1.json --apply
# 完成候选内容审校后再运行 promote。
npm run locale:promote -- --locale ar --batch "$AR_BATCH_ID" --reviews production/localization/ar/batches/a1-reviews.json
npm run locale:promote -- --locale ar --batch "$AR_BATCH_ID" --reviews production/localization/ar/batches/a1-reviews.json --apply
npm run --silent locale:check -- --locale ar --json
npm run content:validate
```

scope apply 只在目标差异已核实后运行，不是刷新批准的手段。`--locale` 与 `--all` 互斥；普通报告允许 disabled 语言未完成。`--all` 用于保留诊断，不能用 `--all --strict` 把以后新增的未启用预览语言变成 ar 上线前置条件。

### 11.2 完整候选检查

```sh
npm run locale:check -- --locale ar --strict
node --input-type=module <<'NODE'
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
const registry = YAML.parse(fs.readFileSync('content/locales.yaml', 'utf8'));
for (const locale of registry.locales.filter((entry) => entry.enabled && entry.code !== 'ar')) {
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

沿用已有导入冲突、审校失效、scope 保留、重复应用和失败回滚测试；只补阿语路径暴露的缺口。新测试必须验证实际输出和错误边界，不复制实现规则冒充质量证据。

### 11.3 产物状态与构建矩阵

AR-07 新增仅供测试的 `AR_EXPECT_STATE`，HTTP 和浏览器套件共用硬断言，不进入产品配置：

| 值       | 必须断言                                                                              |
| -------- | ------------------------------------------------------------------------------------- |
| disabled | 生产 BUILD.locales 无 ar，路由/搜索/feed 索引不存在，菜单及外部收录输出无 ar          |
| preview  | ar 为 disabled/preview；预览含 ar，A0 后 About/License 可用；全站 noindex             |
| enabled  | BUILD.locales 含 enabled ar；页面/索引存在、冻结 cases 非空；按构建 mode 检查收录资格 |

显式期望与产物不符必须 fail，不能 skip。候选和启用后的 CI 必须传 enabled，防止“产物漏了 ar，所以全套阿语测试跳过”。准备期 preview 只运行阶段已交付用例，不提前宣称全量通过。

先在 disabled 状态完成生产负向检查，A0/A1 完成后做预览检查：

```sh
BASE_PATH= BUILD_MODE=production npm run build
AR_EXPECT_STATE=disabled npm run test:e2e -- tests/e2e/arabic.http.spec.ts --project=http --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
AR_EXPECT_STATE=preview PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- tests/e2e/arabic.http.spec.ts tests/e2e/arabic-rtl.browser.spec.ts --workers=1
```

全部 strict ready 后，在不会触发自动部署的 `codex/arabic-production-candidate` 分支或等价检出目录启用 ar，再顺序执行：

```sh
BASE_PATH= BUILD_MODE=production npm run build
AR_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=production npm run build
AR_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1

BASE_PATH=/prompt-seen BUILD_MODE=preview npm run build
AR_EXPECT_STATE=enabled PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- --workers=1
```

每次测试当前 `dist/` 并存证后才构建下一份；不在同一检出目录并发写 `.next`、generated、out、dist。候选与生产使用同一 SITE_ORIGIN 覆盖值。HTTP 由仓库 nginx 提供静态产物，不以 `next dev` 代替。需要 Node ≥24、依赖、三种 Playwright 浏览器及 nginx 脚本所需容器环境；环境缺失记录未执行，不能记通过。

继续遵守[总体设计 §16](prompt-library-website-design.md)的性能预算：记录相同源树/配置下的构建时间、文件数、HTML 字节、每个受影响语言索引 raw/gzip、英/阿首页和模板首屏 JS、字体请求及布局偏移。首屏测量使用 `scripts/measure-first-load.ts`，区分初始、idle preload、路由 prefetch；不得把搜索索引、其他语言完整字典或审校资料加入首屏。以同配置重复测量处理噪声，不用扩大既有例外来通过预算。

### 11.4 验收记录与完成定义

`production-acceptance.json` 为事实记录，至少包含：完整候选/发布提交、实际执行时间、sourceRevision/scopeFingerprint/policyFingerprint、counts/ready/blocking；各构建 origin/basePath/mode/enabled locales/build ID/搜索版本；命令、退出码、pass/fail/skip 数、浏览器/视口/主题；人工复核范围、复制下载对照、性能数据、artifact 位置及上一成功部署。

未执行写 pending，失败写 failed；P3 候选通过不等于 P4 线上完成，顶层发布 status 在 live 核验前保持 pending。`preservation-audit.json` 比较原始 Prompt/模板正文、变量定义、事实字段和资产哈希；共享 YAML 按字段比较，不能要求整个文件不变。其他工作改变源树时重建基线，不撤销其修改制造一致性。

- [ ] ar 的 complete/fingerprint/source-only 生效；scope 与最新公开目标一致，无无据移除。
- [ ] `ready: true`、`blocking: false`；localCurrent=indexable=target，fieldsCurrent=fieldsTotal；missing/draft/unreviewed/outdated/archived/invalid/fallback 均为 0。
- [ ] UI、内容和全部依赖具有当前指纹的实际审校；人工阿语复核、媒体和操作证据齐全。
- [ ] 冻结搜索用例、字形与数字归一化、混排输入、高亮及真实 Worker 全部通过，无其他语言退化。
- [ ] RTL 矩阵、字体、320px reflow、200% 缩放、键盘/触摸/屏幕阅读器验收通过；复制下载与原始语义一致。
- [ ] root/subpath production、subpath preview 及 enabled 语言回归通过，SEO/外部输出与性能符合合同。
- [ ] 同一发布版本完成线上 build ID 和阿语主流程核验，记录真实结果与可用回滚目标。

## 12 上线核验与持续维护

使用现有 `.github/workflows/deploy.yml`。发布后按既有命令核对实际 build ID，再抽查 `/ar/`、列表第二页、Prompt、模板、About/License、搜索索引、sitemap、canonical/hreflang、Markdown 及复制原文；正式域名无意外 noindex header，移动端 RTL 主流程可用。

```sh
npm run check:live -- --expect-build "$AR_RELEASE_BUILD_ID"
npm run check:live -- --site "$AR_PLATFORM_ORIGIN" --platform --expect-build "$AR_RELEASE_BUILD_ID"
```

变量来自实际部署记录；platform origin 不带 basePath，checker 与构建使用相同 origin/basePath 配置。技术验收不等于搜索引擎已收录，也不证明生图模型支持阿语。

若主要路由不可用、复制正文改变、混排导致操作不可读、索引版本不一致或收录输出错误，使用现有 `.github/workflows/rollback.yml` 回到上一完整成功部署，核对恢复后的 build ID。HTML、字典、generated 数据、Worker 和索引一起回滚；保留失败版译文与证据，通过可审查的 revert/修复提交防止再次部署。长期停用另提交 `enabled: false` 并全量重建，不手改线上文件。

上线后新增公开内容同步准备阿语说明和依赖；源变更触发 affected review，不降低 complete 或 source-only。沿用现有分析模块观察 ar 页面访问、搜索无结果、复制和模板使用，国家维度与语言维度分开；不为本地化新增记录用户原始 Prompt 或自由输入的遥测。上线后首个完整观察周期复核检索词、翻译问题和字体/交互反馈，再决定是否需要地区词汇或独立阿语 Prompt 变体。

## 13 实施依据

仓库中的实际配置、工具及测试是工程合同的首要依据。以下规范用于实施时核对方向、语言标签及国际化输出，不据此推断本项目已通过相应验收：

- [W3C HTML 方向指导](https://www.w3.org/International/questions/qa-html-dir)：基础方向、未知输入和双向文本隔离。
- [W3C 行内双向文字](https://www.w3.org/International/articles/inline-bidi-markup/)：行内片段的方向边界。
- [Unicode CLDR 阿拉伯语复数规则](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#ar)：基数分类；具体句式仍需语言审校。
- [Google 多语言版本说明](https://developers.google.com/search/docs/specialty/international/localized-versions)：hreflang、自引用及互返关系。
- [Google 多语言网站管理](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)：独立 URL、可见页面语言及用户切换。
