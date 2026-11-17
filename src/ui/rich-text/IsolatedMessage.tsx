import { Fragment } from 'react';

// Object-replacement placeholder exists only while formatting. It never enters a catalog,
// the DOM, an accessible label or copied content. Values are inserted afterwards as React text.
const SLOT = '\uFFFC';

/** Isolate one textual ICU interpolation without changing shared catalog keys or prose hashes.
 * Use only for text arguments, never arguments that control plural/select branches.
 */
export function IsolatedMessage({
  format,
  value,
  dir = 'auto',
  lang,
}: {
  format: (slot: string) => string;
  value: string;
  dir?: 'auto' | 'ltr' | 'rtl';
  lang?: string;
}) {
  return format(SLOT)
    .split(SLOT)
    .map((part, index) => (
      <Fragment key={index}>
        {index > 0 && (
          <bdi dir={dir} lang={lang}>
            {value}
          </bdi>
        )}
        {part}
      </Fragment>
    ));
}
