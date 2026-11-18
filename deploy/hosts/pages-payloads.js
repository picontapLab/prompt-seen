// The Pages packager supplies the URL index and content-addressed pack paths at build time.
export function createPayloadWorker(index, packs) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const pathname = url.pathname.replace(/\/__next\._full\.txt$/, '/index.txt');
      const entry = index[pathname];
      if (!entry || !['GET', 'HEAD'].includes(request.method)) return env.ASSETS.fetch(request);
      const [pack, offset, length, originalLength] = entry;
      const end = offset + length - 1;
      const head = request.method === 'HEAD';
      const etag = `"${packs[pack].split('/').pop()}-${offset}-${length}"`;
      const validators = request.headers
        .get('If-None-Match')
        ?.split(',')
        .map((value) => value.trim().replace(/^W\//, ''));
      const unchanged = validators?.includes(etag) || validators?.includes('*');
      const metadataOnly = head || unchanged;
      const asset = await env.ASSETS.fetch(
        new Request(new URL(packs[pack], url), {
          method: metadataOnly ? 'HEAD' : 'GET',
          headers: metadataOnly ? {} : { Range: `bytes=${offset}-${end}` },
        }),
      );
      const unavailable = () =>
        new Response('Payload unavailable', { status: 502, headers: { 'Cache-Control': 'no-store' } });
      if (asset.status !== 200 && asset.status !== 206) return unavailable();

      // Inherit deployment headers (including preview noindex), but describe the original resource.
      const headers = new Headers(asset.headers);
      for (const name of ['Content-Encoding', 'Content-Range', 'Accept-Ranges', 'Content-Disposition'])
        headers.delete(name);
      headers.set('Content-Type', url.pathname.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8');
      headers.set('Content-Length', String(originalLength));
      headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      headers.set('ETag', etag);
      if (unchanged) {
        headers.delete('Content-Length');
        return new Response(null, { status: 304, headers });
      }
      if (head) return new Response(null, { headers });
      // Pages can ignore Range. Packs are bounded so reading a whole pack also works.
      const bytes = await asset.arrayBuffer();
      if (asset.status === 206 && !asset.headers.get('Content-Range')?.startsWith(`bytes ${offset}-${end}/`))
        return unavailable();
      const body = asset.status === 206 ? bytes : bytes.slice(offset, end + 1);
      if (body.byteLength !== length) return unavailable();
      const decoded = new Response(body).body.pipeThrough(new DecompressionStream('gzip'));
      return new Response(decoded, { headers });
    },
  };
}
