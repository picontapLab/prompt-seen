import { config } from '@/config';
import { createUrlModule } from './create';

export type { UrlConfig } from './create';

export const { withBasePath, stripBasePath, absoluteUrl, paths } = createUrlModule({
  origin: config.origin,
  basePath: config.basePath,
  urlPattern: config.urlPattern,
  localePrefixes: config.locales.map((l) => l.pathPrefix),
});
