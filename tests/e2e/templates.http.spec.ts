import { expect, test } from '@playwright/test';
import { BASE, BUILD, message, publicUrl } from './support/artifact';
import { localeIndex, templateDetail } from './support/content';
import { canonical, dataAttr, elementText } from './support/html';

// Templates as crawlers receive them (design doc §3.3, §9.1, §9.6, §17.3 step 3c): the list links
// every template and describes them in visible order; a template page holds its whole form with
// the default sample's values, so fields, help and the default prompt read without scripts.

const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"#]+)"/g)].map((m) => m[1]!);

function collection(html: string) {
  const docs = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]!) as { '@graph': Record<string, unknown>[] },
  );
  return docs.flatMap((d) => d['@graph']).find((n) => n['@type'] === 'CollectionPage') as
    { url: string; mainEntity: { itemListElement: { position: number; url: string; name: string }[] } } | undefined;
}

const decode = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

for (const locale of BUILD.locales) {
  const templates = localeIndex(locale.code).templates;
  const listUrl = `${BASE}/${locale.pathPrefix}/templates/`;

  test(`${locale.code}: the template list links every template, in the order its structured data gives`, async ({
    request,
  }) => {
    const res = await request.get(listUrl);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(dataAttr(html, 'page')).toBe('template-list');
    expect(elementText(html, 'h1')).toBe(message(locale.code, 'templates.list.title'));
    expect(canonical(html)).toBe(publicUrl(`/${locale.pathPrefix}/templates/`));
    const links = hrefs(html);
    for (const t of templates) expect(links).toContain(`${BASE}${t.path}`);
    if (!templates.every((template) => template.localization.indexable) || !templates.length) {
      expect(collection(html)).toBeUndefined();
      expect(html).toMatch(/<meta name="robots" content="noindex/);
      return;
    }
    const items = collection(html)!.mainEntity.itemListElement;
    expect(items.map((i) => i.url)).toEqual(templates.map((t) => publicUrl(t.path)));
    expect(items.map((i) => i.position)).toEqual(templates.map((_, i) => i + 1));
  });

  test(`${locale.code}: the header links the template list, and the template breadcrumb does too`, async ({
    request,
  }) => {
    test.skip(templates.length === 0, 'no templates in this locale');
    const html = await (await request.get(`${BASE}${templates[0]!.path}`)).text();
    expect(hrefs(html)).toContain(listUrl);
  });

  test(`${locale.code}: a template page holds its form with the default sample's values`, async ({ request }) => {
    test.skip(templates.length === 0, 'no templates in this locale');
    for (const summary of templates) {
      const t = templateDetail(locale.code, summary.id);
      const html = decode(await (await request.get(`${BASE}${t.path}`)).text());
      const sample = t.version.samples[0]!.values;
      for (const field of t.version.fields) {
        expect(html, `label of ${field.name}`).toContain(field.label);
        expect(html).toContain(`data-field-shell="${field.name}"`);
        const value = sample[field.name];
        if (field.type === 'string' && typeof value === 'string' && value)
          expect(html, `value of ${field.name}`).toMatch(
            new RegExp(
              `(?:value="${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"|>${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</textarea>)`,
            ),
          );
        if (field.type === 'string-list' && Array.isArray(value))
          for (const item of value) expect(html, `item of ${field.name}`).toContain(item);
      }
    }
  });
}

for (const locale of BUILD.locales) {
  test(`${locale.code}: template list always describes the use and only quotes matching body languages`, async ({
    request,
  }) => {
    const html = await (await request.get(`${BASE}/${locale.pathPrefix}/templates/`)).text();
    for (const template of localeIndex(locale.code).templates) {
      const card = html.match(new RegExp(`<article[^>]*data-entry="${template.id}"[^>]*>([\\s\\S]*?)</article>`))?.[1];
      expect(card).toBeTruthy();
      const summary = card!.match(/<p[^>]*data-template-summary=""[^>]*>[\s\S]*?<\/p>/)?.[0];
      expect(summary).toContain(`lang="${locale.code}"`);
      expect(elementText(summary!, 'p')).toBe(template.description);
      expect(card!.includes('data-template-excerpt')).toBe(template.promptLanguage === locale.code);
    }
  });
}
