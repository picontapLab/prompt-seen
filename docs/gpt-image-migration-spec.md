# GPT Image 图片生成与样例迁移规格

状态：已实现并完成 101/101 迁移与验收，最终报告 `migrations/gpt-image-v1/report.json` 为 `complete`。日期：2026-10-28。核对基线：`9286a0c68d86` 及创建清单时的工作区内容。

本规格将现有 101 张程序绘制的内容图片替换为根据对应 prompt 实际生成的 GPT Image 图片，并交付真实运行记录、适合网站展示的图片尺寸和可恢复的迁移清单。面向实现脚本、执行生成和验收内容的开发者或 agent。

## 1. 范围与完成条件

| 基线项目 | 数量与处理方式 |
| --- | --- |
| Prompt | 100 条；92 条读取文本，8 条通过现有模板渲染器展开 |
| 图片任务 | 101 项，以原资产 ID `a_001` 至 `a_101` 标识任务 |
| 额外图片 | `a_101` 使用 `x_009/prompt.txt`，归属 `t_001/v2/default`，没有 `promptId` |
| 旧运行记录 | 44 份；完整归档，新增真实记录，不改写为真实运行 |
| 模板 | 3 套、4 个版本；8 条模板 Prompt 加 1 个独立模板样例，共 9 个模板关联任务 |
| 标注 | 7 条内容、20 个标注框，需要根据新图逐项定位 |
| 输入图片 | 当前没有必需参考图，也没有使用参考图的旧运行；本次全部独立文生图 |

最终必须存在 101 张通过验收的新资产和 101 份成功运行记录，其中 100 份归属 Prompt、1 份仅归属模板。生产与预览内容均不再引用旧样例图片或展示旧样例运行。原 Prompt ID、slug、模板版本、分类、发布范围保持兼容。

本次实现不包含新的在线生成页面、生成服务、自动部署或旧媒体文件清理。程序绘制的测试 fixture、图标和装饰 SVG 不属于替换范围。生成图片不等于完成现有译文的人工审核，语言状态单独遵守既有规则。

## 2. 已确定的实现选择

1. 使用内置 `image_gen` 工具，每项任务独立调用一次，并发为 1；每项最多 3 次实际生成尝试。
2. 本地 TypeScript CLI 负责清单、状态、校验、图片加工和迁移；工具调用由执行 agent 完成。CLI 不假设能够从 shell 调用内置工具。
3. 使用页面实际复制的 prompt，不添加隐藏的创作要求。`flat-vector`、文字、主体数量和比例等要求保留。
4. 先完成 8 项试跑，之后每 10 项形成一个可验收的处理批次；所有 101 项准备完成后统一切换正式内容引用。
5. 新图使用新资产 ID，旧运行使用新运行 ID 替代。历史数据按原字节归档，旧媒体对象继续留存用于回退。
6. 默认将返回图无损转换为站点 WebP 母图，再从同一母图分别编码各展示尺寸。展示质量优先于固定文件大小。
7. 精确模型 ID、请求 ID、生成质量、用量等只记录工具实际提供的值。内置路径不承诺可以指定模型快照或获得 API 用量。

若后续明确改用可指定模型的官方 API，应增加独立 transport，并重新确认其参数和访问条件；本规格的首版无需 API key、SDK runner 或 Batch API。GPT Image 官方支持 PNG、JPEG、WebP 以及输出压缩，但这些 API 参数不能冒充当前内置工具的参数。[官方图像生成文档](https://developers.openai.com/api/docs/guides/image-generation)

## 3. 模块与存储位置

以下模块已实现；现有模块通过链接列出。

| 文件或目录 | 职责 |
| --- | --- |
| `scripts/media-generate.ts` | CLI 参数、退出码和 JSON 输出 |
| `scripts/lib/media-generation/manifest.ts` | 清单 Schema、prompt 快照、引用清单、ID 分配 |
| `scripts/lib/media-generation/jobs.ts` | 状态转换、尝试记录、互斥和恢复 |
| `scripts/lib/media-generation/prepare.ts` | 原始文件登记、母图生成、验收和导入暂存区 |
| `scripts/lib/media-generation/migrate.ts` | 内容映射、旧样例归档、事务应用及回退 |
| `scripts/lib/media-generation/verify.ts` | 清单覆盖率、可达图片、运行记录及产物检查 |
| `migrations/gpt-image-v1/` | 提交到 Git 的清单、prompt 快照、尝试元数据、评审、映射和回退记录 |
| `.artifacts/gpt-image-v1/` | 加入 `.gitignore`；原始输出、临时文件、暂存内容、截图与处理中的事务文件 |

`migrations/gpt-image-v1/` 包含：`manifest.json`、`jobs/<oldAssetId>/prompt.txt`、`jobs/<oldAssetId>/state.json`、`jobs/<oldAssetId>/attempts/<NNN>.json`、`jobs/<oldAssetId>/review.json`、`asset-map.json`、`archive/`、`apply-journal.json` 和 `report.json`。已完成的尝试记录和 prompt 快照保持不可变；状态文件是可更新投影。

原始图片必须从工具输出位置复制到 `.artifacts/gpt-image-v1/raw/<oldAssetId>/<attemptId>/`，不能只保存工具外部路径。最终站点母图和变体提交到 `public/media/`；fresh clone 不依赖 `.artifacts/` 即可构建。续跑未准备完成的任务需要保留原始图片；丢失时先恢复文件，不能把已登记的成功调用自动变成一次新生成。

**不要把生成进度或原始图片放入 `.generated/`。** [content:build](../scripts/content-build.ts) 会清空 `.generated/`、`public/generated/` 和 `deploy/generated/`。

复用 [内容加载器](../scripts/lib/content/load.ts)、[promptTextOf](../scripts/lib/content/rules.ts)、[模板渲染器](../src/modules/template/render.ts)、[媒体加工](../scripts/lib/media/process.ts) 和 [存储驱动](../scripts/lib/media/storage.ts)。从 [media:import](../scripts/media-import.ts) 提取可调用的导入函数，使现有命令与新流程共用分析、命名、写入及校验逻辑。导入函数显式接收 `contentDir` 和 `storage`；本次迁移固定使用本地存储，不继承环境中的 S3 写入设置。

## 4. 清单与 prompt 合同

`plan` 从当前工作区读取数据，不用 Git HEAD 覆盖工作区。生成以下信息：

| 字段 | 合同 |
| --- | --- |
| `schemaVersion` / `migrationId` | `1` / `gpt-image-v1` |
| `baseline` | HEAD、创建时间、`America/Los_Angeles` 时区、源文件相对路径与 SHA-256、既有可见条目及地址集合 |
| `policy` | transport、并发 1、最多 3 次尝试、试跑 ID、后续批量 10、图片处理配置版本 |
| `jobs` | 按原资产数字 ID 排序的 101 项任务 |
| `references` | 每个原资产在内容模型中的引用位置；记录文件和结构化字段，不做全库字符串替换 |

每项 job 必须具有 `id`（原资产 ID）、`promptId`（可空）、`template`（可空）、`sourceExampleIds`、`promptFile`、`promptSha256`、`targetAspectRatio`、`newAssetId`、`newExampleId`、`requiredAltLocales` 和 `annotationCount`。

初始化时扫描当前 ID 与本次预留 ID，固定分配两个不重复的连续区间。当前基线对应 `a_102…a_202` 与 `x_045…x_145`，这两个区间是预期结果，不是写死的全局起点。应用前再次检查冲突；遇到其他工作占用 ID 时报告冲突，通过 `plan --rebase` 重新规划映射，保留已经生成的图片和尝试记录。

prompt 来源规则：

- 文本 Prompt 使用 [normalizePrompt](../scripts/lib/content/read.ts)：CRLF/CR 转 LF，移除首尾空白。快照保存该字符串，末尾可加一个文件换行；哈希和工具调用均使用规范化字符串。
- 模板 Prompt 使用 `promptTextOf` 和既有字段默认值、列表分隔符、版本规则，不能自行拼接。保留模板 ID、版本、值及匹配的 sample 名称。
- `a_101` 使用 `x_009` 的规范化 prompt；同时验证它等于指定模板、版本和值的渲染结果。
- 同一原资产的封面 prompt 和所有旧输出记录必须一致；不一致时 `plan` 失败并列出来源，不能任选其一。已核对的当前基线没有冲突。
- 比例优先来自模板的 `aspectRatio`，文本 prompt 使用唯一的比例声明；模糊或缺失时要求在清单中明确补齐并记录依据。旧文件的 `600:257` 等像素近似不能替代明确的 `21:9` 语义。
- `requiredAltLocales` 是原资产已有 alt 的语言与引用它的可构建内容所需语言的并集；保持已有 draft、archived 和语言启用状态。

生成开始后，快照不可修改。新需求若改变 prompt，建立新的清单修订和独立尝试，重新验收对应内容。被旧运行使用过的模板版本保持冻结；模板文案变更需新增版本。本次默认不改任何 prompt 或模板正文。

**本阶段完成条件：** 101 项任务覆盖全部原资产，92/8/1 三类来源可解析；9 项模板关联和全部引用可追踪；所有 prompt 哈希可重新计算，连续两次读取同一清单不分配新 ID。

## 5. 执行状态与恢复

任务主路径为 `pending → running → generated → accepted → processed → prepared → applied`。生成图与压缩后展示图分两次评审，文件加工成功不能代替展示验收。

| 状态 | 进入条件与下一步 |
| --- | --- |
| `pending` | 尚未生成，或上一尝试被拒绝且剩余次数大于 0 |
| `running` | `next` 已落盘新的 attemptId 和 claimToken，等待工具结果登记 |
| `generated` | 输出已复制、可解码，原始哈希和实际尺寸已登记，等待视觉评审 |
| `accepted` | 生成图符合 prompt；执行者完成评审，选定唯一尝试 |
| `processed` | 母图和四种变体已生成且技术检查通过，等待展示尺寸、标注与文案评审 |
| `prepared` | 母图、四种变体、内容评审和暂存媒体记录全部通过 |
| `applied` | 正式内容引用与运行记录已经切换，事务完成 |
| `needs_attention` | 三次尝试耗尽、输出去向不明、输入发生冲突或需要人工处理 |

命令短操作使用排他文件锁；生成调用期间使用持久化的任务 claim。任一时刻最多有一项 `running`。所有状态写入采用临时文件加 rename；同一个 attempt 的重复结果登记在哈希一致时为无操作，不一致时失败。排他锁保存 PID 和随机 token，只在确认持有进程退出且 token 一致时恢复遗留锁；任务 claim 不因锁恢复而释放。

每次尝试保存开始/完成时间、实际提交的 prompt 哈希、transport、工具调用标识（若有）、可获取的模型元数据、结果状态、原始文件的相对路径/哈希/格式/尺寸、错误原因和用量（若有）。未返回的信息写 `null`。成功生成与视觉验收是两个事件，不能因文件存在而自动通过评审。

同一个成功输出的原始哈希只能绑定一个任务；跨任务重复登记同一图片时拒绝并检查是否选错工具输出。一个任务有多个候选时明确选定其中一张，其他候选作为未采用尝试保留。

中断恢复时，`running` 不因超时自动回到 `pending`。先查已有工具结果和本地输出：能找回就登记；确定失败才计入失败尝试；不能确定是否完成就保持 `needs_attention`。费用和 exactly-once 调用无法由本地状态保证，因此不能盲目重新提交。unknown 后找回的结果用追加的恢复事件补登，保留未知状态的审计记录。成功输出、压缩失败、内容验证失败分别恢复，不重新付出一次生成调用。

视觉不合格的尝试记录原因后回到 `pending`，保持原 prompt；已明确失败的暂时性调用可以退避后重试。额度、权限和内容拒绝进入 `needs_attention`。重试上限含首次调用，共 3 次；超过上限不自动增加预算。

内置工具调用只传该任务的 prompt 与需要的透明背景设置；新生成不携带上一张图的引用。若工具暴露 revised prompt，单独保存，页面仍说明用户提交的 prompt；不冒充能够观测工具内部全部处理过程。

## 6. CLI 合同

新增 `npm run media:generate -- <command>`，所有命令接受 `--migration gpt-image-v1`，默认即该迁移。`--json` 输出机器可读结果，诊断写 stderr。以下命令已实现。

| 命令 | 输入与行为 |
| --- | --- |
| `plan` | 创建清单和 prompt 快照；已有清单则验证并返回，不覆盖 |
| `plan --rebase` | 仅在无 running、无应用事务时修订基线或 ID 映射；按下述规则保留生成结果 |
| `status` | 汇总各状态、已用尝试次数、失败原因和下一步；不写文件 |
| `next` | 领取一项 pending 任务，返回 jobId、attemptId、claimToken、prompt 和输出目录；先试跑后按 ID 顺序 |
| `record --job … --attempt … --claim … --receipt <json>` | 成功 receipt 提供本地图片路径和可获取元数据；失败 receipt 提供错误类别。验证 claim 后登记结果 |
| `review --job … --file <json>` | `phase: generation` 评审原始输出，通过后进入 accepted；`phase: display` 评审已加工文件及内容，通过后进入 prepared |
| `prepare --job …` / `prepare --all` | 从 accepted 图生成母图、变体和暂存内容；保存每个文件的 hash/bytes/dimensions，成功后进入 processed |
| `verify --scope pilot` | 校验 8 项试跑的图片、暂存内容和页面评审；通过后记录试跑完成，允许 next 领取余下任务 |
| `apply --dry-run` | 在暂存副本构造全部变更、检查基线和引用，输出精确文件差异；正式内容零写入 |
| `apply` | 要求 101 项 prepared、试跑通过，执行第 10 节的事务 |
| `verify --scope final` | 校验完成条件和交付报告；未满足的验收项逐项失败 |
| `rollback` | 按事务记录恢复本次应用前的内容；新图片对象保留 |

统一退出码：`0` 操作完成；`1` 输入、验证、I/O 或前置条件失败；`2` 当前没有可领取任务。`next` 的退出码 2 同时返回原因 `generation-complete`、`pilot-review-required`、`in-flight` 或 `needs-attention`，不能把无可领取任务等同迁移完成。

receipt Schema 至少定义 `outcome: success|failed|unknown`、`sourcePath`（成功时必需）、`toolCallId`、`model`、`usage` 和 `error`（失败/未知时必需）。缺省元数据为 null；输出路径以磁盘中真实存在的本地文件为准。claimToken 只用于本地协调，不是服务访问凭据。

`plan --rebase` 先归档旧 manifest 和映射，再创建新修订。只有规范化 prompt、比例、输入要求都相同的任务可以复用生成结果；仅 ID/引用变化的任务回到 accepted，重新加工和评审，生成尝试不增加。仅为发生冲突的映射分配新 ID，其余映射保留；已分配给一个任务的 ID 不转配给另一任务。prompt 变化的任务保留旧快照与尝试，建立独立任务修订并回到 pending。原资产集合或任务总数变化超出本次范围时拒绝 rebase，要求先修订本规格。rebase 不能清零同一 prompt 的已用尝试次数。

## 7. 试跑和逐图评审

试跑固定选择以下 8 项，覆盖全部 8 个题材分类及独立模板样例；按表中顺序执行。

| 原资产 | 来源 | 主要检查点 |
| --- | --- | --- |
| `a_018` | `p_018`，风景 | 横向构图、渐变 |
| `a_045` | `p_045`，海报 | 图形层级、5 个标注、首页展示 |
| `a_101` | `t_001/v2/default`，产品 | 独立模板记录、`Made slowly` 文字 |
| `a_050` | `p_050`，肖像 | 霓虹边缘、2 个标注 |
| `a_063` | `p_063`，插画 | 1:3 长卷、完整主体 |
| `a_020` | `p_020`，建筑 | 细线、轮廓 |
| `a_067` | `p_067`，食物 | 俯视细节、3 个标注 |
| `a_064` | `p_064`，图案 | 方图、重复图案边缘 |

每份 review 记录 `phase`、`reviewer`（agent 或人员的真实标识）、时间、选定 attemptId、所检查文件的哈希、检查项结果与失败原因。generation 阶段确认主体、数量、文字、风格和构图；display 阶段确认卡片/详情/手机效果，并记录最终 alt、焦点、annotation regions、文案变更及压缩覆盖值。明确要求的文字无拼写错误，无无关水印和明显生成损坏，才能通过。

display 评审必须绑定当前母图和全部变体的哈希，以及该项内容修订的哈希。更改压缩配置、焦点或选定尝试会使该评审失效，任务回到 accepted，重新 prepare 和评审；只改 alt/标注/文案时回到 processed，重新生成暂存内容并进行 display 评审。保留被替代的评审记录，不能沿用旧图片的通过结论。

图片比例相对误差不得超过 2%；最长边至少 1024 px、最短边至少 512 px。尺寸不足或比例明显不符时重新生成，不能拉伸或通过大幅裁剪伪造达标。长卷优先保证短边清晰度；展示变体仍遵守不放大规则。内置工具没有显式 size 参数，目标比例通过已有 prompt 表达，实际像素尺寸靠输出检测。

先查看独立输出，再检查卡片、详情和手机显示。需要透明背景的任务保留 alpha；普通任务使用现有 prompt 的背景。图像 review 的通过不自动改变译文的 `reviewStatus`。

试跑输出包含每张生成耗时、尝试次数、源图/母图/变体体积与视觉结论。后续 93 项按同一流程处理，每 10 项更新汇总；不为获得清单进展而接受不合格图片。

## 8. 母图与展示变体

模型返回文件保留原始字节与 SHA-256。母图执行方向校正、sRGB 归一化并优先无损 WebP 编码，保留全尺寸与 alpha。如果原文件已满足方向/颜色要求，且解码后的像素与候选母图一致，可以在原字节更小时直接保留原文件。否则保存规范化后的无损 WebP 或 PNG，不通过再次 JPEG 编码获得母图。母图不做有损压缩或缩小，限制在展示变体中实施，避免有损编码串联。

| 变体 | 尺寸规则 | 默认编码 | 需复查的体积阈值 |
| --- | --- | --- | --- |
| `thumbnail` | 最长边 ≤ 480，保持比例 | WebP quality 76 | 60 KiB |
| `card` | 最长边 ≤ 960，保持比例 | WebP quality 82 | 160 KiB |
| `detail` | 最长边 ≤ 1600，保持比例 | WebP quality 82 | 500 KiB |
| `og` | 目标 1200 × 630，围绕 focalPoint 裁切、不放大 | JPEG quality 84 | 200 KiB |

阈值用于触发检查，不是自动降质到达的硬上限。母图大于 5 MiB 时额外记录原因。质量不通过时，WebP 依次试 88、92、无损；OG 可试 90。每次都从母图独立编码，在同样展示尺寸下比较，检查文字、线条、色带、边缘和 alpha。必要的大文件在 review 中记录理由。

现有 [mediaSchema](../scripts/lib/content/schemas.ts) 为 strict Schema，需先增加可选 `processing` 字段并保持旧记录兼容：

```yaml
processing:
  version: 1
  thumbnail: { quality: 76, lossless: false }
  card: { quality: 82, lossless: false }
  detail: { quality: 82, lossless: false }
  og: { quality: 84 }
```

quality 为 1–100 整数；前三种 lossless 为 boolean；OG 不接受 lossless；缺失整个 processing 时使用现有默认值。`renderVariants`、导入和 `--refresh` 必须读取同一配置；无损时 quality 不参与输出，避免 refresh 丢失已验收的压缩选择。该配置属于媒体处理，不写入模型的生成参数表。

`original.key` 继续指向传给导入器的站点母图，符合导入器保留输入字节的合同。原始模型输出另由尝试记录追踪，不能拿它的哈希代替母图 `contentHash`。页面链接文案 `detail.image.original` 从“原图 / Original”改为“下载大图 / Full-size image”，同步所有已有语言目录中的同名键，避免把转换后的母图说成模型原始响应。

新媒体 `digitalSourceType` 为 `trainedAlgorithmicMedia`。`contentCredentials` 依据实际存储文件检查；没有可用校验时记 `unknown`，不能因源图带凭证就给转换图标记 `present`。更新 credit，去掉 `sample set` 描述；沿用现有站点的逐图许可策略，并在清单中显式记录每项采用的 credit/license 值。

## 9. 新内容与真实运行记录

每项任务生成一个新 ExampleRun，使用现有 [exampleRunSchema](../scripts/lib/content/schemas.ts)，不向 strict Schema 塞入迁移私有字段：

- `prompt.txt` 等于该次实际提交的规范化文本；`promptSha256` 与之匹配。
- `promptId` 为对应 Prompt，`a_101` 为 null；模板任务保留 ID、版本、resolved values 和 sample 关联。尤其保留 `t_001/v2/default`，否则当前 [模板封面选择](../scripts/lib/content/build-index.ts) 会改变。
- `outputAssetIds` 只包含新资产，`referenceAssetIds: []`，`provider: OpenAI`。
- `model.displayName` 使用已确认的 GPT Image 名称；精确版本不可见时用 `GPT Image`，`providerModelId: null`。精确版本只有工具明确提供才写入。
- `recordedAt` 取该次真实生成完成时间在 `America/Los_Angeles` 的日期；完整 ISO 时间保存在尝试记录。
- `parameters` 只放已知且实际提交的生成参数。内置工具未暴露时可以为空；实际输出像素和压缩配置进入迁移记录，不伪装成提交的生成参数。删除样例的虚构 seed 和 `quality: standard`。
- `notes` 是针对新图的实际观察，不复制旧图结论；失败尝试仅留在迁移审计中，不混入已通过的公开样例。

Prompt 的 `model` 与新运行一致，存在成功运行且视觉评审通过后设 `verification: verified`；其含义是已实际运行并检查，不保证确定性复现。用真实编辑日期更新 `updatedAt`，保留 `createdAt` 与地址。

20 个标注分别属于 `p_012`（3）、`p_015`（3）、`p_024`（2）、`p_045`（5）、`p_050`（2）、`p_067`（3）、`p_098`（2）。保持 phrase 与 prompt 的对应关系，以新母图为坐标系重新写入 x/y/w/h；复查所有可见语言的说明。标注边界符合现有 Schema，桌面与手机均准确指向目标。

以结构化映射更新 Prompt/合集的 `coverAssetId`、MDX Figure、仍有效的引用图片字段及其他可达图片引用。首页和 feed 使用的是 Prompt ID，不替换为资产 ID。模板封面由新运行关系得到。所有缺少映射的旧资产引用都阻止 apply。

复查新图的 alt、caption 与正文，更新关于页、许可页、根 README、`content/README.md` 中仍宣称“全部是程序绘图”的文字。保留历史设计记录。源文变更后按现有翻译规则处理 `sourceHash`；未重新完成审核的已有译文标为 `outdated`，不能仅刷新 hash 伪装审核。现有草稿保持草稿，不在本次扩大语言发布范围。

## 10. 暂存、应用与回退

`prepare` 将内容写入 `.artifacts/gpt-image-v1/staged/content/`，包含完整配置、语言注册表和其余内容。媒体对象可提前写到 `public/media/` 的新哈希路径；正式 `content/` 的媒体记录、封面与运行记录直到 apply 才变更。暂存内容通过 `loadContent({ dir, mediaRoot })` 验证，也可用 `CONTENT_DIR` 预览。每次预览前由 CLI 从基线加已验收任务重建副本，丢弃暂存中不可追溯的手工修改。

apply 前必须满足 101 项 prepared、试跑通过、内容修改源哈希与 baseline 一致、新 ID 无冲突。只比较拟修改文件及生成所依赖的源文件；无关工作区修改不得被重置。源变更导致快照或引用不再成立时，输出精确冲突，重新规划受影响项；已生成的匹配 prompt 图片可复用。

应用时停止本仓库内容/dev watcher，避免构建读取多文件事务的中间状态。采用以下顺序：

1. 获取迁移锁；创建字节级备份和事务日志，逐文件保存 beforeHash、afterHash、创建/修改/移除动作及回退路径。重新检查基线。
2. 对完整暂存内容运行现有校验与本规格验证；确认全部新媒体对象可读取且实际 hash、尺寸、格式吻合。
3. 将 44 份旧运行完整复制到 `migrations/gpt-image-v1/archive/content/examples/`，核对归档哈希，再从正式 `content/examples/` 移除。
4. 使用逐文件原子 rename 写入新媒体记录、101 份真实运行、引用和文案变更；每步记录完成状态。文件系统多文件操作不宣称原子事务。
5. 对正式内容重新校验并构建。成功后标记 applied，保存结果报告；发布部署留给独立流程。

任一步失败或进程中断，依据日志恢复或续做尚未完成的文件动作，不重跑生成。恢复前比较当前文件与日志记录的 before/after hash：匹配 after 才撤回，匹配 before 则跳过，二者均不匹配就报告并保留该文件，避免覆盖新编辑。回退恢复原始 44 份运行、封面、标注和文案，移除本次新增的内容记录；新媒体二进制和迁移审计保留。完整回退后任务回到 prepared，迁移记录标为 rolled_back，最后重建正式内容的生成产物。

旧 `content/media/a_001…a_101.yaml` 和旧 `public/media/` 对象本轮保留，成为未被站点内容使用的资源；现有 unused 提示可接受。它们可以保留旧 credit/provenance；最终校验针对公开内容的可达资源，而不是要求仓库任何角落都不能出现样例词。

## 11. 验证与测试

新增测试放在相应模块旁，构造小型临时内容树与栅格 fixture，不调用真实生成服务。

| 测试范围 | 必须证明的行为 |
| --- | --- |
| 清单 | 文本、模板默认值和独立模板样例正确；同资产不同 prompt 被拒绝；ID 冲突与 prompt 漂移被发现 |
| 状态 | 重复登记无副作用；两次领取互斥；超时不盲重试；第 4 次生成不被领取；中断后原始文件丢失可诊断 |
| 评审 | 未看展示变体不能进入 prepared；更改文件/焦点/内容后旧评审失效；同一输出不能登记给不同任务 |
| 加工 | 方向/alpha/比例正确；长卷不拉伸；不放大；各变体独立编码；自定义质量和无损配置经 refresh 保留 |
| 迁移 | dry-run 无正式内容写入；101 项不齐不能 apply；旧记录归档字节不变；模板默认封面关联保留 |
| 恢复 | 注入中途写入失败可恢复；二次 apply/rollback 幂等；遇到应用后的外部编辑时不覆盖 |
| 内容验证 | 旧图在 active 内容中的引用为 0；新运行 prompt/hash/资产一致；未知模型 ID 合法、伪造元数据不通过迁移验证 |

调整依赖仓库真实内容的测试，例如 [搜索集成测试](../scripts/emitters/search.test.ts) 中的 `sample renderer` 断言。独立测试 fixture 内的 Sample Renderer 可保留，不用全局替换字符串来通过测试。

最终执行 `npm run content:validate`、`npm run typecheck`、`npm run lint`、`npm test`，分别完成 preview 与 production 构建。E2E 使用现有 Docker/nginx 流程，覆盖媒体请求、首页、列表、详情、弹层、模板和搜索；现有代表文件为 `tests/e2e/media.http.spec.ts`、`home.browser.spec.ts`、`detail.browser.spec.ts`、`popup.browser.spec.ts`、`editor.browser.spec.ts`。每次测试使用对应模式刚构建的产物。

人工或 agent 视觉验收覆盖全部 101 张图及 20 个标注；页面走查至少覆盖 en、zh-Hans，以及 preview 中既有 ja、ar，桌面 1280 × 800 和手机 390 × 844，浅色/深色。正文图片完整、无断图；详情和弹层展示一致；下载链接指向新母图；全部模板的当前默认示例正常。

实际测量冷缓存首屏加载的图片字节和 `currentSrc`。沿用[设计文档 §16.1](prompt-library-website-design.md#161-性能目标)约 600 KiB 的首屏图片预算，记录首页、画廊、代表详情的结果。超过预算必须记录并解决图片选型/编码问题，或明确列为未达成项，不能仅凭单文件阈值声称性能通过。

最终报告必须包含：

- 101/101 任务 applied、101 个可解码的新资产、101 份真实运行；100 个 Prompt 都有相符成功记录。
- 9 项模板关联正确，尤其三个当前模板的 default 示例都指向新图。
- 旧样例运行在 active 内容中的数量为 0，归档数量为 44，归档校验和匹配。
- 从 production 和 preview 的详情、列表、模板、合集、富文本及导出模型追踪出的旧图片引用为 0。
- 7 条内容的 20 个标注完成评审；全部需要的 alt 语言存在；原发布范围与地址集合可核对。
- 每张图的尝试数、通过原因、输出尺寸、生成时间、处理参数、源图/母图/变体字节数及新旧 ID 映射。
- 测试结果、视觉记录、首屏图片实测和回退演练结果。用量未暴露时费用标为未知，不从次数估算出假精确金额。

只有全部硬性验收项满足时，迁移报告状态才能为 `complete`。仍有 needs_attention、缺图、错误标注、未解释的可见内容变化或失败的必需检查时，保持 `incomplete` 并列出具体项。

## 12. 实施顺序

| 交付阶段 | 改动范围 | 退出条件 |
| --- | --- | --- |
| A：持久化清单与状态 | 新 CLI、manifest/jobs、目录忽略规则 | plan/next/record/status 可用；用本地 fixture 验证中断与重复登记 |
| B：图片加工与暂存 | 导入函数提取、processing Schema、prepare/review | 对现有媒体向后兼容；新母图、变体、refresh 和暂存验证通过 |
| C：迁移与回退 | migrate/verify、事务日志、结构化引用更新 | 临时内容树 apply/rollback 演练通过，失败恢复不覆盖外部编辑 |
| D：8 张试跑 | 实际工具调用、内容评审、暂存页面预览 | 8 项 prepared，所有试跑检查通过，压缩策略确定 |
| E：93 张生成 | 串行任务、每 10 项整理 | 101 项全部 prepared，20 个标注及内容评审齐全 |
| F：统一切换与验收 | 新资源、运行记录、旧样例归档、文案及相关测试 | dry-run 清晰、apply 成功、最终报告 complete |

共享内容 Schema 的变更先交付兼容实现，并在设计文档 §5.4、§10 中同步 `processing` 合同；真正完成 F 后再更新 §17.6 的实施状态。实现前端相关改动前，按 AGENTS.md 阅读当前安装版本的 Next.js 指南，继续使用现有静态导出及媒体 URL 模块。

## 13. 执行中的 prompt 修订

2026-10-28，`a_101` 原有 `t_001/v2/default` prompt 的三次实际调用均漏掉 `Made slowly` 标题，并产生写实杯体。三次结果作为失败尝试保留，v2 正文与旧运行保持冻结。新增 `t_001/v3`，沿用字段与样本，明确产品本身采用二维矢量风格，并要求准确渲染提供的标题；当前模板版本更新为 v3。v3 的首次结果通过生成评审。

独立模板任务通过 `migrations/gpt-image-v1/source-overrides.json` 指定新版本与值，并以 `previousPromptSha256` 验证被替代的原始来源。`plan --rebase` 保存原清单和任务档案，记录 v3 实际提交的 prompt 与哈希；旧 x_009 继续保留其原始 v2 文本，待统一归档。最初基线的 4 个模板版本因此增加为 5 个；任务总数仍为 101。该机制仅用于没有 Prompt 所有者的独立模板任务，普通 Prompt 修订继续通过其内容文件表达。

产品与食物图的首轮结果出现写实倾向，因此其公开 prompt 补充了整个场景的二维扁平要求。产品模板 Prompt 使用新 v4（基于 v1）和 v5（基于 v2）；已冻结的 v1/v2 不变。当前默认仍为 v3，模板版本总数为 7。

秋丘、月下山岭和叶片的实际结果表明数字要求容易被额外的前景形状破坏，因此在公开 prompt 中补充轮廓、峰顶或完整叶片的计数方法；相关清单修订保留旧快照和尝试。未改 prompt 的任务继续保留已有展示审核。每个精确 prompt 哈希最多 3 次尝试；修改后是独立修订，尝试编号连续而不覆盖。

双蓝肖像的两次结果均出现琥珀色右轮廓光，因此 p_084 的公开 prompt 明确左右分别为钴蓝与冰蓝，并将背景光体写为银蓝色；新修订结果通过。
