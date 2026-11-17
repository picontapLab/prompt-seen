# 繁体中文实施与验收

全量内容已完成、经三个独立 AI subagent 审阅并导入。工作分支 `codex/traditional-chinese-localization`，工程基线 `53cbc8ef`。注册表已设为 `enabled: true / preview: true`，策略为 `complete / fingerprint / source-only`。这是本地生产候选，未提交、未部署。

## 内容完成度

严格 `locale:check --locale zh-Hant --json --strict` 通过：`ready: true`、`blocking: false`，无 findings。

| 内容单元 | 已完成 / 总数 |
| --- | ---: |
| Prompt 说明 | 285 / 285 |
| 模板说明 | 75 / 75 |
| 合集 | 16 / 16 |
| 专题 | 3 / 3 |
| About、License | 2 / 2 |
| 全部页面 | 381 / 381 |
| UI 消息 | 427 / 427 |
| 共享解释字段 | 1,793 / 1,793 |
| 全部字段 | 2,220 / 2,220 |

381 页均为 current、published、indexable；missing、draft、outdated、unreviewed、archived、invalid、fallback 全部为 0。三个 subagent 审阅后修订了 313 个页面对象、224 个字段；2,601 条审批均匹配最终源文与译文指纹。38 批已通过既有 importer/promoter。详见 `evidence/readiness.json`、`evidence/promotion.json` 与 [审阅证据](review-evidence.md)。

363 个媒体资产匹配既有实际审查哈希；38 个 GIF 关联全帧历史证据。主代理另实际查看 8 图并记录观察。修正了 3 处错误的英文 alt，并由 subagent 同步复审五个完整语言的 15 个相关译文。除这些明确记录的 alt 修正外，已有语言内容保持原义与值；2,896 个原始媒体与 Prompt／模板文本文件字节一致。模板默认值、枚举、约束、模型事实均未改变。

## 自动化验收

- 8 个 enabled 语言全部 `ready: true / blocking: false`；预览专用 ar 仍未 ready，不冒充完成。
- 内容校验：0 errors、0 publish errors；10 个既有简体过期警告。
- 类型检查、修改代码 ESLint、设计 token 校验、Storybook 构建通过。
- 最终全量单测：67 个测试文件、686/686 项通过，0 skipped（独立运行、`--maxWorkers=2`）。日志与摘要见 `evidence/checks-final.json` 和 `evidence/logs/`。
- 修复纯类别查询排序后，搜索及导出针对性回归 106/106 通过；27 个冻结真实繁体搜索用例全部运行通过。
- 原始 Prompt 语言、canonical、hreflang、Open Graph、noindex、404、Worker 搜索、输入法合成事件、模板输入／复制／下载、390px／1280px 布局、TC 字体及 axe 检查均使用静态打包产物验证。

| 候选 | build ID | 浏览器／HTTP 结果 |
| --- | --- | --- |
| 子路径预览，繁体仅 preview | `zh-hant-reviewed-preview` | 30 passed，1 skipped |
| `/prompt-seen` 生产 | `zh-hant-reviewed-subpath` | 31 passed |
| 根路径生产，含全站 SEO | `zh-hant-reviewed-root` | 102 passed |

每份候选均运行 Chromium、Firefox、WebKit。预览唯一跳过项是完整语料中不存在的 fallback 示例；其余测试没有因语言缺失跳过。生产根路径另覆盖既有全站 sitemap、结构化数据及 Markdown 导出 SEO 检查。产物配置、索引原始／gzip 字节、HTML 数量和大小见 `evidence/artifact-*.json`。根路径接入前快照使用同一工程基线，但内容审校前后并非严格相同源树，不能将该对比声称为隔离性能实验。

## 边界与后续

- 没有运行真实系统注音、拼音、仓颉或辅助技术人工验收；合成 composition 和 Safari 229 事件不代表这些人工检查。
- 没有执行正式部署、线上核对或搜索引擎收录确认；没有创建部署审批记录。
- Next.js 在根路径构建时发出已知安全问题升级提示；首次中止，重试后构建成功且提示仍在。本轮未升级依赖，应另行处理。未独立确认具体漏洞编号或影响范围。
- 初次验收暴露「模板」纯类别查询排序及测试入口问题，均已修复并由 subagent 复审。与构建并行的全量单测发生过资源超时；最终结果以独立复跑的日志为准。

## 维护

原始 preparation 为冻结候选来源，保留历史索引，不可重生成或直接覆盖已导入译文。`integrate-reviews.mjs` 拒绝覆盖已 promote 的审批；后续源文变化必须建立新的输入／审阅／导入计划。纯类别查询规则限定完整匹配注册词，复合查询及其他语言仍按原相关度，不硬编码内容 ID。
