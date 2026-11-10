# GPT Image 2.6 多语种 GIF 新增调研（2026-11-07 PT）

## 结论

本轮去重后找到日语与土耳其语三条「原GIF + 明确2.6归属 + 原作者提示词 + 点赞/转发证据」新样本，最高68赞，不超过上一轮Top12较高名次，不能称为又发现一批千赞爆款。另有84赞、65赞日语作品，模型和GIF格式可核验，但没有找到原提示词。未为凑满12条降低标准。

基线去重：上一轮最终静态12 + GIF12；没有修改旧报告或汇总。此次也记录英语发现以供主调研合并。

## 本轮新增、原词完整可定位

|作品|语言|点赞|转发|原帖|原提示词|
|---|---|---:|---:|---|---|
|角色微眨眼 / magu@ai|日语|68|5|[作品](https://x.com/magu_ai_h/status/2118268865868362147)|[作者回复](https://x.com/magu_ai_h/status/2118288125873250766)：`まばたきしてるGIF作ってください！`|
|猫Robin眨眼、带名字的帽子落下 / Ozan Sihay|土耳其语|37|3|[作品及原词](https://x.com/ozansihay/status/2118238946412953985)|`Kedimiz Robin’in GIF'ini oluştur. Kameraya baksın göz tek gözünü kırpsın ve kafasına Robin yazan bir şapka düşsün.`|
|角色喜悦之舞 / ちび名那詩|日语|25|3|[作品及原词](https://x.com/thibi_nanashi/status/2118136361584877622)|`次の内容で GIF を作成して: 踊らせる、喜びの舞`|

三帖官方嵌入都标注 `animated_gif`。前两条需要原角色/猫的照片；第三条帖中没有完整解释此前输入上下文，不能保证只用这一句可复现同一个角色。

提示词中文释义：①请做一个正在眨眼的GIF。②把我们的猫Robin做成GIF，让它看镜头、眨一只眼，并让写着Robin的帽子落到头上。③按照以下内容生成GIF：让角色跳舞、跳喜悦之舞。释义不是原提示词。

## 热度稍高但原词缺失，单独保留

|作者|赞/转|已证实|缺口|
|---|---|---|---|
|[TlanoAI](https://x.com/TlanoAI/status/2118171048634134838)|84/9|作者写ChatGPT Images2.6、媒体animated_gif|检查可读原线程后仍没有原词|
|[AM09_21](https://x.com/AM09_21/status/2118143217434800219)|65/0|作者写GPT Image2.6(GIF)、媒体animated_gif|夏日祭烟花测试，没有原词；作者也提及动态/静态混合时画面崩坏|
|[himenoji52](https://x.com/himenoji52/status/2118727426524270834)|34/0|images2.6、吃饭循环、animated_gif|没有原词|
|[seosoyoung_ai](https://x.com/seosoyoung_ai/status/2118142838198169750)|5/0|韩语作者明确gpt-image-2.6-flare、6帧参考图编辑GIF，媒体animated_gif|未公布请求原词；14秒是作者自报耗时，不能视为独立性能验证|

## 英文检索中一并发现

|作者/作品|赞/转|原提示词|取舍|
|---|---|---|---|
|[Voxyz_ai：法师旋杖](https://x.com/Voxyz_ai/status/2118750260549796019)|22/0|主帖有完整词；短摘录：`Turn this character image into a seamless looping GIF, 12 frames at 100 ms per frame.`|原媒体animated_gif；可复用参考图动作模板，但不算高热|
|[createwithtimi：闹钟跳跃](https://x.com/createwithtimi/status/2118724550602964999)|16/0|未见原词|主帖为AI探索加Rive手工重做，不能把Rive结果当GPT原生GIF；[作者对比回复](https://x.com/createwithtimi/status/2118724581229744318)只有1赞，含两张GIF，明确左Rive右ChatGPT|
|[thealexbanks：8bit Johnny Bravo跳舞](https://x.com/thealexbanks/status/2118755226555490395)|4/0|`make a raving 8bit johnny bravo`|作者明确Images2.6 GIF，发布为加音乐的视频；不把音乐部分当模型输出|
|[bananaprompts：黑白生活片段](https://x.com/bananaprompts/status/2118731413805535723)|2/0|主帖未公开|四张animated_gif，明确GPT Images2.6，不能按账号体量推断这帖热度|

## 搜索覆盖与没找到的部分

共做6批24个搜索查询，包含日语（プロンプト、作ってみた、作った）、韩语（프롬프트、만들）、西班牙语（creado、hice、me gusta）、葡萄牙语（criei、curtidas）、法语（français）、德语（deutsch、erstellt）、土耳其语（yaptım）及泰语提示词检索。没有把翻译成某语言的官方新闻页或模板站，当作该语种社交原作。

西语、葡语、法语、德语检索主要返回发布新闻、官方本地化页面、工具教程，未取得同时符合模型归属、GIF原作、原词、可比社交指标的高热样本。韩语找到5赞Flare原作但无原词。日语找到最多实际创作者原帖。无法用这些结果证明其他语言不存在热门作品，只能说明当前可检索证据不足。

补充检索了GPTProto目录、Felo约95条索引中的23个新增GIF详情页，并逐条回到X原作者核对。公共镜像搜索端点请求失败，未将此路径视作覆盖了X全站。Felo站内likes/views不用于X排名。

## 核验方法与证据

统计日期2026-11-07 America/Los_Angeles。X点赞取官方公开 `cdn.syndication.twimg.com/tweet-result` 的 `favorite_count`；转发和长帖文本来自 `api.fxtwitter.com/status/ID`，明确是二级镜像。精确缓存时间未知。每帖日期、作者、媒体类型在原始JSON中保留。

证据目录：`docs/research/gpt-image-2.6-multilingual-evidence-2026-11-07/gifs/`。
- `new-candidates.json`：本轮29个原作及提示词回复候选（不是29个合格作品）。
- `new-verified-prompts.json`：5条作者原词可定位新样本（日/土3条，英语2条）。
- `POST_ID.json`：X官方嵌入原始证据。
- `POST_ID.fx.json`：FxTwitter完整文本/转发证据。
- `POST_ID-thread.html`：公开线程镜像，保留提示词回复关联。

搜索来源例：[日语原作者](https://x.com/magu_ai_h/status/2118268865868362147)、[土耳其语原作者](https://x.com/ozansihay/status/2118238946412953985)、[韩语原作者](https://x.com/seosoyoung_ai/status/2118142838198169750)。
