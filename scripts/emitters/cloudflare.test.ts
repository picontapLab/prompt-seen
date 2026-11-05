import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/load';
import { createUrlModule } from '../../src/modules/url/create';
import { loadContent } from '../lib/content/load';
import { ROOT } from '../lib/paths';
import cloudflare from './cloudflare';

describe('Pages indexing contract', () => {
  for (const mode of ['production', 'preview'] as const) {
    it(`${mode}: only production platform rules have the removable noindex marker`, async () => {
      const config = loadConfig(ROOT, {
        BUILD_MODE: mode,
        BASE_PATH: '/prompt-seen',
        SITE_ORIGIN: 'https://picontap.com',
      });
      const url = createUrlModule({ ...config, localePrefixes: config.locales.map((l) => l.pathPrefix) });
      const { built } = loadContent({ root: ROOT, config, url });
      if (!built) throw new Error('Content must build');
      const files = new Map<string, string>();
      await cloudflare.run({
        config,
        url,
        content: built,
        locales: config.builtLocales,
        write: (_, file, body) => files.set(file, String(body)),
      });
      const headers = files.get('cloudflare/_headers')!;
      const blocks = headers.split('\n\n').filter((block) => /X-Robots-Tag:/.test(block));
      expect(blocks).toHaveLength(mode === 'production' ? 2 : 1);
      if (mode === 'production') {
        for (const block of blocks) {
          expect(block).toMatch(/https:\/\/:.*\.pages\.dev\/\*/);
          expect(block).toContain('X-Robots-Tag: noindex');
          expect(block).toContain('X-Prompt-Seen-Platform-Noindex: production-v1');
        }
      } else {
        expect(headers).not.toContain('X-Prompt-Seen-Platform-Noindex');
        expect(blocks[0]).toContain('/*\n  X-Robots-Tag: noindex');
      }
    });
  }
});
