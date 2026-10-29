# X 图片与 Prompt 候选：一手证据核验

观察日期：2026-10-28（America/Los_Angeles）；对应 UTC 2026-10-29 约 06:00–06:20。共 39 个可供主榜筛选的独立主题。本文件只是候选池，不是 X 全站热度榜。

## 方法与边界

X 网页正文在本环境多次返回空页或 403，因此改用平台自己的公开嵌入响应 `cdn.syndication.twimg.com/tweet-result`。每项的作者、发帖日期、点赞、`conversation_count` 和图片地址均来自该官方域名成功返回的 JSON。接口可能返回缓存；这里记录的是采集时读到的快照，不承诺实时计数。没有返回的浏览、转发、收藏均为 null；没有用第三方数值填空。`conversation_count` 保留原字段名称，不擅自解释为全部评论总数。

二手索引仅用于发现原帖链接：[XOutlier作者页](https://xoutlier.il.ly/u/azed_ai)、[公开候选数据集](https://github.com/jau123/nanobanana-trending-prompts)。二手库曾出现题材错配和作者旧名，已依据原帖修正。GitHub星数不算入任何图片互动。

所有英文 prompt 均为本次独立编写的改写/反推模板，**不是原作者原文，也未经生成模型实测**。原文完整可见、正文截断、或只说“prompt在评论”分别标注。原帖附图是参考链接，未获得再分发授权，网站上线宜用独立生成的示例图。模型仅记录作者自述，不构成兼容性或型号核验。需要事实准确的信息图已要求传入核验资料。

2026年高赞样本的作者较多；2025年风格类样本集中于一位作者，因此主榜应限制单作者比例，并与论坛、中国平台、图片社区交叉选择。原帖可能包含名人、商标或已有IP；本次模板改成用户素材或原创主体。

## 快览（按本候选池点赞降序）

| 候选 | 主题 | 点赞 | conversation_count | 发帖日期 | 作者 | 来源 |
|---|---|---:|---:|---|---|---|
| X01 | 照片转桌面收藏手办与包装 | 6,338 | 365 | 2025-09-01 | @GeminiApp | [原帖](https://x.com/GeminiApp/status/1962647019090256101) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1962647019090256101&lang=en&token=1) |
| X02 | 同一产品九宫格品牌故事板 | 5,179 | 25 | 2026-01-19 | @Dari_Designs | [原帖](https://x.com/Dari_Designs/status/2013268963266904438) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2013268963266904438&lang=en&token=1) |
| X03 | 复古掌机像素对战画面 | 4,659 | 106 | 2026-02-26 | @ProperPrompter | [原帖](https://x.com/ProperPrompter/status/2027157212863631567) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2027157212863631567&lang=en&token=1) |
| X04 | 人物剪影内的照片拼贴海报 | 4,032 | 79 | 2026-01-07 | @AmirMushich | [原帖](https://x.com/AmirMushich/status/2008976966255337666) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2008976966255337666&lang=en&token=1) |
| X05 | 国家立体地形旅行指南 | 3,902 | 67 | 2026-04-11 | @TechieBySA | [原帖](https://x.com/TechieBySA/status/2043047413770809708) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2043047413770809708&lang=en&token=1) |
| X06 | 云朵组成的品牌标志 | 3,632 | 18 | 2026-03-14 | @AmirMushich | [原帖](https://x.com/AmirMushich/status/2032908105994961090) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2032908105994961090&lang=en&token=1) |
| X07 | 产品剖透视技术信息图 | 3,525 | 57 | 2026-02-01 | @TechieBySA | [原帖](https://x.com/TechieBySA/status/2017928823497453789) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2017928823497453789&lang=en&token=1) |
| X08 | 真人照片转一致姿态的3D角色 | 3,324 | 29 | 2026-02-07 | @firatbilal | [原帖](https://x.com/firatbilal/status/2020241008693506483) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2020241008693506483&lang=en&token=1) |
| X09 | 悬浮水晶玻璃Logo雕塑 | 3,177 | 35 | 2026-04-11 | @AmirMushich | [原帖](https://x.com/AmirMushich/status/2043027627640799569) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2043027627640799569&lang=en&token=1) |
| X10 | 天鹅绒纱丽时尚棚拍 | 2,876 | 26 | 2026-02-10 | @Flora_Janer8 | [原帖](https://x.com/Flora_Janer8/status/2021300975248736723) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2021300975248736723&lang=en&token=1) |
| X11 | 复古工业专利蓝图 | 2,820 | 63 | 2025-04-21 | @azed_ai | [原帖](https://x.com/azed_ai/status/1914258586588639270) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1914258586588639270&lang=en&token=1) |
| X12 | 膨胀气球字与尖刺字标 | 2,641 | 21 | 2026-04-12 | @AmirMushich | [原帖](https://x.com/AmirMushich/status/2043381172646920237) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2043381172646920237&lang=en&token=1) |
| X13 | 同主题触感3D图标九宫格 | 2,599 | 135 | 2026-01-09 | @NanoBanana | [原帖](https://x.com/NanoBanana/status/2009660363227152653) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2009660363227152653&lang=en&token=1) |
| X14 | 几何模块与摄影融合的品牌海报 | 2,570 | 18 | 2026-03-01 | @AmirMushich | [原帖](https://x.com/AmirMushich/status/2028115571724660920) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2028115571724660920&lang=en&token=1) |
| X15 | 城市地标与天气的3D微缩卡片 | 2,550 | 107 | 2025-11-26 | @dotey | [原帖](https://x.com/dotey/status/1993729800922341810) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1993729800922341810&lang=en&token=1) |
| X16 | 毛绒材质Emoji与图标 | 2,527 | 63 | 2025-04-12 | @gizakdag | [原帖](https://x.com/gizakdag/status/1911075302941622512) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1911075302941622512&lang=en&token=1) |
| X17 | 带标题与行动按钮的社媒广告 | 2,289 | 32 | 2026-02-24 | @AmirMushich | [原帖](https://x.com/AmirMushich/status/2026316195977146728) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2026316195977146728&lang=en&token=1) |
| X18 | 悬浮食材分层料理信息图 | 2,176 | 50 | 2026-02-01 | @Taaruk_ | [原帖](https://x.com/Taaruk_/status/2017865644365255078) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2017865644365255078&lang=en&token=1) |
| X19 | 直闪抓拍风特写肖像 | 2,165 | 58 | 2026-01-14 | @oggii_0 | [原帖](https://x.com/oggii_0/status/2011304086847832089) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2011304086847832089&lang=en&token=1) |
| X20 | 夸张大头3D肖像 | 1,612 | 87 | 2025-08-16 | @azed_ai | [原帖](https://x.com/azed_ai/status/1956672587628781751) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1956672587628781751&lang=en&token=1) |
| X21 | 字形窗口里的摄影海报 | 1,547 | 25 | 2026-02-28 | @AmirMushich | [原帖](https://x.com/AmirMushich/status/2027798913516761522) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2027798913516761522&lang=en&token=1) |
| X22 | 本人和巨型3D分身同框 | 1,421 | 49 | 2026-03-04 | @Emmma___0 | [原帖](https://x.com/Emmma___0/status/2029142137015812314) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2029142137015812314&lang=en&token=1) |
| X23 | 主题美甲设计特写 | 1,290 | 92 | 2025-05-07 | @azed_ai | [原帖](https://x.com/azed_ai/status/1920115927661883397) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1920115927661883397&lang=en&token=1) |
| X24 | 一致角色的四格温暖小故事 | 1,256 | 109 | 2026-02-26 | @GoogleAI | [原帖](https://x.com/GoogleAI/status/2027094912357761319) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2027094912357761319&lang=en&token=1) |
| X25 | 个性人物钥匙扣商品图 | 1,213 | 67 | 2025-04-27 | @azed_ai | [原帖](https://x.com/azed_ai/status/1916521742052503804) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1916521742052503804&lang=en&token=1) |
| X26 | 餐饮品牌全套VI展示板 | 1,211 | 33 | 2026-04-26 | @MrLarus | [原帖](https://x.com/MrLarus/status/2048360321379701233) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2048360321379701233&lang=en&token=1) |
| X27 | 带流动尾迹的火漆印章Logo | 1,178 | 9 | 2026-01-10 | @AmirMushich | [原帖](https://x.com/AmirMushich/status/2010070395974504565) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2010070395974504565&lang=en&token=1) |
| X28 | 节日红色写真与祝福九宫格 | 1,161 | 58 | 2026-01-06 | @wanerfu | [原帖](https://x.com/wanerfu/status/2008421241091154115) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2008421241091154115&lang=en&token=1) |
| X29 | 博物馆图鉴式汉服与器物拆解 | 1,125 | 52 | 2026-04-18 | @MrLarus | [原帖](https://x.com/MrLarus/status/2045504669401653414) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2045504669401653414&lang=en&token=1) |
| X30 | 人群拖影中的静止人物 | 1,118 | 31 | 2026-02-03 | @Taaruk_ | [原帖](https://x.com/Taaruk_/status/2018685474131562751) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2018685474131562751&lang=en&token=1) |
| X31 | 工业产品多视图概念草图 | 1,051 | 26 | 2025-09-26 | @azed_ai | [原帖](https://x.com/azed_ai/status/1971529965301829959) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1971529965301829959&lang=en&token=1) |
| X32 | 层叠剪纸故事插画 | 994 | 47 | 2025-09-18 | @azed_ai | [原帖](https://x.com/azed_ai/status/1968631874663891175) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1968631874663891175&lang=en&token=1) |
| X33 | 包豪斯几何主题海报 | 988 | 29 | 2025-06-10 | @azed_ai | [原帖](https://x.com/azed_ai/status/1932392843756368086) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1932392843756368086&lang=en&token=1) |
| X34 | 有指纹的手捏黏土角色 | 937 | 48 | 2025-04-13 | @azed_ai | [原帖](https://x.com/azed_ai/status/1911359730888614168) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1911359730888614168&lang=en&token=1) |
| X35 | 金箔彩饰中世纪手抄本 | 937 | 37 | 2025-04-17 | @azed_ai | [原帖](https://x.com/azed_ai/status/1912809288705483159) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1912809288705483159&lang=en&token=1) |
| X36 | 自拍转九宫格3D表情贴纸 | 788 | 28 | 2026-03-18 | @oggii_0 | [原帖](https://x.com/oggii_0/status/2034263750539411550) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=2034263750539411550&lang=en&token=1) |
| X37 | 毛绒水果与蔬菜吉祥物 | 767 | 53 | 2025-08-28 | @azed_ai | [原帖](https://x.com/azed_ai/status/1961020464182247838) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1961020464182247838&lang=en&token=1) |
| X38 | 双人纪念首饰盒微缩摆件 | 474 | 15 | 2025-04-07 | @dotey | [原帖](https://x.com/dotey/status/1909332895115714835) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1909332895115714835&lang=en&token=1) |
| X39 | 个人公仔零售盒与配件套装 | 334 | 14 | 2025-04-07 | @dotey | [原帖](https://x.com/dotey/status/1909047283485671924) · [官方数据](https://cdn.syndication.twimg.com/tweet-result?id=1909047283485671924&lang=en&token=1) |

## 逐项收录建议与改写 Prompt

### X01 照片转桌面收藏手办与包装

- 来源：[@GeminiApp 原帖](https://x.com/GeminiApp/status/1962647019090256101)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1962647019090256101&lang=en&token=1)。
- 原prompt可见性：`thread_prompt_not_fetched`。
- 入选理由（编辑判断）：官方具体案例互动6338赞；用户、宠物、家人都可作为主体，个性化使用门槛低。
- 核验/使用注记：已视觉核对官方附图；只是一张手办效果图，非可3D打印模型。

独立改写/反推（未实测）：

```text
Convert the subject in the uploaded photo into a realistic painted collectible figure displayed on a desk. Preserve distinctive facial features, outfit and pose while making the materials clearly miniature resin and plastic. Place it on a clear circular stand, with a matching illustrated retail box nearby and a monitor showing the same figure as a modeling wireframe. Use natural desktop lighting.
```

### X02 同一产品九宫格品牌故事板

- 来源：[@Dari_Designs 原帖](https://x.com/Dari_Designs/status/2013268963266904438)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2013268963266904438&lang=en&token=1)。
- 原prompt可见性：`linked_original_excerpt_visible`。
- 入选理由（编辑判断）：统一产品外观与九种镜头；适合电商和品牌展示，用户只需替换产品照片。
- 核验/使用注记：本帖5179赞属于九宫格成品展示；原始prompt帖2012178722615329176另有2484赞，不能相加。两帖均已核验。

独立改写/反推（未实测）：

```text
Using the uploaded product photo, design a 3-by-3 campaign contact sheet. Keep the container, label and brand palette consistent across all nine panels. Include a hero shot, packaging close-up, human interaction, material detail, repeated arrangement, floating product, texture macro, still life and usage scene. Use coherent lighting, even gutters and a 4:5 canvas.
```

### X03 复古掌机像素对战画面

- 来源：[@ProperPrompter 原帖](https://x.com/ProperPrompter/status/2027157212863631567)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2027157212863631567&lang=en&token=1)。
- 原prompt可见性：`visible_full`。
- 入选理由（编辑判断）：游戏怀旧与高精度像素画结合，缩略图识别度很强，可换原创怪兽。

独立改写/反推（未实测）：

```text
Create a polished pixel-art screenshot of an original turn-based creature game. Two invented creatures face each other across a moonlit marsh arena. Show one attack with luminous pixel particles, clear silhouettes and a limited jewel-tone palette. Add restrained health bars and simple menu buttons. Preserve crisp pixel clusters without smoothing, on a 4:3 canvas.
```

### X04 人物剪影内的照片拼贴海报

- 来源：[@AmirMushich 原帖](https://x.com/AmirMushich/status/2008976966255337666)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2008976966255337666&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：大肖像与细节故事构成两次观看层次，可用于个人回忆、球员和音乐活动海报。

独立改写/反推（未实测）：

```text
Make a portrait tribute poster from the uploaded photographs. A large monochrome profile silhouette fills the page; within it, arrange a precise grid of small action and memory photographs. Keep the outer face contour readable. Use one restrained accent color, off-white textured paper and generous margins. Add only the supplied name in small editorial type.
```

### X05 国家立体地形旅行指南

- 来源：[@TechieBySA 原帖](https://x.com/TechieBySA/status/2043047413770809708)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2043047413770809708&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：地图、地标和旅行清单合一，收藏价值高；需提供核验过的地点文字。
- 核验/使用注记：已查看原图；地图位置和景点事实需人工核对，prompt不能凭空保证地理准确。

独立改写/反推（未实测）：

```text
Build a travel infographic for {{country}} using the supplied verified map and destination list. Render the map as a raised miniature terrain model with a few recognizable landmark miniatures. Add clear city labels, route lines and concise checklists in the margins. Place a small suitcase and compass beside the map. Use a light studio background and readable typography.
```

### X06 云朵组成的品牌标志

- 来源：[@AmirMushich 原帖](https://x.com/AmirMushich/status/2032908105994961090)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2032908105994961090&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：极简天空与熟悉标志形成视觉反差，易于品牌二次创作。

独立改写/反推（未实测）：

```text
Transform the uploaded symbol into a single large cloud floating in an open blue sky. Preserve its overall silhouette while building the form from believable billowing vapor, translucent edges and soft internal shadows. Keep the scene minimal with tiny distant clouds for scale. Photograph it from the ground in warm late-afternoon light. No lettering or extra logos.
```

### X07 产品剖透视技术信息图

- 来源：[@TechieBySA 原帖](https://x.com/TechieBySA/status/2017928823497453789)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2017928823497453789&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：产品结构可视化与精细标注兼具观赏和解释用途，适合科技网站封面。
- 核验/使用注记：已查看原图；本条按原帖作者标注记录模型名，不据此确认正式型号。结构和参数须另行核验。

独立改写/反推（未实测）：

```text
Create an educational cutaway illustration of {{device}} from the supplied specifications. Show a three-quarter product view with selected housing panels transparent. Draw precise leader lines to major components, using four accent colors for functional groups. Keep labels short and legible on white. Include one enlarged detail inset. Use only the provided dimensions and technical facts.
```

### X08 真人照片转一致姿态的3D角色

- 来源：[@firatbilal 原帖](https://x.com/firatbilal/status/2020241008693506483)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2020241008693506483&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：保留动作和构图让用户能直接对比前后差异，传播机制明确。
- 核验/使用注记：选择原始prompt帖3324赞；后续Super Bowl展示帖1645赞不重复计入。

独立改写/反推（未实测）：

```text
Restyle the uploaded portrait as an expressive stylized 3D character. Preserve the person’s pose, clothing colors, hairstyle and camera angle. Simplify shapes into carefully sculpted forms, with subtle skin shading and tactile fabric. Keep recognizable proportions without extreme distortion. Match the original scene layout and use soft cinematic lighting with natural depth of field.
```

### X09 悬浮水晶玻璃Logo雕塑

- 来源：[@AmirMushich 原帖](https://x.com/AmirMushich/status/2043027627640799569)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2043027627640799569&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：透明材质折射与熟悉轮廓形成高点击封面；适合独立品牌。

独立改写/反推（未实测）：

```text
Turn the uploaded logo into a substantial polished glass sculpture suspended against a bright sky. Keep the outline exact, give the form thick beveled edges and realistic refraction, and allow faint spectral highlights to appear in the glass. Use a low camera angle, believable scale and clean negative space. Avoid adding lettering beyond the original mark.
```

### X10 天鹅绒纱丽时尚棚拍

- 来源：[@Flora_Janer8 原帖](https://x.com/Flora_Janer8/status/2021300975248736723)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2021300975248736723&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：服饰材质和肖像结合，适合区域化审美与个人写真。

独立改写/反推（未实测）：

```text
Create an editorial studio portrait of an adult person wearing an elegant olive velvet saree with delicate embroidered trim. Use the uploaded portrait for facial identity. Pose the subject naturally against a warm neutral backdrop, with a large soft side light revealing the fabric pile and folds. Keep skin texture believable, jewelry understated and the framing waist-up.
```

### X11 复古工业专利蓝图

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1914258586588639270)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1914258586588639270&lang=en&token=1)。
- 原prompt可见性：`visible_full_or_alt`。
- 入选理由（编辑判断）：单一材质语言可跨机械、家居、交通主题扩展，具备长期收藏价值。

独立改写/反推（未实测）：

```text
Depict {{object}} as a vintage engineering plate on deep cobalt paper. Draw precise ivory linework for a central three-quarter view, an exploded assembly and two small cross-sections. Use sparse dimension arrows and short supplied labels, with a discreet serial-number box. Keep the drawing elegant and mechanically plausible, with slight paper wear around the margins.
```

### X12 膨胀气球字与尖刺字标

- 来源：[@AmirMushich 原帖](https://x.com/AmirMushich/status/2043381172646920237)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2043381172646920237&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：文字本身成为3D主视觉，适合潮流活动与短词标题。

独立改写/反推（未实测）：

```text
Render the exact word {{word}} as an inflated sculptural wordmark. Use rounded irregular letterforms, glossy {{color}} material and a few expressive tapered protrusions. Keep every letter readable and the spacing intentional. Float the object above a pale studio floor with a soft contact shadow. Use close framing, crisp highlights and no extra text.
```

### X13 同主题触感3D图标九宫格

- 来源：[@NanoBanana 原帖](https://x.com/NanoBanana/status/2009660363227152653)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2009660363227152653&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：九个主题变化提升收藏意愿，可直接覆盖图标、表情包和品牌素材需求。

独立改写/反推（未实测）：

```text
Create nine cohesive 3D icons for {{theme}} arranged in a neat square grid. Give each icon a distinct action or object while preserving the same rounded geometry, tactile matte materials, color palette and lighting. Use simple recognizable silhouettes, consistent scale, equal spacing and a clean white background. Do not add text, borders or watermarks.
```

### X14 几何模块与摄影融合的品牌海报

- 来源：[@AmirMushich 原帖](https://x.com/AmirMushich/status/2028115571724660920)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2028115571724660920&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：摄影主体穿插抽象色块，适合品牌平面视觉，区别于普通人物海报。
- 核验/使用注记：已查看原图：核心是几何模块、色块和摄影遮罩，不能只按转载标题称普通排字。

独立改写/反推（未实测）：

```text
Design a vertical campaign poster for {{brand}} using the supplied product or person image. Divide the page into an intentional grid of large rectangles and quarter-circle shapes in the brand palette. Let parts of the photographed subject cross the geometric boundaries while other parts are masked. Use a clear focal point, small logo placement and minimal text.
```

### X15 城市地标与天气的3D微缩卡片

- 来源：[@dotey 原帖](https://x.com/dotey/status/1993729800922341810)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1993729800922341810&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：地名是极低门槛变量，可产生强地域认同；天气需用户输入数据。
- 核验/使用注记：天气数据必须明确提供；图片模型不会因写入current而自动获得实时天气。

独立改写/反推（未实测）：

```text
Create a vertical weather card for {{city}} using the supplied date and forecast. Build a compact isometric miniature of several local landmarks with coherent toy-like materials. Express the forecast through sky, lighting and small environmental details. Leave a clear header for the city name and a footer for the exact provided temperature and weather symbol.
```

### X16 毛绒材质Emoji与图标

- 来源：[@gizakdag 原帖](https://x.com/gizakdag/status/1911075302941622512)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1911075302941622512&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：经典可触摸材质变换，2527赞；一个简单图标即可作为输入，可扩展为品牌图标变体。
- 核验/使用注记：原帖明确是fluffy emojis；毛绒Logo只是可扩展用途，不能冒充原帖标题。

独立改写/反推（未实测）：

```text
Rebuild the uploaded icon as a small three-dimensional object covered in dense soft fur. Keep its silhouette and essential color areas instantly recognizable. Show individual fibers catching the light, rounded padded volume and a soft shadow beneath it. Float the object against a light neutral studio backdrop. Use a close product-photography composition without adding any text.
```

### X17 带标题与行动按钮的社媒广告

- 来源：[@AmirMushich 原帖](https://x.com/AmirMushich/status/2026316195977146728)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2026316195977146728&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：结合产品、短文案和CTA，收录后有明确商用需求与模板扩展。

独立改写/反推（未实测）：

```text
Create a 4:5 social campaign image for {{product}} using the supplied brand colors. Combine a realistic hero photograph with bold flat graphic shapes that guide the eye. Set the exact headline {{headline}} in large readable type, add {{subtext}} beneath it and place a clear {{cta}} pill near the lower edge. Keep the layout spacious and product details consistent.
```

### X18 悬浮食材分层料理信息图

- 来源：[@Taaruk_ 原帖](https://x.com/Taaruk_/status/2017865644365255078)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2017865644365255078&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：食物照片与结构拆解混合，单张就能讲清配料组成。
- 核验/使用注记：食谱数量和营养信息只采用用户给定资料。

独立改写/反推（未实测）：

```text
Illustrate {{dish}} as a mouthwatering food diagram. Place the finished bowl at the bottom and separate its main ingredients into tidy floating layers above it, with steam connecting the composition. Add concise labels and quantities from the supplied recipe, using thin leader lines. Use warm directional light, realistic food textures and a clean background with ample margins.
```

### X19 直闪抓拍风特写肖像

- 来源：[@oggii_0 原帖](https://x.com/oggii_0/status/2011304086847832089)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2011304086847832089&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：直接闪光、粗颗粒与非摆拍瞬间形成强烈社媒审美，可复用到个人头像。

独立改写/反推（未实测）：

```text
Use the uploaded adult portrait to create a candid flash photograph at night. Frame the face and shoulders tightly as the subject turns toward the camera, with an unposed expression and a slight off-center crop. Use direct on-camera flash, a dark indistinct background, visible fine grain and realistic skin texture. Preserve identity and avoid beauty-filter smoothing.
```

### X20 夸张大头3D肖像

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1956672587628781751)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1956672587628781751&lang=en&token=1)。
- 原prompt可见性：`visible_full_or_alt`。
- 入选理由（编辑判断）：大头比例和表情带来明确的喜剧吸引力，适合头像和礼物定制。

独立改写/反推（未实测）：

```text
Sculpt a humorous 3D portrait of the adult in the uploaded photo. Enlarge the head moderately and emphasize their most recognizable facial shapes while preserving their identity. Give the figure an expressive friendly pose and simple clothing based on the reference. Use smooth clay-like materials, controlled studio lighting and a quiet neutral backdrop.
```

### X21 字形窗口里的摄影海报

- 来源：[@AmirMushich 原帖](https://x.com/AmirMushich/status/2027798913516761522)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2027798913516761522&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：巨大文字兼作画面窗口，标题与图像共同承担视觉焦点。

独立改写/反推（未实测）：

```text
Set the exact word {{word}} in oversized bold condensed capitals across a vertical poster. Fill only the letter shapes with the uploaded action photograph, aligning the subject so its key gesture remains readable. Use a solid {{color}} field around the letters, small corner metadata and generous margins. Preserve strong letter contrast and avoid decorative clutter.
```

### X22 本人和巨型3D分身同框

- 来源：[@Emmma___0 原帖](https://x.com/Emmma___0/status/2029142137015812314)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2029142137015812314&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：身份一致与巨大尺度反差适合个人分享，单图效果容易理解。
- 核验/使用注记：官方响应作者为Emmma___0；第三方库写Kashberg_0，采用官方当前screen_name。

独立改写/反推（未实测）：

```text
Using the uploaded portrait, create a playful scene where the same adult person appears as both a realistic human and a towering stylized 3D companion. Match their face, hairstyle, outfit colors and gesture. Place both on the same sunlit street, with correct contact shadows and perspective. Give the larger character friendly proportions while keeping the smaller person photographic.
```

### X23 主题美甲设计特写

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1920115927661883397)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1920115927661883397&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：可替换主题和配色，适合美业、穿搭和节日选题。

独立改写/反推（未实测）：

```text
Photograph a neatly posed adult hand showing a coordinated nail-art collection inspired by {{theme}}. Use {{palette}}, with a different small motif on each nail while maintaining a consistent style. Include realistic cuticles, subtle glossy reflections and clean finger anatomy. Use soft studio lighting, a simple contrasting background and close-up beauty campaign framing.
```

### X24 一致角色的四格温暖小故事

- 来源：[@GoogleAI 原帖](https://x.com/GoogleAI/status/2027094912357761319)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2027094912357761319&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：角色一致性加完整故事弧，适合表情、儿童内容和连载。

独立改写/反推（未实测）：

```text
Draw a four-panel comic about three original fluffy creatures building a tiny treehouse. Panel one shows their ambitious plan, panel two a funny construction mistake, panel three their cooperative repair, and panel four a cozy celebration. Keep each character’s size, colors and accessories consistent. Use clear visual storytelling, soft lighting and no speech bubbles unless text is provided.
```

### X25 个性人物钥匙扣商品图

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1916521742052503804)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1916521742052503804&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：低成本礼物和个人周边场景明确，适合用户上传照片体验。

独立改写/反推（未实测）：

```text
Turn the subject in the reference photo into a small collectible keychain charm. Preserve recognizable colors and facial features in a simplified miniature form. Add a believable metal loop and short chain attached at the top. Photograph the charm beside a real key on a warm tabletop, using soft window light and shallow depth of field.
```

### X26 餐饮品牌全套VI展示板

- 来源：[@MrLarus 原帖](https://x.com/MrLarus/status/2048360321379701233)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2048360321379701233&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：将包装、菜单、海报整合为提案，实用性强，适合吸引设计和创业用户。
- 核验/使用注记：已查看原图；只生成提案视觉，不等于可生产包装刀模或可编辑VI源文件。

独立改写/反推（未实测）：

```text
Design one presentation board for the fictional cafe {{name}}. Develop a coherent identity using {{palette}} and {{mood}}. Show its primary logo, takeaway cup, food carton, shopping bag, menu, table card and three compact campaign applications. Keep the same mark and typography across every mockup. Arrange the objects by function on a clean editorial grid with readable supplied labels.
```

### X27 带流动尾迹的火漆印章Logo

- 来源：[@AmirMushich 原帖](https://x.com/AmirMushich/status/2010070395974504565)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2010070395974504565&lang=en&token=1)。
- 原prompt可见性：`reply_not_fetched`。
- 入选理由（编辑判断）：熟悉Logo变成可触摸的工艺材料；适合婚礼、邀请函和品牌封面。
- 核验/使用注记：已查看原图。二手数据集将其误配成贴纸sheet；官方正文和图片均确认为火漆印章。

独立改写/反推（未实测）：

```text
Create a macro product photograph of a wax seal carrying the uploaded emblem. Press the mark cleanly into glossy {{color}} wax with a raised circular rim, small air bubbles and an irregular molten tail spreading across textured ivory paper. Use soft raking light to reveal the relief. Keep the emblem crisp and leave ample negative space.
```

### X28 节日红色写真与祝福九宫格

- 来源：[@wanerfu 原帖](https://x.com/wanerfu/status/2008421241091154115)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2008421241091154115&lang=en&token=1)。
- 原prompt可见性：`external_prompt_link_not_fetched`。
- 入选理由（编辑判断）：适合朋友圈和节日头像；保留单人身份、改变动作是明确可复用玩法。
- 核验/使用注记：原例为2026马年，网站模板应将年份、生肖和祝福全部变量化，避免过期。

独立改写/反推（未实测）：

```text
Make a square nine-panel holiday portrait sheet from the uploaded photo. Keep the same face, hairstyle and red knit outfit in every panel while varying natural expressions and playful hand poses. Use a plain ivory studio backdrop, subtle festive doodles and the nine supplied short greetings. Ensure each greeting is readable and the grid spacing is consistent.
```

### X29 博物馆图鉴式汉服与器物拆解

- 来源：[@MrLarus 原帖](https://x.com/MrLarus/status/2045504669401653414)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2045504669401653414&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：文化细节、中文标注与视觉拆解适合知识型收藏，是中文内容差异化机会。

独立改写/反推（未实测）：

```text
Create a museum-catalog illustration of {{garment_or_object}} using the supplied historical reference notes. Show a large realistic central view and neatly separated detail studies around it. Label materials, construction and decorative motifs in concise Chinese supplied by the user. Use fine leader lines, a restrained palette and an ivory paper background. Keep uncertain historical details out.
```

### X30 人群拖影中的静止人物

- 来源：[@Taaruk_ 原帖](https://x.com/Taaruk_/status/2018685474131562751)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2018685474131562751&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：清晰人物与流动人群的反差形成电影感，换照片即可复用。

独立改写/反推（未实测）：

```text
Create a cinematic street portrait from the supplied adult photo. Keep the subject completely sharp and still at the center while surrounding pedestrians stretch into directional long-exposure trails. Use a busy city setting, restrained cool colors and a warm accent light on the face. Preserve realistic anatomy and clothing details, with an eye-level lens and 4:5 framing.
```

### X31 工业产品多视图概念草图

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1971529965301829959)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1971529965301829959&lang=en&token=1)。
- 原prompt可见性：`visible_full_or_alt`。
- 入选理由（编辑判断）：满足设计灵感需求，可覆盖大量实物产品，收藏意图比纯装饰图强。

独立改写/反推（未实测）：

```text
Create a concept-design board for an original {{product}}. Arrange a large perspective sketch, front and side elevations, and two material-detail studies on white paper. Use controlled graphite lines, restrained marker shading and a few {{color}} accents. Keep geometry consistent between views and annotate only the supplied design features. Present it like an early professional design proposal.
```

### X32 层叠剪纸故事插画

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1968631874663891175)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1968631874663891175&lang=en&token=1)。
- 原prompt可见性：`visible_full_or_alt`。
- 入选理由（编辑判断）：手工层次、柔和阴影形成好辨识的风格，适合节日卡片和故事封面。

独立改写/反推（未实测）：

```text
Build an illustration of {{scene}} entirely from layered cut paper. Use a limited palette of sage, peach and cream, with visible paper fibers and gently lifted edges. Separate foreground, subject and background into readable depth layers, casting delicate shadows between them. Keep the composition calm and graphic, with one clear storytelling focal point.
```

### X33 包豪斯几何主题海报

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1932392843756368086)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1932392843756368086&lang=en&token=1)。
- 原prompt可见性：`visible_full_or_alt`。
- 入选理由（编辑判断）：几何抽象和色彩系统可迁移到多种主题，是长期设计型内容。

独立改写/反推（未实测）：

```text
Translate {{subject}} into a modernist poster built from circles, bars, triangles and simple modular forms. Use only rust orange, pale cream and near-black. Arrange the shapes on a deliberate asymmetric grid, leaving breathing room around the focal motif. Add a small title supplied by the user and subtle printed-paper texture without decorative effects.
```

### X34 有指纹的手捏黏土角色

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1911359730888614168)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1911359730888614168&lang=en&token=1)。
- 原prompt可见性：`visible_full_or_alt`。
- 入选理由（编辑判断）：可触摸的手工缺陷与AI常见光滑风格有明显差异，适合可爱角色。

独立改写/反推（未实测）：

```text
Create a single-frame stop-motion-style scene featuring {{character}}. Build everything from colored modeling clay, including tiny props and a simple handmade set. Show subtle fingerprints, tool marks and imperfect paint that make the objects feel physical. Give the character a readable expression and pose. Use soft practical lighting and a gently blurred pastel backdrop.
```

### X35 金箔彩饰中世纪手抄本

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1912809288705483159)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1912809288705483159&lang=en&token=1)。
- 原prompt可见性：`visible_full_or_alt`。
- 入选理由（编辑判断）：古典装饰和现代题材的反差适合头像、书封和奇幻创作。

独立改写/反推（未实测）：

```text
Illustrate {{subject}} on a parchment page as a medieval illuminated artwork. Surround the central scene with intricate vines, small symbolic animals and restrained gold-leaf ornament. Use flat jewel-tone pigments and decorative perspective, with a carefully balanced border. Reserve a small blank cartouche for optional supplied text and show subtle aging of the paper.
```

### X36 自拍转九宫格3D表情贴纸

- 来源：[@oggii_0 原帖](https://x.com/oggii_0/status/2034263750539411550)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=2034263750539411550&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：相比泛用图标进一步强调用户本人，可用于聊天表情和社交分享。

独立改写/反推（未实测）：

```text
Turn the uploaded selfie into a cohesive sheet of nine expressive 3D character stickers. Keep the same face, hairstyle and outfit throughout. Include greeting, laughter, surprise, gratitude, focus, celebration, sleepy, encouragement and a friendly wave. Give every sticker a clean white outline, complete hands and a distinct silhouette. Arrange them evenly with generous space on a plain background.
```

### X37 毛绒水果与蔬菜吉祥物

- 来源：[@azed_ai 原帖](https://x.com/azed_ai/status/1961020464182247838)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1961020464182247838&lang=en&token=1)。
- 原prompt可见性：`visible_full_or_alt`。
- 入选理由（编辑判断）：触感、圆润造型和食物拟人组合，适合贴纸和品牌吉祥物系列。

独立改写/反推（未实测）：

```text
Design a huggable plush mascot inspired by {{fruit_or_vegetable}}. Preserve the recognizable silhouette while adding tiny embroidered eyes, soft fabric limbs and one playful accessory. Show velour fibers, felt leaves, visible seams and slightly squashed stuffing. Photograph it on a simple pastel tabletop with diffuse daylight, as a believable handmade toy.
```

### X38 双人纪念首饰盒微缩摆件

- 来源：[@dotey 原帖](https://x.com/dotey/status/1909332895115714835)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1909332895115714835&lang=en&token=1)。
- 原prompt可见性：`thread_prompt_not_fetched`。
- 入选理由（编辑判断）：双人照和纪念日场景增加情感价值，适合送礼和婚礼内容；原帖474赞。

独立改写/反推（未实测）：

```text
Transform the two people in the uploaded photo into affectionate miniature figures inside an open keepsake box. Preserve their recognizable hairstyles, clothing colors and relationship pose. Use cream enamel, subtle gold fittings and a tiny interior scene inspired by {{memory}}. Add the supplied names discreetly inside the lid. Photograph the object in soft warm light as a handcrafted gift.
```

### X39 个人公仔零售盒与配件套装

- 来源：[@dotey 原帖](https://x.com/dotey/status/1909047283485671924)；[官方互动快照](https://cdn.syndication.twimg.com/tweet-result?id=1909047283485671924&lang=en&token=1)。
- 原prompt可见性：`visible_excerpt`。
- 入选理由（编辑判断）：身份、爱好配件与包装文字可自定义，适合作为照片玩法模板；原帖334赞，强度低于桌面手办。

独立改写/反推（未实测）：

```text
Design a collectible toy package based on the uploaded full-body portrait. Show a stylized figure inside a clear display box with three miniature accessories representing {{hobbies}}. Put the exact name {{name}} on the box and place a second unboxed figure beside it. Use original packaging graphics, believable plastic reflections and clean product photography.
```
