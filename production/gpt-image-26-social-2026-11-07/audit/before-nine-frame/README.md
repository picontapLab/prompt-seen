# GPT Image 社交案例实施记录

执行更新：2026-11-08。**用户已明确要求不要合成 GIF。已撤下 26 个合成条目，当前保留 11 个作者原词静态实测与 1 个自拍工作流改编，共 12 个成品；本批原生 GIF 验收成功数为 0。** 未提交、未部署。

本次更正取代上一轮的“38 个成品”统计。之前的合成精灵图、GIF、审核和导入回执仅作为历史档案保留，不属于当前交付。

- [完整目标与当前约束](../../docs/gpt-image-26-social-import-plan.md)
- [原词内容映射](content-map.json)、[改编映射及撤回状态](adaptations/content-map.json)
- [覆盖率](audit/coverage.json)、[当前验证结果](verification.json)
- [撤回清单与文件哈希](audit/withdrawn-composites/withdrawal.json)

## 原生 GIF 再验证

### 2026-11-09 新增三次尝试

G13 原词第三次、G16 原词第二次、G18 明确要求可下载多帧 GIF 的独立格式测试，三次均返回 PNG、1 帧，无动画时长或循环信息。G16 返回带时间标记的静态分镜，其余为单张人物画面。本轮未合成、未发布，没有恢复已撤下的内容；当前仍为 12 个保留成品、0 个验收通过的原生 GIF。

完整提交词、实际原件与文件检查见[本轮报告](audit/native-gif-retry-2026-11-09.json)。这里只描述本次工具返回，官方原生 GIF 能力及此前接口核查保持下述记录。


### 最新版与接口核查（2026-11-08）

[OpenAI 官方文档](https://developers.openai.com/api/docs/guides/image-generation#generate-animated-gif-output)确认 **GPT Image 2.6 Sunburst / Flare 支持原生动画 GIF**，通过 Image API 的 `output_format: "gif"` 请求。当前会话只暴露一个 `image_gen.imagegen` 工具，没有 `model`、`output_format` 或版本切换参数，无法确认其底层模型。

按用户要求再次执行 [G17 v2](jobs/g17-direct-gif-v2/audit.json)，在提示词中指定 2.6 Sunburst、原生 GIF、9 帧与 200 ms，实际仍返回 **单帧 PNG 九格分镜**。提示词中的模型名不代表已切换版本。本次未合成、未导入；官方能力与本会话接口限制分开记录于[核查结果](audit/official-gif-capability.json)。

已准备[正式 API 请求草稿](prepared-api/g17-native-gif.request.json)，保留 G17 原词，**尚未提交**。当前进程没有 API 密钥，随附 CLI 也未支持 GIF；需要可调用原生 GIF 的接口才能继续完成剩余 26 个目标。

### 先前实测

本轮按用户更正，使用内置 `image_gen.imagegen`，对 G13 追加明确的日语输出要求：直接返回可播放、多帧的 `.gif`；不输出静态 PNG、分镜或精灵图，不进行本地合成。输入仍为 R15 角色图。

实际返回 **PNG，1 帧**。已按真实文件格式拒绝作为 GIF 成品，未转码、未合成，也未导入页面。本次结果说明当前会话的实际返回，不推断所有 GPT Image 接口都无法生成 GIF。

- [本次实际提交文本](jobs/g13-direct-gif-v1/prompt.txt)
- [文件格式、帧数与审核](jobs/g13-direct-gif-v1/audit.json)
- [返回的 PNG 原件](audit/jobs/gpt26-social-g13-direct-gif-v1/returned.png)
- [所有原生 GIF 能力验证记录](audit/capability.json)

再次按用户要求检查工具后，新增 G17 纯文字直出 GIF 请求，未传入参考图。完整返回结构只有 `image_url` 和 `output_hint`：前者为 `data:image/png`，后者仅指向 PNG，没有额外动画链接。读取文件头确认 PNG 签名 `89504e470d0a1a0a`，1254×1254、1 帧，亦无 APNG 的 `acTL` / `fcTL` 动画块。未转码、未合成、未发布。

- [工具参数及完整返回结构检查](jobs/g17-direct-gif-v1/tool-response-inspection.json)
- [本轮实际提示词](jobs/g17-direct-gif-v1/prompt.txt)
- [真实文件头与帧数](jobs/g17-direct-gif-v1/file-inspection.json)
- [归档 PNG 原件](audit/jobs/gpt26-social-g17-direct-gif-v1/returned.png)

G13、G14、G04、G16 首轮原词测试及 G13 第二轮原词重试也均返回单帧 PNG。18 个 GIF 案例、26 个目标 GIF 继续待完成。原词与参考图都保留，后续只接受工具直接返回并通过格式、帧数和画面验收的 GIF。

## 已撤回的内容

撤下 p_247–p_272、x_311–x_336、合集 c_014，以及仅被这些条目使用的 40 个媒体记录与其公开文件。399 个运行时文件按原路径归档至 `audit/withdrawn-composites/runtime/`，逐一校验 SHA-256。没有删除生成记录或改写历史发布回执。

`generation-policy.json` 固定为 `native-gif-only`。本批合成 CLI、合成结果登记和精灵图任务准备已停用；发布器跳过合成分支，重新核对不会把历史 apply 回执计作当前内容。为低分辨率合成动图增加的媒体导入门槛变更已撤回。原有项目 GIF 播放能力保留。

原词合集 c_013 已移除合成合集链接，仍包含 11 个原词静态案例，并单独关联 W01。

## 当前保留内容

| 案例 | Prompt | Example | 类型 |
| --- | --- | --- | --- |
| S02 | p_236 | x_300 | 作者原词静态实测 |
| S03 | p_238 | x_302 | 作者原词静态实测 |
| S05 | p_237 | x_301 | 作者原词静态实测 |
| S06 | p_239 | x_303 | 作者原词静态实测 |
| S07 | p_246 | x_310 | 作者原词静态实测 |
| S08 | p_240 | x_304 | 作者原词静态实测 |
| S09 | p_241 | x_305 | 作者原词静态实测 |
| S10 | p_242 | x_306 | 作者原词静态实测 |
| S12 | p_244 | x_308 | 作者原词静态实测 |
| S13 | p_243 | x_307 | 作者原词静态实测 |
| S15 | p_245 | x_309 | 作者原词静态实测 |
| W01 | p_273 | x_337 | 单次自拍工作流改编 |

S07 原词重试成功。S01、S04、S11、S14 两轮均在输出审核阶段被工具拒绝，真实错误及 request ID 保留；没有通过改写绕过。

W01 使用本地参考名称到 R14 文件的映射，直接上传参考图，只调用一次生图。日语消息由助手单独编写，保存在 [message-ja.txt](adaptations/w01/message-ja.txt)。参数、执行时间和映射见 [workflow.json](adaptations/w01/workflow.json)。它是单次工作流改编，未创建定时任务，也未声称使用服务端参考图注册。

## 来源、素材与边界

冻结的 [39 条完整作者原词](sources/manifest-v3.json) 未更改；19 组、22 张参考图均保留在 `references/`，可供后续直接生成任务使用。原有 p_221、p_228、p_232 未覆盖。已发布正文在中英文页面、复制及 Markdown 导出中保持实际提交语言；土耳其语仅注册，不启用站点路由。

全部生图使用内置 GPT Image 工具，没有切换到 CLI/API。模型家族确认为 GPT Image，精确版本未知，记为 `null`。来源作者关于 Image 2.6 的声明单独归属原帖。原词署名属于原作者，未知许可保持 `null`；W01 独立改编明确注明来源。X 点赞与 Reddit 搜索索引得分只表示原帖快照。

S06 下方小图是模型重绘，非逐像素粘贴；S09 的画面日期不代表生成时间；S13 右瞳孔缺失来自原词明确要求。

[136 条来源台账](source-ledger.json) 保留 34 条实施来源、15 条原词证据及 87 条待核实线索，后者未转为空内容卡。

## 验证与续作

当前验证结果见 [verification.json](verification.json)。原词、25 次原词尝试、22 张参考图、当前 12 项内容和撤回档案都进行哈希核对；站点重新构建并检查撤下页面及媒体的 404 响应。

```sh
python3 production/gpt-image-26-social-2026-11-07/reconcile.py
node production/gpt-image-26-social-2026-11-07/verify-import.mjs
node production/gpt-image-26-social-2026-11-07/verify-adaptations.mjs
```

这些命令不触发生图或合成。`campaign.json` 仅统计严格原词结果；`adaptations/campaign.json` 现在只包含 W01。合成输出在映射中标记 `withdrawn-user-request`，历史 ID 放在 `historicalIds`，不再计入成功数。后续直接 GIF 请求必须使用新的任务 key，保存实际提示词和工具返回原文件，再验收。

撤回前状态见 [before](audit/withdrawn-composites/before/)；首轮状态见 [round1](audit/round1/)。历史成功测试仅说明当时构建，不代表当前仍发布那些合成条目。

## 公开记录的路径约定

共享记录中的仓库文件路径相对于仓库根目录；`[local-generation-output]/` 表示已移除的本机工具输出位置，不是可直接读取的文件路径。原始回执保存在未纳入 Git 的本地档案中。路径脱敏不改变提示词、输入输出字节、媒体哈希或已记录的审核结果。
