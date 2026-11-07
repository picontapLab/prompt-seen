# 生产发布与搜索提交验收

**已上线：** https://promptseen.dev 。[PR #1](https://github.com/picontapLab/prompt-seen/pull/1) 已于 2026-11-07 06:51:19 UTC 合并；生产提交为 `2fb7029f63aa643af3a7a21673febda03cac390c`。[手动 Deploy 42348927089](https://github.com/picontapLab/prompt-seen/actions/runs/42348927089) 成功，Cloudflare 发布完成时间为 **2026-11-07 06:55:17 UTC / 2026-11-06 22:55:17 America/Los_Angeles**；工作流于 06:55:28 UTC 完成。实际生产 [build.json](evidence/production-after/build.json) 与该 SHA 一致。

本记录补充[原始审计报告](REPORT.md)。用户在本地审计后明确授权提交、合并、部署和必要操作。没有把部署或请求入队计作收录、流量或 AI 引用提升。

## 实际发布范围

- 四个英语页面：p_123、t_017、p_153、p_218；保持一个参考图商品视觉意图簇。共享 Markdown 导出修复保留有序输入、slot 标签和原图地址，作用于现有 134 个有参考图的文档。
- 原始 prompt、输入/输出字节、模型记录和训练爬虫政策均未修改。参照页 p_151 的 Markdown 与生产基线逐字相同。
- 为执行发布检查，修正一个搜索测试的重复索引构建、两个真实图片集成测试的超时，以及署名 HTTP 测试对空作者字段的错误假设。最终应用 diff 见 PR；原始六文件业务改动见 [implementation.patch](implementation.patch)，额外测试改动和验证记录见 [release-preflight](evidence/release-preflight/NOTES.md)。

## 生产技术验收

| 验收项 | 已验证结果 | 记录 |
| --- | --- | --- |
| 实际部署 | Cloudflare Pages 成功；生产 SHA 精确匹配；平台地址 noindex 与 canonical 主机检查通过 | [部署元数据](evidence/production-after/deployment.json)、[日志摘录](evidence/production-after/deployment-log-excerpt.txt) |
| 全站既有线上脚本 | 20 passed / 2 warnings / 0 failed。两个既有警告为移除页 404 而非 410、直达错误页 200 但带 noindex | [check-live.txt](evidence/production-after/check-live.txt) |
| 五个选定页面 | HTML/Markdown 200、无 JavaScript 正文、准确 prompt、canonical、可索引指令、双向 en/zh-Hans、JSON-LD 内容及输入顺序通过 | [verification.json](evidence/production-after/verification.json)；同目录原始 HTML/headers/Markdown |
| 输入与输出 | 8 个实际生产原图 HTTP 200；全部 SHA-256 与原始媒体记录一致；4 份生成回执仍匹配 | [original-assets.json](evidence/production-after/original-assets.json) |
| 政策和参照 | robots.txt 与基线逐字相同；p_151 Markdown 与基线逐字相同；四页 sitemap lastmod 为实际编辑日 2026-11-06 | [invariants.json](evidence/production-after/invariants.json)、[robots.txt](evidence/production-after/robots.txt)、[站点地图](evidence/production-after/en-sitemap.xml) |

**发布限制：全量 WebKit 回归没有通过。** 托管 runner 多次在 WebKit 阶段收到 shutdown 信号；本机尝试补齐时也出现长时间卡死，两个 Explore 用例在重试后仍失败，随后明确中断。本机完整子路径补测未执行。根因未知，不能声称这些问题已修复或已证明与改动完全无关。

已通过的是 384 个单测、生产构建、22 项 SEO HTTP 测试（1 项 production 草稿条件跳过）、五页专项验证，以及托管环境根路径/子路径的前两个分片（HTTP、Chromium、大部分 Firefox，存在记录在案的重试通过项）。16 项本机 WebKit 布局验收曾单独通过，但不替代完整回归。详见[通过的托管任务](evidence/release-preflight/hosted-passed-jobs.json)、[未完成的本机日志](evidence/release-preflight/local-root-shard3-incomplete.txt)和[失败页面记录](evidence/release-preflight/webkit-failures/)。

分片与单 worker 的 CI 配置实验未解决问题，已全部撤回；最终 `.github/workflows/ci.yml` 与发布前相同。按已授权范围使用项目原有手动生产工作流发布，未移除保护或禁用检查。发布回退点为原生产 SHA `7ab2486c21460834dc3cbf7a20bb751baf842b3a`，可使用仓库既有 Rollback 工作流。

## 搜索操作：提交成功，不等于收录成功

| 页面 | Google 请求前显示的状态 | Google 操作结果 |
| --- | --- | --- |
| p_123 | URL unknown；last crawl N/A | [Indexing requested，加入优先抓取队列](evidence/production-after/gsc-p123-indexing-request.json) |
| p_153 | Discovered, currently not indexed；last crawl N/A | [Indexing requested](evidence/production-after/gsc-p153-indexing-request.json) |
| p_218 | Discovered, currently not indexed；last crawl N/A | [Indexing requested](evidence/production-after/gsc-p218-indexing-request.json) |
| t_017 | URL is on Google / Page is indexed | [Indexing requested，更新后重新抓取](evidence/production-after/gsc-t017-indexing-request.json) |

四条 Google 请求均在生产技术验收通过后提交，逐条核对当前检查 URL，并保存完整界面文本和时间。内部检查 ID 已脱敏。未对参照页请求索引。与初始基线相比，p_123 / p_218 的发现状态显示有变化；这属于不同时间的 GSC 报告，未取得新版本实际重抓证据，不能归因于本次内容变化。

Google [sitemap 状态仍为 Success](evidence/production-after/gsc-sitemap.json)，界面汇总发现数仍为 0；已有逐 URL 收录结果证明该汇总不能当作全站未收录结论。没有重复提交正常的 sitemap。

部署日志明确显示 **IndexNow 因缺少 INDEXNOW_KEY 跳过**。因此使用已登录 Bing Webmaster 提交四个修改页，[提交列表确认 4 条记录、当天配额剩余 96](evidence/production-after/bing-submission.json)。这是 Bing URL Submission，不冒充 IndexNow 接收或 Bing 已收录。

## 后续效果验收

部署日 D 为 **2026-11-06（洛杉矶）**。优先比较 D−28 至 D−1，即 **2026-10-09 至 2026-11-05**；这段 GSC 完整数据目前不可用，不能补作零值。逐页取得重抓时间 R_i 后，再取其后 28 个完整日。统一部署后描述窗口可用 **2026-11-07 至 2026-12-04**，但不替代按重抓时间划分，也不解决前窗口缺失。

继续使用报告中的 Google Web / US / Desktop、五页和七题固定口径，Mobile 单独统计。保留 p_151 作非随机参照。GEO 仍采用原先的 Google AI Mode 七题、每题两次新会话，记录完整回答、引用、时间和产品标识；精确模型未公开时保留 null。此前出现流量验证，本次没有绕过验证或追加即时引用测量。初始 0/14 引用率仍仅是基线。

新版本收录、重抓时间、28 天曝光/点击/CTR/位置分布和准确引用率都尚待观察。未建立定时自动化，也未改变训练授权。

本文件与生产原始响应在部署后作为审计追加提交保存在 `codex/seo-geo-evidence` 分支；生产应用保持已合并的 `2fb7029`，审计追加不需要再次部署。
