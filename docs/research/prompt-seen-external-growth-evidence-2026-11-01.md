# Prompt Seen 外部引用与采用证据

核查日期：2026-11-01（America/Los_Angeles）。目标是判断 Prompt Seen 能否通过可复用的商品视觉任务，为 PicOnTap 带来新增付费用户。用户已确认 Prompt Seen 尚未部署，也没有现成行为报表。因此以下结论属于发布前证据审查，不能称为已经运行的增长循环。

## 当前项目的可确认状态

| 观察 | 原始来源 | 能支持与不能支持的判断 |
| --- | --- | --- |
| GitHub 仓库为 `PRIVATE`，homepage 为空；创建于 2026-10-16；查询时 0 Star、0 fork | [仓库](https://github.com/morehardy/prompt-seen)；2026-11-01 通过已认证 `gh repo view` 查询 | 代码包含开源许可不等于已公开发行；目前不能把 GitHub 当成已有公共采用渠道。零 Star/fork 也不用于判断内容需求。 |
| contributors 仅 `morehardy`，65 次贡献；issues API 返回的 20 项全部是同一作者的 PR；`has_discussions=false` | [contributors API](https://api.github.com/repos/morehardy/prompt-seen/contributors)、[全部 issues API](https://api.github.com/repos/morehardy/prompt-seen/issues?state=all&per_page=100)、[PR 列表](https://github.com/morehardy/prompt-seen/pulls?q=is%3Apr) | 没有从这些记录确认独立贡献者、终端用户讨论或第三方代码部署。自建 PR 是开发活动。 |
| 唯一 production deployment 的工作流总体状态为 success，但实际执行的是 `Production settings missing`；Build、Deploy、Check canonical site 均 skipped | [2026-10-27 工作流](https://github.com/morehardy/prompt-seen/actions/runs/40603119483/job/122535907280) | 工作流成功不代表产品已上线。日志明确生产部署被跳过。用户随后确认未部署，与此一致。 |
| `content/site.yaml` 仍使用 `https://example.com`；repo 和 production 环境的公开变量没有 SITE_ORIGIN | [实例配置](../../content/site.yaml)、[部署文档](../operations.md) | 仓库路径可核查，不能替它虚构正式网址。未读取或输出任何 secrets。 |

GitHub 插件对本私有仓库最初返回 404/422；随后用本机已认证 `gh` 成功查询。不能把前者误当“仓库不存在”。本次只读检查，没有公开仓库、部署或联系第三方。

## 外部引用追溯

查询覆盖精确仓库名、`"Prompt Seen" "PicOnTap"`、`"picontap.com/prompt-seen"`、`"prompts.picontap.com"`、`"picontap" site:reddit.com`、`"picontap" site:x.com`。没有找到可归属本项目的外部推荐链。检索不是全网穷举；在用户确认未上线之后，此结果不再用于推断需求。

| 页面或事件 | 链接目标与来源身份 | 决策价值 |
| --- | --- | --- |
| [promptseen.com 关于页](https://promptseen.com/about-us/) | 自称创始人为 Rutik Soni，社媒指向其自有账号 | 同名项目。其搜索热度、应用下载、评论、内容引用均不能归给本仓库。 |
| [AINave 的 PicOnTap 收录](https://ainave.com/products/picontap)，页面标注 2026-10-10 | `Visit website` 指向 `https://picontap.com`；`Listed by` 为 `support` | 证明商业主站确实被收录；提交者独立性未证实，不能当独立用户推荐，也没有推荐访问或付费数据。 |
| [RealTest 的 PicOnTap 任务记录](https://realtest.org/tools/picontap.com/#feature-ai-product-background)，2026-10-28 | 固定测试输入 `anchor_product_bg_v1`；称背景替换提交后卡在 Turnstile 120 秒，最终出现 “Human verification didn't complete”，无输出；[阻断清单](https://realtest.org/pitfalls/)复述同一事件 | 是一个外部评测者报告的失败线索，不是两个独立失败样本。缺少本次复现和 PicOnTap 服务端核对，不能推出当前普遍故障率。 |

RealTest 的[方法页](https://realtest.org/methodology/)区分确定性脚本检查与人工编辑判断，采用固定 fixture。没有材料足以判断该次具体交互完全由人工还是浏览器自动化完成；更不能把它当普通用户最近一次商业任务、需求访谈或付费意愿。它只提醒首实验要同时记录验证、生成任务状态与真实输出，不能只数按钮点击。

## 商品九宫格原始灵感的传播边界

本仓库候选案例为 `p_123`、路径 `/prompt-seen/en/prompts/product-brand-story-grid/`。其原灵感链接是 [Dari Designs 的 X 帖子](https://x.com/Dari_Designs/status/2013268963266904438)。本次 X 访问返回 403，未能取得原帖评论、读者复现作品或作者最近一次真实工作任务的完整过程。

精确帖子 ID 检索找到相同九宫格主题的转载和商业工具案例，例如 [CreativeClaw 的案例页](https://creativeclaw.co/examples/product-3x3-storyboard-grid/)明确称使用原作者的提示词与图片；其外部署名指向 `@Dari_Designs`。这类页面没有指向 Prompt Seen，不能计入本项目影响力；它们也说明九宫格提示词本身并不稀缺。页面宣称的模型和工具路径不等于原作者实际运行条件，更不等于本项目已经验证的 PicOnTap 结果。

因此，拟验证的差异应是“把参考图、实际运行文本、结果与失败边界放在一起，帮助用户改成自己的商品任务”，而不是“拥有一条热门提示词”。是否比直接让用户打开 PicOnTap 更有用，需要独立用户实验。当前没有取得本项目终端用户的原话、可交付作品、自然推荐或再次使用证据。

## 一个近邻 Pixonara

选择它是因为本仓库已有内容来源指向它，且它同样把图片提示词与商业生成工具相连；只比较可核对的路径，不借用其访问量、排名或 Star 估算转换。

1. **具体内容入口。** [产品摄影提示词页](https://pixonara.com/prompts/ai-product-photo-prompts)要求使用自己的产品参考图，按主图、细节、生活场景等任务选择，并核对包装与标签。它的 `Create product images` 链接指向 `https://pixonara.com/skills?tool=product-detail`。
2. **具体商业路径。** [作者的公开提示词仓库](https://github.com/JeremyGDM/awesome-ai-product-photography-prompts)将示例逐个链接到商业站详情页；例如腕表例子 → [`/prompt/1237`](https://pixonara.com/prompt/1237) → `Use this Prompt` → [`/ai-image-generator?promptId=1237`](https://pixonara.com/ai-image-generator?promptId=1237)。已核实锚点目标，未登录、生成或付款，因此只证明路径存在，不证明携带内容后一定成功生成。
3. **真实传播动作的身份。** [awesome-seedance issue #11](https://github.com/ZeroLu/awesome-seedance/issues/11)由 JeremyGDM 在 2026-08-14 创建，自述 “I am the maker of Pixonara”，链接主站。2026-11-01 查询 comments 返回空。另一个[收录请求](https://github.com/PRIV-Creation/Awesome-Controllable-T2I-Diffusion-Models/issues/23)同样披露作者身份。两者是作者主动分发，不能称第三方推荐或被名单采纳。
4. **证据的终点。** 未取得该仓库的实际提示词使用队列、商业站服务端任务或首次付费。没有可据以宣称成功转化或增长失败的样本。未回复的收录请求只说明“发出收录请求”与“获得独立背书”之间有缺口。

对 Prompt Seen 成立所需的条件：用户确实有反复的商品视觉任务；参考图与改写文本能够在 PicOnTap 得到可用结果；相较直接进入编辑器，案例降低试错而非增加阅读；推荐者愿意保留案例深链，而不是只转发提示词文本；新访客有同类付费任务。当前最靠前、最值得先测的是第三项连同实际任务成功。复制、收藏、Star 或目录收录都不能替代这项证据。

## 交付给主分析的判断

- 目前是发布前假设选择，不是放大已被证明的循环。
- 公开代码采用暂不成立；没有代码运行、独立维护或第三方部署证据。
- 可以条件性优先验证“商品任务的实测配方 → PicOnTap 完成任务”的内容机制。核心价值必须在用户自有参考图上成立，而非只在维护者样例上成立。
- 传播、复访、首次付费都是后续假设。首实验宜先比较“现有案例 + 相同 PicOnTap 入口”与“直接 PicOnTap 入口”的独立任务完成率，保留服务端成功记录和用户认可的输出。不要把招募实验中的受邀参与当自然获客，也不要从短期访问量推断推荐的因果效果。

## 本地产品与主站公开路径补充核对

以下为同日主分析的直接检查，不是用户行为数据。

- 当前工作区有 208 条 Prompt；按英文 locale 的实际 `status`，204 条 published、3 条 draft、1 条 archived。204 条 published 中，140 条不需要参考图、19 条参考图可选、45 条必需；只有 10 条带短语标注。68 个模板的英文 locale 为 published。统计来自逐个解析 `content/prompts/*/entry.yaml`、`locales/en.mdx` 和模板文件；published 是内容状态，不代表已上线。这些数量不能推导需求或采用。
- 浏览器访问本地 `/prompt-seen/zh-hans/prompts/product-brand-story-grid/` 返回 200，显示参考图、两组测试记录、复制、收藏、分享和改写入口。[案例](../../content/prompts/p_123/entry.yaml)、[记录 A](../../content/examples/x_168/run.yaml)、[记录 B](../../content/examples/x_196/run.yaml)可逐项复核。参考图为本站合成素材；模型精确 ID 为 null；不是独立顾客的商品照片，也不是 PicOnTap 的生成回执。
- 在[现有模板](../../content/templates/t_017/versions/v1/body.txt)修改配色后，复制动作交付的完整文本包含修改值；分享动作交付带参数的模板 URL。浏览器检查拦截了剪贴板写入，没有修改系统剪贴板。默认 URL 仍以 `https://example.com` 开头，因此目前不能把它发给外部用户当有效链接。模板只生成文本，改变参数不会生成新图片。
- `src` 中未找到 PicOnTap 品牌或域名入口；浏览器核对上述案例和模板的链接也没有通往主站。`analytics` [默认关闭](../../src/config/schema.ts)，[loader](../../src/modules/analytics/loader.ts)只提供可选访问统计；[复制](../../src/ui/feedback/CopyButton.tsx)、[分享](../../src/ui/feedback/ShareButton.tsx)和[收藏](../../src/state/favorites/store.ts)是本地交互，没有本项目可读的用户事件队列。不能由此推断 PicOnTap 的后台没有任务或支付日志。
- 浏览器只读访问 [PicOnTap 首页](https://picontap.com/)确认：上传图片、输入编辑指令、选择模型和分辨率；本次新会话显示可用 2 credits、1K 编辑成本 2 credits。没有提交生成、登录或付款。文本框上限为 2000 字符，候选案例的默认提示词为 513 字符；能粘贴不等于模型可可靠完成任务。
- [PicOnTap 背景替换页](https://picontap.com/replace-background)已有商品案例、原图、比较提示与使用入口；它是“直接进入 PicOnTap”的真实替代方案，不能假定 Prompt Seen 的案例天然增加价值。[价格页](https://picontap.com/pricing)公开有订阅与按额度使用的规则，但没有取得新增客户、留存或首付结果。

本仓库对 Pixonara 内容的独立改写本身就是一条可核查的内容传播链，例如 [p_151](../../content/prompts/p_151/entry.yaml)记录原页面来源；它不证明采用了 Pixonara 的代码，更不证明向 Pixonara 付费。这也是免费内容传播可以发生、商业价值却未必回到原站的具体边界案例。
