# 官方与社交案例生成批次

本批次包含 27 个案例：15 张静态成品、12 个 GIF。实际生成通道是内置 GPT Image 工具。2026-11-05，项目所有者补充本批次使用 GPT Image 2.6，站点案例和运行记录的 `model.displayName` 已据此更新。工具未返回精确 API 模型 ID，`providerModelId` 仍为 `null`；原始生成回执保留。更正记录见 `../model-version-annotation-2026-11-05.json`。

## 素材与制作

生成了 7 张计划内原创底图。另保留首次小猴子请求返回的静态 PNG，作为该动画的原创角色参考。官方与社交作者参考原图均未用于生产输入。

内置工具对直接 GIF 请求返回了单帧 PNG，失败尝试 `image26-g01-v1` 保留在任务记录中。随后 12 个动画均采用生成六帧精灵图、逐格裁切、编码 GIF 的路线，512×512 像素、六帧、每帧 300 毫秒、每轮 1.8 秒、无限循环。未补间；细微背景漂移和动作不连续之处写入了各案例的观察结果。

## 文件

- `content-map.json`：案例与项目 prompt、example、media ID 对应关系。
- `campaign.json`：27 个案例的接受覆盖目标及已接受的 example ID。
- `recipes/`：实际导入的中英文文案、真实提示词、来源和审核记录。
- `recipes-draft/`：保留的制作草稿，不应直接发布。
- `audit/`：每个正式案例的生成定义、输入输出哈希与视觉审核记录。
- `prompts/`、`job-definitions/`：本次提交的实际提示词与参考顺序。
- `generation/manifest.json`：生成通道、任务状态及依赖。
- `generation/animation-audit/`：12 个 GIF 的帧图和成品哈希、裁切方式、帧数与时长。
- `generation/compose-gif.mjs`：从六格帧图复现 GIF 的工具，调用方式 `node production/gpt-image-26-2026-11/generation/compose-gif.mjs G01 /absolute/path/to/sheet.png`。
- `generation/ready-stills.jsonl`：较早准备的 API 请求方案，未执行；其中 model 字段是计划值，不是本次实际生成证明。

原创输出、底图、帧图及验收预览保存在 `output/imagegen/gpt-image-26-2026-11/`。项目正式素材通过现有内容生产流程导入 `content/` 与 `public/media/`；生成记录没有删除或覆盖原工具输出。

## 导入与验证

使用现有 `content:produce` 的 plan、claim、record、review、prepare、apply 流程。为正确记录中文提示词和直接来源原文，发布配方增加可选的 `promptLanguage` 与 `promptProvenance`，旧配方默认行为不变。

静态图逐张视觉检查；12 个 GIF 的帧数、时长、无限循环标记经程序核验，并在本机浏览器中检查展示和姿态变化。最终项目验证结果见 `verification.json`。

本批次只导入本地项目，不自动部署线上站点。社交指标沿用 2026-11-04 的来源帖快照，不能当成本次新生成案例的互动数。

## 公开记录的路径约定

共享记录中的仓库文件路径相对于仓库根目录；`[local-generation-output]/` 表示已移除的本机工具输出位置，不是可直接读取的文件路径。原始回执保存在未纳入 Git 的本地档案中。路径脱敏不改变提示词、输入输出字节、媒体哈希或已记录的审核结果。
