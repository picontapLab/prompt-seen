# GPT Image 2.6 GIF 调研来源（2026-11-07）

## 方法与证据

抓取时间约 2026-11-07 16:26–16:36 America/Los_Angeles。此为检索样本排名，不是全网穷尽榜。按点赞降序，同点赞按转发降序。点赞以 X 官方公开嵌入接口 favorite_count 为主；转发由 FxTwitter 公共镜像 retweets 提供（不是官方 API，本次镜像点赞与官方一致）。各帖精确缓存生成时间不可知，故不是保证同步的实时计数。原始 JSON 保存在相邻证据目录。

原帖媒体 animated_gif 为强格式证据；video 仅当作者明确声明是 GIF 展示时纳入。模型归属以作者公开声明为依据，非独立重跑证明。高关注度但无原提示词者不强行补写。

## 12 条排序候选

全部12条已定位作者本人原提示词帖子或回复。第10与12条经公开线程镜像补全回复ID，再用X官方嵌入接口核对作者及回复元数据，完整长文本通过FxTwitter同ID获取。

|名次|作品/作者|点赞|转发（镜像）|原作|原提示词来源|证据限制|
|---:|---|---:|---:|---|---|---|
|1|角色从画面外弹跳登场 / @YU_TAI2414|1117|77|[原帖](https://x.com/YU_TAI2414/status/2118343700929753503)|[作者原帖或回复](https://x.com/YU_TAI2414/status/2118343700929753503)；primary|需角色参考图；原帖 animated_gif。|
|2|Q版中文反应表情包 / @0xluffy_eth|1020|102|[原帖](https://x.com/0xluffy_eth/status/2118235544459387112)|[作者原帖或回复](https://x.com/0xluffy_eth/status/2118235547454083357)；primary|需角色参考图；原帖两张 animated_gif，共用帖子指标。|
|3|金门大桥、斗兽场、富士山旅行海报循环 / @devteamdrew|557|36|[原帖](https://x.com/devteamdrew/status/2118308538564989025)|[作者原帖或回复](https://x.com/devteamdrew/status/2118538745175503130)；primary|同帖3件作品只占1名；作者回复含3套完整提示词。|
|4|灰色走廊与长臂人偶 GIF 原稿 / @cocktailpeanut|275|17|[原帖](https://x.com/cocktailpeanut/status/2118408795026043260)|[作者原帖或回复](https://x.com/cocktailpeanut/status/2118408801812643957)；primary|作品帖是 GIF 与 Minimax H3 视频对比；只取作者明确标注的 GIF 原稿，排除 H3 视频成品。|
|5|夏日花园喷水女孩 / @nima2qisi2|175|14|[原帖](https://x.com/nima2qisi2/status/2118150226330734787)|[作者原帖或回复](https://x.com/nima2qisi2/status/2118150229811920912)；primary|原帖 photo + 两张 animated_gif；提示词含10秒/30fps要求，不能当作实际输出参数。|
|6|3D游戏资产360度旋转 / @xikhar|152|8|[原帖](https://x.com/xikhar/status/2118407355859878352)|[作者原帖或回复](https://x.com/xikhar/status/2118409026044403849)；primary|同帖4张 animated_gif；作者回复4条原提示词。|
|7|蓝发角色吃饭“真香” / @Gorden_Sun|152|4|[原帖](https://x.com/Gorden_Sun/status/2118166046175908016)|[作者原帖或回复](https://x.com/Gorden_Sun/status/2118166046175908016)；primary|需参考图；原帖公开一行提示词。|
|8|大肥鱼反应表情包 / @op7418|145|7|[原帖](https://x.com/op7418/status/2118181775688241456)|[作者原帖或回复](https://x.com/op7418/status/2118181972451438662)；primary|需参考图；作者回复完整模板；同帖4张 GIF。|
|9|投篮表情 GIF / @crayon1267|124|11|[原帖](https://x.com/crayon1267/status/2118186300339892472)|[作者原帖或回复](https://x.com/crayon1267/status/2118186300339892472)；primary|需12帧动作参考图；原帖公开GIF合成指令，未取得参考图最初生成提示词。|
|10|精神稳定藏狐与内阁打工人 / @vastxie|107|10|[原帖](https://x.com/vastxie/status/2118265895613346263)|[作者原帖或回复](https://x.com/vastxie/status/2118586752915095805)；primary|原帖明确gpt-image-2.6与GIF格式；完整原模板已在作者回复核验。|
|11|企鹅角色喜怒哀乐 / @tetumemo|83|9|[原帖](https://x.com/tetumemo/status/2118129204449697985)|[作者原帖或回复](https://x.com/tetumemo/status/2118129204449697985)；primary|X保存为video；作者明确说用引用中的原提示词生成喜怒哀乐GIF，属于GIF演示视频。|
|12|炭治郎像素水之呼吸 / @Mayz1169|64|8|[原帖](https://x.com/Mayz1169/status/2118245929505669260)|[作者原帖或回复](https://x.com/Mayz1169/status/2118246507128541553)；primary|原帖 animated_gif+reference；完整原提示词已定位作者本人回复。|

## 原提示词定位与摘录

长提示词通过作者原帖/回复访问全文；下列只保留短摘录，不把解释或仿写当作原词。

- 角色登场：作者原帖以「ワイ」引出本人请求。短摘录：`この画像の女の子を可愛く画面外から登場`。需附原图。
- 路飞：完整原模板在 https://x.com/0xluffy_eth/status/2118235547454083357 。作者模板保留主题填空，不能认为任意主题都已测试。
- 旅行风景： https://x.com/devteamdrew/status/2118538745175503130 含 #1金门大桥、#2斗兽场、#3富士山的三段英文提示词。短摘录：`A living mid-century gouache travel-poster painting of the Golden Gate Bridge seen from a beach`。
- 走廊： https://x.com/cocktailpeanut/status/2118408801812643957 原帖 Step1 为5秒10帧 GIF；主帖说15秒是后续流程叙述，不把它混作原稿参数。短摘录：`Generate a 5-second animated GIF consisting of 10 evenly spaced animation frames.`
- 夏日花园：完整长词在 https://x.com/nima2qisi2/status/2118150229811920912 。只有开头公开于官方嵌入截断文本，全文已通过 FxTwitter 相同回复恢复。
- 3D资产旋转：作者回复给出4条；其中矮人完整短词：`create a gif of a "3d dwarf game model carrying a huge axe on his shoulders" spinning full 360 degrees`。不要把其余三条复制进同一报告以超出同来源引用限制。
- 真香：原帖提示词短摘录：`使用这个角色，生成一张GIF图`；完整单句位于原帖。
- 大肥鱼：作者回复长模板，需附原角色图并填写最终主题。完整作者回复见表。
- 投篮：作者原句：`创建一个gif，按照附图的动作顺序生成。` 这是图到GIF阶段的完整指令；需要原帖动作顺序参考图。
- 藏狐：作者本人原模板 https://x.com/vastxie/status/2118586752915095805 ，经原线程、官方嵌入及同ID全文镜像核验。
- 喜怒哀乐：作者原句：`このキャラの喜怒哀楽のGIFよろ`。需附角色静态图。
- 炭治郎：作者本人原词 https://x.com/Mayz1169/status/2118246507128541553 ，经原线程、官方嵌入及同ID全文镜像核验。

## 低关注度备选

以下作者也有直接公开原词，但关注度低于当前Top12：

- 38赞/2转（镜像），@munou_ac，https://x.com/munou_ac/status/2118220485150535796 。animated_gif，明确ChatGPT Images2.6。完整原词：`参照画像のキャラクターが
ダンスするGIFを作ってください`。需角色参考图。
- 21赞/1转（镜像），@SSHCodes，https://x.com/SSHCodes/status/2118127375481504100 。animated_gif，明确gpt image2.6。完整原词：`generate a gif of a pelican riding a bicycle`。

## 不纳入主榜与原因

- @gabrielchua 288赞/21转： https://x.com/gabrielchua/status/2118135343354720648 ，明确Flare的站立后空翻GIF比较，但没有原始prompt字符串，只是作者描述其请求。不能把描述当精确原词。
- @GrayNoteLab 616赞： https://x.com/GrayNoteLab/status/2118255007564763207 ，原帖是36宫格转GIF教程，当前官方嵌入无媒体附件，暂不把教程点赞当特定GIF作品点赞。
- @MiraMusic_AI 148赞/13转： https://x.com/MiraMusic_AI/status/2118513591490163168 ，有原词与视频，但原词与原帖未明确GIF格式，暂不作已验证GIF。
- 官方发布帖点赞不能挪用给发布页中的多件不同演示。
- GitHub与目录收藏、站内喜欢不可当X帖子点赞。AgentCraft 895、GPTProto113与官方1020（路飞同帖）是不同快照，不可混算。

## 资料来源

- Discovery: https://github.com/GPTProto/awesome-gpt-image-2.6-gif （52个完整词条、87个仅展示词条）
- Discovery: https://agentcraft.dev/en/prompts/image/gpt-image-2-6/
- Discovery: https://github.com/zhuyansen/awesome-chatgpt-images-2.6
- 官方X嵌入证据格式：`https://cdn.syndication.twimg.com/tweet-result?id=POST_ID&lang=en&token=1`
- 镜像补充证据格式：`https://api.fxtwitter.com/status/POST_ID`

补充检查：shinshin86 25赞的角色可爱动作原词在主帖直接可见；uzuyanurp 23赞与dextune22赞主帖提示词截断或位于回复。这些关注度低于第12名64赞，因此不影响最终排序。
