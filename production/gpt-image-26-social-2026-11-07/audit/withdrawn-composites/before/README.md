# GPT Image 社交案例实施记录

执行更新：2026-11-08。**已交付 38 个成品：11 个原词静态实测、26 个合成 GIF 改编、1 个自拍工作流改编，覆盖 30/34 个来源主题。** 原词严格成功数是 11/34，不能将改编数计入原生 GIF 或逐字原词成功。本批未提交、未部署。

- [计划与原始验收目标](../../docs/gpt-image-26-social-import-plan.md)
- [原词内容映射与全部重试](content-map.json)、[改编内容映射](adaptations/content-map.json)
- [覆盖率](audit/coverage.json)、[验证结果](verification.json)
- [原词完整性检查](audit/import-integrity.json)、[动画合成与导入检查](audit/adaptation-integrity.json)

## 本轮重试与补齐

S07 原词重试成功，导入 p_246 / x_310 / a_414。S01、S04、S11、S14 再次在输出审核阶段被工具拒绝，保留原词、两轮任务状态及真实错误 request ID；未改写提示词绕过。G13 原词重试仍返回单帧 PNG，拒绝作为原生 GIF 发布。

按计划的独立改编支路制作 26 张动作精灵图，逐格裁切并编码为 26 个真实多帧 GIF，保留每帧时长、循环方式、原始精灵图和实际 GIF 首帧封面。G11 的四种情绪是四次独立调用，共享来源原词和参考角色。W01 使用本地名称到文件映射，直接上传 R14，仅调用一次生图；日语消息由助手另写，单独存为 [message-ja.txt](adaptations/w01/message-ja.txt)。时间上下文、参数和映射见 [workflow.json](adaptations/w01/workflow.json)，没有创建定时任务或声称调用服务端参考图注册。

19 组、22 张参考图均已生成，含 R01 标注版、R08 侧视图和 R09 动作表。底图、实际生成词和回执保存在 `references/`。全部素材已进入项目目录，不依赖默认生图临时路径。

## 内容与来源

原词合集 **c_013**：`gpt-image-26-social-original-prompts`，11 项；按原 X 帖点赞快照排序。

改编合集 **c_014**：`gpt-image-social-animation-adaptations`，27 项；关联 G03 三海报、G06 四资产、G11 四情绪，并与原词合集互链。

冻结的 [39 条完整原词](sources/manifest-v3.json) 未改动。英语、日语、中文与土耳其语实际提交词在中英文页面保持一致，不创建 Prompt 译文。土耳其语注册但不启用站点路由。原 p_221、p_228、p_232 保持不变。

所有调用使用内置 `image_gen.imagegen`，已确认模型家族 GPT Image，精确模型 ID 未返回，保持 `null`。来源帖的 Image 2.6 声明与本次生成事实分别记录。原词署名属于来源作者，改编署名为 Prompt Seen 并关联原作者；来源未声明的许可保持 `null`。首轮 10 条署名修正见 [attribution-corrections.json](audit/attribution-corrections.json)，未改写历史发布审核。

X 点赞属于整篇来源帖，同帖变体共享统计对象；G18 的 204 分是 Reddit 搜索索引快照，并非实时点赞，不混入 X 排行。[136 条来源台账](source-ledger.json) 保留 34 条实施来源、15 条原词证据和 87 条待核实线索；后者不自动转为内容卡。

## 结果与实际限制

- S06 下方小图为模型重绘，非逐像素粘贴；S09 画面日期不代表生成时间；S13 缺失右瞳孔来自原词要求。
- G03 的 3 个海报逐格裁为 3:4，存在景物重绘；斗兽场在循环边界有明显复位。G06 的旋转是绘制视角，不是真实 3D 模型或精确等角转台。
- G04 为 10 帧 / 5 秒 / 播放一次，镜头倾斜和空间几何是近似关键帧。
- G05 为 **171×304、16 帧、10 秒、播放一次的静音分镜**，非原目标的 30fps 带音乐视频。原尺寸保留，不通过放大冒充更高细节。
- G09 循环缺少捡球过渡。G10 真实透明、字牌正确，但脸部仍有轻微重绘差异，未逐像素锁定。
- G12 用原创剑士替代炭治郎。G14 仅采用 12 格中的前 8 格，帽子落下后停帧，不宣称无缝循环。G18 最终闭眼并停帧。
- G16 没有 low/high/max 等级或成本对比；G17 未添加原帖后配音乐。各页记录具体动画抖动、复位和画面限制。

26 个 GIF 的完整参数见 [adaptation-integrity.json](audit/adaptation-integrity.json)；每个 `adaptations/<unit>/output-encoding.json` 保存原图哈希、裁切坐标、逐帧哈希、时长和循环设置。

## 导入索引

| 案例／变体 | Prompt | Example | 类型 |
| --- | --- | --- | --- |
| S02 | p_236 | x_300 | 原词静态 |
| S03 | p_238 | x_302 | 原词静态 |
| S05 | p_237 | x_301 | 原词静态 |
| S06 | p_239 | x_303 | 原词静态 |
| S07 | p_246 | x_310 | 原词静态 |
| S08 | p_240 | x_304 | 原词静态 |
| S09 | p_241 | x_305 | 原词静态 |
| S10 | p_242 | x_306 | 原词静态 |
| S12 | p_244 | x_308 | 原词静态 |
| S13 | p_243 | x_307 | 原词静态 |
| S15 | p_245 | x_309 | 原词静态 |
| G01 | p_247 | x_311 | 合成 GIF |
| G02 | p_248 | x_312 | 合成 GIF |
| G03-golden-gate | p_249 | x_313 | 合成 GIF |
| G03-colosseum | p_250 | x_314 | 合成 GIF |
| G03-fuji | p_251 | x_315 | 合成 GIF |
| G04 | p_252 | x_316 | 合成 GIF |
| G05 | p_253 | x_317 | 合成 GIF |
| G06-dwarf | p_254 | x_318 | 合成 GIF |
| G06-sword | p_255 | x_319 | 合成 GIF |
| G06-motorbike | p_256 | x_320 | 合成 GIF |
| G06-cat | p_257 | x_321 | 合成 GIF |
| G07 | p_258 | x_322 | 合成 GIF |
| G08 | p_259 | x_323 | 合成 GIF |
| G09 | p_260 | x_324 | 合成 GIF |
| G10 | p_261 | x_325 | 合成 GIF |
| G11-joy | p_262 | x_326 | 合成 GIF |
| G11-anger | p_263 | x_327 | 合成 GIF |
| G11-sorrow | p_264 | x_328 | 合成 GIF |
| G11-delight | p_265 | x_329 | 合成 GIF |
| G12 | p_266 | x_330 | 合成 GIF |
| G13 | p_267 | x_331 | 合成 GIF |
| G14 | p_268 | x_332 | 合成 GIF |
| G15 | p_269 | x_333 | 合成 GIF |
| G16 | p_270 | x_334 | 合成 GIF |
| G17 | p_271 | x_335 | 合成 GIF |
| G18 | p_272 | x_336 | 合成 GIF |
| W01 | p_273 | x_337 | 工作流改编 |

对应全部媒体 ID、参考槽位及原件路径见两份内容映射。所有条目沿用 plan → claim → record → review → prepare → apply 流程，顺序分配 ID。

## 实现与验证

新增参数化 [GIF 合成器](compose-gif.mjs)，支持任意网格、选用帧数、不同停留时间、播放一次、透明度、格边裁切与精确画幅裁切，不插帧。3 项合成测试覆盖 10 帧顺序、逐帧时长、透明度、首帧封面、选帧、错误设置及拒绝静态重复帧。

媒体导入允许最小 160×160 的多帧 GIF，保留原分辨率；静态图片仍要求至少 320×200。测试确认低分辨率 GIF 不被放大，播放一次设置在派生 WebP 中保留。原有大小、帧数和解码像素上限仍生效。

内容校验 0 错误、0 发布错误，12 条既有翻译警告；类型检查和 lint 通过。69 项相关单元测试、3 项合成测试、26 项 Chrome 浏览器检查通过。预览构建 1489 页；在 1440px 与 390px 检查日语/土耳其语正文、复制、Markdown 导出、真实动画变化、单次播放停帧、透明度及合集变体链接。原文件及站点派生图均核对帧数、时间和循环，首帧封面与 GIF 解码首帧一致。

截图见 [round2-screenshots](audit/round2-screenshots/)，首轮结果快照见 [round1](audit/round1/)。本地浏览器只运行 Chrome，未运行 Firefox/WebKit，未部署。

## 复核与续作

以下命令只核对档案与已有内容，不触发生图：

```sh
python3 production/gpt-image-26-social-2026-11-07/reconcile.py
node production/gpt-image-26-social-2026-11-07/verify-import.mjs
node production/gpt-image-26-social-2026-11-07/verify-adaptations.mjs
node --test production/gpt-image-26-social-2026-11-07/compose-gif.test.mjs
```

`campaign.json` 的 11/42 仅统计严格原词目标；`adaptations/campaign.json` 单列 27 项改编，不混算。合成器拒绝覆盖已有 GIF，新的提示词或重试使用新 key。`publish-adaptations.mjs` 跳过已应用任务。四个拒绝案例需改变外部条件后再另行处理；保留阻塞事实，不继续重复调用。
