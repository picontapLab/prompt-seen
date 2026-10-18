// Crawler rules (design doc §9.10.2, §15.4.3). Search engines, AI search and pages a user asks an
// assistant to read are always allowed; model training follows `robots.aiTraining` in site.yaml.
// Nothing is disallowed for search crawlers: a noindex page must stay readable to be honoured
// (§9.4). Pure; the robots.txt route and the snippet emitter both use it.
//
// User-agent tokens follow each provider's documentation as of the design doc (§9.10.2, refs
// 36, 38–40); check them again when a provider announces a new crawler.

export const CRAWLERS = {
  /** AI search indexes: whether answers can cite the site. */
  search: ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot'],
  /** Fetches a user asked for in a conversation. Some providers do not apply robots.txt to them. */
  user: ['ChatGPT-User', 'Claude-User', 'Perplexity-User'],
  /** Training data collection, and the tokens that control training use (Google-Extended, Applebot-Extended). */
  training: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'],
} as const;

export type RobotsOptions = {
  /** standalone: this is the host's robots.txt; snippet: groups for the host to merge (§15.4.3). */
  mode: 'standalone' | 'snippet';
  /** This site's addresses on the host: "/" at the root, or "/prompt-seen/" (withBasePath('/')). */
  scope: string;
  aiTraining: 'allow' | 'disallow';
  /** Absolute URL of the sitemap index. */
  sitemapUrl: string;
  /** Absolute URL of the host's robots.txt, named in the snippet's instructions. */
  hostRobotsUrl: string;
};

/** robots.txt for a site at the root of its host, or the snippet a host merges into its own. */
export function robotsTxt(o: RobotsOptions): string {
  const { scope } = o;
  const training = o.aiTraining === 'allow' ? 'Allow' : 'Disallow';
  const header =
    o.mode === 'standalone'
      ? ['# robots.txt (design doc §9.10.2). Generated from content/site.yaml; do not edit.']
      : [
          `# Rules for ${scope} (design doc §9.10.2, §15.4.3). Generated from content/site.yaml.`,
          `# Crawlers read robots.txt only at the root of a host: merge these lines into ${o.hostRobotsUrl}.`,
          '# Where the host already has a group for one of these user agents, add the rule to that group:',
          '# many crawlers follow only one group per user agent.',
        ];
  return [
    ...header,
    '',
    'User-agent: *',
    `Allow: ${scope}`,
    '',
    '# AI search and answer engines, and pages a user asks an assistant to read.',
    ...[...CRAWLERS.search, ...CRAWLERS.user].map((agent) => `User-agent: ${agent}`),
    `Allow: ${scope}`,
    '',
    `# Model training (robots.aiTraining: ${o.aiTraining}).`,
    ...CRAWLERS.training.map((agent) => `User-agent: ${agent}`),
    `${training}: ${scope}`,
    '',
    `Sitemap: ${o.sitemapUrl}`,
    '',
  ].join('\n');
}
