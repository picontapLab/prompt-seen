# Changelog

The engine follows [semantic versioning](https://semver.org/). Each release lists changes to
configuration (`content/site.yaml`, `content/locales.yaml`) or the content schema with how to
migrate, so instances can upgrade safely (design doc §15.5.4).

## Unreleased

First version, built in steps 1a–5 of the implementation plan (design doc §17).

### Configuration

New keys in `content/site.yaml`, all optional (see `site.example.yaml`):

- `media.baseUrl`: the CDN address of the image storage; `MEDIA_BASE_URL` overrides it.
- `analytics`: `provider: none | cloudflare | plausible` with its token or domain.
- `searchEngines.verification`: `google`, `bing`, `yandex`, `naver` verification values.

New environment variables for deploys: `MEDIA_STORAGE=s3` with `S3_ENDPOINT`, `S3_BUCKET`,
`S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (uploads), and `INDEXNOW_KEY`.
