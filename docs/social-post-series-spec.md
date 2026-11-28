# 社交图文套版实施规格

2026-11-27 · v1.0 · 本地发布候选已完成。供内容编辑、GPT Image 制作人员和入库维护者使用。

## 1. 交付目标

用户找到与自己发布目的相同的案例，先看一套图如何分工，再换掉参考照片和文案，逐页复制提示词。**首批交付 12 个案例、12 个可编辑模板、14 张无字底图、36 张独立成果图和 1 个合集**。每套三张，两套需要双图输入。每张成果都有自己的确切文案、输入、运行和原图。本文保留制作规格初稿。实测后调整的构图样值、原件与退回原因见[批次报告](../production/social-post-series-v1/README.md)。

已有的英语社交合集重点是表情、照片亭、生日卡和漫画。商品九宫格用一张合成图呈现视觉变化，社媒广告示范单张促销海报。这次的增量是让用户按顺序单发、轮播或跨渠道发布三张图，并能单独重做其中一张。此前的选题依据和相邻内容可从这里核对。[需求调研](research/prompt-image-content-opportunities-2026-11-22.md) · [英语社交合集](../content/collections/c_015) · [商品九宫格](../content/prompts/p_123) · [社媒广告](../content/prompts/p_142)

## 2. 场景与发布方式

平台列表示例投放位置。三张顺序阅读的套图使用相同画幅。写有“跨版位”的套图按表分别投放，勿把横竖版本混入同一轮播。收藏、报名、留言等是读者预期动作，可在后续用户访谈中检验。

| 案例 | 谁在什么情况下发图 | 读者看到三张图后能做什么 | 推荐版位与组织方式 |
| --- | --- | --- | --- |
| S01 人物访谈预告 | 播客主理人拿到嘉宾照片，要给同一集节目做分发 | 认出嘉宾、理解本集问题并找到节目 | YouTube 普通视频横封面、Instagram 竖帖、Story 预告，跨版位 |
| S02 一周便当教程 | 家庭料理作者有一份便当和三种主料 | 认材料、看装盒顺序、保存备菜清单 | Instagram 三张竖版轮播 |
| S03 独立品牌上新 | 陶艺小店要发布同一只杯子的新品预告 | 认出款式、看清工艺、记住开售时间 | Instagram 三张竖版轮播 |
| S04 社区活动招募 | 志愿者团队需要邀请邻居参加衣物修补活动 | 了解活动、准备物品、在帖子里报名 | Facebook 或 Instagram 两张方帖，另配一张 Story 提醒 |
| S05 通勤包选购比较 | 测评作者手上有两只真实样包 | 看出包型和容量区别，按携带习惯选款 | Instagram 三张同尺寸比较卡 |
| S06 团队改进复盘 | 团队负责人要公开解释一次等待时间实验 | 分清基线、试点和结论边界，引用数字 | LinkedIn 同帖三张图片，按顺序附图 |
| S07 城市散步收藏帖 | 本地生活作者把踩过点的三站路线整理成帖子 | 认地标、按顺序走、保存集合信息 | 小红书三张竖版笔记 |
| S08 小空间改造投票 | 租客想在两种家具布局中征求意见 | 看懂同一房间的两个选择，在评论区选 A 或 B | 小红书或社群信息流三张对照图 |
| S09 展品细节讲解 | 手作账号只凭一张器物图介绍可观察的工艺 | 先认全貌、再找局部、自己观察纹样 | 微信图文配图或小红书三张图鉴 |
| S10 连载角色小故事 | 日语读书社团为账号吉祥物连载一个短篇 | 连续翻页看完起因、转折、结尾 | Instagram 或 X 三张叙事卡，按顺序上传 |
| S11 今日菜单与取餐 | 西语街区餐馆要发布午餐内容、价格和时段 | 知道卖什么、多少钱、何时到店 | Instagram 竖帖及两张连续 Story，跨版位 |
| S12 社群活动回顾 | 葡语跑团有两张活动照片，想感谢参与者 | 认出现场、看到幕后、转发致谢 | Instagram 三张竖版回顾卡 |

**语言配额按实际送入工具的成图提示词统计。** S01–S06 用英语，S07–S09 用简体中文，S10 用日语，S11 用西班牙语，S12 用巴西葡萄牙语。即 6／3／1／1／1 套、18／9／3／3／3 张成果。每例的底图指令、页面构图指令、上图文字也使用对应语言。中英文网站介绍另写。[项目多语言提示词约定](multilingual-prompt-design.md)

## 3. 十二个社交媒体 AI 原作参考

每条只对应一个制作卡。原帖给出可借鉴的具体手法，右栏说明如何改成另一项可用任务。2026-11-27 读取了十条平台公开接口记录（X、哔哩哔哩）和两篇 Reddit 原帖。下列图文由本站另拟，生产时使用自制底图。原帖点赞量、作者所用型号和原作图片均不作为本站测试记录。[X 来源档案](research/ai-image-top50/x-social-candidates.json) · [B 站来源档案](research/ai-image-top50/china-visual-candidates.json) · [Reddit 房间案例档案](research/ai-image-top50/reddit-candidates.json)

| 对应案例 | 社交媒体上的 AI 作品 | 借鉴什么，本站怎样改编 |
| --- | --- | --- |
| S01 | 哩布哩布AI 用 AI 演示时尚摄影与杂志封面。[哔哩哔哩原视频](https://www.bilibili.com/video/BV16m4y1a7uC/) | 借鉴人物视线、头部留白和标题关系，改成同一嘉宾在横、竖、全屏三种版位中的重新构图。 |
| S02 | Taaruk_ 发布用 Nano Banana Pro 做印尼料理食材分层信息图的提示词。[X 原帖](https://x.com/Taaruk_/status/2017865644365255078) | 借鉴可辨认的食材分层，把一张信息图拆成成品、步骤、备菜三页。 |
| S03 | Dari_Designs 展示用同一商品做多个场景的 Nano Banana 品牌故事板。[X 原帖](https://x.com/Dari_Designs/status/2013268963266904438) | 借鉴产品身份跨画面一致，改为同一只杯子的独立上新、细节和开售卡。 |
| S04 | AmirMushich 的 Nano Banana 社媒广告示范主视觉、标语与行动提示的关系。[X 原帖](https://x.com/AmirMushich/status/2026316195977146728) | 把商业广告的信息层级用于公益招募，参加条件和报名动作各占一张。 |
| S05 | azed_ai 发布 AI 工业设计多视角草图提示词。[X 原帖](https://x.com/azed_ai/status/1971529965301829959) | 借鉴统一角度与基线，把概念草图改成两件已有物品的实拍对照。容量由测评作者提供。 |
| S06 | u/Beginning-Willow-801 在 r/GeminiAI 展示 Nano Banana Pro 信息图，写明先给数据、再安排版面。[Reddit 原帖](https://www.reddit.com/r/GeminiAI/comments/1p9cfn1/how_to_visualize_anything_with_gemini_a/) | 借鉴先锁数据的做法，只展示两个可复算数值，把结论限制写进最后一页。 |
| S07 | 宝玉 dotey 分享用 Nano Banana Pro 把地标和天气汇入微缩城市卡的做法。[X 原帖](https://x.com/dotey/status/1993729800922341810) | 取地标辨识法，改成三个固定站点的步行示意。样例地点虚构，正式路线由作者提供。 |
| S08 | u/GMScreech 在 r/homeassistant 展示用 ChatGPT 把房间变成等距房间图的效果。[Reddit 原帖](https://www.reddit.com/r/homeassistant/comments/1jkk5oo/new_chatgpt_model_great_for_creating_3d/) | 取自有空间作锚点，固定门窗、视角和家具，仅改变允许移动的两件物品。 |
| S09 | MrLarus 展示 GPT 图像生成的汉服拆解图，并给出可换主题的图鉴提示词。[X 原帖](https://x.com/MrLarus/status/2045504669401653414) | 借鉴全貌与局部的对应关系，改成可逐页翻看的器物观察练习。 |
| S10 | Google AI 示范 Nano Banana 2 的四段角色故事提示词。[X 原帖](https://x.com/GoogleAI/status/2027094912357761319) | 借鉴跨格角色一致性，设计原创纸狐狸与跨三页的动作接续。 |
| S11 | MrLarus 展示 AI 生成的四个餐饮品牌视觉提案，包含包装、菜单与促销材料。[X 原帖](https://x.com/MrLarus/status/2048360321379701233) | 取同店视觉一致性，压缩成可当日更新的菜品、价格和取餐时间三张卡。 |
| S12 | AmirMushich 发布 Nano Banana 照片网格纪念海报。[X 原帖](https://x.com/AmirMushich/status/2008976966255337666) | 借鉴照片并置和留白，改成现场、幕后、致谢三张图，保留每张照片的具体出处。 |

## 4. 制作人员怎样使用下列卡片

1. **先生成无字底图。** 每张底图用对应的完整指令调用 GPT Image。底图应当是用户能够替换的照片、插画或图案，并预留排字空间。S05 的两只包各生成一张，S12 的两张照片各生成一张。其余每例一张。逐张保存提示词、原件、尺寸及 SHA-256，注明合成示范。
2. **再生成独立单页。** 每例的成图正文是模板原文。先将该例的整套共用字段填入 `{{anchor}}`，再将样值表中的四列依次填入 `{{ratio}}`、`{{scene}}`、`{{headline}}`、`{{detail}}`，再附上该例底图，调用一次只取一张。每例三行就是三次完整任务。本页的参考图顺序固定，三次都从同一批已验底图开始。表中“页”只做导航。画面中的文字只取标题与副文，保留标点、重音、大小写、时间和金额。构图指令不会上图。
3. **规格与发布文件。** 本批选用 16:9、1:1、4:5、3:4、9:16 五种成品画幅。普通视频封面选 16:9。Story 上下各留约 15% 给界面，其余页重要文字距边至少 8%。这些留白是本批设计值。生成端只提交工具确实支持的尺寸。记录返回原始宽高。建议发布尺寸为 16:9 用 1280×720，1:1 用 1080×1080，4:5 用 1080×1350，3:4 用 1080×1440，9:16 用 1080×1920。用原件等比缩放并在留白内裁切，另存发布版并记录裁框与哈希。若生成端原件较小，可按目标比例交付实际可得的最大不放大尺寸。例如从 1024×1536 原件的留白区域裁成 864×1536 的 9:16。把实际尺寸标在下载项，文字可读性仍须通过验收。原始输出和发布版分别标明。若裁到文字、物品或人物，就重新构图生成。YouTube 普通视频与 Shorts 的封面行为可查官方帮助。[YouTube 缩略图说明](https://support.google.com/youtube/answer/72431?hl=en)
4. **字段与样例。** 五个字段均为必填的 `string`。`anchor` 最多 320 字符，填写这一套要保持的主体特征、视觉约定或已核对的数字。`ratio` 只在本批制作单校验上述五个值。`scene` 最多 320 字符，`headline` 最多 64，`detail` 最多 128。这是编辑器输入上限，图上的可读性仍逐图实测。每套用第 1 行作默认值和 `default` 样例，第 2、3 行作 `page-02`、`page-03`。一张参考图时槽位用 `visual`，两张时按卡片顺序用 `first`、`second`，各需一张。换主题时先在三页填入相同的新 `anchor`，再改涉及旧主体的 `scene` 与上图文字。例如把 S03 的白釉杯换为玻璃杯时，三个样例都填实际的杯柄、颜色和表面特征，第二页指定放大新杯的真实细节。
5. **可复制示范。** 例如给 S02 附上便当底图，再把这段完整英文输入 GPT Image，即可试做第 2 页。其余 35 页用相同的正文替换规则，所需文字已在卡片中逐项列全。

```text
Make one 4:5 recipe card from the supplied lunch photo. Keep its three ingredients, blue enamel box and warm ivory surface identifiable. Use a top-down food photograph, dark green sans-serif type and soft side light. Arrange this page as follows: Three loose piles lead into the open box from left to right. Set the headline exactly to “Pack in this order” and the smaller line exactly to “Rice, chickpeas, then cucumber”. Render only these two lines of copy.
```

## 5. 制作卡

### S01 · 人物访谈的跨版位封面 · en

播客本期讨论旧灯维修，嘉宾是一位虚构的灯具修复师。锁定圆眼镜、蓝围裙和黄色工作灯。横图依靠视线给文字留位，竖图重新安排手、灯和脸的位置。

**底图指令**

```text
Photograph a fictional adult lamp restorer with round glasses and a faded blue apron at a workbench, holding a small mustard-yellow desk lamp. Soft light from the left, teal workshop wall, waist-up, wide composition with generous space on both sides. Make one clean editorial reference photo without lettering or logos.
```

**整套共用字段**　`anchor` = Preserve the guest's face, glasses, blue apron and yellow lamp.

**成图正文**

```text
Make one {{ratio}} editorial image for a repair podcast from the supplied photo. {{anchor}} Use a teal background, warm side light and cream condensed type. {{scene}} Set the headline exactly to “{{headline}}” and the supporting line exactly to “{{detail}}”. Print only this copy.
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 横封面 | 16:9 | Place the guest on the right looking toward the short title on the left. | Why fix this lamp? | Bench Notes · Ep. 04 |
| 2 信息流 | 4:5 | Frame the face and lamp in a tight vertical triangle with the title below the lamp. | Meet the restorer | Bench Notes · Ep. 04 |
| 3 Story | 9:16 | Show the hands holding the lamp near the middle, with both lines clear of the top and bottom. | Hear the full story | Bench Notes · Ep. 04 |

**验收**　三页嘉宾和灯可辨认为同一组。横封面缩到 160 像素宽仍能读出主标题，竖版手、灯罩与人脸都在画内。

### S02 · 便当教程与收藏清单 · en

美食作者需要读者从成品走到可操作的装盒顺序。三页保持俯拍桌面和餐盒颜色，食材名称与底图逐项对应。

**底图指令**

```text
Make one overhead food photograph of cooked rice, cooked chickpeas and sliced cucumber beside an open blue enamel lunchbox on a warm ivory table. Keep each ingredient clearly separate and recognizable. Soft side light, quiet editorial styling, no lettering, no packaging and no other ingredients.
```

**整套共用字段**　`anchor` = Keep its three ingredients, blue enamel box and warm ivory surface identifiable.

**成图正文**

```text
Make one {{ratio}} recipe card from the supplied lunch photo. {{anchor}} Use a top-down food photograph, dark green sans-serif type and soft side light. Arrange this page as follows: {{scene}} Set the headline exactly to “{{headline}}” and the smaller line exactly to “{{detail}}”. Render only these two lines of copy.
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 成品 | 4:5 | Fill the box with the three ingredients and give it most of the frame. | A three-part lunch | Rice, chickpeas, cucumber |
| 2 步骤 | 4:5 | Three loose piles lead into the open box from left to right. | Pack in this order | Rice, chickpeas, then cucumber |
| 3 清单 | 4:5 | Place the three ingredients in a vertical row, leaving a clear block for the copy. | Save the prep list | Cook rice · Drain chickpeas · Slice cucumber |

**验收**　两处顺序一致，装盒成品和清单中只有给定的三种食材。三个动作与食材正确配对。

### S03 · 独立陶艺品牌上新 · en

一只白釉杯有两个明显识别点——单个钴蓝笔触、方形把手。上新卡从全貌切到工艺细节，再告知开售时间。

**底图指令**

```text
Create an unlettered reference photograph of one handmade ivory mug with a squared handle and a single cobalt brushstroke directly beneath its rim. Place it on pale clay paper in soft daylight, seen from a three-quarter angle with the handle to the right. No label, writing or extra objects.
```

**整套共用字段**　`anchor` = Keep the squared handle, ivory glaze and single cobalt mark in their original positions.

**成图正文**

```text
Create one {{ratio}} product launch card using the pictured mug as the identity reference. {{anchor}} Use pale clay paper, daylight and restrained navy lettering. {{scene}} Reproduce only the headline “{{headline}}” and the smaller line “{{detail}}”, exactly as supplied.
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 款式 | 4:5 | Show the whole mug just below center with ample air above. | The Tide Mug | Studio release 01 |
| 2 工艺 | 4:5 | Move close enough to show the glazed edge and the single cobalt stroke. | One cobalt stroke | A closer look at the glaze |
| 3 开售 | 4:5 | Place the full mug at lower right and give the release time the largest clear area. | Friday at noon | Shop the studio release |

**验收**　特写中的蓝色笔触数量、位置和轮廓与首图相符。只使用给定的开售信息。

### S04 · 社区修补活动招募 · en

海报解决“这是什么活动”，准备卡解决“带什么”，提醒卡解决“如何报名”。示范文案里的时间和地点在正式制作时由组织者换成实值。

**底图指令**

```text
Make a clean overhead photograph of a mustard sewing kit, a spool of navy thread, a patch of indigo denim and one loose brass button on pale pink paper. Leave open space around the objects. Soft shadows, cheerful community workshop mood, no words, numbers or logos.
```

**整套共用字段**　`anchor` = Keep navy ink, blush paper, mustard accents and bold friendly lettering across the series.

**成图正文**

```text
Design a single {{ratio}} community notice using the supplied sewing objects. {{anchor}} {{scene}} The complete visible copy is the headline “{{headline}}” and the supporting line “{{detail}}”. Keep every word exact and legible.
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 邀请 | 1:1 | Arrange the kit around the main title, with the venue line immediately below. | Repair Café | Saturday · 2 pm · Elm Hall |
| 2 准备 | 1:1 | Crop closely around the patch and button and keep the lower half clear for the instructions. | Bring one item | A torn seam or a loose button |
| 3 报名 | 9:16 | Frame the center with a curved thread and place the response instruction in the open center. | Save your seat | Comment JOIN on the event post |

**验收**　“JOIN”大小写正确。报名指引明确指向活动帖，Story 不依赖画面内的假按钮。

### S05 · 两款通勤包比较 · en

测评者提供两张各自拍摄的商品图，按顺序绑定。样例核定规格为窄包 2 L、宽包 5 L。容量由输入文案指定，画面避免暗示未经测量的相对尺寸。

**底图指令**　分两次生成，第一张为窄包，第二张为宽包。生成第二张时可用第一张作棚拍光色参考，记录此处的生成依赖。

```text
Photograph one compact slate-blue crossbody pouch with one vertical orange zipper, front view, neutral gray tabletop, diffuse side light. Keep all edges visible, with no lettering or brand mark.
```

```text
Photograph one wide olive messenger bag with a broad flap and two dark buckles, front view, neutral gray tabletop, diffuse side light. Keep all edges visible, with no lettering or brand mark.
```

**整套共用字段**　`anchor` = The first photo identifies the blue pouch with one orange zip. The second identifies the olive bag with two buckles. Preserve these details whenever each bag appears.

**成图正文**

```text
Build one {{ratio}} buying-guide card. {{anchor}} Use a gray ground, navy type and a consistent front view. {{scene}} Print exactly “{{headline}}” as the headline and “{{detail}}” as the secondary line, with no other copy.
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 总览 | 4:5 | Show the blue pouch at left and the olive messenger at right in two equal photographic windows. | Pick your carry | Two bags for different loads |
| 2 小包 | 4:5 | Show only the blue pouch with keys beside it, leaving its orange zip visible. | Light carry | Blue pouch · 2 L |
| 3 大包 | 4:5 | Show only the olive bag with a closed notebook beside it, leaving both buckles visible. | Room for a notebook | Olive messenger · 5 L |

**验收**　蓝包始终一条橙色拉链，绿包始终两只扣。两种容量不能互换，两幅等大照片窗不作为实物等比例测量图。

### S06 · 团队试点的数据复盘 · en

虚构团队给出的原始记录为基线等待 12 分钟、试点等待 8 分钟，差值 4 分钟。无字底图只提供视觉素材，任何数字都来自这三条输入。

**底图指令**

```text
Create one unlettered editorial background for a service-design report: warm off-white paper, a small navy outline of a clock without numbers in the top corner, and a muted green horizontal accent low on the page. Leave the center empty. No charts, text or numerals.
```

**整套共用字段**　`anchor` = The sample figures are a 12-minute baseline and an 8-minute pilot wait.

**成图正文**

```text
Create one {{ratio}} report card based on the supplied paper and clock motif. Use navy type and a single muted green accent. {{anchor}} {{scene}} Print exactly “{{headline}}” and “{{detail}}”. These two strings are the only visible text. Keep the figures easy to check.
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 提问 | 1:1 | Enlarge the clock outline as a visual cue and give the question the main space. | Did the wait change? | Pilot review · Demo data |
| 2 比较 | 1:1 | Use exactly two horizontal bars from the same origin, navy above green. Their lengths are in the ratio 3 to 2. Put the two values together in the headline. | Baseline 12 min · Pilot 8 min | Average wait · Demo data |
| 3 结论 | 1:1 | Make the difference the focal point. Use the quiet footer for the scope of the result. | 4 minutes shorter | This pilot only · Demo data |

**验收**　12、8、4 以及单位逐个核对。第二页两条柱的起点相同，短柱约为长柱的三分之二，实测长短比允许偏差 5%。三张均保留演示数据标签。

### S07 · 三站城市散步收藏帖 · zh-Hans

以虚构的“岸北”示范路线。底图建筑分别靠砖色、桥拱与棚布来辨认。示范只要求站点顺序，实际发布时作者负责核对通行路线、集合点和地名。

**底图指令**

```text
画一张无字的微缩街区参考图，浅沙色地面，斜上方四十五度视角。由左至右依次是一间红砖旧书店、一座单拱蓝桥、一排橙色顶棚的市集，三处以同一条步道相连。让三种轮廓清楚可辨，周围留白，不出现招牌文字、道路编号或地图图例。
```

**整套共用字段**　`anchor` = 沿用红砖书店、蓝色单拱桥、橙顶市集和浅沙底色，保持同一套微缩插画笔触。

**成图正文**

```text
用所附街区图制作一张 {{ratio}} 散步笔记。{{anchor}}{{scene}} 大标题逐字写“{{headline}}”，副文逐字写“{{detail}}”。画面只印这两段文字，文字与建筑分开。
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 封面 | 3:4 | 三处地标排成一道横向弧线，上方留出标题区。 | 岸北散步三站 | 虚构街区示例 |
| 2 路线 | 3:4 | 用两支从左向右的箭头依次连接书店、桥、市集，将站点顺序排在箭头下方。 | 从书店走到市集 | 旧书店 → 蓝桥 → 周末市集 |
| 3 集合 | 3:4 | 把红砖书店入口放大当主视觉，蓝桥只在远处露出一角。 | 先在旧书店碰面 | 集合点：红砖门廊 |

**验收**　第二页两支箭头方向正确。第三页的红砖门廊能在前两页找到。站内介绍把该路线标为虚构示范。

### S08 · 租房客厅布局投票 · zh-Hans

同一间房、同一机位，只移动阅读椅和落地灯。参与者可据此回答“靠窗还是靠书架”，首图也交代共同条件。

**底图指令**

```text
画一个无字的等距小客厅模型，从同一个斜上方机位看进去。后墙中央是高窗，右墙是固定矮书架，左前有房门。深绿阅读椅和黄铜落地灯放在屋子中央，浅木地板干净。完整保留门窗和家具轮廓，底色米白，不写标注或尺寸。
```

**整套共用字段**　`anchor` = 固定原机位、墙体、门窗、书架和地板，保留同一把深绿椅及同一盏黄铜灯。

**成图正文**

```text
根据参考图画一张 {{ratio}} 的客厅布局投票卡。{{anchor}}沿用米白背景、墨绿标题和等距模型画风。{{scene}} 只排两段字，标题是“{{headline}}”，副文是“{{detail}}”，原样保留空格与拉丁字母。
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 提问 | 3:4 | 按底图原位展示整个房间，给上方标题留出空白。 | 阅读角放哪里？ | 同一间房，两种摆法 |
| 2 方案 A | 3:4 | 只把椅和灯移到高窗前，保留从房门到书架的通路。 | A 靠窗 | 喜欢自然光就选 A |
| 3 方案 B | 3:4 | 只把椅和灯移到右侧书架旁，窗前留空。 | B 靠书架 | 想随手拿书就选 B |

**验收**　并排看三页的门、窗和书架，应落在同一位置。第二、三页各仅有一把椅和一盏灯，字母与实际布局一致。

### S09 · 看懂一件手作的细节 · zh-Hans

博物馆商店或手作账号可换成自己的器物。这次只讲底图中能看见的线圈与交叉纹，不推断年代、产地或材质鉴定结论。

**底图指令**

```text
拍一张无字手作器物参考照片。一个浅褐色圆形编织小篮，口沿绕着深靛蓝色线圈，篮身正面有明显的交叉纹。略高于篮口的正面视角，淡灰背景，柔和侧光。画面清楚呈现整只篮子、口沿和正面的纹理，不加标签和展签。
```

**整套共用字段**　`anchor` = 保留同一只篮子的形状、蓝线口沿和正面交叉纹，采用浅灰纸底、深靛蓝文字与克制的图鉴排版。

**成图正文**

```text
用参考照片制作一张 {{ratio}} 的器物观察卡。{{anchor}}{{scene}} 标题逐字写“{{headline}}”，说明逐字写“{{detail}}”。除了给定文字，不添加鉴定信息、编号或装饰字。
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 全貌 | 4:5 | 整只篮子居中，上沿和篮底都在画内。 | 看懂一只编织篮 | 先看轮廓，再找细节 |
| 2 口沿 | 4:5 | 放大篮口前沿，保留一小段篮身作为方位参照。 | 第一眼，看口沿 | 蓝色线圈沿边缘绕行 |
| 3 纹理 | 4:5 | 放大正面原有的交叉纹，在右下留出观察提示的位置。 | 第二眼，看交叉 | 找到两条编带相遇的位置 |

**验收**　在全貌图中能指出两个局部各自的来源。近景若新增一套编法，退回重做。

S09 当前采用 [t_099 v2 正文](../content/templates/t_099/versions/v2/body.txt)。最后两行由标题与副文填写，保留用户输入的末字和标点。七次生成中三次通过，当前样例为 `x_568`、`x_569`、`x_570`。

### S10 · 读书社团的三页角色故事 · ja

一个三角耳纸狐狸发现书签、寻找书签原位、替读者夹回书中。画面每页一个动作，日文短句可独立阅读。

**底图指令**

```text
文字のないキャラクター用の見本を一枚作ってください。赤い折り紙のキツネが薄いクリーム色の机に座っています。左耳の先だけが白く、首には青い紙のスカーフ。隣に青いしおりと、文字のない閉じた本を置きます。紙の折り目が見える柔らかな切り絵風にしてください。
```

**整套共用字段**　`anchor` = 赤い紙のキツネ、白い左耳の先、青い紙のスカーフ、クリーム色の机をそろえ、切り絵の質感を保ってください。

**成图正文**

```text
参考画像を使って、読書会で投稿する {{ratio}} の物語カードを一枚作ってください。{{anchor}}{{scene}} 見出しは「{{headline}}」、小さな一文は「{{detail}}」と正確に書いてください。ほかの文字は入れず、横書きにしてください。
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 发现 | 4:5 | 机の端の青いしおりを見つめるキツネと、閉じた本を描いてください。 | あれ、しおりだ。 | 机のすみに青い一枚。 |
| 2 寻找 | 4:5 | キツネがしおりを持ち、本の真ん中をそっと開く瞬間を描いてください。 | どのページかな。 | きのうのつづきを探そう。 |
| 3 收束 | 4:5 | 閉じた本にしおりの先が見え、キツネが満足そうに座っている場面にしてください。 | ここで待ってる。 | また明日、つづきを読もう。 |

**验收**　左耳白尖始终在角色自身左侧。青色书签从桌面移到手中，最后露出书边。检查假名、小「っ」和句号。

### S11 · 今日菜单与取餐通知 · es

虚构西语餐馆推出番茄汤配面包。菜单价格固定为 8,50 €，取餐窗口固定为 13:00–15:00。注意空格、小数逗号和重音符。

**底图指令**

```text
Crea una fotografía de referencia sin texto de un cuenco blanco con sopa de tomate y un trozo de pan a su lado. Usa una mesa de madera clara y una servilleta azul a cuadros. Luz lateral de mediodía, encuadre amplio y vajilla sin marcas. No añadas otros platos, etiquetas ni letras.
```

**整套共用字段**　`anchor` = Conserva el cuenco, el pan y la servilleta azul a cuadros.

**成图正文**

```text
Crea una sola tarjeta de menú en formato {{ratio}} a partir de la foto. {{anchor}} Combina un fondo crema con tipografía azul oscuro y luz natural. {{scene}} Escribe exactamente «{{headline}}» como titular y «{{detail}}» como segunda línea. Respeta los acentos, los espacios, las cifras y los signos.
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 菜品 | 4:5 | Muestra el cuenco entero con el pan a la derecha y el nombre del plato arriba. | Menú del día | Sopa de tomate con pan |
| 2 价格 | 9:16 | Acerca el cuenco y reserva el centro despejado para el precio y lo que incluye. | 8,50 € | Incluye sopa y pan |
| 3 取餐 | 9:16 | Coloca la servilleta en la parte inferior y destaca el horario en el centro. | Recogida en el local | De 13:00 a 15:00 |

**验收**　把第二页价格与给定字符串逐字符比对。两张 Story 连续观看时，读者看得到价格、所含菜品和取餐时间，无额外套餐或折扣。

### S12 · 跑团活动回顾与致谢 · pt-BR

跑团运营可上传两张经授权的现场照片。示例用 GPT Image 做模拟现场，第一张给出集合场景，第二张记录补水点。成果文案不填写未经统计的参与人数。

**底图指令**　分两次生成，顺序为集合照、幕后照。

```text
Crie uma fotografia documental fictícia, sem texto, de três adultos de costas reunidos para uma corrida comunitária num parque. Uma pessoa usa camiseta verde, outra usa azul e a terceira usa coral. Luz suave da manhã, caminho de terra e árvores. Não inclua marcas, placas nem números de corrida.
```

```text
Crie uma fotografia documental fictícia, sem texto, de duas mãos colocando copos reutilizáveis de três cores numa mesa de apoio ao ar livre. Ao fundo, árvores desfocadas e luz suave da manhã. Não mostre rostos, marcas, placas nem letras.
```

**整套共用字段**　`anchor` = A primeira foto mostra o encontro dos três corredores e a segunda mostra a mesa de apoio. Preserve o que aparece em cada foto utilizada.

**成图正文**

```text
Crie um único cartão de retrospectiva em {{ratio}}. {{anchor}} Use margens de papel creme, títulos em verde-escuro e luz suave de manhã. {{scene}} Escreva exatamente “{{headline}}” como título e “{{detail}}” na linha de apoio. Use somente esse texto.
```

| 页 | ratio | scene | headline | detail |
| --- | --- | --- | --- | --- |
| 1 现场 | 4:5 | Use apenas a primeira foto numa janela ampla, mantendo as três pessoas no quadro. | Sábado no parque | Um encontro para correr e conversar |
| 2 幕后 | 4:5 | Use apenas a segunda foto e aproxime o enquadramento das mãos e dos copos. | Quem fez acontecer | O cuidado da equipe de apoio |
| 3 致谢 | 4:5 | Coloque uma imagem de cada foto em duas janelas separadas e deixe espaço para a despedida. | Valeu, pessoal! | Até a próxima corrida |

**验收**　第三页两张图仍以独立画格呈现。首图是三个背影，幕后图是手与水杯。检查“Sábado”“Até”“próxima”的重音。

## 6. 批次、入库与页面呈现

**制作清单。** 建议批次名为 `social-post-series-v1`，唯一候选键用 `SOCIALSERIES-01` 至 `SOCIALSERIES-12`。实施时建立 `production/social-post-series-v1/`，登记本规格版本、来源表、参考图指令与槽位、每次渲染的正文、样值、回执、审图和最终 ID 对照表。每例在 `campaign.json` 写一行 `expectedOutputs: 3`。底图另记，预计 14 次底图生成、36 次成图生成，返工另计。用相同参考文件的哈希复用媒体。裁切、缩略图和三页联览不另计成图数。[生产 CLI 说明](../production/README.md)

**分类与入口。** 一个合集收录 12 个提示词条目，按第 2 节的次序排。统一使用 `social-post` 用途。建议 S02、S11 用 `food`，S03、S05 用 `product`，S01 用 `portrait`，S08 用 `architecture`，S07、S10 用 `illustration`，S04、S06、S09、S12 用 `poster`。合集 slug 建议 `social-post-series`。首次准备时检查 slug 冲突，由准备步骤分配实际 p、t、x、a 编号，合集 ID 依库内现况分配并保留历史占用。[现有分类](../content/taxonomy/categories.yaml) · [用途词表](../content/taxonomy/use-cases.yaml)

**生成、录入顺序。**

1. 内容编辑先核对各卡三页的用途和文字，冻结样值、参考材料与各页构图。菜价、营业时间、路线、实测数据等由内容提供者确认。本站样例使用本规格给定的虚构信息。制作人先生成并验收底图，确保文件可读取，然后渲染每页的完整文本。
2. 以“候选键、页号、尝试号”生成唯一 job key。用 `content:produce plan` 冻结正文、参考图和顺序，`claim` 后把原样文本与所列底图交给 GPT Image。没有显式设置生成画幅时，job 的 `targetAspectRatio` 写 `null`。验收表单独记录期望画幅、实测尺寸和实际裁切。保存原图和真实回执，再执行 `record`、`review`。回执记录已知模型名与提供方，精确型号只据工具返回值填写。失败保留记录。改动正文、输入或参数后使用新的尝试键。[冻结任务与回执](../scripts/lib/content-production/production.ts)
3. 三页视觉都通过后，用第一页的 recipe 新建一个模板和一个衍生提示词条目。写入本例的 `promptLanguage`、五个字段、默认样值和必需参考槽。另两页沿用同一模板版本、字段和槽位，指定实际 `target.promptId`，用各自的 `sampleName`、样值和回执追加运行。核对模板渲染结果与提交给工具的 UTF-8 正文、换行及标点完全一致。三个源语言样例都可在模板中选择。已记录的正文或字段语义发生改变时按项目约定另建版本。[生产配方及追加逻辑](../scripts/lib/content-production/publish.ts) · [模板与运行约定](../content/README.md#example-runs)
4. 写入作者和改编溯源，制作卡与对应原帖一一关联。采用 `independent-adaptation` 并在 `inspirationSources` 填本例候选键、作者、原帖、核查时间、证据链接和方法。未采集互动数据时 `metrics: []`。为生成底图保留独立原文、哈希与“本站合成示范”的署名。记录实际审图人和译审方式。按 `recipe-hash → prepare → apply` 处理已审核内容，使用 prepare 返回的真实哈希。每例 `acceptedExampleIds` 填入三次实际通过的运行 ID。[来源字段](../scripts/lib/content/schemas.ts) · [覆盖率算法](../scripts/lib/content-production/coverage.ts)
5. 现有 recipe 的页面文案和 alt 接受英文及简中。沿用已完成批次的多语言候选集成方式，在隔离候选树上补齐当前启用语言需要的页面、alt、槽位、字段标签、合集、本地化指纹及审核记录，再核对整批差异。界面译文和原始 prompt 语言独立。模板切换页面语言时仍能复制实测原文。共用文件有漂移时从当前内容重算 ID 和准备哈希。[本地化工作流](localization-workflow.md) · [已完成的多语言图像批次](../production/everyday-photo-edit-v1/README.md) · [语言注册表](../content/locales.yaml)

**用户看到什么。** 在详情正文按 1、2、3 明写每页的版位、用途和标题，并提供三张可分别打开保存的成果链接，另列无字底图链接。正文可按顺序使用现有的 `<Figure asset="实际媒体ID" caption="页号和用途" />` 展示页面。原图地址用项目媒体解析器按真实资产生成，以支持子路径和 CDN。额外裁出的发布版用既有媒体导入流程登记并与原件 ID 配对，记为发布衍生图。若 Figure 只有展示能力，实施时为其补上对应原件链接并核对点击目标。[正文组件约定](../content/README.md#what-the-body-may-contain) · [媒体地址解析](../src/modules/media/index.ts) 默认封面、默认样例和 `showcaseExampleId` 指向第 1 页。当历史运行区按测试日期排序时，仍可从正文顺序找到三页。模板编辑器切换三个样例时，正文、字段、输入和成果一起核对。自定义值沿用未实测状态。需要精确画幅的发布版另列下载链接，主展示运行始终对应其真实原件。[运行展示](../src/ui/prompt-detail/ExampleRuns.tsx) · [模板编辑器](../src/ui/template-editor/TemplateEditor.tsx)

## 7. 上线候选的验收清单

| 谁来验 | 通过条件 | 未通过时怎样处理 |
| --- | --- | --- |
| 审图人员逐图查 | 36 页分别用原尺寸和 360 px 宽度查看。按第 5 节核对主体、画幅、视觉连续性、标题和副文。每页文字与样值逐字符比对，可用 OCR 辅助，再按原文目读。记录实测宽高与结果。 | 人名、菜单价格、日期、数值、重音、假名、汉字或主体特征错一处即退回。保留失败图和原因，另开尝试。 |
| 内容编辑按套查 | 12 套各有三个不同发布任务或阅读步骤。同帖轮播方向和尺寸一致。三张独立文件都可用，跨版位的构图针对横竖空间重排。读者在第三页能完成场景表所述动作。 | 联览图不能顶替独立页面。若只有裁切变化却丢掉标题或主体，重做相应版位。 |
| 入库维护者查 | 12 个提示词、12 个模板、1 个合集、14 张独立底图、36 张通过的独立成果，50 个独立原件哈希。每例在本次发布清单中选用三个验收运行。已替换版本的运行和回执单列保留。按实际 prompt 语言得到 en 18、zh-Hans 9、ja 3、es 3、pt-BR 3。每次运行能反查实际输入、原文、样值与输出。 | 查重以原件哈希和运行绑定为准。重试、裁切和预览图单列。缺项在批次状态中列明。 |
| 页面验收人员查 | 手机上从合集进入 S01、S02、S05、S11 验证横竖重排、轮播、双图顺序和非英语文字。全部 12 套做顺序与复制核对，抽查桌面、手机和源语言页面的底图／结果下载。搜索“视频封面”“菜单”“lunch”“buying guide”可找到相应案例。 | 对照真实内容改标题、描述或链接。核对复制原文的哈希匹配该页记录。 |
| 发布维护者查 | 通过 `npm run content:produce -- status --campaign social-post-series-v1` 返回的 `coverage` 核对 12／12、36／36。运行 `npm run content:validate`、`npm run locale:check -- --all --strict` 和 `BUILD_MODE=production npm run build`，用打包产物验证页面和媒体路径。报告区分本地验收与正式上线。 | 保留失败命令与具体条目，修正后重跑受影响检查，再生成最终覆盖报告。[生产批次流程](../production/README.md) |

**完成标志。** 交付一个可浏览的合集、每套三张可独立保存的图、对应底图和能复现每页的提示词，以及含来源、资产 ID、样值和审图结果的批次报告。2026-11-27 完成本地集成与打包验收。实际编号见[ID 对照表](../production/social-post-series-v1/id-map.json)，S05、S06 的发布版留白尺寸及全部运行与裁切哈希见[逐页验收](../production/social-post-series-v1/asset-acceptance.json)。
