# Security

## Reporting

Please report vulnerabilities privately through GitHub: _Security › Report a vulnerability_ on
this repository (private vulnerability reporting). Do not open a public issue. Include what you
found, how to reproduce it and what it affects. You will get an answer within a few days.

Use the same channel for reports that must stay private for other reasons, such as a takedown
request with personal details or a code of conduct report.

## Scope

The site is static files: there is no server process, login or database. Relevant reports
include cross-site scripting through content or addresses, leaked credentials, problems in the
build or deploy workflows, and dependencies with known vulnerabilities that reach the built site.

## For instance maintainers

- Keep build dependencies up to date (`npm outdated`, Dependabot). There is no runtime to patch.
- Cloudflare and object storage credentials belong in CI secrets and your own shell only
  (docs/operations.md, "Security").
- Keep instance-specific deployment notes, account dashboard exports, raw request logs and
  search-console submissions outside version control, for example under the ignored `.artifacts/`.
  Public reports should contain technical findings and reproducible checks without account data
  or private repository settings.
- Use repository-relative paths in shared generation records. Remove local usernames, home
  directories and tool session paths before committing; keep original receipts privately.
  Secret scanning does not detect every kind of private operational information.
