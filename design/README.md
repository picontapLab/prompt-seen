# 设计资产

本目录保存 Prompt Seen 已选定的视觉方向资产：暗房方向（A），提示词标注采用校样方向（C）的字母与高亮。规格以 [设计文档](../prompt-library-website-design.md) 第 11.1.9 节为准，本目录中的文件是它的可视化参考。

## 目录

| 路径 | 内容 |
| --- | --- |
| `tokens/darkroom.css` | 功能层与品牌层 token（CSS 自定义属性），默认跟随系统主题，`data-theme` 可覆盖；第 1 阶段迁入 `src/styles/tokens/` |
| `tokens/darkroom.tokens.json` | 同一组 token 的 JSON 版本，由 `darkroom.css` 生成 |
| `visual-direction/darkroom/home.html` | 首页首屏：展出作品、片边与帧号、字母标注、更多展出 |
| `visual-direction/darkroom/feed.html` | 连续列表：等高行、悬停与收藏状态、21:9 特写行、加载占位与状态行 |
| `visual-direction/darkroom/detail.html` | 详情：片边舞台、字母标注、Prompt 纸张、测试记录 |
| `visual-direction/darkroom/phone.html` | 手机首页（390 × 844） |
| `visual-direction/annotation-reference/` | 校样方向的首页与详情，仅作为字母标注（高亮、引线、字母标签）的来源参考，其余视觉不采用 |
| `visual-direction/images/` | 方向稿使用的占位图片 |
| `visual-direction/screenshots/` | 上述页面的截图，含深浅两种主题 |

## 查看方式

直接用浏览器打开 HTML 文件。页面需要联网加载 Google Fonts。

- 在地址后加 `?theme=light` 或 `?theme=dark` 切换主题；桌面页面右上角的主题按钮也可切换。
- 页面之间的主要链接可以点击，例如首页的“Open frame 0127”进入详情。

## 与方向稿画布的关系

三个方向的完整探索保存在画布 [Prompt Seen Visual Directions](https://claude.ai/artifact/EiDg5dKjQdvb8dZQPp21UE)（私有链接）。本目录导出的暗房页面与画布有一处有意的差异：画布中 A 方向用数字标注，这里已改为第 11.1.9 节选定的字母标注。

## 不带入实现的内容

- 图片由程序生成，只是占位；“Model A”“Model B”、帧号与“120 frames”等数字均为示例。
- 悬停、当前标注与收藏状态以静态方式画出，交互行为以设计文档第 11.8 节为准。
- 这些 HTML 是视觉参考，不是实现代码；组件结构以设计文档第 4、11 章为准。
