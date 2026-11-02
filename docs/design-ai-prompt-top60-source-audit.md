# Design AI Prompt Top 60：来源与复用审计

- 审计日期：2026-10-29（America/Los_Angeles）
- 审计对象：`<private-local-file>`
- 目的：判断 60 条案例能否在 Prompt Seen 中生成、记录并发布；判断外部 Prompt 和示例图能否直接复制。

## 结论

这份文件适合作为候选清单，不能原样作为已验证内容导入项目。

- **0/60 条可以不经改写、输入准备、生成和审核就直接发布。** 原文仍有占位符、模型/来源差异、参考图依赖或文字准确性风险；项目的发布契约还要求真实生成回执、媒体资产、中英文内容和许可记录。
- **58/60 条可以在现有“静态图片 Prompt/Template”管线中落地**，但要把占位符转成项目字段、准备参考图槽位、生成一张或多张自有样张，再通过媒体和内容校验。适用范围是第 01–14、17–60 条。
- **第 15、16 条是图生视频 Prompt，按本次接入决定移出当前站导入范围**。当前项目的媒体契约只接受 JPEG/PNG/WebP/AVIF，示例运行也只记录图片输出，因此这两条不生成展示图、不写入 Prompt/Template/Example/Media，也不加入合集；未来如新增视频资产、播放器、转码和验收契约，再单独评估。
- 第 21–26、30–40、53 条属于文字/信息图压力场景。可以生成图片，但不能把“中文清晰”“准确价格/活动/CTA”“精确标语”等要求当作模型保证；必须把文字准确性列为人工验收项，必要时改为后期排版示例。
- 第 28、37、41–48、49–52、55–56、58 条依赖一个或多个参考图。项目已经支持 `inputRequirements.slots`、有序 `referenceBindings` 和生成回执，但仍需准备并授权输入图；第 42 条的“第二轮旋转 180°”应记录为第二次运行或额外输出，不能假设一次调用自动提供可追溯的两步结果。

## 项目侧核对结果

Prompt Seen 当前是静态内容库：内容文件先写入 `content/`，生成工具在库外执行，结果通过 `content:produce` 的 plan → claim → record → review → prepare → apply 流程写入 `content/examples/` 和 `public/media/`。现有 schema 已覆盖：

- 字面 Prompt 和带 `{{fieldName}}` 的 Template；
- `none / optional / required` 参考图，以及多槽位、多图片顺序绑定；
- 生成提供方、模型未知值、参数、Prompt 哈希、输出图片哈希和人工审核；
- Prompt 来源/灵感来源与 CC BY 4.0 内容说明。

因此，接入这 58 条图片案例时应采用“独立改写 + 自有样张”的方式，而不是把外部示例图或未经核实的原 Prompt 当成本站生成记录。原文件里的 `[PRODUCT]`、`[城市]`、`{WORD}` 等写法要转换成项目模板字段，例如 `{{product}}`、`{{city}}`、`{{word}}`，并在 `fields.yaml` 写入类型、默认值、限制和本地化标签。每个已发布案例还需要 `entry.yaml`、中英文 locale、`prompt.txt` 或模板版本、媒体元数据、运行记录和来源/许可说明。

## 60 条的落地分组

| 案例 | 项目处理 | 主要前置条件 |
| --- | --- | --- |
| 01–14 | 可做图片 Template；01、17–20 的产品广告也可做字面/模板混合案例 | 产品字段、品牌/标签约束；产品参考图优先作为槽位；标签和比例人工复核 |
| 15–16 | 移出本批导入范围 | 图生视频模型和视频资产管线；仅保留在审计排除记录中 |
| 17–20 | 可做图片 Template/Prompt | 使用虚构或自有品牌；避免把外部样图当作本站资产 |
| 21–27 | 可做图片 Template | 中文标题/短文案的字段化；文字准确性和商标检查；27 需固定故事字段 |
| 28 | 可做参考图编辑案例 | 用户自有或获授权的地图截图；地图版权、地名和标识检查 |
| 29 | 可做图片 Template | 年龄/场景字段；打印尺寸、纯黑白和右下角色稿人工检查 |
| 30–40 | 可做图片 Template/实验案例 | 先把事实、价格、CTA、人物关系和中文标签作为已核对输入；生成后逐字检查 |
| 41–48 | 可做多参考图编辑案例 | 草图/平面图/材质/家具/室内图的槽位和授权；保留几何、透视等要求作为审核清单 |
| 49–52 | 可做参考图资产概念案例 | 角色/物体参考图；保持身份和轮廓；不得暗示已经具备可制造的 3D 工程数据 |
| 53–54 | 可做图片 Template/概念样机 | Emoji、标题和短标语字段；文字、产品结构和功能不能视为生产规格 |
| 55–56 | 可做参考图资产概念案例 | 主体参考图；生产用途需另行确认厚度、挂孔、线条和颜色可制造性 |
| 57–60 | 可做图片 Template/概念案例 | 57、58 需要像素/体素风格检查；60 的学校/组织名称、校徽和视觉资产需品牌授权 |

原文件标注的证据等级为 A 45 条、C 15 条、B 0 条。这个等级说明文件收集了示例/来源的程度，不能替代本站自己的生成验收，也不自动授予示例图、商标、人物肖像或输入图片的复用权。

## 一手来源与许可核查

### JeremyGDM 产品摄影仓库（第 01–20）

[仓库 README](https://github.com/JeremyGDM/awesome-ai-product-photography-prompts) 明确把内容描述为可复制的产品摄影模板，要求替换方括号字段、在支持时上传产品参考图、只使用有权使用的源照片，并在发布前检查标签、比例、材质和宣传 claims。仓库的 [LICENSE](https://raw.githubusercontent.com/JeremyGDM/awesome-ai-product-photography-prompts/master/LICENSE) 是 CC0 1.0，因此模板文本可按 CC0 方向复用；但 CC0 本身不清除商标、肖像、隐私或第三方输入图权利。仓库中的示例品牌、标签和外部来源图片仍应视为需要单独核查的素材。

[Pixonara 产品 Prompt 页面](https://pixonara.com/prompts/ai-product-photo-prompts) 将产品参考图作为输入，并要求在发布前检查产品 fidelity、可读标签和 claims；页面没有给出一个可以替代逐例核查的总许可声明。Pixonara 的 [图生视频页面](https://pixonara.com/prompts/image-to-video-prompts) 说明这类 Prompt 的输入是参考图，输出控制的是运动、摄像机、氛围和节奏，和本项目的静态图片资产不是同一数据类型。

### jamez-bondos GPT-4o Images（第 21、23–29、49–60）

仓库 [README](https://github.com/jamez-bondos/awesome-gpt4o-images/blob/main/README_en.md) 标明案例图由项目整理/生成，且每个案例会列出原作者或来源。仓库 [LICENSE](https://raw.githubusercontent.com/jamez-bondos/awesome-gpt4o-images/main/LICENSE) 的 NOTICE 规定：除 `/gpt-image-1/NOTICE-openai.md` 和显式提供覆盖许可的案例目录外，仓库原创内容由 Jamez Bondos 以 CC BY 4.0 发布。这个声明不等于所有 X/Sora 原作者的 Prompt、人物、品牌或外部图片都由仓库作者重新授权。接入时应保存原作者与原始链接，优先采用独立改写 Prompt 和本站自生成样张，不直接复制外部案例图。

### ZeroLu GPT Image（第 30–40）

仓库 [README](https://github.com/ZeroLu/awesome-gpt-image/blob/main/README.md) 将内容描述为来自 X 和社区的精选案例，并在末尾称项目按 CC BY 4.0 发布；同一仓库的当前 [LICENSE](https://raw.githubusercontent.com/ZeroLu/awesome-gpt-image/main/LICENSE) 文件却是 MIT。README 还说明“内容来自互联网”，并提供侵权下架渠道。这是仓库级许可信息不一致的信号，不能据此安全地把原图或原文直接复制到 Prompt Seen。建议只引用原始链接、把 Prompt 作为独立改写候选，并在上游明确许可或逐例取得许可后再导入外部资产。

### qzh3722 空间设计仓库（第 41–48）

[README](https://github.com/qzh3722/awesome-nano-banana-spatial-design/blob/main/README.md) 说明这些 Prompt 是可修改、组合和适配的工作流参考，并声明案例图片仅用于教育/研究，输入图来自公开建筑图或专门制作的演示图；仓库 [LICENSE](https://raw.githubusercontent.com/qzh3722/awesome-nano-banana-spatial-design/main/LICENSE) 是 CC BY 4.0。许可证允许分享和改编，但其 NOTICE 同时提醒肖像、隐私、道德权利等其他权利可能仍限制使用。因此可以按 CC BY 归属要求改写 Prompt，不能无条件复制公开建筑图、家具图或仓库案例图作为本站媒体。

## 建议的接入门槛

1. 先将 58 条图片案例拆为候选 Template/Prompt，补齐字段、参考图槽位、分类和中英文说明；第 15–16 条不进入本批导入，仅保留在审计排除记录中。
2. 为每条准备原创或有明确许可的参考素材，尤其是 28、37、41–48、49–52、55–56、58。不要下载外部示例图充当本站生成结果。
3. 用同一份最终 Prompt 生成本站样张，保存实际提交文本、输入顺序、输出哈希和提供方/模型信息；工具未返回的模型 ID 保持未知。
4. 对文字、商标、事实、人物身份、产品比例和建筑几何逐项人工审查；未通过的结果保持 draft，不加入已发布合集。
5. 对 CC BY 来源记录作者、来源 URL、许可证 URL 和“独立改写”说明；对许可冲突或无明确单项许可的来源，保留链接与研究注释，但不复制原图。

## 审计范围限制

本审计核对了来源仓库/页面的可访问性、仓库级许可声明和项目数据契约，没有替每张外部图片、每个商标、人物肖像或用户输入图做权利清除，也没有把 60 条全部实际生成一遍。是否达到“已验证案例”仍以本站生成、视觉验收、内容校验和逐例许可记录为准。
