import { describe, expect, it } from 'vitest';
import { robotsTxt } from '../../../src/modules/geo/robots';
import { groupsFor, isAllowed, parseRobots } from './robots';

// Host robots.txt as crawlers read it (design doc §9.10.2, §15.4.4).

const snippet = (aiTraining: 'allow' | 'disallow') =>
  robotsTxt({
    mode: 'snippet',
    scope: '/prompt-seen/',
    aiTraining,
    sitemapUrl: 'https://example.com/prompt-seen/sitemap.xml',
    hostRobotsUrl: 'https://example.com/robots.txt',
  });

describe('robots.txt reading', () => {
  it('applies the snippet merged into a host file', () => {
    const host = `User-agent: *\nDisallow: /admin/\n\n${snippet('disallow')}`;
    const robots = parseRobots(host);
    expect(robots.sitemaps).toEqual(['https://example.com/prompt-seen/sitemap.xml']);
    expect(isAllowed(robots, 'Googlebot', '/prompt-seen/')).toBe(true);
    // The host's own * rules still apply: both * groups count.
    expect(isAllowed(robots, 'Googlebot', '/admin/x')).toBe(false);
    expect(isAllowed(robots, 'OAI-SearchBot', '/prompt-seen/en/')).toBe(true);
    expect(isAllowed(robots, 'GPTBot', '/prompt-seen/en/')).toBe(false);
    expect(isAllowed(robots, 'GPTBot', '/blog/')).toBe(true);
  });

  it('merges groups with the same user agent, as the snippet header asks', () => {
    const robots = parseRobots('User-agent: *\nDisallow: /admin/\n\nUser-agent: *\nAllow: /prompt-seen/\n');
    expect(groupsFor(robots, 'Bingbot')).toHaveLength(2);
    expect(isAllowed(robots, 'Bingbot', '/admin/')).toBe(false);
    expect(isAllowed(robots, 'Bingbot', '/prompt-seen/')).toBe(true);
  });

  it('follows the longest match, Allow on ties, wildcards and anchors', () => {
    const robots = parseRobots('User-agent: *\nDisallow: /\nAllow: /prompt-seen/\nDisallow: /prompt-seen/*.md$\n');
    expect(isAllowed(robots, 'x', '/other')).toBe(false);
    expect(isAllowed(robots, 'x', '/prompt-seen/en/')).toBe(true);
    expect(isAllowed(robots, 'x', '/prompt-seen/en/prompts/a/index.md')).toBe(false);
    expect(isAllowed(parseRobots('User-agent: *\nDisallow: /p\nAllow: /p\n'), 'x', '/p')).toBe(true);
  });

  it('lets a specific group override *, and Googlebot-Image fall back to Googlebot', () => {
    const robots = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /\n');
    expect(isAllowed(robots, 'Googlebot-Image', '/media/a.webp')).toBe(true);
    expect(isAllowed(robots, 'GPTBot', '/media/a.webp')).toBe(false);
    expect(isAllowed(parseRobots('User-agent: x\nDisallow:\n'), 'x', '/anything')).toBe(true);
    expect(isAllowed(parseRobots(''), 'x', '/anything')).toBe(true);
  });

  it('allows training crawlers when the policy says so', () => {
    expect(isAllowed(parseRobots(snippet('allow')), 'CCBot', '/prompt-seen/en/')).toBe(true);
  });
});
