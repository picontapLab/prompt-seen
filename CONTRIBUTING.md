# Contributing

Thank you for helping. Prompt Seen is a static site built from files: code in `src/` and
`scripts/`, content in `content/`. Both are changed through pull requests.

## Before you start

- Read the [README](README.md) to run the site locally. A fresh clone needs Node.js 24 and,
  for the end-to-end tests, Docker. No account or credential is needed.
- For anything larger than a fix, open an issue first, so the change can be agreed before you
  spend time on it.
- The [design document](docs/prompt-library-website-design.md) (Chinese) decides what the site
  does; [engineering conventions](docs/engineering-conventions.md) say how code is organised.
  A change to either goes in its own small pull request.

## Code

1. Branch from `main`; one topic per pull request.
2. Follow the conventions: addresses from `@/modules/url`, configuration from `@/config`, UI
   text in the message catalogs, comments that explain why and cite the design document section.
3. Add or update tests next to the code (`*.test.ts`) and, for pages, in `tests/e2e/`.
4. Before pushing:

   ```bash
   npm run content:validate && npm run typecheck && npm run lint && npm run format:check && npm test
   ```

   ```bash
   npm run build && npm run test:e2e
   ```

5. Describe what changed and how you checked it; add screenshots for visible changes.

CI runs the same checks, builds the site at the root and under `/prompt-seen`, tests both in
Chromium, Firefox and WebKit, and scans the history for secrets. Pull requests from forks get no
secrets: no preview deployment and no access to storage.

## Content

How entries, images, translations and address changes are written: [`content/README.md`](content/README.md).

- **Licensing.** By submitting prompt text or descriptions you agree to license them under
  [CC BY 4.0](content/LICENSE). Submit only images you made or may license, and fill in their
  `credit` and `license` fields. Third-party material without a known license is not accepted
  (design doc §15.5.1).
- **Tested prompts.** Record what you ran (`content:new -- example`): the exact prompt, the
  model, the date and what you observed. Unknown values stay `null`; nothing is guessed.
- **Translations.** Machine translations are drafts (`reviewStatus: machine-draft`) until a
  reviewer for that language signs them off (design doc §8.4).
- **Annotations** describe what a phrase does, based on test records.

## Reporting problems

- Wrong or broken content, or a feature idea: open an issue with the matching template.
- A copyright or licensing problem with an image or prompt: use the takedown template, or the
  private contact in [SECURITY.md](SECURITY.md) when the report includes personal details.
- A security issue: follow [SECURITY.md](SECURITY.md); do not open a public issue.

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).
