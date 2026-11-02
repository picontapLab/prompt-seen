# Design AI Prompt Top 60：完整接入实施方案

- 状态：方案阶段，尚未生成新图，尚未修改 `content/`
- 输入：`/Users/hp/Downloads/design_ai_prompt_top60.md`
- 目标：将 58 条图片案例按 Prompt Seen 的内容契约导入，使用 GPT Image 生成每条展示图，完成生成审核、内容审核和静态站验收后发布。

## 1. 交付边界

最终交付 58 个可访问的图片 Prompt 条目、每条至少 1 个 GPT Image 展示结果、完整的输入/来源/模型/审核记录，以及一个总合集和四个主题合集。

第 15、16 条原始案例是图生视频 Prompt。按当前站点能力和本次接入决定，它们从导入范围中移除：不生成展示图、不创建 Prompt/Template/Example/Media、不加入合集。它们仅保留在审计文档中作为排除项，未来站点具备视频资产契约后再单独评估。

不复制外部案例图作为本站媒体。外部 Prompt 只作为独立改写的灵感来源，本站展示图全部由 GPT Image 重新生成；参考图只使用 Prompt Seen 已有的合成素材、新生成的合成素材或明确授权的输入。

## 2. 内容分类与展示方式

### A. 产品摄影与商业广告（01–14、17–20）

| 案例 | 项目类型 | 展示方式 | 默认画幅 |
| --- | --- | --- | --- |
| 01–14 | 图片 Template；03、06 可带产品参考槽位 | 单图 Hero + 参数字段 + 产品保真审核提示 | 1:1、4:5 或 16:9，按案例设定 |
| 17–20 | 图片 Prompt/Template | 单图 Hero + 商业用途说明 + 标签/品牌后期提示 | 4:5 或 16:9 |

### B. 海报、字体与信息设计（21–40）

| 案例 | 项目类型 | 展示方式 | 默认画幅 |
| --- | --- | --- | --- |
| 21–27 | 图片 Template | 大图优先；字段区显示主题、标题或文案；文字验收提示 | 2:3、3:4 或 9:16 |
| 28 | 参考图编辑 Prompt | 输入图/输出图左右对照，显示地图槽位 | 3:4 |
| 29 | 图片 Template | 大图 + 打印规格和黑白检查清单 | 8.5:11 近似比例 |
| 30–40 | 图片 Template/实验案例 | 大图 + “文字/事实需人工核对” Callout；信息密集图优先完整详情页 | 3:4、9:16 或自定义 |

### C. 建筑、室内与空间编辑（41–48）

| 案例 | 项目类型 | 展示方式 | 默认画幅 |
| --- | --- | --- | --- |
| 41、42、45–48 | 单参考图编辑 Prompt | 输入图/输出图左右对照；显示空间保持规则 | 4:3、3:2 或 16:9 |
| 43、44 | 多参考图编辑 Prompt | 按槽位显示“材质/家具参考”和“目标场景”，输出在右侧 | 4:3 或 16:9 |
| 42 | 两步编辑案例 | 运行记录中保存第一轮轴测图和第二轮反向视角；页面默认展示最终视角并链接第一轮 | 4:3 |

### D. 3D 资产、图标与吉祥物（49–60）

| 案例 | 项目类型 | 展示方式 | 默认画幅 |
| --- | --- | --- | --- |
| 49–52、55–56、58 | 参考图资产概念 Prompt | 输入图/输出图对照 + “概念图，不是工程文件”提示 | 1:1、3:4 或 4:5 |
| 53–54、57、59–60 | 图片 Template/概念样机 | 单图 Hero + 参数字段 + 生产/品牌权利提示 | 1:1、3:4 或 4:5 |

项目字段中的 `promptSource.type` 规则如下：有清晰变量且值得复用的案例使用 Template；固定构图或复杂多步骤案例使用 literal Prompt；有输入图的案例通过 `inputRequirements.slots` 描述图片角色，不把图片路径塞入 Template 字段。

## 3. 数据与目录设计

新增一个批次目录：

```text
production/design-ai-top60-2026-10/
├── manifest.json                 # 58 条的稳定映射和分类
├── recipes/r01.json … r58.json   # content:produce 的完整 recipe
├── references/                   # 本批新增的合成/授权参考图
├── outputs/                     # GPT Image 原始输出
├── reviews/                     # generation/display/editorial review
├── content-map.json              # candidate → prompt/template/example/media
└── README.md                    # 批次说明、许可证和复现方式
```

每条案例的 `manifest.json` 字段：

```json
{
  "candidateId": "design-top60-01",
  "rank": 1,
  "sourceCode": "BP01",
  "slug": "minimal-studio-product-hero",
  "family": "product",
  "entryKind": "template",
  "displayMode": "hero-image",
  "categoryId": "product",
  "styleIds": ["minimal"],
  "useCaseIds": ["packaging"],
  "targetAspectRatio": "1:1",
  "referenceSlots": [],
  "sourceUrl": "https://…",
  "sourcePromptStatus": "independently adapted"
}
```

### 字段转换

原文件中的 `[PRODUCT]`、`[城市]`、`{WORD}` 等写法全部转换成项目 Template 的 `{{fieldName}}`；字段名使用 camelCase，例如 `product`, `background`, `city`, `country`, `headline`, `cta`, `scene`, `topic`。每个字段在 `fields.yaml` 中必须有：类型、是否必填、默认值、长度/数量限制、英文和简体中文标签。

### 参考图槽位

多图案例按角色冻结顺序：

- 28：`map`
- 37：`document`
- 41、45、46、47、48：`scene`
- 42：`floorPlan`
- 43：`materialSample`, `targetScene`
- 44：`furniture`, `targetScene`
- 49–52：`subject`
- 55–56：`subject`
- 58：`styleReference`, `targetIcon`

每次运行用 `referenceBindings` 绑定每张图的槽位。优先复用项目已有合成参考素材；缺少的素材先单独生成并审查，再进入案例生成。

### Taxonomy

先复用现有 `product`、`poster`、`illustration`、`architecture`、`food`、`packaging`、`editorial`、`social-post` 等词，避免为单条案例创建孤立主题。批次完成后补充至少三条案例会使用的新词：`infographic`、`typography`、`asset-concept`、`interior-visualization`。每个新增词必须同时补齐 en/zh-Hans 标签和主题页文案，否则只保留为搜索别名。

## 4. GPT Image 生成流程

严格沿用现有增量生产流程，不直接把图片复制进 `public/media/`：

1. **Plan**：读取 `manifest.json` 和 recipe，检查 slug、taxonomy、字段、槽位、画幅和参考文件哈希。
2. **Claim**：冻结最终 Prompt、字段值、有序参考图和目标画幅。
3. **Generate**：用 GPT Image 生成输出。记录 provider `OpenAI`、displayName `GPT Image`；工具没有返回的精确 provider model ID 保持 `null`。
4. **Record**：把原始输出、输出哈希和实际生成时间写入 job receipt。
5. **Generation review**：逐条审查主体、数量、构图、参考关系、文字、品牌/商标、异常物体和缩略图可读性。
6. **Display review**：通过 `media:import` 生成 thumbnail/card/detail/og，检查裁切、焦点、移动端比例和媒体元数据。
7. **Editorial review**：检查英文源文案、简体中文译文、字段说明、alt、来源链接、许可证和“概念图/静态预览”提示。
8. **Prepare / Apply**：只对三种审核都通过的条目执行 `prepare` 和 `apply`；失败条目保留 `needs_attention`，不得进入发布合集。

### 批次安排

按风险分四批，每批完成后先构建和验收，再进入下一批：

| 批次 | 范围 | 数量 | 重点 |
| --- | --- | ---: | --- |
| B1 | 01–14、17–20 | 18 | 产品与商业广告 |
| B2 | 21–40 | 20 | 海报、中文文字、信息图和地图编辑 |
| B3 | 41–48 | 8 | 多参考图、空间几何、两步运行 |
| B4 | 49–60 | 12 | 角色、玩偶、徽章、像素、Voxel、吉祥物 |

每条默认最多 3 次生成尝试。失败重试只允许修改 recipe 后生成新的 job key，保留原失败记录。

## 5. 审核门槛

### 生成审核

- 主体数量和身份符合 Prompt。
- 参考图角色、顺序和保留区域正确。
- 画幅、主体位置、负空间和层次符合展示方式。
- 文字案例逐字检查；价格、CTA、事实、中文标签不能只凭模型“看起来正确”。
- 不出现未授权真实 Logo、校徽、人物或可识别第三方品牌。
- 概念资产明确不是工程图、制造规格或医疗/健康建议。

### 内容审核

- `prompt.txt` 或 Template 渲染结果与 job 中的实际 Prompt 完全一致。
- `entry.yaml`、Template 版本、fields、inputs、example run 和媒体 ID 互相一致。
- en/zh-Hans locale 均为 published，并有描述、使用方法、实测说明和本地化 alt。
- 来源记录标为独立改写；外部原图不进入本站媒体。
- `content:validate` 无 error、无 publish error。

### 视觉审核

- 桌面详情页主图完整，移动端无横向溢出。
- 卡片缩略图仍能识别主体；信息图文字不能缩到不可读。
- 参考图案例首屏能看出输入与输出关系。
- OG 图裁切不切掉主体或关键标题。

## 6. 合集与入口

新增 1 个总合集和 4 个主题合集：

- `design-ai-prompt-top-60`
- `design-ai-product-commercial`
- `design-ai-poster-information`
- `design-ai-spatial-design`
- `design-ai-asset-concepts`

合集只收录已通过三重审核的 Prompt，不把 Template 重复计数。所有 58 条通过后再把总合集标为完整；批次中间状态只显示实际已发布数量。首页 featured 和 feed showcase 只放 B1/B2 中已通过的条目，B4 完成后再切换为总合集主视觉。

## 7. 验收与回滚

每个批次完成后运行：

```sh
node --import tsx scripts/content-validate.ts
node --import tsx scripts/content-build.ts
npm test
npm run typecheck
npm run build
npm run test:e2e
```

此外检查：

- 58 个 Prompt、实际 Template 数量、58 个 showcase example、所有引用媒体均可追溯。
- `content-map.json` 的 candidate、Prompt、Template、Example、Media 数量一致。
- 生成失败、审核拒绝和重试记录没有被覆盖。
- 静态导出中每个新增 Prompt、Template、合集和 Markdown 页面均可访问。

应用使用现有 transaction journal。若某批次应用中断，按 journal 恢复或回滚；不回滚其他工作区改动。发布前只提交已验收批次，外部部署继续沿用当前静态构建和发布流程。

## 8. 实施顺序

1. 固化 `manifest.json`、字段映射、分类、画幅、参考槽位和来源记录。
2. 补齐必要 taxonomy 和四个主题合集的文案模板。
3. 准备并审核缺失的合成参考图。
4. 逐批生成 GPT Image 展示图，完成 generation/display/editorial review。
5. 通过 `content:produce` 写入 Prompt、Template、Example、Media 和 `production/applied/`。
6. 构建静态站、跑测试和浏览器验收，修正失败案例后重新生成。
7. 58 条全部通过后更新总合集、首页和 feed，生成最终 `content-map.json`。

本方案完成前不开始批量生成，不直接修改 `content/`，也不把外部示例图作为展示资产。



## 2026-10-30 实施与纠错结果

本计划已落实为 58 个静态案例、33 个案例模板和 1 个反向视角模板、59 个有效生成运行及五个中英文合集。旧的 6 张主题占位图和虚假运行记录已退出活动内容。分类采用项目现有 taxonomy；展示采用现有详情大图、参考图画廊、运行切换和模板编辑器，无新增前端展示组件。逐条实际映射以 `production/design-ai-top60-2026-10/manifest.json` 为准；不再使用初期空值清单。验收与模型局限见 [视觉与交互复核](design-ai-top60-visual-qa.md)。
