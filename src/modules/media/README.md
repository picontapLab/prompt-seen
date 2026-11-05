# media

Image addresses and responsive attributes (design doc §7, §10): `getImage(imageRef, preset)`, `srcSet`, `imageUrl` and `absoluteImageUrl`. Works on the server and in the browser. Images come from the CDN when `media.baseUrl` (or `MEDIA_BASE_URL`) is set, otherwise from the local media driver's files in `public/media/`; the switch is `mediaUrl` / `absoluteMediaUrl` in `@/modules/url` (step 5). Owner: step 1b; `media:import` lives in `scripts/`.

GIF files use the same import and example workflow as still images:

```sh
npm run media:import -- animation.gif --slug moving-product --alt en="A rotating product"
```

The importer retains the original GIF byte for byte. Thumbnail, card and detail variants are animated WebP, preserving transparency, frame delays and loop counts; `og` is a static JPEG of the first frame. All display sizes autoplay in native images, including lists and example outputs, with no play/pause controls. Offscreen images retain native lazy loading. A finite source loop count remains finite. Static annotation overlays and layered image transitions are suppressed on animated covers.

Media records retain the original `mimeType`, `byteSize` and optional `animation` (`frameCount`, `durationMs` for one cycle, `loopCount`: 0 for infinite, null when unspecified). Display dimensions describe one frame, never the vertically stacked frame buffer. GIF import is limited to 50 MiB, 500 frames and 100 million decoded pixels. Single-frame GIFs are accepted without animation metadata; other animated input formats remain unsupported.

Use the returned asset ID in an existing example's `outputAssetIds`; image-to-GIF cases also record their inputs in `referenceAssetIds`. The `content:produce` publication workflow and `media:generate` artifact preparation both preserve GIF outputs. Actual generation still takes place through the selected model/tool. `hasGifOutput` is derived from example outputs at build time; reference inputs do not trigger it. `GifBadge` displays `GIF` for GIF assets and a localized “Includes GIF” label for static covers with GIF examples. Search indexes include GIF as a keyword for these cases.
