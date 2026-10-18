import { describe, expect, it } from 'vitest';
import { llmsTxt } from './llms';
import { CRAWLERS, robotsTxt, type RobotsOptions } from './robots';

const options: RobotsOptions = {
  mode: 'snippet',
  scope: '/prompt-seen/',
  aiTraining: 'disallow',
  sitemapUrl: 'https://example.com/prompt-seen/sitemap.xml',
  hostRobotsUrl: 'https://example.com/robots.txt',
};

/** user agent → rules of the group it is in. */
function groups(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const block of text.split(/\n\n+/)) {
    const lines = block.split('\n').filter((l) => l && !l.startsWith('#'));
    const agents = lines.filter((l) => l.startsWith('User-agent:')).map((l) => l.slice(11).trim());
    const rules = lines.filter((l) => !l.startsWith('User-agent:'));
    for (const a of agents) out.set(a, rules);
  }
  return out;
}

describe('robotsTxt (§9.10.2)', () => {
  it('allows search engines, AI search and user-triggered reads within the site only', () => {
    const g = groups(robotsTxt(options));
    for (const agent of ['*', ...CRAWLERS.search, ...CRAWLERS.user])
      expect(g.get(agent)).toEqual(['Allow: /prompt-seen/']);
  });

  it('applies the training policy to every training crawler', () => {
    for (const agent of CRAWLERS.training) {
      expect(groups(robotsTxt(options)).get(agent)).toEqual(['Disallow: /prompt-seen/']);
      expect(groups(robotsTxt({ ...options, aiTraining: 'allow' })).get(agent)).toEqual(['Allow: /prompt-seen/']);
    }
  });

  it('never blocks the whole host, and names the sitemap index', () => {
    const text = robotsTxt(options);
    expect(text).not.toMatch(/^Disallow: \/$/m);
    expect(text).toContain('Sitemap: https://example.com/prompt-seen/sitemap.xml');
  });

  it('tells the host where a snippet goes; a standalone file is the host file itself', () => {
    expect(robotsTxt(options)).toContain('merge these lines into https://example.com/robots.txt');
    const standalone = robotsTxt({ ...options, mode: 'standalone', scope: '/' });
    expect(standalone).not.toContain('merge');
    expect(groups(standalone).get('GPTBot')).toEqual(['Disallow: /']);
  });
});

describe('llmsTxt (§9.10.4)', () => {
  it('follows the llms.txt layout and leaves out empty sections', () => {
    expect(
      llmsTxt({
        title: 'Prompt Seen',
        summary: 'Tested image prompts.\nSee what each phrase does.',
        details: ['Every prompt has a Markdown version.'],
        sections: [
          {
            heading: 'Templates',
            links: [{ title: 'Ink [scroll]', url: 'https://x/t/index.md', note: 'Fill in a subject.' }],
          },
          { heading: 'Collections', links: [] },
          { heading: 'Optional', links: [{ title: 'Sitemap index', url: 'https://x/sitemap.xml' }] },
        ],
      }),
    ).toBe(
      [
        '# Prompt Seen',
        '> Tested image prompts. See what each phrase does.',
        'Every prompt has a Markdown version.',
        '## Templates\n\n- [Ink \\[scroll\\]](https://x/t/index.md): Fill in a subject.',
        '## Optional\n\n- [Sitemap index](https://x/sitemap.xml)',
      ].join('\n\n') + '\n',
    );
  });
});
