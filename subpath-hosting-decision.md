# 子路径托管决策：保留拦截路由，还是改为静态导出

> 状态：已决定。2026-10-15 采用方案 B；设计文档已按 §6 与 §7.4 修改（1.7 版）。  
> 日期：2026-10-15  
> 关联：[prompt-library-website-design.md](./prompt-library-website-design.md) v1.2 的 §3.2、§4、§9、§11.3、§15（本备忘的分析基于该版本）  
> 依据：Next.js 官方文档（当前版本 16.4，2026-10-15 查阅）、Google 搜索中心文档和静态托管平台文档，编号见文末“参考资料”。标为“推论”的内容在文档中没有原文，需要原型验证。  
> 原型验证：2026-10-15 完成，§5 要求的两项均通过，结果见 §7。

## 结论

**决定（2026-10-15）**：采用方案 B。§5 要求的两项原型验证全部通过，结果见 §7。

采用**方案 B：静态导出（`output: 'export'`）+ 真实预生成的详情页 + 基于 `history.pushState` 的客户端弹层**。

- 开源用户和宿主站只需要能提供静态文件，不需要运行和修补 Node.js 服务。
- 第一版设计用到的服务端能力只有 `next.config` 重定向、响应头和拦截路由。前两项可以由构建生成的宿主配置代替，宿主无法配置时也有可接受的退化方式（§3.3）。
- §11.3 对弹层的行为要求可以全部保留，代价是弹层的打开、关闭和数据加载改由项目自己的客户端代码负责。

两个方案都不能把同一份产物放到任意路径。`basePath` 必须在构建时确定，修改后需要重新构建 [2]。“部署到任意路径”的准确含义是“构建时可以指定任意路径”。

## 1. 与方案无关的前提

| 事项 | 文档事实 | 对项目的含义 |
| --- | --- | --- |
| basePath | 构建时内联到客户端包，修改需重新构建；`next/link` 自动加前缀，`next/image` 的 `src` 需要手动加 [2] | 构建参数 `BASE_PATH`；效果图走 CDN 绝对地址，不受影响 |
| canonical 与 hreflang | `metadataBase` 可以包含路径；以 `/` 开头的字段从 `metadataBase` 末尾拼接 [9] | 设 `metadataBase = SITE_ORIGIN + BASE_PATH`，§9.3 规则不变 |
| robots.txt | 必须位于主机根目录；爬虫不检查子目录，`/folder/robots.txt` 无效 [13] | 子路径部署时，应用自己的 robots.txt 不起作用，规则要写进宿主站的根 robots.txt |
| sitemap | 未通过 Search Console 提交时，sitemap 只影响其父目录下的地址 [14]；robots.txt 中的 `Sitemap:` 必须是完整 URL，可以在其他主机 [13] | `/prompt-seen/sitemap.xml` 正好覆盖本站全部地址。宿主在根 robots.txt 加一行 `Sitemap:`，或在 Search Console 提交 |
| 404 与 410 | Google 对除 429 外的全部 4xx 处理方式相同 [16] | 410 对收录不是必需项；宿主做不到 410 时退化为 404，不影响 SEO |
| 语言入口 | §8.2 的根地址 `/` 变为 `{BASE_PATH}/` | x-default 指向 `{BASE_PATH}/` |

## 2. 方案 A：保留拦截路由，以 Next.js 服务器加反向代理部署

### 2.1 做法

- 保留 §4 的 `@modal/(.)prompts/[slug]`、`default.tsx` 和 `[...catchAll]`。
- `next.config` 设置 `basePath`，用 `next start` 或容器运行。宿主把 `/prompt-seen` 和 `/prompt-seen/*` 原样转发到该服务，不去掉路径前缀。
- 宿主是 Next.js 时按 Multi-Zones 用 `rewrites` 转发；从宿主页面进入本站要用 `<a>`，跨 zone 是整页导航 [3]。
- Multi-Zones 文档用 `assetPrefix` 区分各 zone 的资源 [3]。推论：本项目已设 `basePath`，`/_next` 资源同样位于 `/prompt-seen/` 下，同一条转发规则即可覆盖，需在原型中确认。

### 2.2 设计功能保留情况

§3.2 的全部渲染策略和 §11.3 的弹层机制原样保留。

| 需求 | 实现 |
| --- | --- |
| 旧地址重定向（§9.5，§8.2 的 `/zh/`） | 构建时读取 `redirects.yaml`，生成 `next.config` 的 `redirects()`；source 和 destination 自动加 basePath；`permanent` 返回 308，也可指定 `statusCode: 301` [7] |
| 分页第一页重定向（§9.4） | 同上 |
| 已知地址的大小写规范化（§8.2） | 同上；如需处理任意大小写，用 `proxy.ts` |
| 410（§9.5） | `proxy.ts` 匹配构建生成的已删除清单，直接返回 `new Response(html, { status: 410 })`；Proxy 支持直接产生响应 [8] |
| 404 | `notFound()` 和分段 `not-found.tsx`，可以按 locale 输出 |
| noindex（§9.1、§15.1） | `metadata.robots` 输出 meta 标签 [9]；需要时用 `headers()` 加 `X-Robots-Tag` |
| robots.txt | `robots.ts` 放在 `app` 根目录 [10]，加上 basePath 后实际地址是 `/prompt-seen/robots.txt`，所以只在根域部署时有效；子路径部署见 §1 |
| sitemap | `sitemap.ts`，地址为 `/prompt-seen/sitemap.xml` |

### 2.3 宿主需要提供

- 能转发到上游服务的反向代理，例如 nginx、Caddy、Cloudflare，或 Vercel、Netlify 的外部 rewrite，并保留路径前缀。GitHub Pages、裸对象存储这类纯静态托管无法承载。
- 一个持续运行的 Node.js 进程或容器，以及对应的监控、重启和升级。Next.js 自托管文档建议在 `next start` 前放置反向代理；多实例或滚动发布还要处理 `deploymentId`、版本偏移和缓存共享 [11]。
- 在根 robots.txt 中加入 `Sitemap:` 行。

### 2.4 弹层无障碍与前进后退

- 拦截路由加并行路由是官方支持的弹层模式：地址可分享，刷新显示完整页，后退关闭弹层，前进重新打开 [4][5]。
- slot 状态由框架保留。软导航到不匹配的路由时 slot 仍然可见，需要 `[...catchAll]` 返回 `null` 才会关闭；整页加载时未匹配的 slot 需要 `default.tsx`，否则返回 404 [5]。§11.3.1 已考虑到这一点。这部分是框架内部行为，升级 Next.js 时要做回归测试；历史上出现过 catch-all 被错误匹配到并行 slot 的问题 [20]。
- Dialog 语义、焦点进入和恢复、Esc 关闭（调用 `router.back()` [5]）都要项目自己实现，与方案 B 的工作量相同。
- 弹层节点的生命周期由路由决定，因此 §11.3.1 限制了 `AnimatePresence` 退出动画的用法。

### 2.5 开源自托管体验

- 步骤：`BASE_PATH=/prompt-seen next build`，再 `next start` 或构建 Docker 镜像，最后配置反向代理。
- 根域名部署到 Vercel 最简单；子路径部署仍需要主站转发。
- 运行中的 App Router 服务需要及时跟进安全更新。例如 2025 年 12 月的 CVE-2025-66478 评分为 CVSS 10.0，处理攻击者构造的请求时可能远程执行代码，影响使用 App Router 的 Next.js 15.x 与 16.x；官方说明没有临时规避办法，必须升级 [12]。每个自托管者都要承担这类维护。

## 3. 方案 B：静态导出加 pushState 弹层

### 3.1 做法

- `next.config` 设置 `output: 'export'` 和 `basePath: process.env.BASE_PATH`。建议同时设 `trailingSlash: true`，使产物为 `/a/index.html`；Next.js 的 nginx 示例说明，此时不需要额外的 rewrite [1]。
- 删除 `@modal` slot 和拦截路由。所有动态段使用 `generateStaticParams`，并设 `dynamicParams = false`；静态导出不支持 `dynamicParams: true` [1]。
- 画廊卡片是指向真实详情页的普通 `<a href>`。对未按修饰键的主键点击执行 `preventDefault()`，调用 `history.pushState(state, '', 带 basePath 的详情地址)` 并打开弹层。Next.js 文档说明，原生 `pushState`/`replaceState` 会接入其路由，`usePathname` 和 `useSearchParams` 随之同步 [6]。用普通 `<a>` 而非 `<Link>`，可以避免为每张卡片预取详情页，符合 §16.4。
- 弹层是否打开，由“当前路径是详情地址且画廊仍然挂载”推导，不另存状态，符合 §11.6.1 以 URL 为权威来源的规则。
- 弹层数据：`content:build` 为每个已发布条目、每个已发布 locale 生成一份 JSON，例如 `public/generated/{locale}/prompts/{slug}.json`，在 hover 或 focus 时预取。完整页和弹层都从同一个可序列化的详情模型渲染同一个 `PromptDetailBody`，保持 §11.3“两种展示共用详情正文”。为此，MDX 说明需要在构建时编译为可序列化的形式，例如受限组件集输出的 HTML 或 AST。
- 刷新、直接访问、新标签页打开或没有 JavaScript 时，宿主直接返回预生成的详情 HTML，即完整详情页。

### 3.2 设计功能保留情况

- **保留**：§3.2 的全部预生成页面、元数据、hreflang、sitemap（导出时 Route Handler 生成静态文件，仅支持 GET [1]）、静态搜索页、explore 的 fragment 筛选、模板编辑器、本地收藏和主题。
- **失去**（静态导出不支持 [1]）：拦截路由、`next.config` 的 redirects/rewrites/headers、Proxy、ISR、Server Actions、读取请求的 Route Handler、cookies，以及默认 loader 的图片优化。第一版设计只用到其中的重定向、响应头和拦截路由。§10 的图片在导入时已生成各规格并走 CDN，不依赖默认 loader。
- **404**：导出只生成一个根 `404.html` [1]。按 locale 显示错误页，需要宿主规则（例如 nginx 分 location 配置 `error_page`；Netlify 支持按路径指定 404 页面 [17]），或在 404 页里由客户端按地址切换语言。
- **以后的服务端能力**（例如 §19.2 在线生图）：放到独立 API 服务；或去掉导出、改为服务器运行。Next.js 文档把“从静态站起步，以后再升级到需要服务器的功能”列为支持的路径 [1]。前提是代码一直遵守导出限制。

### 3.3 重定向、410、noindex、robots.txt 与 sitemap

`content:build` 根据 `redirects.yaml`、已删除条目清单和分页规则，为各类宿主生成配置。§8.2 只要求重定向“已知地址”的大小写变体，§9.4 的分页第一页也可以逐条列出，所以静态规则能满足设计要求。

| 宿主 | 301/308 重定向 | 410 | 按 locale 的 404 |
| --- | --- | --- | --- |
| nginx（参考实现） | 生成 `map`，用 `return 301` | `return 410`，配合 `error_page 410` | 分 location 配置 `error_page 404` |
| Netlify `_redirects` | 支持 301、302 [17] | 文档未列出，按 404 处理 | 支持按路径指定 [17] |
| Cloudflare Pages `_redirects` | 支持 301、302、303、307、308；上限为 2,000 条静态和 100 条动态规则 [18] | 不支持，退化为 404 | 不支持用 `_redirects` 改写为 404 [18] |
| Vercel `vercel.json` | `redirects`，可用 `permanent` 或 `statusCode` [19] | 不属于 redirects，退化为 404 | 需另行验证 |
| 无配置能力的托管（GitHub Pages、裸对象存储） | 在旧地址生成即时 meta refresh 页面。Google 把即时 meta refresh 视为永久重定向，但建议尽可能使用服务端重定向 [15] | 404 | 只有根 404 |

- **noindex**：`metadata.robots` 把 meta 标签写进 HTML，在任何宿主上都有效 [9]。预览构建由环境变量给全部页面加 noindex。`X-Robots-Tag` 响应头可选，由 nginx `add_header` 或 Vercel `headers` [19] 提供。
- **robots.txt 与 sitemap**：同 §1。根域部署时导出的 `robots.txt` 生效；子路径部署时另外生成 `robots-snippet.txt`，供宿主合并。
- **自动校验**：构建后检查每条重定向的目标都存在于产物中；CI 启动参考 nginx 容器，请求样本地址并断言 301、410、404 状态码。

### 3.4 宿主需要提供

以下三种方式任选其一，都不需要 Node.js 运行时：

1. 宿主自己的服务器把 `/prompt-seen/` 映射到产物目录，并 `include` 生成的 nginx 配置。
2. 把产物合并进宿主站的静态部署目录，同时合并生成的重定向配置。
3. 本站单独部署到静态托管，宿主用一条 rewrite 或代理规则转发 `/prompt-seen/*`。重定向配置留在本站的部署中。

打包时把 `out/` 的内容放到 `dist/prompt-seen/` 下，使文件路径与 basePath 一致，方式 2 和 3 可以直接使用。推论：导出的 `out/` 不包含 basePath 目录层级，需原型确认。

### 3.5 弹层无障碍与前进后退

| 场景 | 行为 |
| --- | --- |
| 在画廊点击卡片 | pushState 到详情地址，打开弹层，焦点进入对话框 |
| 浏览器后退 | popstate 后路径回到画廊，弹层关闭，焦点回到原卡片。画廊一直挂载，不需要恢复滚动位置 |
| 浏览器前进 | 路径变回详情地址，用缓存的 JSON 重新打开弹层 |
| 刷新或打开分享链接 | 宿主返回完整详情页 |
| 关闭按钮或 Esc | 当前历史项由本站 pushState 创建（以 `history.state` 标记）时调用 `history.back()`，否则进入当前语言列表，与 §11.3.1 一致 |
| 在弹层内打开模板、专题等其他页面 | 普通 Next.js 导航。路径不再是详情地址，弹层随之关闭，不需要 catch-all |
| 在弹层内打开相关 Prompt | 用 pushState 或 replaceState，按 §11.3.1“采用最新的有效导航”在原型中确定 |

- 建议用原生 `<dialog>` 和 `showModal()`：背景不可交互，Esc 触发 `cancel` 事件后走同一套关闭逻辑。其余要求按 WAI-ARIA Dialog 模式 [21]。
- 打开和关闭弹层时，需要自行设置和恢复 `document.title`。
- 弹层节点由应用自己掌控生命周期，`AnimatePresence` 退出动画可以正常使用，§11.3.1 对退出动画的限制可以放宽。
- 风险：pushState 与 Next.js 路由内部状态如何配合，文档只说明“会同步”[6]。需要用 Playwright 验证：快速连续点击；弹层打开后刷新再后退；在弹层内软导航后再后退；以上场景都在 basePath 下进行。

### 3.6 开源自托管体验

- 步骤：`BASE_PATH=/prompt-seen SITE_ORIGIN=https://xxx.com npm run build`，得到 `dist/` 静态文件，以及 `deploy/` 下的 nginx 配置、`_redirects`、`vercel.json` 和 robots 片段。
- 可以部署到任何静态托管，包括免费的 GitHub Pages 和 Cloudflare Pages；Next.js 提供了 GitHub Pages 部署模板 [1]。本地用任意静态文件服务器即可预览。
- 线上没有服务进程。推论：CVE-2025-66478 这类漏洞需要服务器处理攻击者构造的请求才能触发 [12]，静态部署没有这类攻击面。构建依赖仍需按期升级。
- 根域部署时 `BASE_PATH` 留空即可。

## 4. 对比

| 维度 | 方案 A | 方案 B |
| --- | --- | --- |
| 弹层实现 | 框架的拦截路由加并行路由 | 项目自己的客户端代码加 pushState |
| 运行时 | Node.js 服务或容器 | 无 |
| 宿主要求 | 能反向代理到上游 | 能提供静态文件，配置可选 |
| 重定向 | 原生支持，308 或 301 | 生成宿主配置；无配置能力时用 meta refresh |
| 410 | Proxy | nginx 支持；其余宿主退化为 404 |
| 按 locale 的 404 | 原生支持 | 依赖宿主规则或客户端处理 |
| noindex | meta 标签或响应头 | meta 标签；响应头取决于宿主 |
| robots.txt 与 sitemap | 子路径下都由宿主根 robots.txt 负责 | 同左 |
| 弹层退出动画 | 受路由生命周期限制 | 应用自行控制 |
| 框架升级风险 | 拦截路由与并行 slot 的行为 | pushState 与路由的同步行为 |
| 运维与安全 | 持续修补运行时 | 只需升级构建依赖 |
| 更换部署路径 | 重新构建 | 重新构建 |
| 以后增加服务端功能 | 直接在应用内添加 | 独立服务，或改为服务器模式 |

## 5. 建议

采用方案 B，理由如下：

1. 项目要同时满足开源和嵌入其他站点的子路径。方案 B 把对宿主的要求降到“能提供文件”，自托管者不需要维护运行时。
2. 第一版不需要请求期能力。§1.2 已把账户、云端收藏、在线生图和支付排除在外。
3. 方案 B 损失的能力都有替代：重定向由生成的宿主配置提供；410 对 Google 与 404 等效 [16]；noindex 本来就可以用 meta 标签。

以下情况改选方案 A：主站已经运行 Node.js 或 Next.js，并愿意长期运维本应用；需要在同一个应用里加入服务端能力（例如 §19.2 在线生图或账户）；或必须对任意地址做大小写规范化并返回 410。

修改设计文档前，先完成两项原型验证：

1. 在 basePath 下验证 pushState 弹层的完整历史行为，覆盖 §3.5 的表格以及 §12.8 的场景 2 至 4。
2. 由参考 nginx 在 `/prompt-seen/` 下提供导出产物，确认生成的配置返回正确的 301、410、404，且 canonical、hreflang 和 sitemap 的地址都带有前缀。

如果第 1 项失败（例如 pushState 与路由状态无法稳定配合），退回方案 A。

## 6. 采纳方案 B 时需要修改的设计文档章节

| 章节 | 修改内容 |
| --- | --- |
| §3 总体架构图、§3.1 技术选择 | “Next.js 网站”改为“静态导出产物加宿主”；增加“部署形态”一行（`output: 'export'` + `basePath`）；“CI 与发布”不再限定 Vercel |
| §3.2 页面渲染策略 | “详情弹层”一行改为“预生成详情页加 pushState 客户端弹层”；把“第一版不启用 `output: 'export'`”改为启用，并列出禁用的能力和 `dynamicParams = false` 规则 |
| §3.3、§3.4 | “详情路由”一行改为 pushState 弹层；时序图中的“Next.js 部署”改为“静态宿主” |
| §3.5 客户端数据契约 | 增加按条目、按 locale 的弹层 JSON 和可序列化的详情模型；MDX 说明在构建时编译 |
| §4 目录 | 删除 `@modal/`（`default.tsx`、`(.)prompts/[slug]`、`[...catchAll]`）；增加 `next.config` 的导出与 basePath 设置、`public/generated/{locale}/prompts/`、`deploy/` 宿主配置模板 |
| §5.3、§7 | Content 模块增加返回可序列化详情模型的接口；MDX 编译产物用于完整页和弹层 |
| §8.2 语言注册表与 URL | 地址前缀为 `{BASE_PATH}/{locale}/`；根语言入口与 x-default 改为 `{BASE_PATH}/`；大小写重定向限于逐条列出的已知地址 |
| §9.3 元数据规则 | `metadataBase` 包含 basePath；说明 sitemap 的位置，以及经宿主根 robots.txt 或 Search Console 提交 |
| §9.4 分页、筛选与链接 | 分页第一页的重定向由生成的宿主配置实现；noindex 使用 meta 标签；增加子路径下 robots.txt 的规则 |
| §9.5 地址变更与归档 | 重定向和 410 由生成的宿主配置实现；宿主不支持时退化为 404 或 meta refresh；说明按 locale 404 的实现方式 |
| §11.3、§11.3.1 | 路由机制改为 pushState；删除 `@modal` 默认页和 catch-all 的说明；写明关闭逻辑与 `history.state` 标记；放宽退出动画限制；参考资料改为原生 History API |
| §11.6.1 状态表 | 弹层打开状态由路径和 `history.state` 推导 |
| §14.1、§14.2 | 增加宿主配置和弹层 JSON 的生成步骤，以及重定向目标存在性检查 |
| §15 CI、部署与回滚 | “Next.js 构建”改为静态导出加宿主配置生成；增加参考 nginx 的状态码测试；生产发布为部署静态产物，回滚为重新部署上一份产物 |
| §16.2、§16.3、§16.4 | “详情弹层”验收改为 pushState 行为；新增“子路径部署”和“宿主状态码”验收项；Playwright 在 basePath 下测试导出产物；预取改为按意图预取 JSON |
| §17 开发阶段 | 第一阶段就在 `/prompt-seen` 下构建和预览，尽早发现 basePath 问题；第三阶段先完成弹层原型 |
| §18 关键架构决定 | 修改“详情导航”一行；新增“部署形态”一行 |
| §20 配置清单 | 增加 `BASE_PATH`、站点 origin 和目标宿主类型 |
| §21 参考资料 | 增加静态导出、basePath 和原生 History API 文档 |

## 7. 原型验证结果

> 日期：2026-10-15  
> 代码：[`spikes/option-b/`](./spikes/option-b/)，一次性原型，不是正式脚手架；重新运行见其 README。  
> 环境：Next.js 16.4.2（Turbopack）、React 19.3.1；`output: 'export'`、`basePath: '/prompt-seen'`、`trailingSlash: true`，所有动态段 `dynamicParams = false` 加 `generateStaticParams`；两种语言（`en`、`zh-hans`）× 30 条测试 Prompt。参考 nginx 为 Docker `nginx:stable`（1.30.6），未使用 Homebrew。Playwright 1.64.1，浏览器为 Google Chrome 155 和 WebKit 27.2（Safari 引擎），系统 macOS 27.0.1。所有测试都针对导出产物，经 nginx 在 `http://127.0.0.1:8090/prompt-seen/` 提供。

### 7.1 结论

两项验证都通过，没有出现需要退回方案 A 的问题。**建议采用方案 B。**

- 原型一：pushState 与 Next.js 路由在 basePath 下配合稳定。12 项测试在 Chrome 和 WebKit 上全部通过，`--repeat-each=5` 共 120 次运行没有失败。
- 原型二：生成的 nginx include 返回了预期的 301、410 和按 locale 的 404；原始 HTML 和 sitemap 中的地址都是带 `/prompt-seen` 前缀的绝对地址；浏览器没有发出前缀以外的请求。28 项测试全部通过。
- 发现 9 处需要写进实现规范的细节（§7.4），其中滚动恢复时机、隐式 favicon 请求和 nginx `absolute_redirect` 三项不处理会直接出错。

### 7.2 原型一：basePath 下的 pushState 弹层

做法：画廊卡片是指向预生成详情页的普通 `<a href="/prompt-seen/en/prompts/{slug}/">`。对未按修饰键的主键点击执行 `preventDefault()`，调用 `pushState`，在 `history.state` 中写入 `__promptSeenPopup` 标记，然后 `showModal()`。弹层用 `public/generated/en/prompts/{slug}.json` 渲染与完整页相同的 `PromptDetailBody`。弹层是否打开只由“当前路径是本语言的详情地址，且画廊已挂载”推导。上一条和下一条使用 `replaceState`。关闭按钮和 Esc 在带标记的历史项上调用 `history.back()`，否则用 `router.push` 进入列表。

| 检查 | 结果 | 证据（`tests/popup.spec.ts` 中的测试名） |
| --- | --- | --- |
| 点击卡片：pushState 到带前缀的详情地址，打开弹层，焦点进入对话框，标题更新 | 通过 | `click: pushState to the prefixed detail URL, dialog opens, no document load`：`history.length` 加 1，文档标识不变（没有整页加载），弹层显示该条目的完整 Prompt 文本 |
| 浏览器后退：弹层关闭，焦点回到原卡片；前进：重新打开 | 通过 | `browser Back closes and returns focus to the card; Forward reopens from cached JSON`：两次打开只请求 1 次 JSON |
| 关闭按钮或 Esc：本站创建的历史项调用 `history.back()` | 通过 | `Close button and Esc call history.back() for our own entry`：关闭后 `history.length` 不变，仍可前进，说明是后退而不是新增历史项 |
| 关闭按钮或 Esc：历史项不是本站创建的，进入当前语言列表 | 通过 | `usePathname follows foreign pushState; Esc on an untagged entry goes to the list, not back`：不会后退离开本站 |
| §12.8 场景 2：快速连续点击两个资源，只展示最后一个 | 通过 | `§12.8-2: rapid successive clicks end on the last target; one Back returns to gallery`：同一任务内连续两次点击，先点的条目 JSON 延迟 800 ms 返回，也没有覆盖后点的条目；`history.length` 只加 1 |
| §12.8 场景 3：打开后立即 Esc，退出和滚动锁正确清理 | 通过 | `§12.8-3: Esc right after opening (JSON still loading) cleans up scroll lock and focus`：JSON 延迟 1.5 s，Esc 后滚动锁解除，焦点回到卡片，迟到的 JSON 不会重新打开弹层；连按两次 Esc 也不会后退出画廊 |
| §12.8 场景 4：在详情地址刷新显示完整页，然后后退、前进 | 通过 | `§12.8-4: refresh on a detail URL shows the full page, then Back and Forward work`：刷新后是新文档里的完整详情页；后退回到画廊，弹层关闭，`usePathname` 为 `/en/prompts/`；前进得到完整详情页 |
| 在弹层内软导航到其他路由（`next/link` 进入模板页），再后退 | 通过 | `soft navigation from inside the popup to another route, then Back reopens the popup`：画廊和对话框卸载，滚动锁解除，标题变为模板页标题；后退时画廊和弹层一起恢复，全程是同一文档，不需要 catch-all |
| §11.3：用上一条/下一条浏览 20 条，一次后退回到画廊 | 通过 | `§11.3: 20 × next via replaceState, then one Back returns to gallery at the last viewed card`：`history.length` 始终不变；后退后焦点在最后查看的第 21 张卡片上，且该卡片在视口内 |
| §3.5：画廊一直挂载，不需要恢复滚动位置 | 通过 | `memo §3.5: a scrolled gallery keeps its position across open and close`：画廊已滚动时打开再关闭，滚动位置不变；弹层打开时滚轮不会滚动背景 |
| `usePathname` 与 pushState/replaceState 同步 | 通过 | 每个断言都比较 `usePathname()` 与 `location.pathname`：前者去掉 basePath 并保留结尾斜杠，例如 `/en/prompts/neon-alley/`；第三方脚本调用 pushState 时，弹层也能经由 `usePathname` 打开 |
| 修饰键点击和没有 JavaScript 时打开真实详情页 | 通过 | `modifier click and no-JS fall back to the real detail page` |
| 第二语言 | 通过 | `zh-hans gallery: same behaviour under the second locale` |

Firefox 没有运行。Playwright 自带的 Firefox（firefox-1555）在本机启动时报 “Could not find profile folder”，在命令沙箱外运行也一样，属于本机环境问题。正式 CI 应补跑 Firefox。

### 7.3 原型二：参考 nginx

做法：`content:build` 读取 `redirects.yaml`（4 条：§8.2 的 `/zh/` 旧前缀、§9.5 的 slug 改名、§9.4 的分页第一页、§8.2 的已知大小写变体）和 `deleted.yaml`（1 个条目，两种语言），生成 server 级的 `deploy/nginx/prompt-seen.locations.conf`。宿主的 server 块只需要三项（见 `deploy/nginx/host-server.conf`）：`root` 指向包含 `prompt-seen/` 的目录，`absolute_redirect off`，以及一行 `include`。重定向用逐条的 `location =`，每个来源同时生成带斜杠和不带斜杠两种形式。

| 检查 | 结果 | 证据（`tests/hosting.spec.ts` 中的测试名） |
| --- | --- | --- |
| `redirects.yaml` 的 301 和 `Location` | 通过 | 8 项 `301 /prompt-seen/…`；`Location` 是带前缀的相对地址 |
| `/prompt-seen` 和不带结尾斜杠的目录地址 301 到规范地址 | 通过 | `301 for the bare base path and for directory URLs without trailing slash`。目录地址由 nginx 静态模块自动重定向，生成配置不需要额外规则 |
| 已删除条目返回 410 和对应语言的 410 页 | 通过 | `410 … with the en 410 page`、`410 … with the zh-hans 410 page` |
| 按 locale 的 404；未知语言使用根 404；错误页本身不返回 200 | 通过 | `per-locale 404 pages, root 404 for unknown locales, error pages never answer 200`：共 10 个地址，全部返回 404，带 `noindex` 和 `text/html; charset=utf-8` |
| 重定向目标都存在 | 通过 | 打包脚本检查目标文件是否存在；`every redirect target exists and answers 200` |
| canonical、hreflang（含 x-default）、`og:url`、Markdown alternate 和 JSON-LD 都是带前缀的绝对地址 | 通过 | `detail page: canonical, hreflang, x-default, markdown alternate, og:url, JSON-LD`、`gallery, language entry and templates pages`。`metadataBase = new URL(origin + basePath)` 后，写成 `/en/prompts/neon-alley/` 的字段输出为 `https://example.com/prompt-seen/en/prompts/neon-alley/`，没有出现双重前缀；`trailingSlash` 不会给 `index.md` 加斜杠 |
| sitemap 与 robots 中的地址 | 通过 | `sitemap.xml: every <loc> and xhtml:link is absolute with the prefix`：63 个 `<loc>` 和全部 `xhtml:link` 都带前缀；robots.txt 中为 `Sitemap: https://example.com/prompt-seen/sitemap.xml` |
| 推论：`out/` 不包含 basePath 目录层级 | 推论成立 | `out/ has no basePath directory layer; dist/prompt-seen/ is the repackaged copy`：`out/` 顶层是 `index.html`、`_next/`、`en/`、`zh-hans/`、`generated/`、`sitemap.xml` 等。需要按 §3.4 打包到 `dist/prompt-seen/` |
| `index.md`、`llms.txt`、`sitemap.xml`、`robots.txt` 是同名文件，没有被改写成目录 | 通过 | `index.md, llms.txt, sitemap.xml, robots.txt are same-name files, not trailingSlash directories`。`trailingSlash` 只影响页面 |
| Content-Type | 通过，前提是使用生成的配置 | `Content-Type through nginx`（7 项）、`index.md carries Link rel=canonical to the HTML page`。nginx 默认 `mime.types` 没有 `md`，会按 `default_type application/octet-stream` 返回，所以生成的配置为 `index.md` 单独指定 `text/markdown; charset=utf-8` 并加上 `Link: <HTML 地址>; rel="canonical"`。nginx 默认不加 charset，txt、xml 和 json 要配置 `charset_types` 才会带 `charset=utf-8` |
| 原始 HTML 中没有不带前缀的 `/_next/` 或 `/generated/` | 通过 | `every src/href to /_next/ or /generated/ in raw HTML carries the base path` |
| Network 中没有前缀以外的请求 | 通过，前提是声明图标（§7.4 第 2 条） | `Network: no request outside /prompt-seen/ (browser view + nginx access log)`：依次走过语言入口、软导航、弹层、上一条/下一条、模板页、后退、切换语言和完整详情页，检查浏览器记录的全部请求和 nginx 访问日志 |

curl 摘录（经 nginx，`curl -sI`；最后一列是错误页中的语言标记）：

```text
/prompt-seen                                   301 Location: /prompt-seen/
/prompt-seen/en/prompts                        301 Location: /prompt-seen/en/prompts/
/prompt-seen/zh/prompts/neon-alley             301 Location: /prompt-seen/zh-hans/prompts/neon-alley/
/prompt-seen/en/prompts/neon-street/           301 Location: /prompt-seen/en/prompts/neon-alley/
/prompt-seen/en/prompts/page/1/                301 Location: /prompt-seen/en/prompts/
/prompt-seen/EN/Prompts/Neon-Alley/            301 Location: /prompt-seen/en/prompts/neon-alley/
/prompt-seen/en/prompts/retired-lantern/       410 text/html                         data-error-locale="en"
/prompt-seen/zh-hans/prompts/retired-lantern/  410 text/html                         data-error-locale="zh-hans"
/prompt-seen/en/prompts/no-such-prompt/        404 text/html                         data-error-locale="en"
/prompt-seen/zh-hans/prompts/no-such-prompt/   404 text/html                         data-error-locale="zh-hans"
/prompt-seen/fr/prompts/                       404 text/html                         data-error-locale="root"
/prompt-seen/404/                              404 text/html                         data-error-locale="root"
/prompt-seen/llms.txt                          200 text/plain; charset=utf-8
/prompt-seen/sitemap.xml                       200 text/xml; charset=utf-8
/prompt-seen/en/prompts/neon-alley/index.md    200 text/markdown; charset=utf-8
    Link: <https://example.com/prompt-seen/en/prompts/neon-alley/>; rel="canonical"
```

这次摘录之后，生成配置给错误页位置补上了 `charset utf-8`，现在错误页返回 `text/html; charset=utf-8`，测试也断言这一点。

### 7.4 意外发现与需要写进规范的细节

1. **滚动恢复时机**：Chrome 在同文档后退时，会在 popstate **之后**恢复该历史项保存的滚动位置，覆盖 popstate 处理中同步执行的 `scrollIntoView`。实测滚动位置先到 420，随后被改回 0。“关闭时滚动到最后查看的卡片”必须推迟一帧（`requestAnimationFrame`）执行，WebKit 下同样有效。§11.3.1 的“滚动恢复由一处模块统一管理”应写明这一点。
2. **隐式 favicon 请求**：页面没有声明图标时，浏览器会请求主机根的 `/favicon.ico`，不带前缀。这个请求在 Playwright 的 `page.on('request')` 中看不到，只出现在 nginx 访问日志里。需要用 `app/icon.svg` 或 metadata `icons` 声明图标，Next.js 会输出 `/prompt-seen/icon.svg?…`。§15.4.4 的 Network 验收应同时检查宿主访问日志。
3. **nginx `absolute_redirect`**：nginx 默认用自己的协议和端口拼接 `Location`。实测对外端口 8091 时返回 `Location: http://127.0.0.1/prompt-seen/en/prompts/`，端口丢失；在 TLS 终止代理之后还会变成 `http`。宿主配置必须设置 `absolute_redirect off`，这一条要写进宿主接入说明。
4. **导出产生的额外错误页**：除根 `404.html` 外，导出还生成 `404/index.html` 和 `_not-found/index.html`（由 `trailingSlash` 产生），静态宿主上直接访问会返回 200。它们都带 `noindex`，风险较低。参考 nginx 把这两个位置以及各语言的 `/{locale}/404/`、`/{locale}/410/` 设为 `internal`。
5. **按 locale 的错误页不需要客户端切换语言**：在 `app/[locale]/404/page.tsx` 和 `app/[locale]/410/page.tsx` 为每种语言预生成错误页，nginx 用 `error_page` 指向它们，§3.2 的“导出只生成一个根 404”不再是限制。其他宿主未测试：Netlify 文档支持按路径指定 404 页面，Vercel 需另行验证，Cloudflare Pages 不支持（§3.3）。
6. **Route Handler 的静态参数**：Route Handler 不在 `[locale]` layout 之下，拿不到父级 `generateStaticParams` 的参数。`index.md` 的 `generateStaticParams` 必须同时返回 `locale` 和 `slug`，否则导出报错 “returned incomplete params”。
7. **依赖 Next.js 对原生 History API 的接管**：Next.js 改写后的 `pushState` 会把 `__NA` 和内部路由树复制进本站写入的 `history.state`，实测为 `{"__promptSeenPopup":…,"__NA":true,"__PRIVATE_NEXTJS_INTERNALS_TREE":…}`。Next.js 16.4.2 的 popstate 处理用其中的路由树恢复画廊；`history.state` 不含 `__NA` 时会直接 `location.reload()`（`next/dist/client/components/app-router.js` 的 `handlePopState`）。与路由同步是文档说明的行为 [6]，但这些字段属于框架内部实现，升级 Next.js 时用 `tests/popup.spec.ts` 做回归测试。
8. **快速连续点击的规则**：点击时如果当前历史项已经是本站的弹层项，就用 `replaceState` 而不是 `pushState`。这样自然满足“采用最新的有效导航”，一次后退即回到画廊。§3.5 表中“在弹层内打开相关 Prompt”建议按同一规则使用 `replaceState`，与上一条/下一条一致；原型没有单独实现相关 Prompt 链接。
9. **点击后同步打开弹层**：`usePathname` 由 Next.js 在 transition 中更新，比点击事件晚一拍。如果只依据它打开对话框，点击后立即按 Esc 可能发生在对话框打开之前。原型用 `useSyncExternalStore` 读取 `location.pathname`，并在点击处理中用 `flushSync` 同步打开对话框；`usePathname` 只用于一致性校验。弹层状态仍然只由 URL 推导。

另有一项观察：在导出模式下，Next.js 16 的 `<Link>` 预取会先对目标页面发 `HEAD` 请求，再获取 `__next._tree.txt` 等分段文件，这些请求都带前缀。推论：宿主对 `HEAD` 返回 405 时预取可能失效，未测试。

### 7.5 未覆盖的范围

- Firefox，触屏手势，减少动效，共享元素过渡和 `AnimatePresence` 退出动画（§12.8 的场景 1 和 5–10）。
- 根域部署（`BASE_PATH` 为空）的构建；Netlify、Cloudflare Pages、Vercel 的生成配置；无配置宿主的 meta refresh 退化。
- 真实 MDX 编译、图片 CDN，以及 13 个 locale 规模下的产物文件数和构建时间。
- 重定向用逐条 `location =` 实现。条目达到数千时应改用 `map`，需要另行测试。
- `…/neon-alley/index.html` 这类带文件名的地址会以 200 返回重复内容，目前依靠 canonical；需要时可以在 nginx 中 301 到目录地址。

### 7.6 建议

采用方案 B。可以按 §6 修改设计文档，同时把 §7.4 写进以下章节：第 1、8、9 条写入 §11.3 和 §11.3.1；第 2 条写入 §15.4.3 和 §15.4.4；第 3、4、5 条写入 §9.5、§15.4.3 和 `deploy/` 宿主配置模板；第 6 条写入 §4 和 §14.2；第 7 条写入 §16.3 和 §18 的框架升级风险。修改设计文档前，需要由你确认选择 A 还是 B。

**决定**：2026-10-15 维护者确认采用方案 B。设计文档已按 §6 修改，§7.4 各条已写入上面建议的章节（1.7 版）。

## 参考资料

查阅日期均为 2026-10-15。括号内为页面标注的最后更新日期。

1. [Next.js：Static Exports](https://nextjs.org/docs/app/guides/static-exports)（2026-08-09）：不支持的功能列表、Route Handler、`trailingSlash`、nginx 示例、GitHub Pages 模板
2. [Next.js：basePath](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath)（2025-06-16）：构建时设置，`Link` 自动加前缀，`next/image` 需手动加前缀
3. [Next.js：Multi-Zones](https://nextjs.org/docs/app/guides/multi-zones)（2026-06-01）：`assetPrefix`、`rewrites` 转发、跨 zone 使用 `<a>`
4. [Next.js：Intercepting Routes](https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes)（2025-06-16）
5. [Next.js：Parallel Routes，Modals 一节](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes)（2026-08-21）：`default.js`、catch-all 关闭弹层、`router.back()`
6. [Next.js：Linking and Navigating，Native History API 一节](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api)（v16.4.0，2026-09-09）
7. [Next.js：redirects](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects)（2026-06-30）：308、`statusCode`、basePath 自动前缀
8. [Next.js：proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)（2026-09-04）：由 middleware 更名而来、直接产生响应、静态导出不支持
9. [Next.js：generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)（2026-08-19）：`metadataBase` 可包含路径、`robots` 字段
10. [Next.js：robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)（2026-05-01）
11. [Next.js：Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)（2026-10-01）：反向代理、版本偏移、多实例
12. [Next.js 安全公告 CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478)（2025-12-03）
13. [Google：robots.txt 规范](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)：位置规则、`Sitemap` 字段
14. [Google：构建和提交站点地图](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)：sitemap 的作用范围与提交方式
15. [Google：重定向与 Google 搜索](https://developers.google.com/search/docs/crawling-indexing/301-redirects)：meta refresh 的处理方式
16. [Google：HTTP 状态码、网络和 DNS 错误](https://developers.google.com/search/docs/crawling-indexing/http-network-errors)：4xx 的处理方式
17. [Netlify：Redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/)
18. [Cloudflare Pages：Redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
19. [Vercel：vercel.json](https://vercel.com/docs/project-configuration/vercel-json)
20. [vercel/next.js#58272：catch-all 路由被匹配到并行路由](https://github.com/vercel/next.js/issues/58272)（已在 14.0.3 canary 修复）
21. [WAI-ARIA APG：Dialog (Modal) 模式](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
