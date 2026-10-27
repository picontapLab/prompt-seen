// Example: a host site on Cloudflare forwards /prompt-seen/ to the Pages project with a Worker
// (design doc §15.4.1, way 3; hand-written, not generated). Add a route `xxx.com/prompt-seen*`
// for this Worker and set PAGES_HOST to the project's production address.
//
// It keeps the path, status and headers, drops X-Robots-Tag (production deploys mark
// *.pages.dev noindex, which must not reach the canonical host, §9.3), and leaves redirects to
// the browser. See deploy/hosts/README.md.
const PAGES_HOST = 'prompt-seen.pages.dev';

const worker = {
  async fetch(request) {
    const url = new URL(request.url);
    const upstream = new URL(url.pathname + url.search, `https://${PAGES_HOST}`);
    const response = await fetch(new Request(upstream, request), { redirect: 'manual' });
    const out = new Response(response.body, response);
    out.headers.delete('X-Robots-Tag');
    const location = out.headers.get('Location');
    if (location?.startsWith(`https://${PAGES_HOST}/`))
      out.headers.set('Location', location.slice(`https://${PAGES_HOST}`.length));
    return out;
  },
};

export default worker;
