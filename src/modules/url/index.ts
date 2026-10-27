import { config } from '@/config';
import { createUrlModule, urlConfigOf } from './create';

export type { UrlConfig } from './create';

export const { withBasePath, stripBasePath, absoluteUrl, mediaUrl, absoluteMediaUrl, paths } = createUrlModule(
  urlConfigOf(config),
);
export { EMPTY_PARAM, RESERVED_PAGE_SEGMENTS } from './create';
