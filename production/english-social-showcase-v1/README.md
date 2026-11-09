# 英语社交案例实施交付

2026-11-09 已完成本地实施：**12 个 GPT Image 案例、3 张底图、7 个模板、24 个标注、1 个合集和 12 个首页新条目**。生产构建通过，尚未部署。

## 案例与正式内容

| 案例 | 内容 | Prompt | Template | Example | 成图 |
| --- | --- | --- | --- | --- | --- |
| C01 | Your Everyday Reactions | p_274 | t_069 | x_338 | a_457 |
| C02 | My Dog, My Mood | p_275 | t_070 | x_339 | a_459 |
| C03 | Office Cat, Off Duty | p_278 | t_071 | x_342 | a_464 |
| C04 | Social Battery: Low | p_279 | t_072 | x_343 | a_465 |
| C05 | Tiny Frog, Big Support | p_280 | t_073 | x_344 | a_466 |
| C06 | One More Game | p_281 | t_074 | x_345 | a_467 |
| C07 | Bestie Photo Booth | p_276 | — | x_340 | a_461 |
| C08 | The Daily Woof | p_277 | — | x_341 | a_463 |
| C09 | Me Making Plans | p_282 | — | x_346 | a_468 |
| C10 | Weekend Starter Pack | p_283 | — | x_347 | a_469 |
| C11 | Birthday Main Character | p_284 | t_075 | x_348 | a_470 |
| C12 | Five Minutes Home Alone | p_285 | — | x_349 | a_471 |

底图 R1 / R2 / R3 对应 a_458 / a_460 / a_462。原始 PNG 保存在 `references/`，正式媒体和派生图在 `public/media/a_NNN/`；`content/media/a_NNN.yaml` 记录原图及显示文件路径。底图按相同字节去重，C07 的输入顺序固定为 R1、R3。

合集为 `c_015`，slug 为 `english-social-reactions`。`c_014` 曾被另一批内容撤下，保留其历史编号，不复用。首页顺序为 C01、C02、C07、C08、C04、C10、C03、C05、C06、C09、C11、C12，然后继续原有八项。接入日期统一为 2026-11-09；合集同时加入既有列表入口。

## 文件入口

- [规格](../../docs/english-social-showcase-spec.md)：原始目标、验收标准和实施适配说明。
- [manifest.json](manifest.json)、[content-map.json](content-map.json)：真实内容 ID、底图依赖、哈希、尺寸和首页顺序。
- [verification.json](verification.json)：从正式内容和回执计算的数量、实际命令退出状态、截图、审查状态。
- `prompts/`、`job-definitions/`、`recipes/`：完整英文生成词、实际任务定义、经审核的导入配方。
- `reviews/`、`references/*/provenance.json`、`../applied/ensoc-v1-*.json`：生成审核、底图来源和正式导入回执。
- `annotations/`：按真实成图量取的24个区域；正式条目额外包含日语解释。
- `localization/ja.json`：本批日语文本及其107条审核记录；审核也已追加到项目的日语记录文件。
- `audit/screenshots/`：12项分别在1440×900和390×844的实际生产页面截图。
- `audit/site-before.yaml`、`audit/site.patch`：接入前配置与本批展示改动，供逐项恢复使用。

## 生成与审核

使用内置 `image_gen.imagegen`（GPT Image），共16次实际调用：15张验收图和1张未通过图。精确模型版本及 provider model ID 未由工具返回，保持未知。没有改写图中文字、拼接图片或用占位图代替结果。

C03 首次输出末尾出现双句点。失败原图和原因保存在 `audit/rejected/` 与对应 review；修正未发布模板中配文列表末尾的重复标点后，以新 key `ensoc-v1-c03-a02` 重生成并通过。C04—C06 在首次生成前采用同样的分行列举方式。C01/C02 已接受的正文及历史输出保持不变。

12张成图和3张底图均逐张检查身份、构图、文字与尺寸。24张首页截图已检查，手机主要配文可读，完整作品和复制按钮在首屏；英文、简体中文的浅色/深色主题均通过浏览器尺寸检查。C01、C07、C08、C11 的 OG 已查看，后三项调整焦点以保留人物或主标题。OG 遵循既有媒体流程，不放大不足1200像素宽的原图；它只用于链接预览。

当前项目已启用日语且要求完整翻译审核，所以为本批20个新内容页面及依赖字段补充了日语说明。图片文字与生成 prompt 在所有语言页面均保持英文。审核标明为 Codex AI 文本审核，不冒充人工审校。

## 验证结果

- 内容验证通过，无 error / publish error；原有维护警告不阻塞发布。
- 类型检查、lint、全库 Prettier 检查通过。
- 全量 Vitest：53个文件、418项通过，包含8项覆盖率测试。
- 本批浏览器检查：11项通过，覆盖两种视口、两种主题、中英顺序、完整复制、参考图顺序、模板编辑和合集入口。
- 既有首页/详情/语言及旧内容撤下回归：45项通过、1项跳过；跳过项为生产构建未启用阿拉伯语的 RTL 检查。
- `BUILD_MODE=production npm run build` 通过，产物位于 `dist/`，包含 en、zh-Hans、ja。浏览器使用该产物、项目 nginx 配置和本机 Chrome。
- Campaign：12/12主案例、12/12接受输出。底图不计入案例数。
- 代码审查：项目规范与规格两项审查均无发现，记录见 [audit/code-review.json](audit/code-review.json)。

首次 `npm run typecheck` 在沙箱中因 tsx 的本地 IPC socket 权限失败；改用等价的 `node --import tsx scripts/config-gen.ts` 与 `tsc --noEmit` 完成检查。生产构建与浏览器测试在获准的本机执行环境中完成。构建、导入和部署是独立状态；本次没有推送或部署。

## 后续维护

当前文件已经是正式内容，不要再次对同一 candidate 执行新建导入。新增输出使用新的 attempt key，并遵循现有 target append 流程。修改生成语义须建立模板新版本；日语字段说明的修订需更新对应指纹审核。

移除首页展示时，仅撤回 `audit/site.patch` 中的12个 featured 和1个 interlude 条目；保留内容与素材用于修复，避免删除被多个案例共用的底图。部署继续使用项目既有流程与已验证的构建产物。
