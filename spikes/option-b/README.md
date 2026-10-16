# 方案 B 原型：静态导出 + pushState 弹层

一次性验证代码，不是正式项目脚手架。结论写在 [`../../subpath-hosting-decision.md`](../../subpath-hosting-decision.md) 的 §7。

- Next.js 16.4.2 App Router，`output: 'export'`、`basePath: '/prompt-seen'`、`trailingSlash: true`，动态段全部 `dynamicParams = false` + `generateStaticParams`。
- 两种语言（`en`、`zh-hans`）× 30 条测试 Prompt。
- 测试全部针对导出产物，经 Docker `nginx:stable` 在 `http://127.0.0.1:8090/prompt-seen/` 提供。

## 运行

需要 Node ≥ 20.9、Docker，以及本机 Google Chrome（默认浏览器）。

```bash
npm install
```

```bash
npm run build
```

`build` 依次执行 `content:build`（生成弹层 JSON 和 nginx include）、`next build`（输出 `out/`）、`scripts/package.mjs`（复制到 `dist/prompt-seen/` 并检查重定向目标与机器可读文件）。

```bash
npm test
```

Playwright 会自动用 `scripts/nginx.sh` 启动 nginx 容器，结束后容器自动删除。只跑一部分时用 `npm run test:popup` 或 `npm run test:hosting`。

同时跑 WebKit（需先执行 `npx playwright install webkit`）：

```bash
PW_BROWSERS=all npx playwright test --project=chrome --project=webkit
```

手动预览：

```bash
npm run nginx
```

然后打开 <http://127.0.0.1:8090/prompt-seen/en/prompts/>。

可用的环境变量：`BASE_PATH`、`SITE_ORIGIN`（构建时，默认 `/prompt-seen` 和 `https://example.com`；测试按默认值断言）、`PORT`（默认 8090）、`PW_CHANNEL`（默认 `chrome`，改为 `chromium` 使用 Playwright 自带浏览器）。

## 文件

| 路径 | 内容 |
| --- | --- |
| `src/components/Gallery.tsx` | 画廊、点击拦截、`<dialog>` 弹层、关闭逻辑、上一条/下一条 |
| `src/lib/popup-history.ts` | `history.state` 标记、push/replace 规则、JSON 缓存 |
| `src/lib/site.mjs` | basePath、绝对地址与路径工具，构建脚本和应用共用 |
| `src/lib/detail-model.mjs` | 完整页与弹层共用的可序列化详情模型 |
| `src/app/[locale]/404`、`410` | 按 locale 的错误页，由 nginx `error_page` 使用 |
| `content/redirects.yaml`、`deleted.yaml` | 重定向与已删除条目 |
| `deploy/nginx/host-server.conf` | 模拟宿主的 server 块（手写） |
| `deploy/nginx/prompt-seen.locations.conf` | 由 `content:build` 生成的 include |
| `tests/popup.spec.ts` | 原型一：弹层历史行为 |
| `tests/hosting.spec.ts` | 原型二：状态码、Location、绝对地址、文件形态、Content-Type、请求前缀 |
