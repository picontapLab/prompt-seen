# 英语社交图片案例生产与首页接入 Spec

版本：v1。日期：2026-11-08，America/Los_Angeles。

本规格把 12 个英语社交图片创意转成 Prompt Seen 可生产、可追溯、可导入、可在首页展示的内容。实施完成目标是 **12 个案例、12 张验收成图、3 张可复用底图、7 个可编辑模板、1 个合集，以及 12 个可切换的首页新案例**。

实施状态（2026-11-09）：12 个案例、3 张底图、7 个模板、24 个标注和合集已导入并接入本地首页；生产构建与测试已完成，尚未部署。实际 ID、图片、回执、检查记录见 [实施报告](../production/english-social-showcase-v1/README.md) 和 [verification.json](../production/english-social-showcase-v1/verification.json)。下文保留原始实施契约；本节记录实施时发现的环境差异。

实施适配：当前分支已公开启用日语，发布校验强制要求所有新增内容有对应日语说明与指纹审核。因此仅为本批补充了日语页面、alt、标注、输入说明、字段标签和运行说明，并追加 AI 文本审核记录；不修改语言开关、英文 prompt、默认值或已有内容。合集使用 `c_015`，跳过历史撤下的 `c_014`。C03 首次图片的末尾出现双句点，已保留失败记录；C03—C06 在生成验收前改为独立行列出配文，避免模板重复追加标点，C03 第二次通过。沿用媒体工具“不放大原图”的规则：两张 1122×1402 竖图的 OG 为 1122×589，其余指定 OG 为 1200×630；均保持约 1.90:1 的预览比例。

配套目录：[production/english-social-showcase-v1](../production/english-social-showcase-v1/README.md)。[manifest.json](../production/english-social-showcase-v1/manifest.json) 是案例、输入依赖、展示顺序和待回填结果的清单；其中的完整英文 prompt、配方和任务定义已分别落盘。

## 1 产品目标与范围

目标用户是使用英语聊天和社交媒体的用户。用户在首页看到一张完整作品，可以理解用途、查看标注、复制完整英文 prompt、打开详情并取得示例底图；有模板的案例还可以修改配文或姓名等字段。网站继续作为提示词库，不新增在线生图或聊天应用贴纸安装流程。

本批沿用当前静态图片展示、参考图、模板、详情弹窗、复制和下载能力。画面采用自然英语短句；英文和简体中文页面展示同一套英文生成正文。中文只用于介绍、输入说明、alt 和标注解释。

范围包括：

- C01—C06 六套九宫格，每套九个反应，采用卡通人像、宠物插画、蜡笔、毛绒、黏土、像素六种视觉方向。
- C07—C12 照片亭、宠物报纸、上下两格梗图、周末拼贴、生日收藏卡和宠物四格漫画。
- R1—R3 三张独立生成并验收的参考图，供七个案例、八个参考槽位复用。
- 原创案例覆盖率统计的兼容补充、图片标注、合集、首页配置及必要验证。

本批不包含 GIF、视频、透明贴纸拆包、平台原生贴纸安装包、自动播放轮播、首页视觉改版或新生图服务。整张九宫格可以作为图片分享，不能称为可直接导入 WhatsApp 或 iMessage 的贴纸包。

完整实施须达成 12 个案例。允许分批检查，但未达 12 个不得报告整批完成。发布上线是通过本地验收后的独立交付状态。

## 2 当前项目能力与实施约束

| 当前事实                                                                        | 对本批的约束                                                       | 对应实现                                                              |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 当前首页首个案例 p_146 是中文 4×4 角色贴纸                                      | 新增英语 3×3 条目，保留旧条目的正文和历史结果                      | `content/site.yaml`、`content/prompts/p_146/entry.yaml`               |
| 首页使用 `home.featured`，已开始的日期倒序，同日按配置顺序，之后是无日期项      | 本批采用同一个实际发布日 D 和明确顺序；不使用虚构历史日期制造排序  | `src/modules/home/featured.ts`                                        |
| 首页手动点击 Another frame 切换，没有自动轮播                                   | 直接复用现有交互                                                   | `src/ui/home/HomeHero.tsx`                                            |
| 首页只展示带标注的案例                                                          | 每个案例至少两个真实标注，导入后、接入首页前补齐                   | `src/modules/home/compose.ts`、`scripts/lib/content/validate-home.ts` |
| 导入配方为 strict schema，没有 annotations 字段；导入器写入 `annotations: []`   | 不把标注意图直接塞进 recipe；验图后写入新条目的 `entry.yaml`       | `scripts/lib/content-production/publish.ts`                           |
| 首屏 prompt 摘录默认约 320 字符，靠后的标注会拉长摘录                           | 两个标注短语放在正文开头，控制首屏高度                             | `src/ui/showcase/model.ts`、`src/ui/annotation/layout.ts`             |
| `content:produce` 不调用图片服务，plan 会立即读取和哈希参考文件                 | 先生成底图再 plan 依赖任务；未生成的底图路径不能直接执行           | `scripts/lib/content-production/production.ts`                        |
| 原创条目没有外部 inspirationSources，而覆盖率目前只按第一条来源匹配 candidateId | 实施 P0 补充，不能伪造来源记录绕过统计                             | `scripts/lib/content-production/coverage.ts`                          |
| 媒体导入按原图内容哈希去重，并生成 thumbnail、card、detail、og                  | 三张底图保持相同字节，跨案例复用同一媒体；核对首次导入的底图元数据 | `scripts/lib/media/import.ts`                                         |
| 默认公开语言是 en 和 zh-Hans，ja 为 preview                                     | 交付中英内容；不为本批启用语言或批量填充日语内容                   | `content/locales.yaml`                                                |
| 项目使用 Next 静态构建和打包产物                                                | 改内容后重新构建；配置未来日期不会让已部署静态文件自动更新         | `package.json`、`src/ui/home/HomeBody.tsx`                            |

实施前重读上述文件，以当时工作区为准。本规格不要求覆盖其他任务已有的改动。涉及 Next 代码时先阅读当前安装版本的 `node_modules/next/dist/docs/`；静态导出相关指南为 `01-app/02-guides/static-exports.md`。

## 3 案例清单与展示顺序

| ID  | 英文标题与 slug                                              | 视觉和用途                     | 比例 | 底图槽位                       | 模板            |
| --- | ------------------------------------------------------------ | ------------------------------ | ---- | ------------------------------ | --------------- |
| C01 | Your Everyday Reactions / `everyday-reaction-stickers`       | 自拍转九宫格卡通反应，普通群聊 | 1:1  | `person` → R1                  | 九条 captions   |
| C02 | My Dog, My Mood / `dog-mood-reaction-stickers`               | 宠物身份一致的九种反应         | 1:1  | `pet` → R2                     | 九条 captions   |
| C03 | Office Cat, Off Duty / `office-cat-reaction-stickers`        | 蜡笔橘猫、视频会议和下班短句   | 1:1  | 无                             | 九条 captions   |
| C04 | Social Battery: Low / `social-battery-raccoon-stickers`      | 毛绒浣熊，出门和宅家的日常自嘲 | 1:1  | 无                             | 九条 captions   |
| C05 | Tiny Frog, Big Support / `supportive-frog-reaction-stickers` | 黏土青蛙，支持朋友和庆祝小进展 | 1:1  | 无                             | 九条 captions   |
| C06 | One More Game / `gaming-ghost-reaction-stickers`             | 原创像素小幽灵，游戏聊天反应   | 1:1  | 无                             | 九条 captions   |
| C07 | Bestie Photo Booth / `bestie-photo-booth`                    | 双人照片亭四连拍，朋友纪念     | 4:5  | `personA` → R1，`personB` → R3 | 无              |
| C08 | The Daily Woof / `daily-woof-pet-newspaper`                  | 柯基成为虚构报纸趣味头条       | 1:1  | `pet` → R2                     | 无              |
| C09 | Me Making Plans / `making-plans-reaction-meme`               | 上下两格，约局积极与出门犹豫   | 1:1  | `person` → R1                  | 无              |
| C10 | Weekend Starter Pack / `weekend-starter-pack-collage`        | 咖啡、书本和猫的六组剪纸拼贴   | 1:1  | 无                             | 无              |
| C11 | Birthday Main Character / `birthday-main-character-card`     | 人像生日收藏卡                 | 4:5  | `person` → R3                  | age、personName |
| C12 | Five Minutes Home Alone / `dog-home-alone-comic`             | 柯基独自在家的四格故事         | 1:1  | `pet` → R2                     | 无              |

首批贯通验证 C01、C02、C07、C08，覆盖单人、宠物、双人身份绑定和英文海报排字。首批成功后完成余下八项。

完整首页新案例顺序为 **C01 → C02 → C07 → C08 → C04 → C10 → C03 → C05 → C06 → C09 → C11 → C12**，之后继续保留原首页项目。这是基础编辑顺序；各语言最终首图与轮换序列按[首页语言规格 §5.4](./home-language-seo-spec.md#54-各语言共用的首屏选择算法)同语言优先，同组保留这里的顺序。每个案例只配置一次。

每项完整生成词分别位于 `production/english-social-showcase-v1/prompts/c01.txt` 至 `c12.txt`；不要再人工拼接上一轮方案中的公共段落。正文已经把构图和标注短语放到开头。

## 4 英文文案与模板契约

| 案例 | 指定文字，按阅读顺序                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01  | Hey! / Same. / Seriously? / I'm in! / Nope. / Thank you! / You got this. / BRB / Love it!                                                            |
| C02  | Hi, human! / Did someone say snacks? / Side eye. / Not sorry. / Let's go! / Need a nap. / Good job! / Miss you. / Love you!                          |
| C03  | Morning. / Coffee first. / On it. / Quick question. / You're on mute. / Lunch? / Still loading. / Done! / Logging off.                               |
| C04  | I'm in! / Who's coming? / Small talk? / Need a minute. / Battery low. / I'm staying in. / Maybe next time. / Recharging. / Home sweet home.          |
| C05  | You got this. / Proud of you. / One step at a time. / Take a break. / Here for you. / Small wins count. / Sending hugs. / Nice work! / Rest is okay. |
| C06  | GG! / Nice! / My bad. / Lagging. / BRB / One more? / We got this. / So close! / Logging off.                                                         |
| C07  | Better together                                                                                                                                      |
| C08  | THE DAILY WOOF / LOCAL DOG DENIES EVERYTHING / Witnesses report a suspicious amount of fluff.                                                        |
| C09  | Me making plans / Me when it's time to leave                                                                                                         |
| C10  | WEEKEND STARTER PACK / Coffee. Books. No plans.                                                                                                      |
| C11  | LEVEL 30 UNLOCKED / ALEX / Cake first. Responsibilities later.                                                                                       |
| C12  | I'll be good. / They're gone. / My house now. / Welcome back!                                                                                        |

文案使用英语聊天、视频会议、游戏和生日庆祝中的自然表达，不声明这些是热度榜单或某平台热门趋势。画面不使用中文配字；不借用现有游戏角色、品牌或真实报纸版式。

C01—C06 各有一个 `captions` 字段：`string-list`、required、恰好九项、每项最多 28 个字符、分隔符 `; `，字段组为现有 `text`。六项分别创建模板，因为主体、材质和输入要求不同，不合并成一个语义含混的通用模板。

C11 的 `age` 和 `personName` 是 required string，默认分别为 `30` 和 `ALEX`，长度分别为 1—3 和 1—16，单行。当前字段 schema 只校验字符串长度，不声称自动校验年龄范围。默认样例以 R3 虚构成年人生成。

其余五项以 literal prompt 导入。所有案例 `promptLanguage: en`，模板 v1 的正文、字段、默认值和输入契约在产生正式运行记录后冻结。后续改变语义必须新增版本或新条目；不能回写历史 prompt。

配方 `recipes/cNN.json` 保存模板正文、默认值和中英介绍；`prompts/cNN.txt` 与 `job-definitions/cNN.json` 保存已经渲染好的默认英文生成词。调用时以 claim 返回的正文为准。文件末尾换行用于文本文件存储，不额外拼接到 JSON 中冻结的 prompt 字符串。

## 5 参考底图与生成任务

| 底图 | 身份和可识别特征                                                   | 使用案例      | 完整生成词                                                        |
| ---- | ------------------------------------------------------------------ | ------------- | ----------------------------------------------------------------- |
| R1   | 虚构 28 岁成年女性，中棕肤色、深色齐肩卷发、青绿色卫衣；正面半身   | C01、C07、C09 | [r1.txt](../production/english-social-showcase-v1/prompts/r1.txt) |
| R2   | 橙白柯基，额头白色中线、直立耳、绿色三角巾；完整坐姿               | C02、C08、C12 | [r2.txt](../production/english-social-showcase-v1/prompts/r2.txt) |
| R3   | 虚构 30 岁成年男性，浅肤色、短棕卷发、淡雀斑、酒红色上衣；正面半身 | C07、C11      | [r3.txt](../production/english-social-showcase-v1/prompts/r3.txt) |

三张底图单独生成，均为 1:1，浅灰背景、清晰主体、无文字和水印。R1/R3 必须五官、发型和肩部完整；R2 必须双耳、四爪、白色额纹与三角巾完整。底图不以案例形式额外公开，不计入 12 个案例或 12 张成图。

生产步骤：

1. 用 `job-definitions/r1.json`、`r2.json`、`r3.json` 分别 plan、claim、调用图片工具、record、review。生成通道采用当时可用且能传入参考图的工具；不从项目名称推断具体模型版本。
2. 接受后，保留原始返回文件和回执，把审核通过的原始字节复制到清单的 `references/rN/accepted.png` 路径，并记录 SHA-256、真实格式、尺寸和 acceptedJobKey。不能把 WebP/JPEG 改扩展名冒充 PNG；若实际格式不同，在主案例 plan 前更新全部对应路径。
3. R1/R2/R3 的 accepted 文件一旦被主案例 plan 冻结就不可覆盖。替换底图须建立新路径和新 attempt key，重新生成所有使用旧底图且需更新的案例。
4. C07 输入顺序固定为 R1、R3，分别绑定 `personA`、`personB`；图 1 始终在左，图 2 始终在右。其余七项输入绑定以 manifest 为准。
5. C03、C04、C05、C06、C10 无底图依赖，可以直接执行自己的生图任务。

目标是 15 张独立验收图，不是固定 15 次调用。每个底图或案例最多三个尝试；错误字、构图或身份不达标须保留失败记录并使用新 key。第三次失败后记录需改进项，调整配方再确定下一阶段，不无上限自动重试，也不拿同一张成图充作两个案例。

本输入包所有 `targetAspectRatio` 均为 null：比例已写入 prompt，而当前已知的内置生成工具没有独立比例参数。manifest 中的 `desiredAspectRatio` 是验收目标。若实施时确实向另一个通道提交独立比例设置，在 plan 前如实填写，不能把期望尺寸伪装成实际参数。

## 6 素材与视觉验收

### 6.1 通用标准

- 原始成图短边至少 1024 px；九宫格优先争取更高原生分辨率。实际宽高与目标比例的相对误差不超过 2%。不通过拉伸、裁掉格子或事后补字掩盖错误。
- 保留工具返回的原始图。允许项目媒体导入器生成显示派生图；生成失败的文字或身份问题通过新尝试解决。若未来引入人工排字或合成，必须另立工作流与真实复现说明。
- 每个指定文本恰好出现一次，拼写、大小写、标点正确，无遗漏、额外乱码或不相关文字。OCR 可辅助，最终仍逐项看图确认。
- 在 390 px 手机视口中检查实际图片显示宽度：九宫格主要配文、报纸主标题、姓名和生日等级应可读；照片亭副标题和报纸副标题另在 960 px 详情图核对。不能仅检查放大原图。
- 1:1 图片完整显示；4:5 图片完整显示且不挤掉首屏必要操作。浅色和深色主题均无明显边缘、对比度和排版问题。
- 底图是人物/宠物输入，不把示例图片说成用户上传的真实照片。model、provider、recordedAt 及尺寸从实际返回结果填写；未知精确版本保持未知。

### 6.2 每类额外标准

| 类型    | 必须满足                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------- |
| C01—C06 | 正好九格；配文按左到右、上到下排列；主体身份、服装和材质一致；反应有明显变化；每格配文最多两行 |
| C01     | 变成插画后仍保留 R1 的肤色、发型和主要面部特征                                                 |
| C02     | 每格保留 R2 的额纹、耳形和绿三角巾；最长短句仍可读                                             |
| C03—C06 | 各自的蜡笔、毛绒、黏土和像素材质在缩略图中仍可辨认；C06 字体可读                               |
| C07     | 四格，每格两人，身份不融合、不互换；R1 始终左侧，R3 始终右侧                                   |
| C08     | 报头、标题、副标题三组文字，无虚构长正文；主体身份清楚                                         |
| C09     | 正好上下两格；同一人物；日间期待与夜间犹豫形成清晰反差                                         |
| C10     | 六组视觉元素；一双鞋计为一组，猫与垫子计为一组；仅标题和页脚两组文字                           |
| C11     | 同一参考人物；三组文字完全正确；卡片边缘不裁字或皇冠                                           |
| C12     | 四个不同情节按顺序呈现；同一客厅布局、宠物身份和绿三角巾                                       |

每次审核记录必须指出实际观察到的优点、缺陷和通过结论。模型声称“完成”或返回了一个文件不能代替视觉验收。

## 7 生产目录与任务身份

```text
docs/english-social-showcase-spec.md
production/english-social-showcase-v1/
  README.md
  manifest.json                 # 规格、依赖、顺序；结果 ID 初始为 null
  campaign.json                 # 12 个主案例，每项 expectedOutputs = 1
  prompts/r1.txt ... r3.txt      # 3 份完整底图生成词
  prompts/c01.txt ... c12.txt    # 12 份完整默认生成词
  job-definitions/*.json        # 15 份现有 CLI 可识别的定义
  recipes/c01.json ... c12.json # 12 份 schema 合法、尚未签审的配方
  references/                  # 实施时写入已验收底图及 provenance.json
  reviews/                     # 实施时写入真实视觉审核
  annotations/                 # 实施时写入量取坐标后的标注
  content-map.json              # 实施时记录真实分配的 p/t/x/a/c ID
  verification.json            # 实施时写入命令结果、数量和截图路径
  audit/                       # 实施时保存必要执行快照、截图和补丁
```

CLI 运行状态保存在 `.artifacts/content-production/english-social-showcase-v1/jobs/`；prepare 状态在 `.artifacts/content-production/prepared/`，apply 回执在 `production/applied/`。这些不能靠复制草稿伪造。

candidateId 使用 `ENSOC-V1-C01`—`ENSOC-V1-C12`；底图使用 `ENSOC-V1-R1`—`ENSOC-V1-R3`。初始尝试 key 为 `ensoc-v1-c01-a01` 等，重试改为 a02/a03。key 带 campaign 前缀，因为 prepare 和 applied 的目录并不再嵌套 campaign。

manifest 的 `status: specified` 是任务清单状态，不是生产 CLI 的 `planned`。有真实结果后按 generated、accepted、imported、featured 回填；失败记录到具体尝试并注明原因。生产 CLI 的真实状态仍以 job.json 为准。

## 8 导入契约与文件落点

### 8.1 直接复用的导入能力

所有配方已按当前 `recipeSchema` 编写：

- `candidateId`、唯一 slug、现有 categoryId、`useCaseIds: [social-post]`。
- `promptLanguage: en`、`promptProvenance: original`、`source.author: Prompt Seen`、`source.license: CC BY 4.0`。
- `inspirationSources: []`。这是本站新写的英语案例；manifest 的 internalPredecessors 只记录借鉴的站内结构，不虚构外部作者、链接、点赞或流量。
- C01—C06 和 C11 有 fields/values；其他五项为 `fields: []`、`values: {}`。
- 有底图的条目使用 `referenceImage: required`，每个槽位 min/max 都为 1；无底图条目使用 none 和空 slots。
- 中英 locales、输入说明和 alt 都已提供草稿。实施时按真实成图修订 alt 和效果说明，再作 editorialReview。

配方不包含 `editorialReview`，防止未验图就把预设描述当作审核结果。签审流程必须在生成验收后进行。不得把 manifest 中的状态、占位 ID 或 `region: null` 直接传给 strict recipe schema。

### 8.2 正式内容结构

| 内容       | 目标文件                                                                                 | 数量                           |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| Prompt     | `content/prompts/p_NNN/entry.yaml`，中英 locales；literal 条目还有 prompt.txt            | 12                             |
| Template   | `content/templates/t_NNN/entry.yaml`，中英 locales，v1 body/fields/inputs/default sample | 7                              |
| Example    | `content/examples/x_NNN/run.yaml` 和实际 prompt.txt                                      | 12 个验收样例                  |
| Media      | `content/media/a_NNN.yaml` 与 `public/media/a_NNN/`                                      | 目标 15 张唯一原图，另有派生图 |
| Collection | `content/collections/c_NNN/entry.yaml` 与中英 locales                                    | 1                              |
| Homepage   | `content/site.yaml` 的 home.featured                                                     | 12 个新条目                    |

p/t/x/a ID 必须由 prepare/apply 在当前内容树上分配；不得按写 spec 时的最大 ID 预留一段编号。合集按实施时的现有编号分配，串行写入并检查 slug 不冲突。每个案例 prepare 后立即 apply，再开始下一个，避免多个暂存计划争用相同 ID。

运行记录必须满足：

- `showcaseExampleId` 属于该 prompt；其输出含 `coverAssetId`；其保存的正文与当前默认生成正文完全一致。
- `referenceAssetIds` 与实际传入图片一一对应；`referenceBindings` 保持 slotId 和 referenceIndex。
- C07 有两条绑定且顺序正确。其余单图案例各有一条；无图案例没有隐藏参考图。
- 默认模板正文渲染结果必须与 job.definition.prompt 完全一致。修改文案后不能沿用旧成图或旧签审哈希。
- 媒体 dedup 复用相同底图字节；底图标题与 alt 不能被后导入案例改成“某张成图”。

### 8.3 底图元数据补齐

当前 prepare 导入参考媒体时只传 slot labels，未传完整 credit。实施时按清单中的输入哈希定位三张底图的真实 a_ID，补齐中英 alt、AI-generated demonstration credit、与本批一致的 license 和 provenance。修改 YAML 后通过现有 `media:import --refresh` 流程重建元数据派生图，具体参数按该命令当前帮助确认。

每张底图的 `references/rN/provenance.json` 记录实际生成任务 key、实际 provider/model、原始输出路径、SHA-256、格式、宽高、审核结论、复用的 a_ID。不得为了去重改写图片像素。

### 8.4 图片标注写入

manifest 每个案例已有两个 annotationIntents，phrase 是实际正文中的原样子串，note 有中英版本，region 初始为 null。region 必须在验收成图上量取，归一化到 0—1；x+w、y+h 不越界。文本短语不能重叠，图片区域可按现有布局规则合理重叠。

先完成 apply，再把审核后的两个标注写入该新 prompt 的 entry.yaml；随后执行 content:validate，最后才写 home.featured。不要编辑 prepared.json 或 apply journal 来绕过计划哈希。

每个标注解释一个真实可见的效果，例如九格结构、人物一致性、蜡笔材质或标题字形。禁止对所有案例复制同一组整图坐标。标注短语和对应句子应位于正文前 320 字符内；手机首屏仍需实际检查。

## 9 P0 原创案例覆盖率统计补充

当前 `campaignCoverage` 用 `prompt.inspirationSources[0].candidateId` 找 prompt。本批合法的 original 配方没有外部来源，即使已成功 apply，现有统计也会显示零产出。这个问题必须在整批验收前解决。

修改范围限于 `scripts/lib/content-production/coverage.ts` 和其测试，保持 status 输出字段兼容：

1. 优先扫描 `production/applied/*.json`，用 candidateId 找到真实回执中的 ids.prompt 和 ids.example，并核对对应 prompt、run 存在且归属一致。回执只是映射依据，实际输出数仍从 run.outputAssetIds 计算。
2. 不存在该 candidate 的 applied 回执时，保留现有来源匹配作为历史兼容分支。来源匹配应检查来源列表中的任一 candidateId，避免只认首项。已有回执却失效时报告错误，不用历史分支掩盖不一致。
3. 同一 candidate 的多次有效回执指向同一 prompt 时合并；指向不同 prompt、回执指向不存在或错配运行时明确报告冲突/错误，不能静默取第一条。
4. `acceptedExampleIds` 仍由实际审核回填，只统计候选对应 prompt 的有效 run；忽略或报错跨候选、已删除的 sample，不能借其他案例凑足数量。
5. `recordedOutputs` 可以包含额外历史运行，`acceptedOutputs` 只计算白名单中去重的已接受运行。底图任务不进入主 campaign 的 cases。

必须覆盖的回归场景：原创条目无 inspirationSources 仍能统计；旧来源条目仍可统计；未接受运行不计完成；跨候选/缺失运行不计通过；同候选多次回执不重复计数；映射冲突可诊断。

这是后续实施任务，本次仅定义其行为。不能通过向 original 配方添加虚假 X/Bilibili 来源来使旧统计通过。

## 10 首页与合集接入

### 10.1 首页配置

所有 12 项验收、导入和标注完成后，在 `content/site.yaml` 的 home.featured 中按第 3 节顺序新增 12 项。每项使用同一实际接入日期 D；D 不晚于本次构建使用的日期。现有旧条目原样保留。配置提交前核对已有未来排期，避免无意改变其他活动的优先级。

当前配置为所有语言共用。en 和 zh-Hans 将看到同一批新作品，介绍和按钮按界面语言显示，图片配字与 prompt 保持英文。若以后要求“仅英文首页使用这一组”，需要另立按 locale 配置的改动，本规格不隐含该能力。

首页一次只显示一张，Another frame 手动遍历；不新增定时切换。复制完整正文，不能只复制 320 字符摘录。详情里的底图与成图来自同一条真实运行。

### 10.2 合集

新合集 slug 为 `english-social-reactions`，英文标题为 **English Reactions and Social Images**，中文标题为 **英语表情与社交图片**。items 使用与首页相同的新案例顺序，coverAssetId 取 C01 的真实成图。中英 locales 需要有效 description、至少一个正文小节、published 状态和已审核翻译信息。

正文分为 reaction stickers 与 photo edits and shareable images 两段，解释哪些需要上传参考图、哪些可以直接使用纯文本。介绍使用实际已接受数量，不使用“最热门”“爆款”或不存在的效果统计。

合集条目在已有列表中可发现；如需首页更显著曝光，在既有 feed.interludes 中增加该合集入口，并保留原有条目。最终浏览器验收要确认首页或其后续浏览路径能到达合集；不能只创建未链接的孤立文件。

### 10.3 OG 与图片预览

站内图片按原比例完整显示，OG 派生图是 1200×630 裁切。分别检查 C01、C07、C08、C11 的 OG，必要时调整 focalPoint 后 refresh，优先保留脸部和主标题。不要求 OG 展示完整九宫格，也不把裁切 OG 用作首页封面。

## 11 实施阶段与命令

### 阶段 A 工具和输入预检

1. 保存当前工作区和首页配置基线；只操作本批文件及明确列出的生产工具补充。
2. 执行第 9 节的原创覆盖率兼容改动并通过针对性测试。
3. 检查 12 个 slug 未被占用，分类和 social-post 用途存在，所有 recipe 通过 schema，7 个模板渲染结果与对应任务 prompt 一致。
4. 检查 15 个任务定义、七个有输入的案例、C07 双输入顺序和每个标注短语。

完成条件：没有需再决定的输入槽位或配文；生产工具能如实统计原创案例。

### 阶段 B 底图和首批案例

先完成 R1/R2/R3，然后执行 C01/C02/C07/C08。每项走完生成、审核、导入和标注，检查手机首屏与详情输入关系。若参考身份或长英文表现不稳定，先解决这些代表案例，再扩展剩余八项。

以下命令从仓库根目录执行，是执行模板，不是已完成日志。R1 没有依赖，可以首先 plan：

```sh
npm run content:produce -- plan --campaign english-social-showcase-v1 --file production/english-social-showcase-v1/job-definitions/r1.json
npm run content:produce -- claim --campaign english-social-showcase-v1 --key ensoc-v1-r1-a01
```

把 claim 返回的 prompt 和按序参考文件交给生图工具，保存实际返回的本地文件。然后建立真实回执 JSON，字段为 outputPath、provider、model；model 无法确认时用 null。建立审核 JSON，字段为 accepted、notes、reviewer。回执和审核文件均在得到真实结果后创建。

```sh
npm run content:produce -- record --campaign english-social-showcase-v1 --key ensoc-v1-r1-a01 --file production/english-social-showcase-v1/references/r1/receipt-a01.json
npm run content:produce -- review --campaign english-social-showcase-v1 --key ensoc-v1-r1-a01 --file production/english-social-showcase-v1/references/r1/review-a01.json
```

R1 通过后按第 5 节复制 accepted 文件。底图只到 review，不执行 prepare/apply；它会在主案例导入时作为 reference 媒体进入内容库。

主案例 C01 在 R1 文件存在后执行：

```sh
npm run content:produce -- plan --campaign english-social-showcase-v1 --file production/english-social-showcase-v1/job-definitions/c01.json
npm run content:produce -- claim --campaign english-social-showcase-v1 --key ensoc-v1-c01-a01
```

实际生成后保存 receipt 和 review，审核通过再执行以下步骤。配方文案、alt、输入说明先按实图核对；运行 recipe-hash，使用返回的 contentHash、真实 reviewer 和 ISO 时间写入 editorialReview。写入 attestation 后再次核验 hash 不变。

```sh
npm run content:produce -- record --campaign english-social-showcase-v1 --key ensoc-v1-c01-a01 --file production/english-social-showcase-v1/reviews/c01-receipt-a01.json
npm run content:produce -- review --campaign english-social-showcase-v1 --key ensoc-v1-c01-a01 --file production/english-social-showcase-v1/reviews/c01-review-a01.json
npm run content:produce -- recipe-hash --file production/english-social-showcase-v1/recipes/c01.json
```

完成签审后 prepare。使用返回的 planHash 执行 apply，不能把下面的占位文字当成真实 hash：

```sh
npm run content:produce -- prepare --campaign english-social-showcase-v1 --key ensoc-v1-c01-a01 --file production/english-social-showcase-v1/recipes/c01.json
npm run content:produce -- apply --key ensoc-v1-c01-a01 --hash <prepare返回的planHash>
```

apply 后从回执回填 manifest/content-map 的实际 p/t/x/a ID；把真实 x_ID 加入 campaign 对应 acceptedExampleIds；量取并写入两个标注。按同样流程串行导入下一项。

如工具报错且没有图片，用 fail 命令记录真实 provider、message、requestId。若返回了图片但未达标，先 record，再以 accepted=false review；两者都使用新 key 重试。中断后先 status，running 任务先找回真实结果或失败，不自动重新 claim。

### 阶段 C 余下案例和整批接入

完成 C03—C06、C09—C12；核对 12 个案例的输入和产出映射；补齐三张参考媒体元数据；创建合集；按第 10 节更新首页。接入后完成生产模式构建与浏览器检查。

### 阶段 D 验证与交付

记录每条命令的实际结果，不把执行命令清单当作成功记录。验证失败时区分本批引入的问题与基线已有问题，修复本批阻塞后再交付。

```sh
npm run content:validate
npm run typecheck
npm run lint
npx vitest run scripts/lib/content-production/coverage.test.ts scripts/lib/content-production/production.test.ts scripts/lib/content-production/publish.test.ts src/modules/home/home.test.ts
BUILD_MODE=production npm run build
npx playwright test tests/e2e/home.http.spec.ts tests/e2e/home.browser.spec.ts tests/e2e/detail.browser.spec.ts tests/e2e/prompt-languages.browser.spec.ts
npm run content:produce -- status --campaign english-social-showcase-v1
```

端到端测试读取打包后的 dist，使用现有 nginx 配置启动，需本机 Docker/nginx 流程可用和对应浏览器已安装。不得以 next dev 的结果替代打包产物验收；环境无法运行时如实记录未完成项目。

新增的本批浏览器验证应基于 content-map/slug 解析 ID，不硬编码暂定 p_ID：

- 各公开语言首页按最终语言优先规则选择首图与轮换次序，同语言组内保留编辑顺序，完整循环包括保留的旧项；点击切换后焦点正确。
- C01 复制的是完整英文 prompt；C07 详情存在两个有序底图且身份槽位正确；C03 无参考图要求。
- C01 模板拒绝八项或十项 captions，九项能正确渲染；C11 修改姓名/年龄后复制值变化。优先复用既有模板行为测试，不为每个文案重复写同类测试。
- 1440×900 和 390×844 检查全部新项，尤其 C07/C11 的 4:5 比例；无横向溢出，图片与主要复制操作可访问，首图保持现有首屏标准。
- 中英介绍、图中英文、原文下载及示例图一致；合集入口可访问；检查四张指定 OG。

## 12 文件变更范围与恢复

预期实现变更为：本生产目录、12 个新 prompts、7 个新 templates、12 个新 examples、三张底图和 12 张成图的媒体及派生资产、一个新 collection、`content/site.yaml`、覆盖率实现和有意义的测试。若无需其他行为变更，不修改 React 组件、全站样式或 Next 配置。

首页接入前保存本批涉及的 home.featured/feed.interludes 内容快照和补丁。回退展示时仅撤回本批新增配置，保留新内容和历史记录用于修复；与其他任务的配置变更冲突时逐项合并，不整文件覆盖。

prepare/apply 使用现有事务日志。中断或冲突后核对 before hash、journal 和真实内容，不删除运行中的锁，不重置工作区。媒体文件按哈希不可变；未引用的新派生图只在确认无引用后另行清理，不删除共享底图。

部署使用项目既有部署流程，并区分本地导入、构建验证和线上发布三个状态。本规格完成不等于自动部署；需要部署时使用实际产物和现有会话授权继续。

## 13 完成定义

| 交付项   | 验收条件                                                                              |
| -------- | ------------------------------------------------------------------------------------- |
| 底图     | R1/R2/R3 各有真实原图、回执、审核、哈希、已导入资产 ID；可被依赖案例复用              |
| 成图     | 12 个不同案例各一张通过视觉和文字审核的成图，12/12 accepted                           |
| 内容     | 12 个 prompt、12 个默认 example、7 个模板、中英介绍及 alt 合法                        |
| 追溯     | 每个公开展示能追溯到 exact prompt、实际参考字节和 provider/model 记录                 |
| 标注     | 每项至少两个实图对应标注，共至少 24 个，坐标有效、短语原样匹配                        |
| 首页     | 前 12 个新项按指定顺序手动切换，保留旧项，首图和手机布局通过检查                      |
| 合集     | 12 项完整收录，已发布中英页面，存在可用入口                                           |
| 统计     | campaign 为 12 个主案例、12 个目标输出；实际接受数与 content-map 一致；三张底图不凑数 |
| 验证     | 内容验证、受影响测试、生产构建和指定浏览器检查均有真实记录                            |
| 交付记录 | manifest 回填真实结果；verification.json 记录命令、时间、退出状态、数量、截图和遗留项 |

verification.json 的计数必须从实际导入内容和回执计算，不能直接复制 manifest.targets。任一案例失败就保留失败状态和明确下一步；不可把“12 份配方已写好”报告成“12 个演示案例已迁入”。
