const VERSION = 'picontap-v1';
const MARKER = 'X-Prompt-Seen-Platform-Noindex';
const REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'user-agent',
  'if-none-match',
  'if-modified-since',
  'if-match',
  'if-unmodified-since',
  'range',
  'if-range',
];
const REMOVE_HEADERS = [
  'set-cookie',
  MARKER,
  'nel',
  'report-to',
  'strict-transport-security',
  'clear-site-data',
  'x-prompt-seen-proxy-robots-result',
];

function settings(env) {
  const canonical = new URL(env.CANONICAL_ORIGIN);
  const upstream = new URL(env.PAGES_ORIGIN);
  const preview = env.DEPLOYMENT_MODE === 'preview';
  if (
    canonical.origin !== 'https://picontap.com' ||
    canonical.href !== `${canonical.origin}/` ||
    upstream.protocol !== 'https:' ||
    upstream.username ||
    upstream.password ||
    upstream.port ||
    upstream.href !== `${upstream.origin}/` ||
    !/^[a-z0-9-]+\.pages\.dev$/.test(upstream.hostname) ||
    /replace|actual|example|placeholder/i.test(upstream.hostname) ||
    upstream.hostname === 'prompt-seen.pages.dev' ||
    env.BASE_PATH !== '/prompt-seen' ||
    !['preview', 'production'].includes(env.DEPLOYMENT_MODE) ||
    !['true', 'false'].includes(env.FORCE_NOINDEX) ||
    (preview && !/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(env.PREVIEW_HOSTNAME ?? ''))
  )
    throw new Error('Invalid proxy configuration');
  return { canonical, upstream, preview, prefix: `${env.BASE_PATH}/` };
}

const warn = (event) => console.error(JSON.stringify({ event, proxy: VERSION }));

function finish(request, env, response, robotsResult = 'none') {
  const headers = new Headers(response.headers);
  headers.set('X-Prompt-Seen-Proxy', VERSION);
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Media fetches support the download action; images and navigation are not restricted.
  headers.set(
    'Content-Security-Policy',
    `connect-src ${new URL(request.url).origin}/prompt-seen/ https://prompt-seen-media.picontap.com/media/ https://cloudflareinsights.com`,
  );
  if (env.DEPLOYMENT_MODE === 'preview') headers.set('X-Prompt-Seen-Proxy-Robots-Result', robotsResult);
  if (env.DEPLOYMENT_MODE === 'preview' || env.FORCE_NOINDEX === 'true') {
    const robots = headers.get('X-Robots-Tag');
    if (!robots?.split(',').some((value) => value.trim().toLowerCase() === 'noindex')) {
      headers.set('X-Robots-Tag', robots ? `${robots}, noindex` : 'noindex');
    }
  }
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function failure(request, env, status, message, extra = {}) {
  return finish(
    request,
    env,
    new Response(request.method === 'HEAD' ? null : message, {
      status,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...extra },
    }),
  );
}

const worker = {
  async fetch(request, env) {
    let config;
    try {
      config = settings(env);
    } catch {
      warn('proxy_invalid_configuration');
      return failure(request, env, 503, 'Service temporarily unavailable', { 'Retry-After': '60' });
    }
    const { canonical, upstream, preview, prefix } = config;
    const incoming = new URL(request.url);
    const allowedHost = preview ? env.PREVIEW_HOSTNAME : canonical.host;
    if (incoming.host !== allowedHost || !incoming.pathname.startsWith(prefix) || /%2f|%5c/i.test(incoming.pathname)) {
      warn('proxy_route_out_of_scope');
      return failure(request, env, 404, 'Not found');
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      return failure(request, env, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    }
    const target = new URL(incoming.pathname + incoming.search, upstream);
    const requestHeaders = new Headers();
    for (const name of REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value !== null) requestHeaders.set(name, value);
    }
    let response;
    try {
      response = await fetch(target, {
        method: request.method,
        headers: requestHeaders,
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      warn('proxy_upstream_unavailable');
      return failure(request, env, 503, 'Service temporarily unavailable', { 'Retry-After': '60' });
    }
    const headers = new Headers(response.headers);
    const hasCookie = headers.has('Set-Cookie');
    const robots = headers.get('X-Robots-Tag');
    const normalizedRobots = robots?.trim().toLowerCase();
    let robotsResult = robots ? 'kept' : 'none';
    // The optional 304 exception is enabled only after recording real Pages evidence.
    if (
      response.status < 400 &&
      normalizedRobots === 'noindex' &&
      (headers.get(MARKER) === 'production-v1' || (response.status === 304 && env.PAGES_304_WITHOUT_MARKER === 'true'))
    ) {
      headers.delete('X-Robots-Tag');
      robotsResult = 'removed';
    }
    if (response.status >= 400) {
      headers.set('X-Robots-Tag', robots ? `${robots}, noindex` : 'noindex');
      headers.set('Cache-Control', 'no-store');
    }
    if (hasCookie) {
      warn('proxy_upstream_set_cookie');
      headers.set('Cache-Control', 'no-store');
    }
    for (const name of REMOVE_HEADERS) headers.delete(name);
    if (headers.has('Location')) {
      try {
        const location = new URL(headers.get('Location'), target);
        if (
          location.origin !== upstream.origin ||
          location.username ||
          location.password ||
          !location.pathname.startsWith(prefix) ||
          /%2f|%5c/i.test(location.pathname)
        ) {
          throw new Error('Redirect outside project');
        }
        location.host = incoming.host;
        location.protocol = incoming.protocol;
        headers.set('Location', location.href);
      } catch {
        warn('proxy_invalid_redirect');
        return failure(request, env, 502, 'Invalid upstream redirect');
      }
    }
    return finish(
      request,
      env,
      new Response(request.method === 'HEAD' ? null : response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
      robotsResult,
    );
  },
};

export default worker;
