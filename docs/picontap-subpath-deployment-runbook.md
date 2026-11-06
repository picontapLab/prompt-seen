# Prompt Seen 接入 PicOnTap 子路径：方案复核与部署操作手册

日期：2026-11-05（America/Los_Angeles）。

状态（2026-11-05 回滚）：**用户已取消域名关联和主站子路径挂载，本次部署已撤回，主站原配置验证保持一致。** 详见 [本地执行与回滚记录](picontap-deployment-status-2026-11-05.md)。以下仅为历史方案，不应继续执行；重新关联需要用户新指令。

正式访问入口：`https://picontap.com/prompt-seen/`。采用 **Prompt Seen 独立 Cloudflare Pages + 专用路径代理 Worker + 精确入口重定向**。主站保留现有 TanStack Start Worker。

本文是 PicOnTap 实例的部署约定。仓库通用示例中关于 `/prompt-seen*`、直接删除全部 `X-Robots-Tag`、直接合并 robots 片段的简化做法，不可直接用于此次生产部署，应按本文修正。

## 1. 按三个目标复核后的结论

| 用户目标 | 本方案如何满足 | 必须验证的结果 |
| --- | --- | --- |
| 通过主站子路径访问 | 浏览器始终访问 `picontap.com/prompt-seen/...`，代理保留路径前缀 | 首页、深层页、资源、分页、刷新、查询参数均正确，不跳到平台域名 |
| 主站 AI、爬虫、搜索引擎抓取不劣化，并增加发现入口 | 原有 robots 权限、Sitemap、机器可读正文及公开链接保持；增加项目 Sitemap、HTML 链接、`llms.txt` 入口和详情 Markdown | 原有公开地址仍可抓取；原有私有路径限制仍生效；新增内容可发现、可读取、可索引 |
| 主站功能不受影响 | 仅 `/prompt-seen/*` 进入新 Worker；登录、支付、编辑器、API、数据库和任务处理继续走原服务 | 主站原有功能、缓存、Cookie、回调、语言路由与发布资源保持正常 |

这些是可以通过实现和验收控制的技术结果。搜索排名、收录速度和 AI 引用次数是外部系统决定的结果，不能承诺上线后必然上涨。“增强”首先指增加可抓取内容与有效发现链路，再用真实数据验证流量和转化。

### 1.1 上一版方案需要纠正的地方

| 复核发现 | 修正 |
| --- | --- |
| Cloudflare 精确路由 `picontap.com/prompt-seen` 不覆盖带查询参数的入口 | 使用 Single Redirect 按 hostname + pathname 精确匹配入口，保留查询参数；Worker 只绑定 `/prompt-seen/*` [S1][S2] |
| `/prompt-seen*` 会接管 `/prompt-seen-other` 等相邻地址 | 不使用宽泛前缀；代理内部再检查 hostname 和路径边界 |
| 直接追加 robots 里的具名爬虫组，可能改变通配组原有规则的适用方式 | 根 robots 只追加一条 Sitemap，不添加新 User-agent 组 [S3] |
| Prompt Seen 默认 `robots.aiTraining: disallow`，与主站当前公开抓取策略不一致 | PicOnTap 部署改为 `allow`，沿用主站既有权限；不为此次部署新增训练爬虫阻止规则 |
| 无条件删除 `X-Robots-Tag` 可能误删除页面级限制 | 为平台副本限制建立明确标记与处理约定；预览、页面级 noindex、错误响应仍保留限制 |
| 只新增 Sitemap，AI 发现链路仍不完整 | 主站原有 `llms.txt`、`llms-full.txt` 增量加入项目入口，项目提供详情 Markdown |
| 同域子目录被误当作完全隔离 | 运行服务独立，但浏览器同源、Cloudflare 账户配额和站级搜索信号仍共享。同源和配额靠存储命名、脚本审核、路径级 CSP 和配额监控控制；搜索信号靠内容抽检、上线前基线和暂停规则控制（步骤 4、步骤 11） |
| 主站生产提交无法从现有记录确定，也不一定对应单个提交 | 不再从“已核实提交”切专用发布。上线时先在站长平台提交 Sitemap，不发布主站；主站入口改动在子路径通过后并入主干，随下一次正常发布上线（步骤 8） |
| `prompt-seen.pages.dev` 属于第三方 | 项目改名 `picontap-prompt-seen`；上游地址取自 Cloudflare 返回的实际子域名，不用项目名拼接（步骤 2） |
| 主站现在把 `/prompt-seen/` 308 到 `/prompt-seen`，与新入口重定向相反 | 回滚时先停入口重定向，再动 Worker Route，否则形成重定向循环（步骤 12） |
| 代理的响应头“保留清单”漏掉 `Cache-Control`、`Content-Range`、`Accept-Ranges` | 改为默认透传，只删除明确清单（步骤 5） |
| 平台 noindex 移除逻辑上线前没跑过真实 Pages 响应，`check:live` 又要等主站发布后才运行 | 验收代理输出处理结果；绑定路由后立即运行 `check:live`，只允许 Sitemap 一项失败（步骤 6、步骤 7） |
| 写入配置后 Deploy workflow 会在 main 每次 CI 成功后自动运行；文档也没说明哪个仓库负责发布 | 确定唯一发布仓库；`SITE_ORIGIN` 最后写入（步骤 0、步骤 2、步骤 11） |
| 项目 JSON-LD 声明了独立的 Prompt Seen 组织，详情页到主站只有泛化 CTA，统计也未配置 | `publisher` 指向主站组织，详情页增加模型页链接，配置项目访问统计（步骤 1） |

## 2. 已核实事实与上线前未知项

### 2.1 已核实

- Prompt Seen 的 [next.config.ts](../next.config.ts) 使用 `output: 'export'`、构建期 `basePath`、`trailingSlash: true`；已阅读安装版本 Next.js 16.4.2 随包的 static exports 与 basePath 文档。
- [打包脚本](../scripts/package.ts) 将产物放到 `dist/prompt-seen/`；[Pages 准备脚本](../scripts/deploy-cloudflare.ts) 生成 `.deploy/cloudflare/` 并准备真实 404。
- 已有 [发布流程](../.github/workflows/deploy.yml)、[回滚流程](../.github/workflows/rollback.yml)、[线上检查](../scripts/check-live.ts)。这些是基础能力，不能代替新增代理的测试。
- 主站仓库 `/Users/hp/Desktop/bywork/shipany-tanstack` 的 `wrangler.jsonc` 配置生产来源为 `https://picontap.com`，运行在 Cloudflare Workers。
- 2026-11-05 只读请求线上 `https://picontap.com/robots.txt` 成功：`User-Agent: *`、`Allow: /`，限制 `/admin`、`/settings`、`/api/` 及 `/zh`、`/de` 对应私有路径，声明原主站 Sitemap。
- 同日线上 `/llms.txt` 返回 200、`text/plain`，已有英文、中文和德文入口及指南，未看到 `X-Robots-Tag: noindex`。因此不能沿用“主站只有中英文”的假设。
- Prompt Seen 当前公开语言是 `en` 与 `zh-Hans`，路径分别为 `en` 与 `zh-hans`；主站语言目录独立。
- 当前 `public/media` 约 591 MB、1,965 个文件，没有超过 20 MB 的文件；图片键含内容哈希，支持独立 R2 同步。
- 代码 MIT、内容默认 CC BY 4.0，图片按各自媒体记录授权，见 [LICENSE](../LICENSE) 和 [content/LICENSE](../content/LICENSE)。
- 2026-11-05 线上：`/prompt-seen`、`/prompt-seen-other`、`/zh/prompt-seen` 返回 404 + `X-Robots-Tag: noindex`；`/prompt-seen/` 返回 308 到 `/prompt-seen`；`www.picontap.com` 301 到主域名并保留路径。
- 同日 `prompt-seen.pages.dev` 返回 200，内容是另一个 AI 提示词产品的页面（标题 “Prompt Seen — Stop Flying Blind with Your AI Prompts”，页脚 “© 2025 Prompt Seen”）。项目负责人已确认该站不是我们的，这是第三方同名产品。
- 主站生产 `wrangler.jsonc` 没有 `routes`，发布记录提到已接入自定义域名。Cloudflare 文档说明同一 hostname 上 Route 优先于 Custom Domain，更具体的 Route 优先于宽泛 Route [S1][S7]。实际绑定方式仍要在控制台确认。
- 主站发布记录落后于线上：`docs/deployment/production-status.md` 的最新发布是 2026-10-10 的 `f15f57c`，而线上已提供 2026-11-05 才提交的 `/ai-clothes-changer`。历史上也有多次“基线提交加未提交补丁”的发布，因此生产版本不一定对应单个提交。
- 主站账户已开通 Workers Paid，见主站 `docs/deployment/production-status.md`。
- 主站 `tests/seo.http.ts` 和 `tests/sitemap.http.ts` 没有发送 POST，也没有断言 robots 或 llms 全文，增加 Sitemap 行和 llms 段落不会使其失败。
- 用线上 robots 加一行新 Sitemap 运行第 13.1 节的权限比较脚本，结果通过。
- 2026-11-05 用 10 个爬虫 User-Agent 请求主站首页均为 200。这只是 UA 模拟，不等于真实爬虫已放行。
- 最新本地构建（preview，含 ja / ar）的非媒体文件约 6,500 个，低于 Pages 免费版 20,000 的上限 [S5]。
- 主站 Sitemap 有 107 个地址。Prompt Seen 最新本地构建有约 640 个（en 330、zh-hans 310），约为主站的 6 倍；英文详情 Markdown 中位数约 2.6 KB。
- Prompt Seen 有两个远端：`origin`（`morehardy/prompt-seen`，私有）和 `public`（`picontapLab/prompt-seen`，已公开），两者都含发布 workflow，Deploy 目前都是 skipped。`morehardy/prompt-seen` 已有 `production` 环境，未设审阅规则，没有 secrets 和 variables。`picontapLab/prompt-seen` 没有环境，当前 `gh` 账号读不到它的 secrets 和 variables。
- 两个仓库最近完成的 3 次 main CI 都失败（最新一次 2026-11-05 提交 `39814f9`；公开仓库 `190bbb1` 的 CI 在复核时还在运行）。`morehardy/prompt-seen` 的最新失败在 “End-to-end tests through the reference nginx” 这一步，root 和 subpath 两个构建都失败，subpath 日志里失败用例在 acceptance、motion、popup、editor 这些浏览器测试中。
- `content/site.yaml` 未配置 `analytics`。现有统计只支持 `cloudflare` / `plausible` 的访问和来源，代码中没有自定义事件。

### 2.2 尚未核实，执行步骤 0 时记录

- **阻塞：** Prompt Seen 唯一发布仓库是 `morehardy/prompt-seen` 还是 `picontapLab/prompt-seen`。
- **阻塞：** main 上的 CI 失败（见 2.1）。这些是即将上线站点的浏览器验收用例，步骤 4 之前要修好，或逐条确认是测试本身的问题。Deploy workflow 只在 CI 成功后运行，CI 不通过，步骤 11 的日常发布也不会触发。
- **阻塞：** 当前 Search Console、Bing 的账户配置与流量基线。没有基线就无法判断上线是否影响主站，见步骤 0。
- 是否继续使用 “Prompt Seen” 这个名字。第三方同名产品同在 AI 提示词领域，至少从 2025 年开始使用这个名字（见 2.1）。这不阻塞技术部署，但要在提交 Sitemap 前决定：上线后再改名，要改标题、`og:site_name`、仓库和已收录地址。商标风险需要由负责人或法律顾问判断。
- Cloudflare 账户里真正生效的主站 Custom Domain / Route、DNS 代理状态、Redirect / Transform / Cache Rules。
- WAF、Bot Fight / Bot Management、AI Crawl Control、Cloudflare 托管 robots 是否额外改变访问结果。
- 当前生产 Worker 版本对应的源码提交和未提交补丁。向实际发布人确认；确认不了就记为“未知”，不阻塞子路径上线。
- Pages 对条件请求返回 304 时是否保留 `_headers` 中的响应头；官方文档未说明 [S4]，在步骤 6 实测。
- GitHub Actions production 环境、部署凭据、账户实际配额。

不确定项必须在上线前填实。不能把“仓库里配置过”写成“云端已生效”。

## 3. 最终访问和资源结构

```text
picontap.com
  /、/zh、/de、/api/*、登录、支付、编辑器、主站静态资源
    → 原 PicOnTap Worker / 原静态资源处理

  /prompt-seen 或 /prompt-seen?参数
    → Cloudflare Single Redirect：308 到 /prompt-seen/，保留参数

  /prompt-seen/*
    → prompt-seen-proxy-production Worker
    → <实际 Pages 子域名>.pages.dev/prompt-seen/*

prompt-seen-media.picontap.com/media/*
    → 独立 R2 桶 prompt-seen-media-production
```

媒体子域名只承载图片，不改变项目通过主站子路径访问的目标。Pages 与 R2 使用独立资源；不得将 PicOnTap 主域名重新绑定到 Pages，也不更换主站 DNS 记录。

未采用的备选：把项目部署成带 Static Assets 的 Worker，直接绑定 `picontap.com/prompt-seen/*` [S8]。这样不再有 `pages.dev` 副本，步骤 5 的 noindex 和 Location 处理大多可以省去；代价是重写发布、回滚和 PR 预览工具链，且 `assets.base_path` 需要 Wrangler 4.148.0 及以上。本文继续按 Pages + 代理执行。

| 用途 | 正式地址 |
| --- | --- |
| 语言入口，200，不按 IP / 浏览器语言强制跳转 | `https://picontap.com/prompt-seen/` |
| 英文 / 中文首页 | `/prompt-seen/en/`、`/prompt-seen/zh-hans/` |
| 提示词详情 | `/prompt-seen/en/prompts/<slug>/` |
| 详情机器可读版本 | `/prompt-seen/en/prompts/<slug>/index.md` |
| 项目 Sitemap 索引 | `/prompt-seen/sitemap.xml` |
| 语言 Sitemap | `/prompt-seen/en/sitemap-pages.xml` 等 |
| 项目机器可读目录 | `/prompt-seen/llms.txt` |
| 真正生效的 robots | 主站 `/robots.txt`；子目录 robots 不是权限入口 |

## 4. 步骤 0：记录主站基线与隔离发布范围

**操作位置：Cloudflare 控制台、两个仓库的独立 checkout。此阶段对线上全部只读。**

1. 在 Cloudflare 选择 `picontap.com` 所属 zone，记录主站域名绑定、全部 Worker Routes 及无 Worker 的例外路由。
2. 记录现有单次重定向、URL 重写、缓存、响应头、WAF、AI crawler 设置。只保存非秘密配置及规则 ID，不导出 API token。
3. 在 Workers & Pages → 主站 → Deployments 中记录当前版本 ID 和部署时间，保留它作为回滚点。向实际发布人确认源码提交及是否含未提交补丁；`production-status.md` 已落后于线上（见 2.1），不能把其中最新记录当作当前生产。确认不了就如实记为“未知”。
4. 此次只新增发现入口，不需要 SQL、认证密钥、Hyperdrive、Workflow 或数据库策略变更。迁移一致性由主站发布预检校验，本文不做迁移。
5. 对下列地址记录状态码、跳转目标、canonical、hreflang、meta robots、`X-Robots-Tag`、正文和缓存头：
   - `/`、`/zh`、`/de`；
   - 当前线上 Sitemap 中抽取的工具、模型、价格、博客页面，覆盖全部已启用语言；
   - `/robots.txt`、`/sitemap.xml`、`/llms.txt`、`/llms-full.txt`；
   - `/api/health`；匿名访问 `/admin`、`/settings` 时的原有拒绝或跳转行为；
   - `/prompt-seen-other`、`/prompt-seen2`，作为不应被接管的边界样本。
6. 从 Search Console 和 Bing 导出主站基线，保存到证据目录：最近 28 天的点击、展示、已编入索引页面数、抓取请求数、平均响应时间和 Top 页面。没有基线不得进入步骤 7。
7. 确定 Prompt Seen 唯一发布仓库。只在该仓库配置 Cloudflare 凭据和发布变量，另一个仓库保持未配置，其 Deploy workflow 就只会输出跳过提示。

以下命令保存公开发现文件。执行前将变量替换为**本次独立 checkout** 的绝对路径；不要把命令运行在别人正在开发的工作区里。

准备 Node 24、npm 和主站要求的 pnpm 版本。Prompt Seen 用 `git worktree add -b codex/picontap-prompt-seen <新目录> main` 建立 release checkout，先完成步骤 1 的实现，再将已审查提交作为发布版本。主站此处只需要一个跑基线测试的 checkout：用 `git worktree add --detach <新目录> <与生产最接近的提交>` 建立，再执行 `pnpm install --frozen-lockfile` 和 `node --import tsx scripts/generate-sources.ts`（`pnpm test:seo` 不会自动生成源码）。

所有后续 shell 示例中的变量需保持在当前终端，换终端时重新设置；秘密变量通过安全方式注入。证据目录放在仓库之外的持久位置，因为步骤 9 可能在几天后才执行；目录路径写入第 17 节的记录。

```bash
export PROMPT_SEEN_REPO=/absolute/path/to/prompt-seen-release
export PICONTAP_REPO=/absolute/path/to/picontap-baseline
export PS_EVIDENCE_DIR="$HOME/prompt-seen-release-evidence/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$PS_EVIDENCE_DIR"

(
  set -e
  for item in robots.txt sitemap.xml llms.txt llms-full.txt; do
    curl --fail --silent --show-error --max-time 30 \
      --dump-header "$PS_EVIDENCE_DIR/before-$item.headers" \
      --output "$PS_EVIDENCE_DIR/before-$item" \
      "https://picontap.com/$item"
  done
)

cd "$PICONTAP_REPO"
SEO_BASE_URL=https://picontap.com SEO_APP_ENV=production pnpm test:seo
```

这些 HTTP SEO 测试是只读的，但测试期望来自 checkout 里的源码。生产提交未知时，它们与线上清单的差异逐项记录为基线，不要修改线上内容来迎合 checkout。记录所有已有失败项，不能归因给尚未部署的项目。

`pnpm test:smoke` 含数据库和写入操作，不要直接把生产站作为目标。登录、编辑器、支付等完整功能测试安排在隔离环境，生产按步骤 9 使用专用验收账号。

**通过条件：** 能明确列出“哪些路由新增、哪些规则原样保留”；当前主站 Worker 版本可恢复；已保存 Search Console / Bing 基线；已确定发布仓库。

## 5. 步骤 1：准备必须提交的实现改动

这一步是上线前的实施清单。本文没有创建下表里的新程序文件，执行者需要实现并测试后再部署；现有示例不能当成已经满足这些约定。

| 项目 / 文件 | 操作 |
| --- | --- |
| Prompt Seen `content/site.yaml` | 本实例设置 `robots.mode: snippet`、`robots.aiTraining: allow`；配置 `analytics`（`cloudflare` 或 `plausible`，第一版统计访问和来源）；保留其他设置 |
| Prompt Seen `scripts/emitters/cloudflare.ts` | 增加平台 noindex 来源标记并加测试：生产 `_headers` 除两条平台规则外不得出现 `X-Robots-Tag`，见步骤 5 |
| Prompt Seen `src/modules/seo/structured-data.ts` | 部署在 PicOnTap 时 `publisher` 引用 `https://picontap.com/#organization`，不再输出第二个同 host 的 Organization。Google 不支持子目录级站点名 [S9]，项目名继续用于标题和 `og:site_name` |
| Prompt Seen 详情页模型信息（`src/ui/prompt-detail/TestInfo.tsx`） | 模型名链接到主站已发布的模型页，见 12.3 |
| Prompt Seen `deploy/hosts/cloudflare-worker.js`、`deploy/hosts/nginx-proxy.conf`、`docs/operations.md` | 把示例里的 `prompt-seen.pages.dev` 改为明显的占位符。它属于第三方，公开仓库的读者照抄就会代理到别人的站点 |
| 新增 `deploy/picontap-proxy/worker.js` | 实现有路径边界、请求头隔离、平台 noindex 处理、安全响应头、`FORCE_NOINDEX` 开关和错误保留的代理 |
| 新增 `deploy/picontap-proxy/wrangler.jsonc` | 分离验收环境和生产环境，生产只绑定指定子路径，开启 `observability` |
| 代理测试与 CI | 覆盖查询参数、响应头透传与删除清单、`FORCE_NOINDEX`、重定向、未知路径、错误、请求方法、Cookie 隔离 |
| Prompt Seen `.github/workflows/ci.yml` | 在现有根路径 production、子路径 preview 外，补充 `/prompt-seen` + production 的构建和浏览器验收，覆盖真正上线的组合 |
| 主站 `src/routes/robots[.]txt.ts` | 仅追加项目 Sitemap 声明 |
| 主站 `src/routes/-machine-content.ts` | 给两份 llms 输出增加项目资源链接，保留原有正文与缓存 / 故障处理 |
| 两站导航 / 页脚和详情 CTA | 主站页脚按 12.3 用绝对地址；Prompt Seen 到主站用普通 `<a>`；链接限于实际存在且可用的目标 |
| 两站测试 | 增加发现入口和主站基线不回退的断言 |

主站改动先在分支完成审查和测试，**步骤 7 通过前不要合入主站主干**：主站发布频繁，提前合入可能在子路径可用前就被带上线，让 robots 和 llms 指向 404。

不要修改主站的 `src/server.ts` 来代理所有请求；也不要把 Prompt Seen 文件复制进主站部署包。主站的 `src/lib/public-pages.ts` 会生成主站本地化地址，不应简单向它加入 `/prompt-seen/`，否则可能派生出 `/zh/prompt-seen/`、`/de/prompt-seen/` 等并不存在的地址。

PicOnTap 的应用导航会处理语言前缀；新增项目链接不走主站自动本地化 Link，写法见 12.3。

## 6. 步骤 2：创建独立托管资源与配置凭据

**操作位置：Cloudflare 与 Prompt Seen 的 GitHub 仓库。**

1. 在 Workers & Pages 创建 **Pages Direct Upload** 项目，项目名用 `picontap-prompt-seen`，生产分支 `main`。不要用 `prompt-seen`：`prompt-seen.pages.dev` 属于第三方（见 2.1）。代理若指向它，就会把别人的站点发布到 `picontap.com/prompt-seen/` 下。
   创建后从控制台或 `wrangler pages project list` 读取实际 `*.pages.dev` 子域名，记录为上游来源。子域名可能与项目名不同，任何地方都不要用项目名拼地址。`deploy/hosts/cloudflare-worker.js` 里写死的 `prompt-seen.pages.dev` 不适用于本次部署。
2. 不给该 Pages 项目绑定 `picontap.com`；主站域名绑定保持原样。
3. 建立 Pages 部署 token：仅需要相应账户的 Cloudflare Pages Edit；代理发布使用具备 Workers Scripts Edit 和该 zone Workers Routes Edit 的独立凭据或本机授权。
4. 单次重定向用控制台配置，或用仅限相应 zone 的规则编辑权限；不为项目部署授予主站数据库权限。
5. 在步骤 0 确定的发布仓库：GitHub → Settings → Environments → `production`，设置必需审阅人和分支保护；私有仓库能否设审阅人取决于 GitHub 套餐，设不了就靠 `SITE_ORIGIN` 最后写入来控制。Deploy workflow 在 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`SITE_ORIGIN` 都存在后，会在 main 每次 CI 成功后自动运行，因此 `SITE_ORIGIN` 到步骤 11 才写入。Rollback workflow 也依赖它，写入前用本机 CLI 回滚。
6. 将下表写入发布仓库的 Actions 配置。密钥在界面或秘密管理器中录入，不写入命令参数、仓库或文档。

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Pages 部署 token |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | 实际账户 ID |
| Variable | `CLOUDFLARE_PAGES_PROJECT` | `picontap-prompt-seen`（项目名，不是子域名） |
| Variable | `SITE_ORIGIN` | `https://picontap.com`，不带路径。**步骤 11 才写入** |
| Variable | `BASE_PATH` | `/prompt-seen` |
| Variable | `MEDIA_BASE_URL` | 步骤 3 确认后的媒体来源 |
| Secret，使用 R2 时 | `S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY` | 仅限新媒体桶 |
| Secret，可选 | `INDEXNOW_KEY` | 后续启用；首次不依赖它 |

现有 Deploy workflow 自己设置 `BUILD_MODE=production` 与提交对应的 `BUILD_ID`。PR 预览读取哪些变量，以 `.github/workflows/ci.yml` 为准；production environment secrets 不会自动成为其他 job 的 secrets，也不要为 fork PR 开放生产凭据。

CLI 示例，使用此次核对时主站已安装的 Wrangler 4.130.0。正式 CI 应固定已经验收的版本，后续升级单独验证。

```bash
cd "$PROMPT_SEEN_REPO"
npm ci
export CLOUDFLARE_PAGES_PROJECT=picontap-prompt-seen
npx wrangler@4.130.0 pages project create "$CLOUDFLARE_PAGES_PROJECT" --production-branch main
npx wrangler@4.130.0 pages project list
```

若同名项目已存在，先确认它是本次专用项目且没有承载其他站点，再继续；否则换一个项目名。CLI 凭据由已登录会话或安全注入的环境变量提供。

## 7. 步骤 3：准备独立图片存储

推荐使用 R2。591 MB 总量本身不证明 Pages 不能部署，实际还要检查文件数和单文件限制；独立 R2 的目的主要是减少发布体积和隔离公开素材。[S5][S6]

1. R2 → Create bucket：`prompt-seen-media-production`。
2. Bucket → Settings → Custom Domains：连接 `prompt-seen-media.picontap.com`，等待证书及域名 Active。
3. 只公开这个新桶。主站用户图片桶、签名访问和清理任务保持原样，不共享生命周期删除规则。
4. 为新桶创建范围限定的 Object Read & Write 凭据，配置步骤 2 的 S3 secrets。`S3_REGION=auto`。
5. 同步前使用 dry-run；该命令仍需要凭据并读取远端对象状态。

```bash
cd "$PROMPT_SEEN_REPO"
export MEDIA_STORAGE=s3
export S3_REGION=auto
export MEDIA_BASE_URL=https://prompt-seen-media.picontap.com
# S3_ENDPOINT、S3_BUCKET、S3_ACCESS_KEY_ID、S3_SECRET_ACCESS_KEY 已由安全方式注入。
npm run media:sync -- --dry-run
npm run media:sync
```

6. 在桶根上传一个 `robots.txt` 对象，Content-Type 为 `text/plain; charset=utf-8`，正文为：

```text
User-agent: *
Allow: /
```

7. 验证媒体域名 robots 和一张真实图片返回 200，图片有正确 MIME，无 `X-Robots-Tag: noindex`，无挑战页。主站根 robots 不控制这个媒体子域名。
8. 为哈希图片设置长期缓存；`robots.txt` 使用短缓存或重新验证。仅在该媒体 hostname 上操作缓存规则。
9. 普通 `<img>` 展示不要求 CORS；如果现有下载功能通过浏览器 fetch 读取图片，配置 R2 CORS 允许 `https://picontap.com` 的 GET / HEAD，并实际测试下载。不要给私有主站 API 添加跨域放行。

保留旧对象供历史部署回滚。正式流量使用自定义媒体域名，不使用开发用途的 `r2.dev` 地址。[S6]

## 8. 步骤 4：生产构建并检查产物

**前提：步骤 1 的代码已完成测试，发布提交的 CI 全部通过，release checkout 干净且提交已固定。** 所有构建和打包命令在同一组环境变量下执行。

```bash
cd "$PROMPT_SEEN_REPO"
export BUILD_MODE=production
export SITE_ORIGIN=https://picontap.com
export BASE_PATH=/prompt-seen
export URL_PATTERN='{basePath}/{locale}/{path}'
export BUILD_ID="$(git rev-parse HEAD)"
export MEDIA_BASE_URL=https://prompt-seen-media.picontap.com

npm ci
npm run content:validate
npm run typecheck
npm run lint
npm test
npm run build
npm run media:check
npm run deploy:cloudflare:prepare
```

命令失败就修复，不继续发布。配置修改需要重新构建，不能仅在上传后改 `BASE_PATH`。

检查产物：

```bash
test -f .deploy/cloudflare/prompt-seen/index.html
test -f .deploy/cloudflare/prompt-seen/en/index.html
test -f .deploy/cloudflare/prompt-seen/zh-hans/index.html
test -f .deploy/cloudflare/prompt-seen/sitemap.xml
test -f .deploy/cloudflare/prompt-seen/llms.txt
test -f .deploy/cloudflare/404.html
test -f .deploy/cloudflare/_headers
test -f .deploy/cloudflare/_redirects
cat .deploy/cloudflare/prompt-seen/generated/build.json
```

检查 `_headers`、`_redirects` 的规则数量和最长行、产物文件数和最大文件，符合当前套餐限额。Pages 单文件上限及规则限制见 [S5]。不要简单按 HTML 页数估算文件数，Next.js 的其他导出文件也占用配额。

再抽样解析 HTML / XML，确认：

- 正文在原始 HTML 中，不依赖执行 JavaScript 才出现。
- canonical、hreflang、Open Graph、JSON-LD 和 Sitemap 使用正式域名与完整子路径。
- 不存在 `example.com`、localhost 或平台域名作为 canonical。
- 搜索、收藏、筛选、草稿保持不索引；允许抓取其 noindex，不能靠 robots 禁止读取代替 noindex。
- 只有已发布内容和已启用语言进入 Sitemap。不要修改主站语言目录来迁就 Prompt Seen。
- JS、CSS、字体、站点图标、数据和搜索索引都使用项目子路径；媒体使用已验证的 CDN 来源。
- `.deploy/cloudflare/404.html` 存在，避免 Pages 将不存在地址作为 SPA 首页返回 200。

### 8.1 内容质量抽检

项目上线后主站 host 的地址数约为原来的 7 倍，站级搜索信号共享，所以上线前要确认这些页面值得被索引。先记录实际地址数：

```bash
grep -c '<loc>' .deploy/cloudflare/prompt-seen/en/sitemap-pages.xml \
  .deploy/cloudflare/prompt-seen/zh-hans/sitemap-pages.xml
```

每种语言随机抽 30 个详情页，再加全部合集页和分类页，人工确认：

- 有真实测试图和可复现的提示词，没有占位内容。
- 说明文字针对这一条提示词，不是换词复用的模板段落。
- 中文是可读的中文，不是逐句直译。
- 标题和描述不与主站已有博客或模型页争同一个搜索意图。

不合格的条目补内容，或把 `status` 改回 `draft` 后重新构建。不合格比例超过 10% 时，先整体修复再继续。这个比例是建议初始值，由内容负责人确认。

## 9. 步骤 5：实现代理与索引响应头约定

### 9.1 代理的固定约束

实现到步骤 1 中新增的专用 Worker，不能仅把通用示例复制后改域名：

1. 生产只接受 `picontap.com` 且 pathname 以 `/prompt-seen/` 开头的请求。超出范围立即拒绝并告警；正常线上其他路径不会命中这个 Worker。不得用 `fetch(request)` 尝试转发到另一个同 zone 的 Route Worker。
2. 仅接受 GET、HEAD；其他方法返回 405、`Allow: GET, HEAD`、`Cache-Control: no-store`。本项目是静态站，不处理 API 写入。
3. 上游来源固定为本次 Pages 项目的**生产别名**，不由请求参数或客户端 Host 决定。保持 pathname 与查询参数，不去掉 `/prompt-seen/`。
4. 采用请求头白名单：必要的 Accept、User-Agent、Accept-Language、条件请求和 Range 相关头。丢弃 Cookie、Authorization、Proxy-Authorization、客户端提供的内部标记及 Forwarded 认证信息；让 fetch 为固定上游建立 Host。
5. 使用 `redirect: 'manual'`。保留 301 / 302 / 307 / 308；解析 Location，仅将指向所配置 Pages 来源的目标改写为正式来源；目标路径必须仍在项目范围。测试绝对、相对、协议相对形式和带参数形式，不采用字符串截断。意外的跨域 / 越界跳转视为配置错误。
6. 响应默认透传状态、正文和全部响应头，只删除明确清单：`Set-Cookie`（见第 8 条）、内部标记头、按 9.2 判定的平台 noindex，以及会作用于整个 `picontap.com` 来源的 `NEL`、`Report-To`、`Strict-Transport-Security`、`Clear-Site-Data`。不要用保留白名单：`Cache-Control`、`Content-Range`、`Accept-Ranges`、`Link`、`ETag` 都必须到达客户端，漏掉 `Cache-Control` 会破坏 9.3 的缓存约定。HEAD 不附加正文；保留 Range 的 206 / 416 语义。
7. 不对 HTML 注入主站组件；不移除页面 meta robots；返回内容不根据爬虫 UA 或用户身份变化。
8. 静态上游意外返回 Set-Cookie 时不转发，记录告警并禁止缓存该响应。代理不创建主站会话。
9. 超时 / 网络错误返回 503、`Retry-After: 60`、`Cache-Control: no-store`，不回退成主站首页或 200。上游真实 404 保持 404。
10. 增加只用于验收的 `X-Prompt-Seen-Proxy` 版本标记。主站其他路径不能出现此头。本节所说的“告警”，第一版是写入 Workers Logs 的结构化 `console.error`（带固定 `event` 字段），由步骤 11 的人工检查查看；需要主动通知时另行配置。日志不记录 Cookie、Authorization 或完整查询串。
11. 补齐与主站一致的 `X-Frame-Options: SAMEORIGIN`。Pages 默认已带 `X-Content-Type-Options: nosniff` 和 `Referrer-Policy: strict-origin-when-cross-origin`，验收时确认它们到达客户端；按 9.3 增加路径级 CSP。
12. 支持 `FORCE_NOINDEX` 变量。值为 `true` 时，代理在其他处理之后给所有响应加 `X-Robots-Tag: noindex`，页面保持可访问，用于步骤 11 的暂停规则，不需要重新构建。

### 9.2 平台 noindex 与页面 noindex 分开处理

当前生产构建在 `*.pages.dev` 添加 `X-Robots-Tag: noindex`。直接把它转发到正式子目录会阻止收录；直接无条件删除则不安全。[S4]

采用下面的约定，作为此次代理实现的一部分：

- 生产构建的两条平台域名 `_headers` 规则，同时生成 `X-Prompt-Seen-Platform-Noindex: production-v1` 和现有 `X-Robots-Tag: noindex`。
- preview 构建只保留自己的 noindex，不生成 `production-v1` 标记。
- 页面是否不索引只由既有 meta robots 控制。生产 `_headers` 没有平台规则以外的 `X-Robots-Tag`，本次不建页面级 HTTP robots 通道，由步骤 1 的 emitter 测试保证。以后确实需要时再单独设计新版本标记。
- 仅当固定上游的响应有生产标记，且 `X-Robots-Tag` 的完整规范化值恰为 `noindex` 时，代理移除这条平台限制。
- 遇到没有标记或未知 / 组合 robots 指令，保留原限制并使上线检查失败；不能猜测后删除。4xx / 5xx 保持或补充 noindex，不因平台标记移除错误页面限制。
- 304 在步骤 6 实测。若 304 保留标记，按同一规则处理；若不保留，代理只对 304 删除值恰为 `noindex` 的 `X-Robots-Tag`（304 没有正文，生产 `_headers` 也没有其他来源）。不能让 304 重新带回平台 noindex。
- 发给访客前删除内部 `X-Prompt-Seen-Platform-Noindex`；正式 HTML 的原始 meta robots 保持不变。
- 验收环境的代理先走完整的生产逻辑，把结果写入 `X-Prompt-Seen-Proxy-Robots-Result`（`removed` / `kept` / `none`），最后统一加 `X-Robots-Tag: noindex`。这样上线前就能用真实 Pages 响应验证移除逻辑。正式代理不输出这个头，并关闭 workers.dev 和 preview URLs。

生成的生产平台头示例，必须在 emitter 中实现，不能手改生成文件：

```text
https://:project.pages.dev/*
  X-Robots-Tag: noindex
  X-Prompt-Seen-Platform-Noindex: production-v1

https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex
  X-Prompt-Seen-Platform-Noindex: production-v1
```

标记不是认证秘密，而是由固定、受控上游发出的构建约定。平台重定向可能不应用 `_headers`，因此不能要求所有 3xx 都有标记；验收最终页面的索引行为，不因此将正确重定向变成 503。[S4]

### 9.3 缓存与同源约束

- 首次上线不启用全站 Cache Everything，不调用全 zone Purge Everything。
- `/_next/static/` 在本项目完整前缀下使用 immutable；HTML、无哈希 generated 数据、Sitemap、llms、build.json 使用重新验证或短缓存。为新路径检查现有 zone 级覆盖规则。
- 代理第一版不额外使用 `caches.default` 保存处理后的响应，减少平台副本头与正式头混用。自定义缓存键若以后加入，必须区分 hostname 和发布版本。
- 当前本地存储键 `prompt-library:preferences:v1`、`prompt-library:favorites:v1` 与主站核对无冲突。禁止 `localStorage.clear()`、重写主站 Cookie、注册覆盖根目录的 Service Worker。
- 同源意味着项目脚本理论上能带用户 Cookie 调用主站 API，而项目仓库已公开。继续使用审核过的静态内容及受限 MDX 渲染；不允许用户上传任意可执行 HTML / JS。
- 代理给项目响应加 `Content-Security-Policy: connect-src <当前来源>/prompt-seen/`（路径以 `/` 结尾时按前缀匹配）；启用统计时加入其上报来源。它只限制 fetch、XHR、WebSocket、beacon 这类请求，不限制导航和资源加载，不能替代内容审核。不设置 `script-src`，避免影响首屏主题内联脚本。这条策略只加在项目响应上，主站响应不变。

### 9.4 代理验收环境

先准备无生产域名路由的 `prompt-seen-proxy-preview` Worker 配置，在步骤 6 上传 Pages 后部署，使用独立 workers.dev 地址并强制 noindex。测试同一份生产 Pages 产物的转发、响应头和错误处理，并用浏览器确认搜索、详情弹层和预取没有 CSP 报错。验收不能只有浏览器首页截图，必须覆盖第 13 节的矩阵及上面每一条代理约束。

正式配置示例，保存为实施时新增的 `deploy/picontap-proxy/wrangler.jsonc`。先不要执行 production deploy；它会立即绑定生产路由。

```jsonc
{
  "name": "prompt-seen-proxy",
  "main": "worker.js",
  "compatibility_date": "2026-11-05",
  "observability": { "enabled": true },
  "env": {
    "preview": {
      "name": "prompt-seen-proxy-preview",
      "workers_dev": true,
      "preview_urls": false,
      "routes": [],
      "vars": {
        "DEPLOYMENT_MODE": "preview",
        "CANONICAL_ORIGIN": "https://picontap.com",
        "BASE_PATH": "/prompt-seen",
        "PAGES_ORIGIN": "https://REPLACE_WITH_ACTUAL_SUBDOMAIN.pages.dev",
        "FORCE_NOINDEX": "false"
      }
    },
    "production": {
      "name": "prompt-seen-proxy-production",
      "workers_dev": false,
      "preview_urls": false,
      "routes": [
        { "pattern": "picontap.com/prompt-seen/*", "zone_name": "picontap.com" }
      ],
      "vars": {
        "DEPLOYMENT_MODE": "production",
        "CANONICAL_ORIGIN": "https://picontap.com",
        "BASE_PATH": "/prompt-seen",
        "PAGES_ORIGIN": "https://REPLACE_WITH_ACTUAL_SUBDOMAIN.pages.dev",
        "FORCE_NOINDEX": "false"
      }
    }
  }
}
```

将步骤 2 记录的实际 Pages 子域名填好，程序启动时拒绝占位符和非 HTTPS 来源。实现 preview 模式时允许其指定验收 hostname，生产 hostname 校验保持严格。示例省略编辑器使用的 `$schema`，不要求仅使用 npx 的仓库提前安装本地 Wrangler。

## 10. 步骤 6：先上传 Pages，再验证平台地址

首次接入不直接使用现有完整 Deploy workflow：它最后会检查尚未接通的正式子路径，失败也不会自动恢复已发布资源。先拆开初次上传与接入，待链路完整后再启用日常 workflow。

```bash
cd "$PROMPT_SEEN_REPO"
npx wrangler@4.130.0 pages deploy .deploy/cloudflare \
  --project-name "$CLOUDFLARE_PAGES_PROJECT" \
  --branch main \
  --commit-hash "$BUILD_ID"
```

记录命令返回的 deployment ID、部署 URL、commit；设置实际平台地址：

```bash
export PS_PAGES_ORIGIN=https://ACTUAL_SUBDOMAIN.pages.dev
npm run check:live -- --site "$PS_PAGES_ORIGIN" --platform --expect-build "$BUILD_ID"
```

`--expect-build` 同时证明这个地址确实是本项目；地址填错时检查必须失败。再对本次不可变 deployment URL 运行同样检查。`--site` 只填来源，不重复添加 `/prompt-seen`，脚本会根据 build 配置补路径。

平台页最终响应必须 noindex，canonical 必须指向正式子目录；确认真实 404、重定向、Markdown MIME / canonical Link、图片均正确。

接着实测条件请求，结果决定 9.2 的 304 处理方式：

```bash
# 记录首次响应的 ETag / Last-Modified、X-Robots-Tag 和标记头。
curl --silent --show-error --max-time 30 --dump-header - --output /dev/null \
  "$PS_PAGES_ORIGIN/prompt-seen/en/"
# 若上面有 ETag，填入后再请求一次，记录状态码和同样的响应头。
curl --silent --show-error --max-time 30 --dump-header - --output /dev/null \
  -H 'If-None-Match: ACTUAL_ETAG' "$PS_PAGES_ORIGIN/prompt-seen/en/"
```

复核时抽样的另一个 Pages 站点响应里没有 ETag。若本项目也没有 ETag 和 Last-Modified，上游不会返回 304，这一项记为不适用。

然后部署步骤 5 的 preview 代理并验证；它也必须保持 noindex：

```bash
npx wrangler@4.130.0 deploy --config deploy/picontap-proxy/wrangler.jsonc --env preview
# 使用命令返回的真实来源地址，不附加 /prompt-seen。
export PS_PROXY_PREVIEW_ORIGIN=https://ACTUAL_PREVIEW_WORKER.ACCOUNT.workers.dev
npm run check:live -- --site "$PS_PROXY_PREVIEW_ORIGIN" --platform --expect-build "$BUILD_ID"
curl --silent --show-error --max-time 30 --dump-header - --output /dev/null \
  "$PS_PROXY_PREVIEW_ORIGIN/prompt-seen/en/" | grep -i '^x-prompt-seen-proxy-robots-result'
```

`check:live` 验证预览端内容及 noindex。结果头必须是 `removed`，证明生产移除逻辑在真实 Pages 响应上生效；上线后还需正式来源检查。

**通过条件：** Pages 和代理验收地址均完整可用；结果头为 `removed`；304 行为已记录；所有索引限制处理测试通过；仍未改变主站路由。

## 11. 步骤 7：接通精确子路径

### 11.1 准备入口重定向

Cloudflare → `picontap.com` → Rules → Redirect Rules → Single Redirect，创建以下规则，暂不启用：

| 字段 | 值 |
| --- | --- |
| 名称 | `prompt-seen-entry-trailing-slash` |
| 匹配表达式 | `(http.host eq "picontap.com" and http.request.uri.path eq "/prompt-seen")` |
| 目标类型 | Static URL |
| 目标 | `https://picontap.com/prompt-seen/` |
| 状态码 | 308 |
| Preserve query string | **开启** |

该规则只匹配入口 pathname，包括带查询参数的情况。不要用全站“添加尾斜杠”规则：主站当前有自己的去尾斜杠逻辑，全站规则会与它冲突。

### 11.2 绑定 Worker 后启用入口规则

1. 核对生产配置无占位符、无 `picontap.com/*`、无 `custom_domain: true`、无 `/prompt-seen*` 宽泛匹配，`PAGES_ORIGIN` 是步骤 2 记录的实际子域名。
2. 确认现有 Redirect / Transform 规则不会把项目地址提前改成主站语言目录，且没有更具体的无 Worker 路由截断项目。
3. 发布已经验收的代理代码，只绑定项目子路径：

```bash
cd "$PROMPT_SEEN_REPO"
npx wrangler@4.130.0 deploy --config deploy/picontap-proxy/wrangler.jsonc --env production
```

4. 确认 `/prompt-seen/` 直接返回正确页面后，启用上面的入口重定向。
5. 立即检查：

```bash
curl --silent --show-error --max-time 30 --dump-header - --output /dev/null \
  'https://picontap.com/prompt-seen?utm_source=github&check=1'
curl --silent --show-error --max-time 30 --dump-header - --output /dev/null \
  'https://picontap.com/prompt-seen/'
curl --silent --show-error --max-time 30 --dump-header - --output /dev/null \
  'https://picontap.com/prompt-seen-other'
```

第一项应为 308，Location 为带原参数的 `/prompt-seen/`；第二项为 200，不能有意外 noindex；第三项保持主站原有结果，不能出现代理标记。

6. 立即运行完整线上检查。这是生产 noindex 移除逻辑第一次面对正式地址，不要等到主站发布：

```bash
cd "$PROMPT_SEEN_REPO"
npm run check:live -- --expect-build "$BUILD_ID" --wait 180 \
  | tee "$PS_EVIDENCE_DIR/check-live-after-route.txt"
grep '^✗' "$PS_EVIDENCE_DIR/check-live-after-route.txt"
```

主站 robots 还没有项目 Sitemap，所以这次检查必然报告失败。`grep` 只能输出 `✗ host robots.txt: Sitemap: https://picontap.com/prompt-seen/sitemap.xml` 这一行；出现其他失败项按步骤 12 处理。

7. 用无痕窗口或干净的浏览器配置刷新一条深层详情地址；检查 JS、CSS、字体、图片、搜索索引均成功加载。上线前打开过 `/prompt-seen/` 的浏览器可能缓存了主站旧的 308，不能作为判断依据。

8. 先做一次不依赖新增主站 Sitemap 声明的主站回归：首页、公开 API、现有会话与原发现文件保持。不要等主站入口补丁发布后才第一次检查是否误接管了旧功能。

**通过条件：** 正式子目录可用，`check:live` 只有 Sitemap 一项失败，主站其他 URL 没有进入新 Worker。若失败，按步骤 12 回滚，不修改主站全局规则来绕过问题。

## 12. 步骤 8：增量加入主站发现入口

路径接通后再发布发现入口，避免搜索引擎先发现大量 404。主站补丁需提前完成审查和隔离环境验证，但到此才合入主干。

### 12.0 先提交 Sitemap，不发布主站

步骤 7 通过后，立即按步骤 10 的第 1–3 项在 Search Console 和 Bing 提交项目 Sitemap。这一步不需要发布主站，项目已经可以被发现，主站也没有任何变化。

下面 12.1–12.3 的主站改动不设专门发布窗口，见 12.4。

### 12.1 robots.txt 仅追加 Sitemap

编辑主站 `src/routes/robots[.]txt.ts`，在原 Sitemap 声明旁新增：

```typescript
`Sitemap: ${envConfigs.app_url}/prompt-seen/sitemap.xml`,
```

最终所有旧规则原样保留，只有这一行新增。不要删除 `/de` 私有路径规则；不要把项目生成的整个 robots snippet 拼接进去。

PicOnTap 本实例 `content/site.yaml` 的 `robots.aiTraining` 已在步骤 1 改为 `allow`，因此项目线上检查与主站继承策略一致。这个设置表示不新增禁止训练抓取的 robots 声明，不代表已授权图片的所有用途，也不保证 AI 服务一定抓取或引用。

### 12.2 主站 llms 文件新增资源目录

编辑 `src/routes/-machine-content.ts` 的 `machineContent()` 输出，在现有公开页面 / 指南内容之外增加以下段落，使两种 `full` 模式均包含它：

```markdown
## Open-source prompt library

- [Prompt Seen](https://picontap.com/prompt-seen/): Tested image prompts, templates and examples, maintained by PicOnTap.
- [English library](https://picontap.com/prompt-seen/en/)
- [简体中文提示词库](https://picontap.com/prompt-seen/zh-hans/)
- [Machine-readable prompt catalog](https://picontap.com/prompt-seen/llms.txt)
- [Prompt library sitemap](https://picontap.com/prompt-seen/sitemap.xml)
```

实际代码用环境来源构造这些固定路径，不要通过主站 `publicUrl(path, locale)` 自动添加 `/zh` 或 `/de`。不改变原有 guides 正文、缓存、数据库错误时的 last-good / 503 行为；不在每次主站请求时从 Pages 拉取全文。

`llms.txt` 是便于机器读取的补充入口，不是所有 AI 服务承诺遵守的标准，也不能替代 HTML、Sitemap 和正常可抓取链接。

### 12.3 HTML 链接和项目导流

- 主站页脚（链接配置在 `src/blocks/footer.tsx`）增加项目入口，英文直达 `/prompt-seen/en/`，中文直达 `/prompt-seen/zh-hans/`，其他主站语言暂指向项目语言入口，不创建空翻译页。
- 页脚 href 写 `envConfigs.app_url` 开头的绝对地址，走 `FooterAnchor` 现有的外链分支（新标签页）。不要写站内路径 `/prompt-seen/`：`DraftSafeLink` 会用本地化 Link 并通过 `router.push` 走客户端路由，到不了项目页面。也不要换成同标签页的裸 `<a>`：`DraftSafeLink` 负责在离开前保存编辑器草稿，裸 `<a>` 会跳过这一步。外链分支的 `rel="noopener noreferrer"` 不影响抓取，但项目统计里看不到来自主站的 referrer。
- Prompt Seen 页脚标明与 PicOnTap 的关系，链接到主站；项目 README 的在线演示使用唯一正式子目录。
- 详情页 CTA 只链接到主站已上线的相关功能；一期使用“复制提示词 + 打开 PicOnTap”。当前主站首页没有已验证的 prompt URL 导入协议，不承诺自动带入或一键复现。
- 详情页的模型名链接到主站已发布的模型页：在实例配置里维护“显示名 → 主站路径”映射，英文页指向 `/models/<slug>`，中文页指向 `/zh/models/<slug>`。这是项目把价值传给主站最直接的内链。目前 208 条 GPT Image 2.5 内容可指向 `/models/gpt-image-2-5`；27 条 GPT Image 2.6 在主站没有模型页，先不加链接，也不要指向 2.5。
- 跨应用跳转都是整页导航；不在同一文档里挂载两套框架，也不嵌入 iframe 作为正式页面。
- 主站 `/sitemap.xml` 保留自己的现有条目。项目独立 Sitemap 已在 robots 声明，不需要重建主站 Sitemap 的格式。

### 12.4 随主站下一次正常发布上线

步骤 7 通过后，把已审查的主站改动并入主站主干，随下一次正常发布上线，由主站发布负责人按现有审阅要求执行。不要从某个旧提交单独切一个发布：生产提交无法可靠确定（见 2.1），从旧基线发布可能回退线上已有功能，也会被迁移预检拦下。

主站发布使用自己的生产凭据；切换发布对象时不要沿用 Pages 专用 token。调用主站现有发布流程，而不是从 Prompt Seen 工作流执行主站部署。下面的 `PICONTAP_REPO` 改指发布用的干净 checkout，不再是步骤 0 的基线目录：

```bash
export PICONTAP_REPO=/absolute/path/to/picontap-release
cd "$PICONTAP_REPO"
pnpm typecheck
pnpm check:boundaries
pnpm test
# DEPLOY_ENV_FILE 指向已安全配置的生产环境文件，不在终端打印内容。
export APP_ENV=production
pnpm cf:check --environment production
pnpm cf:deploy:production
```

发布脚本会构建、校验产物、检查迁移历史及资源，再发布并检查 Sitemap；它不会为这项内容入口变更自动批准 SQL。主干上本次之外的改动和迁移属于那次发布自身的范围，由发布负责人决定，不能为了上线入口而绕过校验。发布后在主站发布记录中登记应用提交和 Worker 版本，并更新 `docs/deployment/production-status.md`。

入口发布之前项目已可访问，所以主站发布晚几天不阻塞项目，只是推迟步骤 9 和步骤 11。

## 13. 步骤 9：验收三个目标

本步骤在主站入口改动发布之后执行，此时 `check:live` 必须全部通过。

### 13.1 自动检查

```bash
cd "$PROMPT_SEEN_REPO"
npm run check:live -- --expect-build "$BUILD_ID" --wait 180
npm run media:check

cd "$PICONTAP_REPO"
SEO_BASE_URL=https://picontap.com SEO_APP_ENV=production pnpm test:seo
```

重新按步骤 0 保存 `after-*` 的四份发现文件，与 `before-*` 比较：

```bash
(
  set -e
  for item in robots.txt sitemap.xml llms.txt llms-full.txt; do
    curl --fail --silent --show-error --max-time 30 \
      --dump-header "$PS_EVIDENCE_DIR/after-$item.headers" \
      --output "$PS_EVIDENCE_DIR/after-$item" \
      "https://picontap.com/$item"
  done
)
diff -u "$PS_EVIDENCE_DIR/before-robots.txt" "$PS_EVIDENCE_DIR/after-robots.txt"
diff -u "$PS_EVIDENCE_DIR/before-llms.txt" "$PS_EVIDENCE_DIR/after-llms.txt"
diff -u "$PS_EVIDENCE_DIR/before-llms-full.txt" "$PS_EVIDENCE_DIR/after-llms-full.txt"
```

`diff` 显示预期新增内容时退出码为 1，不等于部署失败；逐项审核差异。以下只读检查复用项目解析器，确认新旧 robots 对代表性主站路径的允许结果一致，并验证项目 Sitemap：

```bash
cd "$PROMPT_SEEN_REPO"
node --import tsx --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseRobots, isAllowed } from './scripts/lib/live/robots.ts';
const evidence = process.env.PS_EVIDENCE_DIR;
assert.ok(evidence, 'Set PS_EVIDENCE_DIR to this release evidence directory');
const before = parseRobots(fs.readFileSync(path.join(evidence, 'before-robots.txt'), 'utf8'));
const after = parseRobots(fs.readFileSync(path.join(evidence, 'after-robots.txt'), 'utf8'));
const agents = ['Googlebot', 'Googlebot-Image', 'Bingbot', 'OAI-SearchBot',
  'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot',
  'Perplexity-User', 'GPTBot', 'ClaudeBot', 'Google-Extended',
  'Applebot-Extended', 'CCBot'];
const paths = ['/', '/zh', '/de', '/models/gpt-image-2', '/pricing',
  '/blog', '/admin', '/settings', '/api/health', '/zh/admin',
  '/zh/settings', '/zh/api/health', '/de/admin', '/de/settings', '/de/api/health'];
for (const agent of agents) {
  for (const pathname of paths)
    assert.equal(isAllowed(after, agent, pathname), isAllowed(before, agent, pathname),
      `${agent} changed permissions for ${pathname}`);
  assert.ok(isAllowed(after, agent, '/prompt-seen/en/'), `${agent} blocked from library`);
}
for (const sitemap of before.sitemaps) assert.ok(after.sitemaps.includes(sitemap));
assert.ok(after.sitemaps.includes('https://picontap.com/prompt-seen/sitemap.xml'));
console.log('PASS: existing crawl permissions preserved; library and sitemap discoverable');
NODE
```

该解析器检查本次涉及的规则，不能代替爬虫供应商的全部实现或真实边缘访问验证。

- robots：除新增 Sitemap 外原文不变；原有 User-agent / Allow / Disallow 结果不变。
- 主站 Sitemap：本次变更不删除或重定向旧条目。若同期正常发布了文章，应逐项解释差异，不将动态正文要求为字节完全相同。
- llms 两份文档：原有链接与指南内容保留，仅增加新段落。
- 首页与代表性公开页：canonical、hreflang、meta robots、HTTP 索引头及正文仍正确；页面变化限于新增入口。

新增的代理 / robots 测试需检查下列矩阵，不能只依赖项目原有 `check:live`：

| 场景 | 期望 |
| --- | --- |
| `/prompt-seen` 与带 UTM 参数的入口 | 308，补一个斜杠，参数完整，无循环 |
| `/prompt-seen/`、英文、中文首页 | 200，HTML 正文完整，正确自指 canonical，无意外 noindex |
| 深层详情直接打开、刷新、带查询参数 | 页面及资源可用，canonical 不带追踪参数 |
| JS、CSS、字体、generated 数据、图标 | MIME 正确，无根路径串用，不返回 HTML 代替资源 |
| 项目 Sitemap、llms、Markdown | 200，内容正确；Markdown 有指向 HTML 详情的 canonical Link |
| 搜索、收藏、筛选页面 | 保留原有 noindex，且不进入 Sitemap |
| 平台地址、PR 预览、验收代理地址 | 最终内容响应 noindex，不能成为另一套正式收录站点 |
| 旧地址重定向 | 正确 301 / 308，Location 不泄露上游域名，最终页面可达 |
| 随机不存在地址、删除条目 | 真正 404；已有约定支持 410 时可为 410，不能 soft 404 |
| HEAD、条件请求、Range | 状态、正文与索引 / 缓存头符合协议；不能让 304 恢复平台 noindex |
| 项目响应头 | `Cache-Control`、`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、路径级 CSP 到达客户端；内部标记不出现 |
| 验收代理设 `FORCE_NOINDEX=true` | 全部响应带 noindex，页面仍可访问 |
| POST 到项目路径 | 405，不进入主站业务 API |
| `/prompt-seen-other`、`/prompt-seen2`、`/zh/prompt-seen` | 保持原主站行为，无新代理标记 |
| 主站首页、`/api/*`、登录、价格、用户工作区 | 不经过新代理，原缓存和访问权限保持 |
| Cookie / Authorization | 发往 Pages 的子请求不携带；响应不覆盖主站 Cookie |
| 上游超时、5xx | 503 或原有错误，no-store，不变成成功首页 |

### 13.2 搜索与 AI 爬虫访问

对主站和项目各选真实公开页，用 Googlebot、Googlebot-Image、Bingbot、OAI-SearchBot、ChatGPT-User、Claude-SearchBot、Claude-User、PerplexityBot、Perplexity-User 做合成 UA 检查。保持训练策略时，也按项目检查器覆盖 GPTBot、ClaudeBot、Google-Extended、Applebot-Extended、CCBot 的 robots 结果；其中一些 token 表示使用控制，不是独立网络爬虫，不能将 UA 模拟当作真实访问证明。

检查 200、完整正文和正确 canonical，而不只是 HTTP 状态。200 的挑战页同样不通过。

在 Cloudflare 的安全 / Bot / AI Crawl Control 日志中核对真实抓取是否被挑战或阻断。不得用“User-Agent 包含 Googlebot”作为安全规则放行条件。若现有规则挡住项目所需抓取，使用平台支持的验证机制和最小路径范围调整，不关闭全站 WAF、不降低登录 / API 防护。

主站此前已经成功的抓取必须保持。若基线已存在阻断，明确登记为已有问题；修复时保留原有业务保护，并独立验证。没有真实 bot 访问记录时，记录“待真实访问验证”，不要写成已验证。

### 13.3 主站业务回归

先在隔离环境完成登录、OAuth 返回、编辑器上传 / 草稿 / 生成、积分、支付与 webhook 集成测试。生产使用专用验收账号，逐项记录：

1. 已登录主站后进入项目，再回主站，会话与已有草稿保持。
2. 未登录访客进入项目可以浏览和复制，进入主站后仍按原规则登录。
3. 首页、已启用语言、模型 / 工具 / 价格页、编辑器及图片加载正常。
4. 项目收藏、主题设置、浏览器前进后退不修改主站存储或语言设置。
5. OAuth、支付返回和 webhook 路径仍由原 Worker 处理；检查已有监控和日志无新增错误。
6. 主站 API 5xx、延迟、登录失败、任务失败和付款错误率未出现与切换相关的回退。

不要为证明无影响而在生产伪造支付 webhook、删除用户数据或重复扣费。真实生成 / 支付烟测按现有发布验收流程和专用账号执行，并记录测试成本；只读检查不能替代完整业务验证。

**放行标准：** 上述技术检查通过、所有相对基线的新失败清零、回滚点可用。搜索引擎尚未收录不代表技术失败，但不能因此宣称流量目标已实现。

## 14. 步骤 10：登记搜索资源、开源入口与转化

第 1–3 项在步骤 7 通过后立即执行（见 12.0），其余在步骤 9 之后执行。

1. Search Console 保留现有主站资源，新增 URL-prefix 资源 `https://picontap.com/prompt-seen/`；通过既有域名验证或该资源支持的验证方式完成。
2. 提交项目 Sitemap，抽查英文 / 中文详情及图片可访问性。主站原 Sitemap 提交保持。
3. Bing Webmaster Tools 保留主站配置，提交新增 Sitemap。需要 IndexNow 时再配置 key；它不替代 Google Sitemap。
4. 公开仓库 `picontapLab/prompt-seen` 已存在。完善 README：正式演示地址、截图、安装 / 自托管步骤、贡献说明、代码 / 内容 / 图片许可；不要发布部署秘密或生成期间的私密资料。
5. 保持只有一个正式索引站点；不同时把相同内容的子域名和 Pages 副本开放索引。
6. 统计项目访问、详情访问、复制、进入 PicOnTap、成功生成、注册与首次付费。访问和来源来自步骤 1 配置的 `analytics`。“复制”和“进入 PicOnTap”需要自定义事件，现有代码没有，要统计就作为单独改动实现；在此之前用主站落地数据估算。站内跳转优先使用自定义来源事件 / 提示词 ID，避免用内部 UTM 覆盖原始获客来源；GitHub 等外部入口可以使用 UTM。
7. 不在 URL 或分析事件中记录用户私有提示词、图片、会话 token。CTA 的目标功能和模型兼容性逐项校验。
8. 观察主站与项目分路径的收录、抓取错误、真实 AI 来源、自然搜索点击、生成与付费漏斗。llms 有入口不等于已被 AI 引用，GitHub star 也不等于有效转化。

## 15. 步骤 11：日常发布与观察

步骤 9 全部通过后，在发布仓库写入 `SITE_ORIGIN` 变量，启用 Prompt Seen 现有 Deploy workflow：CI 通过 → 生产构建 → 图片同步 / 验证 → Pages 上传 → 平台和正式地址检查 → 可选 IndexNow。

- 增加步骤 5 的代理响应头与路径测试作为发布门禁。代理代码单独发布，不随每次内容构建重绑路由。
- Pages 部署和回滚使用互斥发布窗口；代理、主站入口与 Pages 变更也不能在回滚期间并行修改。
- workflow 失败不代表线上没有变化；检查失败后冻结后续自动发布，判断是否需要回滚。
- GitHub `workflow_dispatch` 可选择 ref，不能把“手动选择了提交”当作该提交 CI 已通过；只发布已验证的固定 SHA。
- 不复用主站部署 token / 数据库秘密去构建开源项目。PR 预览保持 noindex。
- 上线后立即、30 分钟、24 小时检查主站错误率、项目状态和代理在 Workers Logs 里的告警；前一周每日检查抓取响应，随后每周看收录与转化。此处是人工运维安排，不代表已创建定时任务。
- 独立 Worker / Pages 减少主站计算和数据库负担，但账户配额、花费与域名级防护仍共享。检查请求预算、限额和费用趋势，按项目设置告警。
- 页面或数据出现旧新版本混用、ChunkLoadError 时处理项目发布一致性；不得清空全站缓存作为默认修复。

### 15.1 搜索影响观察与暂停规则

上线后至少观察 8 周。Search Console 数据有延迟，单日波动不能作为依据；主站路径与 `/prompt-seen/` 分开看，并与步骤 0 的基线比较。下表阈值是建议初始值，上线前由负责人确认后写入第 17 节。

| 信号 | 比较对象 | 触发条件 |
| --- | --- | --- |
| 主站路径（不含 `/prompt-seen/`）的点击、展示 | 上线前 28 天日均 | 连续 14 天低于基线 20% |
| 主站已编入索引页面数 | 上线前数量 | 下降超过 10% |
| 主站抓取错误、平均响应时间 | 上线前水平 | 明显上升并持续 7 天 |
| 项目页面“已抓取，尚未编入索引”的比例 | 项目已提交地址 | 上线 8 周后超过 50%，只触发内容复审，不暂停 |

触发后按顺序处理：

1. 先判断原因。季节、主站发布和已公告的搜索更新都要排除，时间上相关不等于项目造成。
2. 确认需要暂停时，把生产代理的 `FORCE_NOINDEX` 改为 `"true"`，用 `wrangler deploy --config deploy/picontap-proxy/wrangler.jsonc --env production` 发布。页面保持可访问，已收录地址逐步退出索引。保留 robots 里的 Sitemap 和抓取权限，否则搜索引擎读不到 noindex。
3. 暂停期间 `check:live` 会因 noindex 失败，这是预期结果。同时删除发布仓库的 `SITE_ORIGIN` 变量，冻结 Deploy workflow。
4. 修复内容后改回 `"false"` 并恢复 `SITE_ORIGIN`，重新运行 `check:live`，在 Search Console 请求重新抓取代表页面。

## 16. 步骤 12：回滚操作

### 16.1 项目内容或静态资源有问题

保持入口与代理路由，优先恢复上一个已通过验收的 Pages 生产 deployment：

```bash
cd "$PROMPT_SEEN_REPO"
npm run deploy:rollback -- --list
# 用列表里实际部署 ID 替换；确保它符合当前代理的响应头约定。
npm run deploy:rollback -- --yes --to ACTUAL_PREVIOUS_DEPLOYMENT_ID
npm run check:live -- --expect-build ACTUAL_PREVIOUS_COMMIT --wait 180
```

回滚前冻结自动发布；回滚后撤销导致问题的源码提交，避免下次又发布回来。R2 旧对象保持可用。代理头约定有版本变化时，记录兼容范围，必要时配对回滚代理。

首次发布没有可回滚的生产版本，不能假设脚本总能找到前一版。此时按下节用项目范围的 503 暂停服务并修复。

### 16.2 代理有问题，主站正常

Cloudflare → 专用代理 Worker → Deployments → 恢复之前验证过的版本。仅操作 `prompt-seen-proxy-production`，不回滚主站 Worker。

没有可用旧版本时，保留子路径路由但将项目服务暂时改为 503、`Retry-After`、no-store；不能跳转到主站首页制造 soft 404。修复窗口结束后恢复可用版本，避免长期 503。

### 16.3 路由误配已经影响主站

1. **先停用 `prompt-seen-entry-trailing-slash` 入口重定向，再移除错误的 Worker Route**，然后恢复步骤 0 保存的主站绑定，不删除原主站规则。顺序不能反：主站会把 `/prompt-seen/` 308 到 `/prompt-seen`，入口规则又会 308 回去，形成循环。完成后确认 `/prompt-seen` 恢复为 404，`/prompt-seen/` 恢复为一次 308 到 `/prompt-seen`。
2. 若曾把 Worker 误绑到全站，先恢复原路由，再确认首页、API、登录和支付回调路径恢复。
3. 项目暂时不可用可以接受；不要为了维持项目入口继续影响主站。
4. 主站发现入口补丁需要撤销时，只撤销本次新增段落 / 链接 / Sitemap 行，并沿主站既有发布流程发布。不要回滚其他正常业务数据。
5. 用步骤 0 的基线重新检查，记录受影响时间、路径、恢复版本与残留问题。

### 16.4 已收录内容长期下线

短期故障恢复原地址；永久移除按内容情况使用准确的对应重定向或真实 404 / 410，同时更新项目 Sitemap。不能把所有旧详情一律 301 到主站首页。

## 17. 上线记录模板

执行者填写后保存在本次发布记录中，不填写秘密值：

| 项目 | 实际结果 |
| --- | --- |
| “Prompt Seen” 名称决定与决定人 | 待填 |
| Prompt Seen 发布仓库 | 待填 |
| Prompt Seen commit / BUILD_ID | 待填 |
| Pages 项目 / 实际子域名 / deployment ID / URL | 待填 |
| 代理 Worker / version ID | 待填 |
| 精确 Route / Redirect rule ID | 待填 |
| R2 桶 / 媒体域名 / 访问检查 | 待填 |
| 主站原生产 commit（未知就写“未知”）/ Worker version | 待填 |
| 主站本次入口改动 commit / 发布批次 / 新 version | 待填 |
| Search Console / Bing 基线位置 | 待填 |
| 内容抽检：地址总数、抽样数、不合格数 | 待填 |
| before / after 抓取证据位置 | 待填 |
| 304 实测结果与代理处理方式 | 待填 |
| 项目 check:live / 平台检查 / media:check | 待填 |
| 暂停规则阈值与确认人 | 待填 |
| 主站 SEO / 业务回归 | 待填 |
| 真实 bot 验证与尚未观测项 | 待填 |
| Search Console / Bing 提交情况 | 待填 |
| 回滚目标与兼容性验证 | 待填 |
| 未解决问题与是否允许放行 | 待填 |

只有在这些记录有实际证据后，才能将本文状态改为“已部署并验收”。

## 18. 参考依据

官方资料核查日期：2026-11-05。控制台名称和限额可能变化，执行时以当前账户显示为准。

- [S1 Cloudflare Workers Routes：匹配范围、查询参数、优先级与同 zone 限制](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [S2 Cloudflare Single Redirects：状态码与保留查询参数](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/)
- [S3 Google robots.txt 解释：根目录作用域及分组](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [S4 Cloudflare Pages Headers：平台 noindex、重定向与响应头](https://developers.cloudflare.com/pages/configuration/headers/)
- [S5 Cloudflare Pages 限额](https://developers.cloudflare.com/pages/platform/limits/)
- [S6 Cloudflare R2 公开桶与自定义域名](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [S7 Cloudflare Workers Custom Domains：与 Route 的执行顺序](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [S8 Cloudflare Workers Static Assets：从子目录提供静态资源](https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-subdirectory/)
- [S9 Google Search 站点名称：仅支持域名和子域名](https://developers.google.com/search/docs/appearance/site-names)
- 本项目安装版本文档：`node_modules/next/dist/docs/01-app/02-guides/static-exports.md`、`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/basePath.md`。
- 本项目 [operations.md](operations.md)、[Cloudflare emitter](../scripts/emitters/cloudflare.ts)、[robots 实现](../src/modules/geo/robots.ts)、[check:live](../scripts/check-live.ts)。
- 主站源码：`/Users/hp/Desktop/bywork/shipany-tanstack/src/routes/robots[.]txt.ts`、`src/routes/-machine-content.ts`、`src/server.ts`、`wrangler.jsonc`、`scripts/release.ts`、`docs/development-and-deployment.md`。
