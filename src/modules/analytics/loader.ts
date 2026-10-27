import type { ResolvedConfig } from '@/config/schema';

// Visit statistics without cookies (design doc §3.1, §9.10.6, §16.1): the provider's script is
// added once the page has loaded and the browser is idle, so it never competes with the page's
// own first-load JavaScript (§16.4 "分析与日志"). Both providers record the referrer, which is
// how AI referrals (chatgpt.com, perplexity.ai, claude.ai, …) are counted; Cloudflare Web
// Analytics also reports real-user Core Web Vitals. Pure; RootDocument renders the result.

const CLOUDFLARE_BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';

/** Script origins a host's Content-Security-Policy has to allow (docs/operations.md). */
export function analyticsOrigins(analytics: ResolvedConfig['analytics']): { script: string[]; connect: string[] } {
  if (analytics.provider === 'cloudflare')
    return { script: ['https://static.cloudflareinsights.com'], connect: ['https://cloudflareinsights.com'] };
  if (analytics.provider === 'plausible') {
    const origin = new URL(analytics.src).origin;
    return { script: [origin], connect: [origin] };
  }
  return { script: [], connect: [] };
}

/** The inline loader, or null without a provider. */
export function analyticsLoader(analytics: ResolvedConfig['analytics']): string | null {
  let attributes: Record<string, string>;
  if (analytics.provider === 'cloudflare')
    // `spa`: the popup's pushState addresses count as views of the work (§11.3).
    attributes = { src: CLOUDFLARE_BEACON, 'data-cf-beacon': JSON.stringify({ token: analytics.token, spa: true }) };
  else if (analytics.provider === 'plausible') attributes = { src: analytics.src, 'data-domain': analytics.domain };
  else return null;
  return `(function(){var a=${JSON.stringify(attributes)};function add(){var s=document.createElement('script');s.defer=true;for(var k in a)s.setAttribute(k,a[k]);document.body.appendChild(s)}function idle(){'requestIdleCallback'in window?requestIdleCallback(add,{timeout:4000}):setTimeout(add,1500)}document.readyState==='complete'?idle():addEventListener('load',idle,{once:true})})();`;
}
