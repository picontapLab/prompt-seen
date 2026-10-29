# 中文平台图片 Prompt 候选证据

观察日期：2026-10-28（America/Los_Angeles）；API 核验时间：2026-10-29 06:17:12 UTC。本文件是分平台证据附件，不是最终 Top 50 排名。

## 最值得优先考虑的中文项

优先考虑同角色 16 格中文表情贴纸、双人婚纱写真、旅行黏土世界、明代汉服、老照片修复和建筑草图渲染。表情贴纸原视频经 B 站公开只读 API 核验，获得 **344,604 播放、26,934 赞、5,872 收藏、938 评论、1,029 分享**；作者另发专栏公开了完整 prompt。

以下共 11 项；其中婚纱、中文贴纸、杂志肖像、汉服、棚拍头像、老照片修复具备明确指标，另有素材与用途补充项。所有英文 prompt 均为本次独立编写的改编草稿，没有进行生图验证，也不是原作者原文。

## 证据口径

B 站 8 项已用公开只读 `/x/web-interface/view?bvid=...` 接口逐条核验：响应 code=0，使用 stat.view/like/favorite/reply/share 等明确字段。统计对象是整条原始作品演示或教程视频，不是单张静态图片。表情包的原视频 ID 从作者专栏源码定位，并再次用接口核验。每项保留 API 地址和原视频链接，原索引快照只供差异审计。

抖音页面正文索引可以读到一手帖子，但直接打开通常为空页，公开 HTML 也未提供统计字段；抽取文本丢失指标标签。因此保留原始四项数字，不把它们映射成“已核验的赞、评论、收藏、分享”。不使用账号累计获赞、粉丝量或媒体所谓“刷屏”替代单帖证据。

RunningHub 双人纪念照工作流已直接打开，明确显示 1,617 浏览、30 点赞、84 收藏；数据清楚，但绝对热度低，只是补充线索。没有获得足够可靠的小红书原帖数字；微博和即刻的相关线索也未取得可用于排名的单帖指标。

## 候选概览

| ID | 候选 | 一手来源 | 已核验 / 已观察到的数字 | 限定 |
|---|---|---|---|---|
| CN01 | 双人AI婚纱写真 | [Bilibili](https://www.bilibili.com/video/BV18sJ9zeEGY/) | 9,416 播放 · 231 赞 · 345 藏 · 139 评 | 整条教程视频；抖音仅补充 |
| CN02 | 创意伴郎伴娘团合照 | [Douyin](https://www.douyin.com/video/7607819974732010987) | 1.8万 / 269 / 2274 / 8813 | 无标签原始序列 |
| CN03 | 旅行照片变黏土世界 | [Douyin](https://www.douyin.com/video/7367353489397157120) | 6549 / 222 / 5594 / 2347 | 无标签原始序列 |
| CN04 | 同一角色16格中文表情贴纸 | [Bilibili](https://www.bilibili.com/video/BV1uaqqB2Ez7/) | 344,604 播放 · 26,934 赞 · 5,872 藏 · 938 评 | 整条演示/教程视频 |
| CN05 | 时尚杂志封面肖像 | [Bilibili](https://www.bilibili.com/video/BV16m4y1a7uC/) | 56,375 播放 · 3,074 赞 · 2,984 藏 · 64 评 | 整条演示/教程视频 |
| CN06 | 明代风格汉服写真人像 | [Bilibili](https://www.bilibili.com/video/BV1wT411R7fm/) | 18,638 播放 · 477 赞 · 689 藏 · 116 评 | 整条演示/教程视频 |
| CN07 | 干净棚拍证件照风头像 | [Bilibili](https://www.bilibili.com/video/BV1zm4y1J7vr/) | 14,723 播放 · 441 赞 · 611 藏 · 25 评 | 整条演示/教程视频 |
| CN08 | 保持人物一致性的旅行写真 | [Bilibili](https://www.bilibili.com/video/BV1rMspzkEcB/) | 14,675 播放 · 36 赞 · 55 藏 · 6 评 | 整条演示/教程视频；赞藏偏弱 |
| CN09 | 老照片温和修复与自然上色 | [Bilibili](https://www.bilibili.com/video/BV17w41157Ev/) | 33,334 播放 · 505 赞 · 1,340 藏 · 62 评 | 整条演示/教程视频 |
| CN13 | 建筑草图变写实效果图 | [Bilibili](https://www.bilibili.com/video/BV1wC4y1d7FH/) | 29,954 播放 · 601 赞 · 1,966 藏 · 181 评 | 整条演示/教程视频；多课时课程，不能归因单图 |
| CN14 | 双人红底纪念照 | [RunningHub](https://www.runninghub.cn/post/2067127754264506369) | 1,617 浏览 · 30 赞 · 84 藏 | 细分社区，低绝对热度 |

## 每项来源与改编 Prompt

### CN01 · 双人AI婚纱写真

[一手来源](https://www.bilibili.com/video/BV18sJ9zeEGY/) · 2025-09-24 · 作者：张奕的AI工具铺。

- 证据等级：A，B 站公开只读 API 响应 code=0，指标字段明确。
- 证据对象：整条 AI 婚纱照图片制作教程视频。
- 已核验计数：9,416 播放、231 赞、345 收藏、139 评论、65 分享、208 硬币、4 弹幕。
- 复核入口：[公开只读 API](https://api.bilibili.com/x/web-interface/view?bvid=BV18sJ9zeEGY)。
- 原 prompt 可得性：作者简介提供[飞书提示词文档](https://ai.feishu.cn/wiki/X8G5wFXuHiYhs9kyGercDPQYnsg?from=from_copylink)；本轮未读取文档内容，不能声称已获取原 prompt。
- 收录理由：双人身份保持与仪式感结合，用户可直接替换自己的照片，成片有明确分享用途。
- 编辑建议：shortlist；排名的量化基准使用 B 站已标注指标。
- 补充一手来源：[同题抖音视频](https://www.douyin.com/video/7553614841110383882)索引见 2.9万 / 2594 / 2.4万 / 5.7万，无标签，作者未核实；不映射成具体互动，不与 B 站数字相加。

独立改编草稿：

```text
Using the two uploaded portraits, create a wedding editorial photograph of the same two adults. Keep both faces recognizable and their proportions natural. Dress them in an ivory wedding outfit and a charcoal suit, standing close together in a sunlit garden with a stone arch and soft greenery. Candid laughter, a gentle breeze, warm film colors, realistic skin and fabric, flattering late-afternoon side light. Frame from the knees upward in a vertical 4:5 composition. No extra people, text or logos.
```

### CN02 · 创意伴郎伴娘团合照

[一手来源](https://www.douyin.com/video/7607819974732010987) · 2026-02-17 · 作者：小赵公子(Zz)。

- 证据等级：B: indexed primary page, metric labels missing。
- 证据对象：wedding visual concept showcase, tagged 豆包过年。
- 原始计数：1.8万 / 269 / 2274 / 8813。
- 原 prompt 可得性：Not visible in extracted text; exact generation workflow not verified.
- 收录理由：多人姿态与夸张视角制造反差，适合婚礼邀请、伴郎伴娘纪念和社交合照。
- 编辑建议：shortlist with generation provenance check。

独立改编草稿：

```text
Create a playful wedding-party editorial from the uploaded group references, preserving each person's face and keeping the exact number of people. Photograph the couple in the center while friends lean inward from the edges, forming an energetic circular composition around a low-positioned wide-angle camera. Elegant coordinated clothing, a clear blue sky, ivory flowers and spontaneous smiles. Keep facial proportions believable despite the wide lens. A lively magazine photograph with crisp daylight, no text, no cloned faces, vertical 4:5.
```

### CN03 · 旅行照片变黏土世界

[一手来源](https://www.douyin.com/video/7367353489397157120) · 2024-05-10 · 作者：Jacob🐕。

- 证据等级：B: indexed primary page, metric labels missing。
- 证据对象：clay-style travel-vlog tutorial; proposed output is a still-image adaptation。
- 原始计数：6549 / 222 / 5594 / 2347。
- 原 prompt 可得性：No text-to-image prompt visible; source uses a clay-style effect workflow.
- 收录理由：熟悉旅行照片与笨拙手作质感形成反差，人物和景点都可替换。
- 编辑建议：作为静态黏土模板的中文补充证据，与更强的单图来源合并；原帖是视频效果教程。

独立改编草稿：

```text
Rebuild the uploaded travel photograph as a handmade clay diorama. Preserve the placement of the traveler, buildings, trees and horizon so the original place remains recognizable. Turn every visible surface into softly rounded modeling clay with slight fingerprints, uneven edges and miniature construction details. Give the traveler a friendly simplified face while retaining their hairstyle and clothing colors. Warm pastel palette, diffuse daylight, shallow macro depth of field, charming stop-motion-film still. Match the reference framing and add no lettering.
```

### CN04 · 同一角色16格中文表情贴纸

[一手来源](https://www.bilibili.com/opus/1148687573157150722) · 2025-12-20 · 作者：川扑通。

- 证据等级：A: direct public Bilibili read-only API, code 0, labeled stat fields。
- 证据对象：original image-sticker showcase video, plus creator article containing full prompt。
- 原始计数：view=344604 / like=26934 / favorite=5872 / reply=938 / share=1029。
- 复核入口：[原视频](https://www.bilibili.com/video/BV1uaqqB2Ez7/) / [公开只读 API](https://api.bilibili.com/x/web-interface/view?bvid=BV1uaqqB2Ez7)。
- 原 prompt 可得性：Yes, full image prompt is visible. Creator credits an adaptation of Honglizi's prompt; no copying license was established.
- 收录理由：统一身份加多种表情，兼具收藏和聊天复用价值，适合把复杂原案简化为可替换模板。
- 编辑建议：shortlist。

独立改编草稿：

```text
Design one square sticker sheet containing exactly sixteen separate stickers in a clean 4-by-4 grid. Use the uploaded character as the sole character, keeping the face, hairstyle, outfit and colors consistent. Give each cell a different everyday emotion or gesture: joy, surprise, thanks, encouragement, sleepiness, celebration, curiosity, agreement, apology, determination, greeting, laughter, relief, confusion, excitement and affection. Simple expressive cartoon drawing, white cutout borders, generous separation. Add one short Chinese caption per cell from this supplied list: [CAPTIONS]. Avoid background scenes and overlapping stickers.
```

### CN05 · 时尚杂志封面肖像

[一手来源](https://www.bilibili.com/video/BV16m4y1a7uC/) · 2023-06-30 · 作者：哩布哩布AI。

- 证据等级：A: direct public Bilibili read-only API, code 0, labeled stat fields。
- 证据对象：fashion-image model showcase。
- 原始计数：view=56375 / like=3074 / favorite=2984 / reply=64 / share=202。
- 复核入口：[原视频](https://www.bilibili.com/video/BV16m4y1a7uC/) / [公开只读 API](https://api.bilibili.com/x/web-interface/view?bvid=BV16m4y1a7uC)。
- 原 prompt 可得性：No complete prompt in extracted text; model and controls are discussed.
- 收录理由：有明确用途的头像升级；棚拍质感和排版空间使其能转为个人封面。
- 编辑建议：shortlist, evergreen。

独立改编草稿：

```text
Use the uploaded portrait to create a sophisticated fashion-cover photograph. Preserve the person's identity. Style them in an architectural black jacket against a warm gray seamless studio backdrop. One large softbox from the left, subtle edge light, natural skin texture, restrained makeup and a direct confident gaze. Waist-up composition with generous empty space above the head for a magazine title and clear margins for later typesetting. Minimal editorial styling, muted colors, vertical 4:5. Do not invent typography or brand names.
```

### CN06 · 明代风格汉服写真人像

[一手来源](https://www.bilibili.com/video/BV1wT411R7fm/) · 2023-02-09 · 作者：K43。

- 证据等级：A: direct public Bilibili read-only API, code 0, labeled stat fields。
- 证据对象：creator's Ming-inspired Hanfu LoRA image showcase。
- 原始计数：view=18638 / like=477 / favorite=689 / reply=116 / share=98。
- 复核入口：[原视频](https://www.bilibili.com/video/BV1wT411R7fm/) / [公开只读 API](https://api.bilibili.com/x/web-interface/view?bvid=BV1wT411R7fm)。
- 原 prompt 可得性：No complete prompt visible; creator says model and image pack are in comments.
- 收录理由：汉服细节与日常人像变装结合，为中文内容库提供明确的文化主题。
- 编辑建议：shortlist, evergreen。

独立改编草稿：

```text
Create a refined portrait of the adult in the uploaded photo wearing a Ming-inspired hanfu ensemble: a pale jade standing-collar jacket with delicate embroidery and a structured dark-red pleated skirt. Preserve the person's facial identity. Set the scene in a quiet traditional garden beside a carved wooden window and bamboo. Soft overcast light, believable woven silk, restrained jewelry, graceful natural posture, documentary costume-photography texture. Three-quarter-length vertical 4:5 composition. No modern accessories, logos or fantasy armor.
```

### CN07 · 干净棚拍证件照风头像

[一手来源](https://www.bilibili.com/video/BV1zm4y1J7vr/) · 2023-07-04 · 作者：哩布哩布AI。

- 证据等级：A: direct public Bilibili read-only API, code 0, labeled stat fields。
- 证据对象：ID-photo-style image model showcase。
- 原始计数：view=14723 / like=441 / favorite=611 / reply=25 / share=57。
- 复核入口：[原视频](https://www.bilibili.com/video/BV1zm4y1J7vr/) / [公开只读 API](https://api.bilibili.com/x/web-interface/view?bvid=BV1zm4y1J7vr)。
- 原 prompt 可得性：No complete prompt visible; source describes a white-background LoRA.
- 收录理由：低理解成本、强实用性，适合个人资料头像；页面不应把生成结果承诺为官方证件合规照。
- 编辑建议：shortlist, evergreen。

独立改编草稿：

```text
Edit the uploaded adult portrait into a clean studio headshot for a personal profile. Preserve the exact facial structure, skin tone, age and distinctive features. Front-facing head and shoulders, level eyes, relaxed closed-mouth expression, neatly arranged hair and a simple navy shirt. Use a uniform light-gray background and soft symmetrical lighting with a subtle natural shadow under the chin. Keep realistic skin texture and accurate anatomy. Centered vertical 3:4 crop, no text, logos or artificial beauty-filter effect.
```

### CN08 · 保持人物一致性的旅行写真

[一手来源](https://www.bilibili.com/video/BV1rMspzkEcB/) · 2025-10-27 · 作者：不止设计工作室。

- 证据等级：A: direct public Bilibili read-only API, code 0, labeled stat fields。
- 证据对象：photo-editing tutorial with portrait/selfie/travel examples。
- 原始计数：view=14675 / like=36 / favorite=55 / reply=6 / share=10。
- 复核入口：[原视频](https://www.bilibili.com/video/BV1rMspzkEcB/) / [公开只读 API](https://api.bilibili.com/x/web-interface/view?bvid=BV1rMspzkEcB)。
- 原 prompt 可得性：Creator links a TXT prompt download; linked file was not accessed.
- 收录理由：用户自己的脸加可选目的地，输入简单，适合作为多目的地系列模板。
- 编辑建议：reserve: views verified but only 36 likes and 55 saves。

独立改编草稿：

```text
Place the adult from the uploaded portrait in a candid travel photograph at [DESTINATION]. Preserve their facial identity and natural proportions. They wear [OUTFIT] and pause mid-walk beside a distinctive local street feature, looking just past the camera. Include believable local architecture, a few softly blurred passersby and late-afternoon sunlight. Photograph at eye level with a 35mm travel-photography feel, gentle film grain and realistic colors. Vertical 4:5 composition, no text or tourist-brand logos.
```

### CN09 · 老照片温和修复与自然上色

[一手来源](https://www.bilibili.com/video/BV17w41157Ev/) · 2023-12-25 · 作者：火星时代。

- 证据等级：A: direct public Bilibili read-only API, code 0, labeled stat fields。
- 证据对象：creator's grandmother-photo restoration tutorial。
- 原始计数：view=33334 / like=505 / favorite=1340 / reply=62 / share=139。
- 复核入口：[原视频](https://www.bilibili.com/video/BV17w41157Ev/) / [公开只读 API](https://api.bilibili.com/x/web-interface/view?bvid=BV17w41157Ev)。
- 原 prompt 可得性：Workflow named, but no complete prompt visible.
- 收录理由：家庭记忆带来情感价值，前后对比易展示，适合长期搜索流量。
- 编辑建议：shortlist, evergreen。
- 补充一手来源：[同题材来源](https://www.douyin.com/video/7386301086992190755)；跨平台数字不相加。

独立改编草稿：

```text
Carefully restore this old family photograph. Remove visible scratches, dust and stains while preserving the original framing, faces, expressions, age, clothing construction and background objects. Improve clarity conservatively without making skin plastic or inventing sharp facial details where the source is unclear. Add subdued, plausible period colors and retain a little film grain. Do not modernize the clothing, change identities, remove people or replace the setting. Return one restored image at the original aspect ratio.
```

### CN13 · 建筑草图变写实效果图

[一手来源](https://www.bilibili.com/video/BV1wC4y1d7FH/) · 2023-10-07 · 作者：大樟树Design。

- 证据等级：A: direct public Bilibili read-only API, code 0, labeled stat fields。
- 证据对象：multi-part architectural image-generation course; broad workflow demand signal。
- 原始计数：view=29954 / like=601 / favorite=1966 / reply=181 / share=280。
- 复核入口：[原视频](https://www.bilibili.com/video/BV1wC4y1d7FH/) / [公开只读 API](https://api.bilibili.com/x/web-interface/view?bvid=BV1wC4y1d7FH)。
- 原 prompt 可得性：No complete prompt visible; episode titles demonstrate sketch-to-render, room renovation and plan rendering.
- 收录理由：可展示明确前后对比，有专业设计用途；流量属于课程需求，不能归因单张图片。
- 编辑建议：reserve: broad tutorial signal。

独立改编草稿：

```text
Transform the uploaded architectural sketch into a realistic visualization without changing the building massing, window positions, roofline, site boundaries or camera angle. Apply [MATERIAL PALETTE] and set the scene in [SEASON] with soft morning light. Add restrained planting, believable glazing reflections and a few scale-appropriate people. Preserve the design's clear geometric intent and avoid adding floors or structural elements. Architectural photography with balanced exposure and straight verticals, same aspect ratio as the sketch.
```

### CN14 · 双人红底纪念照

[一手来源](https://www.runninghub.cn/post/2067127754264506369) · 2026-06-17 · 作者：孤海AI。

- 证据等级：A: directly opened primary community page with explicit metric labels。
- 证据对象：image-making community workflow, niche rather than viral。
- 原始计数：1617 浏览 / 30 点赞 / 84 收藏。
- 原 prompt 可得性：Workflow description visible; no full model prompt read.
- 收录理由：两张照片合为双人纪念照，背景与服装容易参数化。收藏信号清楚，但绝对热度较低。
- 编辑建议：reserve: low absolute reach。

独立改编草稿：

```text
Combine the two uploaded adult portraits into a warm commemorative studio photograph. Place the two people shoulder to shoulder, facing the camera, preserving each person's exact facial identity and relative height. Both wear simple ivory shirts with natural collars. Use an evenly lit, rich red background, gentle smiles and realistic skin texture. Head-and-shoulders framing, balanced spacing, horizontal 4:3 composition. No document text, seals, official marks or beauty-filter distortion.
```

## 排除项及避免误读

- 可灵官方“一键变手办”视频的单视频仅 560 播放；页面上 2.9 万是合集播放，已排除。[原页](https://www.bilibili.com/video/BV1fWoFY1Er8/)
- 杂志封面视频页面另一个 34.4 万是其合集，不能用于该项；明代汉服页面的 9.4 万、高清头像页面的 34.4 万、旅行写真页面的 77.2 万、老照片教程的 72.8 万也均属于合集，不计入。最终数字全部以各自 API 为准。
- 毕业照线索在抖音聚合页出现 4.2 万卡片数字，但原视频打开失败，且主页面另显示 80；不同对象不能混用，未纳入候选。
- 山海经异兽 87.7 万播放、水墨《花木兰》100.2 万播放、巨构宿舍原始序列 2488 / 107 / 966 / 735，均为视频信号。图片站可作为后续创意来源，本次不以这些数字把静态图片草稿推入榜单。
- 海边三宫格 297 / 22 / 87 / 138、雪景三宫格无计数、宠物镜像写真 146 / 13 / 75 / 6、人宠拥抱 534 / 158 / 276 / 206，保留为可追溯线索但不足以独立证明爆款。

完整结构化字段与排除项原帖链接见同目录 `china-visual-candidates.json`。没有下载或转载他人图片；上线应自行生成示例图，保留玩法来源署名及原帖链接。
