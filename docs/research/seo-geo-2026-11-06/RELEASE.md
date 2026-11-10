# 公开技术验收记录

[PR #1](https://github.com/picontapLab/prompt-seen/pull/1) 对应的页面已在 https://promptseen.dev 发布。公开页面的 [build.json](evidence/production-after/build.json) 记录应用版本；本文件保留技术验收结果和已知限制。账户后台操作、部署日志和内部发布流程保留在私有记录中。

本记录补充[技术审计报告](REPORT.md)。部署成功不代表搜索收录、流量或 AI 引用提高。

## 实际发布范围

- 四个英语页面：p_123、t_017、p_153、p_218；保持一个参考图商品视觉意图簇。共享 Markdown 导出修复保留有序输入、slot 标签和原图地址，作用于现有 134 个有参考图的文档。
- 原始 prompt、输入/输出字节、模型记录和训练爬虫政策均未修改。参照页 p_151 的 Markdown 与生产基线逐字相同。
- 为执行发布检查，修正一个搜索测试的重复索引构建、两个真实图片集成测试的超时，以及署名 HTTP 测试对空作者字段的错误假设。最终应用 diff 见 PR；原始六文件业务改动见 [implementation.patch](implementation.patch)，额外测试改动和验证记录见 [release-preflight](evidence/release-preflight/NOTES.md)。

## 生产技术验收

| 验收项 | 已验证结果 | 记录 |
| --- | --- | --- |
| 页面版本 | 公开构建标识与验收版本一致；canonical 主机检查通过 | [build.json](evidence/production-after/build.json) |
| 全站既有线上脚本 | 20 passed / 2 warnings / 0 failed。两个既有警告为移除页 404 而非 410、直达错误页 200 但带 noindex | [check-live.txt](evidence/production-after/check-live.txt) |
| 五个选定页面 | HTML/Markdown 200、无 JavaScript 正文、准确 prompt、canonical、可索引指令、双向 en/zh-Hans、JSON-LD 内容及输入顺序通过 | [verification.json](evidence/production-after/verification.json)；同目录原始 HTML/headers/Markdown |
| 输入与输出 | 8 个实际生产原图 HTTP 200；全部 SHA-256 与原始媒体记录一致；4 份生成回执仍匹配 | [original-assets.json](evidence/production-after/original-assets.json) |
| 政策和参照 | robots.txt 与基线逐字相同；p_151 Markdown 与基线逐字相同；四页 sitemap lastmod 为实际编辑日 2026-11-06 | [invariants.json](evidence/production-after/invariants.json)、[robots.txt](evidence/production-after/robots.txt)、[站点地图](evidence/production-after/en-sitemap.xml) |

**发布限制：全量 WebKit 回归没有通过。** 托管 runner 多次在 WebKit 阶段收到 shutdown 信号；本机尝试补齐时也出现长时间卡死，两个 Explore 用例在重试后仍失败，随后明确中断。本机完整子路径补测未执行。根因未知，不能声称这些问题已修复或已证明与改动完全无关。

已通过的是 384 个单测、生产构建、22 项 SEO HTTP 测试（1 项 production 草稿条件跳过）、五页专项验证，以及托管环境根路径/子路径的前两个分片（HTTP、Chromium、大部分 Firefox，存在记录在案的重试通过项）。16 项本机 WebKit 布局验收曾单独通过，但不替代完整回归。详见[通过的托管任务](evidence/release-preflight/hosted-passed-jobs.json)、[未完成的本机日志](evidence/release-preflight/local-root-shard3-incomplete.txt)和[失败页面记录](evidence/release-preflight/webkit-failures/)。

## 效果验收范围

公开技术记录不包含 Search Console、Bing Webmaster 或 Cloudflare 账户内数据。后续索引、重抓、曝光、点击与 AI 引用评估应遵循 [报告中的观测协议](REPORT.md#seo--geo-后续观测协议)，在私有记录中保管后台原始数据，并在发布摘要前复核。
