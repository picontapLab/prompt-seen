// Reading a host's robots.txt the way search crawlers do (RFC 9309, Google's robots.txt
// specification), to confirm the host merged this site's rules (design doc §9.10.2, §15.4.4).
// Pure; scripts/check-live.ts fetches the file.

export type RobotsRule = { allow: boolean; path: string };
export type RobotsGroup = { agents: string[]; rules: RobotsRule[] };
export type Robots = { groups: RobotsGroup[]; sitemaps: string[] };

export function parseRobots(text: string): Robots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (field === 'sitemap') {
      sitemaps.push(value);
      continue;
    }
    if (field === 'user-agent') {
      // Consecutive user-agent lines share one group.
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === 'allow' || field === 'disallow') {
      // An empty Disallow allows everything; it adds no rule.
      if (value) current.rules.push({ allow: field === 'allow', path: value });
    }
  }
  return { groups, sitemaps };
}

/** The groups a crawler obeys: its own token, then the token before "-" (Googlebot-Image → Googlebot), then "*". */
export function groupsFor(robots: Robots, agent: string): RobotsGroup[] {
  const token = agent.toLowerCase();
  const candidates = [token, ...(token.includes('-') ? [token.split('-')[0]!] : []), '*'];
  for (const name of candidates) {
    const found = robots.groups.filter((g) => g.agents.includes(name));
    if (found.length) return found;
  }
  return [];
}

function matchLength(pattern: string, path: string): number {
  // "*" matches any run of characters, a trailing "$" anchors the end.
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  const m = new RegExp(`^${source}${anchored ? '$' : ''}`).exec(path);
  return m ? body.length : -1;
}

/** Whether `agent` may fetch `path`: the longest matching rule wins, Allow on a tie; no rule allows. */
export function isAllowed(robots: Robots, agent: string, path: string): boolean {
  let best: RobotsRule | null = null;
  let bestLength = -1;
  for (const group of groupsFor(robots, agent))
    for (const rule of group.rules) {
      const length = matchLength(rule.path, path);
      if (length > bestLength || (length === bestLength && length >= 0 && rule.allow)) {
        best = rule;
        bestLength = length;
      }
    }
  return best ? best.allow : true;
}
