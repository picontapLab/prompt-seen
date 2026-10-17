# media

Image addresses and responsive attributes (design doc §7, §10): `getImage(imageRef, preset)`, `srcSet`, `imageUrl` and `absoluteImageUrl`. Works on the server and in the browser. Images come from the local media driver (`public/media/`) until step 5 adds object storage and a CDN; then only this module and `paths.media` change. Owner: step 1b; `media:import` lives in `scripts/`.
