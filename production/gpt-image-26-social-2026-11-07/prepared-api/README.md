# 原生 GIF API 请求草稿（未提交）

`g17-native-gif.request.json` 对应 `POST https://api.openai.com/v1/images/generations`，保留 G17 作者原词。模型与 GIF 设置是正式请求字段，不是追加提示词。9 帧、200 ms 是本次准备参数，并非原作者明确要求。

当前未调用 API，未产生生成回执或成品。进程环境未配置 `OPENAI_API_KEY`；内置工具没有模型/格式选择字段，随附 CLI 也不支持 GIF。后续需要可用的原生 GIF 接口和相应账户权限，才能执行并验收。不要把 API 密钥贴进聊天。

成功时直接将返回的 `data[0].b64_json` 解码为原生 GIF 文件，不合成、不转码；验收真实格式、帧数、时长、动作与循环，再登记新的实际调用回执。

依据：[OpenAI 官方文档](https://developers.openai.com/api/docs/guides/image-generation#generate-animated-gif-output)。
