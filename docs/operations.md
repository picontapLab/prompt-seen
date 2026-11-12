# Operations: production, rollback and outside services

How the live site is set up, deployed, rolled back and watched (design doc §9.9, §9.10, §10,
§15, §16.1; step 5 of §17). Everything here is optional for running the site locally: a fresh
clone needs no account or credential (README, "Quick start").

## The production setup

The site is a static export, deployed at the root of its own domain by default. `/` serves the
English home directly, with the full navigation and language switch. Other language homes keep
their prefixes (for example `/zh-hans/`), and content routes keep their locale prefixes
(`/en/prompts/…`, `/zh-hans/prompts/…`). `/en/` remains a working alias whose canonical points to
`/`; sitemap and home links use `/`. Browser language and saved preferences do not redirect the root.

For Cloudflare Pages, connect the domain to the Pages project directly. No subpath proxy is
needed. Images can stay in the build or move to object storage behind a CDN address.

```text
browser ── your-domain.com/… ──▶ Cloudflare Pages (custom domain)
browser ── media.your-domain.com/media/… ──▶ R2 bucket (optional; media.baseUrl)
```

A local production build for a domain:

```sh
SITE_ORIGIN=https://your-domain.com BASE_PATH= BUILD_MODE=production npm run build
SITE_ORIGIN=https://your-domain.com BASE_PATH= BUILD_MODE=production npm run deploy:cloudflare:prepare
```

Upload `.deploy/cloudflare/` to Pages, or serve `dist/` with the generated nginx configuration.
The root build includes `dist/index.html`, `_next/`, `media/`, `robots.txt` and `sitemap.xml`.
`SITE_ORIGIN` must be the public domain so canonical, share and sitemap URLs match it. Changing
`BASE_PATH` requires rebuilding; moving a subpath build's files does not update its bundled URLs.

For an optional subpath deployment, set `BASE_PATH=/prompt-seen` and `robots.mode: snippet`,
then use [The host site](#the-host-site). Both build modes keep the same home behavior.

### One-time setup (maintainer)

These steps need accounts and credentials. Nothing in the repository creates them.

1. **Cloudflare Pages project.** `npx wrangler pages project create prompt-seen --production-branch main`
   (or in the dashboard, as a Direct Upload project). The production address becomes
   `prompt-seen.pages.dev`.
2. **API token.** A Cloudflare API token with _Account › Cloudflare Pages › Edit_. Add the
   repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. From then on, CI also
   uploads every PR's `/prompt-seen` preview build (noindex).
3. **GitHub environment.** Create the environment `production` (Settings › Environments). Put
   the production secrets and variables there, and add required reviewers if deploys should wait
   for approval.
4. **Canonical host.** Set the variable `SITE_ORIGIN`, e.g. `https://xxx.com`. `BASE_PATH`
   defaults to the empty path in `content/site.yaml`; leave it unset or set it to `/` in GitHub
   for a root deployment. In a local shell use `BASE_PATH=` (an empty value).
   `CLOUDFLARE_PAGES_PROJECT` if the project is not called `prompt-seen`.
5. **Custom domain.** Add the domain in the Pages project’s Custom domains settings and complete
   DNS setup. Keep `robots.mode: standalone`; the build serves the root `robots.txt`.
   Subpath deployments instead configure [The host site](#the-host-site).
6. **Optional: images in R2.**
   - Create a bucket and connect a custom domain to it (R2 › bucket › Settings › Custom
     Domains), e.g. `media.xxx.com`. Public access through the custom domain is what pages use.
   - Create an R2 API token with _Object Read & Write_ on that bucket. Add the secrets
     `S3_ENDPOINT` (`https://<account id>.r2.cloudflarestorage.com`), `S3_BUCKET`,
     `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, and the variable `MEDIA_BASE_URL`
     (`https://media.xxx.com`).
   - The deploy then uploads new images (`media:sync`), checks every image the build uses
     (`media:check`) and leaves images out of the Pages upload.
7. **Optional: IndexNow.** Generate a key (`openssl rand -hex 16`) and add it as the secret
   `INDEXNOW_KEY`. Each root build then publishes `/<key>.txt`, and each deploy submits
   the addresses it added, changed or removed.
8. **Webmaster tools.** See [Search engines](#search-engines).
9. **Analytics.** See [Analytics and real-user performance](#analytics-and-real-user-performance).

Until `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `SITE_ORIGIN` exist, the Deploy
workflow reports a notice and does nothing.

### Settings at a glance

| Name | Kind | Where it is used |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | secret | PR previews, Deploy, Rollback |
| `SITE_ORIGIN` | variable | Deploy, Rollback: the canonical host |
| `BASE_PATH` | variable (optional) | default from `site.yaml`; `/` for the root |
| `CLOUDFLARE_PAGES_PROJECT` | variable (optional) | default `prompt-seen` |
| `MEDIA_BASE_URL` | variable (optional) | CDN address of the bucket |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | secret (optional) | `media:sync` in Deploy |
| `INDEXNOW_KEY` | secret (optional) | key file in the build, submission after the deploy |
| `PRODUCTION_DEPLOY_HOOK` | secret in the `production` environment (optional) | private artifact customization after Pages preparation, before upload |

Verification tags and shared analytics settings can live in `content/site.yaml`
(`searchEngines`, `analytics`). `site.example.yaml` documents every key. To keep an instance's
integration code and configuration out of the repository, use the private production step below.

## Deploying

Merging into `main` runs CI, then the **Deploy** workflow (`.github/workflows/deploy.yml`):

1. resolve the candidate ref to an immutable SHA using the trusted gate from `main`;
2. require that SHA to still be `main` HEAD, with the latest push CI successful and all required
   jobs successful (checks, secret scan, two builds, six browser jobs);
3. compare it with Cloudflare's current canonical production commit: only the same commit or
   a descendant may deploy; missing metadata, divergent history and API failures stop the job;
4. check out that exact SHA, sync media when configured, build in production mode and check media;
5. snapshot live sitemap URLs, prepare `.deploy/cloudflare/` and apply private customization;
6. run Chromium smoke tests on that final directory at simulated canonical and `pages.dev`
   origins: home, list and prompt detail hydrate, the list popup opens/closes, no runtime errors
   or missing local files, and configured private integration scripts start only in production;
7. recheck the pinned SHA's main HEAD, CI and live-production ancestry immediately before upload;
8. upload to Pages, then run `check:live --platform` and canonical `check:live --expect-build`
   (wait up to three minutes for the host), followed by IndexNow submission.

Manual _Actions › Deploy › Run workflow_ uses exactly the same gate. A branch or tag must point
at the current, CI-approved `main` HEAD. Older releases go through **Rollback**; there is no
emergency CI-bypass switch. Emergency recovery uses the separately audited Rollback workflow.
An old CI rerun cannot deploy over a newer release, including after a forced main-branch rewrite.

Deploy (30 minutes) and Rollback (15 minutes) share the `production` concurrency group and are
never cancelled halfway. Main is rechecked after the build while holding that lock. A main push
in the small interval after the last check queues its own gated deploy; another production or
rollback job cannot upload in that interval. Configure the custom domain/proxy before the live
checks. The SHA and verified CI run are recorded in the Actions summary.

### Static payload file count

The five-language production export contains 20,332 files before host configuration and
private customization. The project owner confirmed a paid Pages plan for this candidate;
the documented limit is 100,000 files (Free: 20,000). Upload preparation keeps the complete
Next.js static export, including both full RSC payload paths. Recount the prepared artifact
after private customization before deployment and confirm the project's current limit.
See [Pages file limits](https://developers.cloudflare.com/pages/platform/limits/#files).

### Private production customization

The existing `npm run deploy:cloudflare:prepare` command runs an optional private JavaScript
module after assembling all pages and host files, and before the workflow uploads them:

- Locally, save the module as `.artifacts/deploy/prepare.mjs`, which Git already ignores.
- In GitHub Actions, store the same self-contained module as the `PRODUCTION_DEPLOY_HOOK`
  secret in the `production` environment. A nonempty secret takes precedence over the local file.
- The module runs from the repository root with `BUILD_MODE=production` and
  `DEPLOY_ARTIFACT_DIR` pointing to the prepared upload directory. Include any private settings
  in that module; do not copy it into the upload directory.
- Preview preparation never executes this step. A clone without the private file or secret
  follows the normal preparation process. The public preview workflow receives no hook secret.
- A failed hook fails preparation and stops the production workflow before upload. Its source
  and output are kept out of the logs; reproduce a failure locally to inspect it.

Keep `analytics.provider` disabled when the private step installs analytics. The private code
should also restrict execution in the browser to the canonical production origin, because the
same production artifact is served on `*.pages.dev`. Browser-delivered scripts remain visible
to visitors even when their deployment source is private. Any subsequent preparation reruns
the hook, so always run `npm run test:deploy` after the last preparation and before upload.

`EXPECT_DEPLOY_INTEGRATION=true npm run test:deploy` requires an integration script to be
requested and executed on each canonical smoke page, and absent on the Pages origin. Deploy
sets this automatically when `PRODUCTION_DEPLOY_HOOK` exists. The current hook contract is a
browser integration that loads a script; a hook used only for metadata must supply an equivalent
smoke assertion before adopting this gate. Locally, set the flag when using the ignored hook.
The preview Chromium job smokes the prepared preview bytes too; the hook's unit tests prove
preview preparation ignores both local code and environment code.

Smoke tests intercept requests and serve the exact artifact bytes. Third-party script responses
are inert stubs, so no real analytics events are sent: this verifies the injected loader and its
origin guard, not a vendor's service availability. Host headers/statuses still use the existing
nginx and post-deploy checks. Smoke tests use no retries, traces, screenshots or public report
uploads; diagnostics report counts so private source and URLs do not enter Actions logs.

## Rolling back

| Problem | What to do |
| --- | --- |
| A deploy broke pages or code | _Actions › Rollback › Run workflow_. Leave the field empty for the deployment before the live one, or give a deployment ID or commit. Pages switches back without a rebuild; `check:live` then confirms the canonical site serves it. Locally: `npm run deploy:rollback -- --list`, then `-- --yes [--to <id or commit>]`. |
| Wrong content | `git revert` the content commit on `main`; the next deploy publishes the previous content. |
| Wrong image | Revert the media YAML (or the entry's `coverAssetId`). Old image keys are never overwritten or deleted, so the previous files are still there (§10.4). |
| Wrong template version | Set `currentVersion` back in the template's `entry.yaml`; examples keep their own version. |

A Pages rollback only changes what is served. Revert the commit on `main` too, or the next deploy
brings the change back.

**nginx hosts** (way 1, the host serves `dist/`): keep each build in its own directory and point
the server's `root` at a symlink, so a rollback is one `ln -sfn` and an `nginx -s reload`:

```bash
cp -R dist /srv/prompt-seen/releases/$(git rev-parse --short HEAD)
```

```bash
ln -sfn /srv/prompt-seen/releases/<build> /srv/prompt-seen/current && nginx -s reload
```

Copy `deploy/generated/nginx/prompt-seen.conf` with each release: it holds that build's redirects.

The rollback has been rehearsed locally on the reference nginx: a content and image update was
undone both by serving the previous artifact again and by reverting the content and rebuilding
(design doc §17.3, step 5 result).

## The host site

The host forwards `/prompt-seen` and `/prompt-seen/*` to the Pages project, unchanged:

- nginx: [`deploy/hosts/nginx-proxy.conf`](../deploy/hosts/nginx-proxy.conf)
- Cloudflare: [`deploy/hosts/cloudflare-worker.js`](../deploy/hosts/cloudflare-worker.js), on a
  route `xxx.com/prompt-seen*`
- a host that serves files itself: [`deploy/nginx/host-server.conf`](../deploy/nginx/host-server.conf)
  and the generated include (README, "Deploying"). Keep its compression settings: stock nginx
  sends text uncompressed, and on a slow phone network the pages then take about twice as long
  to become usable (design doc §17.3, step 6)

What the host must do (design doc §15.4.3):

- **Drop `X-Robots-Tag`** from the Pages responses. Production deploys mark every `*.pages.dev`
  address noindex so only the canonical host is indexed; passed through, the header would
  de-index the real site. `check:live` fails when it gets through.
- **Pass status codes and headers through**: 301/308 with `Location`, 404 with the site's own
  404 page (no host error page), `Content-Type`, `Link`, `Cache-Control`.
- **Merge `deploy/generated/robots-snippet.txt` into the root `robots.txt`**, including its
  `Sitemap:` line. Where the host already has a group for one of its user agents, add the rule
  to that group.
- **Content-Security-Policy**: allow the first-paint theme script (a hash or nonce, §11.6.3) and,
  when analytics is on, its script and beacon origins.
- **Edge rules**: CDN and firewall bot rules (Cloudflare AI crawler controls, WAF rules) must let
  the crawlers that `robots.txt` allows reach the pages.

Rehearse all of this locally with `sh scripts/host-rehearsal.sh` (Docker): it builds the site
for `http://127.0.0.1:8091/prompt-seen/`, puts a Pages stand-in that sends noindex behind a
proxying host with its own `robots.txt`, then runs `check:live` and the raw-HTTP end-to-end tests
through the host.

## Checking the live site

`npm run check:live` reads the canonical site (`SITE_ORIGIN` and the base path) from outside:

- the served build (`generated/build.json`), its mode, and with `--expect-build` its ID;
- the language entry, every public locale's home, a Prompt, a template and list page 2 per
  locale: 200, HTML, the canonical address, indexable (or noindex with `--platform`);
- the sitemap index and every locale sitemap; `index.md` with its `Link` header; `llms.txt`;
  the site icon;
- a redirect, a removed address (410, or 404 on hosts that cannot answer 410), an unknown
  address and an error page's own address;
- the host's `robots.txt`: search engines and AI search allowed for the base path, training
  crawlers as `robots.aiTraining` says, and the `Sitemap:` line;
- the same Prompt requested with the user agents of Googlebot, Bingbot and the AI search and
  user-triggered crawlers: each must get the full page;
- with a CDN: an image and the CDN's `robots.txt`.

A user agent alone does not make a verified crawler. Firewalls that verify bots by IP address
can still treat the real ones differently, so also look at the platform's bot logs (Cloudflare:
Security › Bots / AI Crawl Control; host logs elsewhere) for 200 answers to verified crawlers.

## Search engines

| Engine | Set up | Then |
| --- | --- | --- |
| Google Search Console | Add a **URL-prefix** property for `https://xxx.com/prompt-seen/`. Verify with the HTML tag: put its `content` value in `searchEngines.verification.google`, deploy, verify. | Submit `https://xxx.com/prompt-seen/sitemap.xml`. Check Page indexing and the Rich results test for a Prompt and a list page. |
| Bing Webmaster Tools | Add the site; verify with the meta tag (`verification.bing`, the `msvalidate.01` value), or import from Search Console. | Submit the sitemap. IndexNow covers updates. |
| Naver Search Advisor (`ko`) | Add the site; HTML tag → `verification.naver`. | Submit the sitemap when Korean is enabled. |
| Yandex Webmaster (`ru`) | Add the site; meta tag → `verification.yandex`. | Submit the sitemap when Russian is enabled. |
| Baidu (`zh-Hans`) | Not set up in the first version (design doc §9.9). | — |

The tags are rendered on every page of production and preview builds; only the values in
`site.yaml` decide which appear. IndexNow submissions reach Bing, Naver, Yandex and the other
participating engines; Google does not use IndexNow and reads the sitemap.

## Analytics and real-user performance

Set `analytics` in `content/site.yaml`; production builds load the script once the page is idle,
never in previews:

```yaml
analytics:
  provider: cloudflare # Cloudflare Web Analytics: visits, referrers, Core Web Vitals
  token: <32-character site token from "Manage site">
```

```yaml
analytics:
  provider: plausible # Plausible: visits, referrers, UTM sources; no Web Vitals
  domain: xxx.com
  src: https://plausible.io/js/script.js # or a self-hosted script
```

Neither sets cookies, so no consent banner is needed (design doc §3.1). Add a hostname
`xxx.com` in Cloudflare Web Analytics (a site that is not proxied by Cloudflare works too) and
filter by the path `/prompt-seen/`. Do not also enable the Pages project's automatic Web
Analytics: it measures the `pages.dev` address.

- **AI referrals** (§9.10.6): filter the referrer or source by `chatgpt.com` (links usually carry
  `utm_source=chatgpt.com`), `perplexity.ai`, `claude.ai`, `gemini.google.com`,
  `copilot.microsoft.com`. Some apps send no referrer, so watch the trend, not the absolute number.
- **Real-user performance** (§16.1): Cloudflare Web Analytics › Core Web Vitals shows LCP, INP and
  CLS by page; the targets are p75 LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1, mobile and desktop
  separately. Plausible has no Web Vitals.
- **AI crawlers**: the platform's bot logs, by user agent and status (above).
- **Citations**: once a month, ask the main AI assistants a fixed list of questions per enabled
  locale and record whether the site is cited (§9.10.6).

## Security

- Object storage and Cloudflare credentials exist only as GitHub secrets and in the maintainer's
  shell. Builds never contain them; PR checks of other people's forks get no secrets.
- Local `.env*` files (except `.env.example`), Cloudflare `.dev.vars` / `.dev.vars.*` files,
  and `.wrangler/` state are Git-ignored. Keep `.env.example` free of real credentials and
  never use `git add -f` to commit local secrets. These ignore rules do not remove files or
  credentials already committed; exposed credentials must be revoked and replaced.
- Pages uploads must target `.deploy/cloudflare/`, prepared by
  `npm run deploy:cloudflare:prepare` after a fresh build. Never upload the repository root.
  The prepare command only assembles local files; the Pages upload does not commit or push
  to Git. A local Wrangler upload can deploy this directory without pushing the repository.
- `content/`, `public/media/`, and the tracked records in `production/` and `migrations/`
  travel with Git pushes and are readable by anyone with repository access. Production
  records support publication deduplication and audits; migration archives also support
  tests. Keep private work in the ignored `.artifacts/` workspace, and review records before
  adding them to tracked directories. Making a repository private does not make its deployed
  website private.
- Treat every deployed page, generated data file, and image as public unless access control
  is configured separately. Preview builds can include drafts and preview locales;
  `noindex` discourages search indexing but does not restrict access. Use
  `BUILD_MODE=production` for public production deployments. CI also uploads test results
  and the preview build as GitHub Actions artifacts; these are separate from Git commits.
- CI runs gitleaks over the history of every branch. On GitHub, also turn on secret scanning and
  push protection where the plan allows (Settings › Code security).
- The site has no server process. Keep the build dependencies up to date; there is no runtime
  to patch (design doc §15.5.4).
