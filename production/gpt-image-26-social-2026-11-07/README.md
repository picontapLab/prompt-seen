# GPT Image 社交案例实施记录

执行更新：2026-11-09。用户最新指令允许 **GIF 采用 9 帧合成，其他图片正常生成**。已完成并导入 **26 个九帧 GIF＋11 个静态原词实测＋4 个静态独立改编＋1 个自拍工作流改编，共 42 个成品，覆盖 34 个来源案例**。未提交、未部署。

## 九帧合成结果

26 个目标全部以新任务版本 `*-adapted-9f-v3` 登记，新增 p_286–p_311、x_350–x_375，合集 c_016。复用之前实际生成且审核过的 GPT Image 动作素材，本轮没有冒充新的生图调用。

- 所有 GIF 原文件均为 9 个编码帧。8 姿态素材将一次停留拆成两帧，保持原像素和总时长；较长素材按时间顺序选取 9 个姿态。不是全部都具有 9 个不同姿态。
- 保留总时长、单次／循环播放和透明背景。WebP 显示副本可能合并重复停留帧，播放时间与效果相同。
- G05 原始单格只有 171×304px，显示放大为 320×569px，不声称增加细节，也不满足原帖的 30fps 视频、配乐要求。
- 试做的淡化补帧版出现重影，已弃用；`*-9f-v2` 已移至被忽略的 `.artifacts/content-production-archive/`，未导入；哈希与处置见 `audit/discarded-nine-frame-v2.json`。
- 页面保留实际生成原素材的提示词；本地九帧处理方法单独说明。来源作者与独立改编署名分开，精确模型 ID 仍为 null，不冒称原生 GIF 或严格原词达标。

[全部内容映射](adaptations/content-map.json) · [逐文件校验](audit/adaptation-integrity.json) · [汇总验证](verification.json)

每个 `adaptations/*-9f-v3/` 文件夹均保存 `output.gif`、首帧封面、九格排版图、`composition.json`、编码参数和真实源素材哈希。完整提交提示词位于 `prompt.txt`，原素材的实际工具调用保存在 `composition.json` 指向的原任务中。

## 静态图片

四个此前未交付的场景已通过新的独立改写词补齐：S01 卧室俯拍、S04 车内夜景、S11 月夜汉服、S14 镜面电梯。改用正常成年着装与日常姿势，四次内置 GPT Image 调用均成功，导入 p_312–p_315、x_376–x_379、c_017。图片、实际提交词和审核见 `adaptations/s01-still-v1/`、`s04-still-v1/`、`s11-still-v1/`、`s14-still-v1/`。这是 4 个独立改编，不能称为原词成功。


此前使用内置 GPT Image 按原词再次尝试 S01、S04、S11、S14，4 次均在输出审核阶段被拒绝，未返回文件。第三轮任务、request ID 和失败记录保存在 `jobs/s*-original-r3/`。未修改原词绕过，也未以空卡片冒充成功。

已完成的 11 个原词静态案例为 S02、S03、S05、S06、S07、S08、S09、S10、S12、S13、S15，仍在 c_013；W01 为单次自拍＋独立日语消息工作流，不是定时任务。

## 页面与验证

新增条目包含中、英、日说明，提示词正文保持实际提交语言。日语已补齐 28 个页面与 214 个共享字段并记录指纹审核。原 p_221、p_228、p_232 未改动。

```sh
python3 production/gpt-image-26-social-2026-11-07/reconcile.py
node production/gpt-image-26-social-2026-11-07/verify-import.mjs
node production/gpt-image-26-social-2026-11-07/verify-adaptations.mjs
node --test production/gpt-image-26-social-2026-11-07/compose-gif.test.mjs
```

39 条完整作者原词、19 组 22 张参考图、136 条来源台账和 87 条待核实线索保持归档。严格原词成功与改编成功分别计数，四个静态原词仍未复现成功，但已有单独署名的改编成品。

## 续作核查

[最新报告](audit/followup-completion-2026-11-09.json)：lint 未使用变量已修复；G03/G06/G11 的同帖名称已改为真正的跳转链接，33 个语言页面、90 个链接全部核对通过。四个新静态图及合集补齐了 5 个日语页面、28 个共享字段。类型检查、lint、内容校验、构建和 17 项浏览器测试通过。

当前展示交付数为 42，严格原词成功数仍为 11。不要把“有原词或改编结果覆盖全部来源”改写为“全部作者原词均通过”。线上部署不属于本次本地交付。

后续修改本批条目时，`reconcile.py` 后执行 `link-sibling-variants.mjs` 更新中英同帖链接，再执行 `localize-nine-frame.mjs` 和 `localize-static-adaptations.mjs` 完成相应日语说明与审核。不要改写历史 apply 回执。

## 历史记录

先前用户要求只接受原生 GIF，旧合成 p_247–p_272、x_311–x_336 和 c_014 已撤回。它们继续留在 [撤回档案](audit/withdrawn-composites/withdrawal.json)，399 个运行时文件的哈希均保留；本轮创建新版本，没有恢复旧条目或改写旧回执。

此前原生 GIF 请求实际返回单帧 PNG，见[原生重试记录](audit/native-gif-retry-2026-11-09.json)。这只描述工具会话的实际返回，不否认其他接口的原生 GIF 能力。[本轮前的记录](audit/before-nine-frame/README.md)保留当时的用户约束与执行状态，已由最新指令取代。

## 版本库与本地档案

版本库保存来源文本、脚本、内容映射、哈希和审核摘要。站点实际依赖的原图及派生媒体只在 `public/media/` 提交。生产目录中的图片副本、精灵图、失败格式探针和历史撤回运行时文件留作本地审计输入，已由 `.gitignore` 排除；全新 checkout 可直接构建站点，但运行本目录的完整素材复核／再合成脚本，需要恢复本地生成档案。未脱敏回执另存于 `.artifacts/repository-privacy-cleanup/`。

共享记录使用仓库相对路径；`[local-generation-output]/` 仅代表原生工具输出位置已隐藏，不是可读文件路径。路径整理不改变提示词、生成图片字节及其 SHA-256。
