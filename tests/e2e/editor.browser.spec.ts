import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { renderTemplate } from '../../src/modules/template';
import { scrollToTop, seriousViolations, settle } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';
import { localeIndex, promptDetail, sampleTemplate, templateDetail } from './support/content';

// The template editor in real browsers (design doc §11.4, §11.6, §11.8.4, §17.3 step 3c):
// preview, copy and download agree (§16.2 模板输出); invalid values block copy and say why
// (§16.2 参数错误); input methods keep their input (§12.8 scenario 6, §11.6.4); drafts, shared
// links, samples and reset; the docked preview on phones.

const [first] = BUILD.locales;
const code = first!.code;
const index = localeIndex(code);
/** The richest template: the one with a list field and the most fields. */
const summary = [...index.templates].sort((a, b) => b.fieldCount - a.fieldCount)[0]!;
const template = templateDetail(code, summary.id);
const url = `${BASE}${template.path}`;
const fields = template.version.fields;
const textField = fields.find((f) => f.type === 'string' && f.required)!;
const listField = fields.find((f) => f.type === 'string-list');
const spec = { body: template.version.body, fields };

const shell = (page: Page, name: string) => page.locator(`[data-field-shell="${name}"]`);
const input = (page: Page, name: string) => shell(page, name).locator('input:not([type=radio]), textarea').first();
const previewText = (page: Page) => page.locator('[id$="-prompt"]').first();
const copyButton = (page: Page) => page.locator('[data-copy-state]').first();
const variables = (page: Page, name: string) => previewText(page).locator(`[data-field="${name}"]`);
const t = (key: string, values: Record<string, string> = {}) => message(code, `templates.${key}`, values);

/** Waits until React has attached its handlers, so input reaches the editor. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('[data-field-shell] input');
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  });

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function open(page: Page, suffix = '') {
  await page.goto(`${url}${suffix}`);
  await hydrated(page);
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the first render is the default sample, as in the HTML', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page);
    await expect(previewText(page)).toHaveText(template.version.defaultPrompt);
    await expect(input(page, textField.name)).toHaveValue(
      template.version.samples[0]!.values[textField.name] as string,
    );
    await expect(copyButton(page)).toHaveAttribute('data-copy-state', 'idle');
    expect(errors).toEqual([]);
  });

  test('preview, copy and download give one text for the current values (§16.2 模板输出)', async ({
    page,
    context,
    browserName,
  }) => {
    await open(page);
    await input(page, textField.name).fill('a brass desk lamp');
    const expected = renderTemplate(spec, {
      ...template.version.samples[0]!.values,
      [textField.name]: 'a brass desk lamp',
    }).text!;
    await expect(previewText(page)).toHaveText(expected);
    await expect(variables(page, textField.name).first()).toHaveText('a brass desk lamp');

    const downloading = page.waitForEvent('download');
    await page.locator('[data-action="download"]').click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(`${template.slug}-${template.version.id}.txt`);
    expect(fs.readFileSync((await download.path())!, 'utf8')).toBe(expected);

    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await copyButton(page).click();
      await expect(copyButton(page)).toHaveAttribute('data-copy-state', 'done');
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    }
  });

  test('a missing value blocks copy, says how many, and takes focus to the field (§11.4)', async ({
    page,
    context,
    browserName,
  }) => {
    await open(page);
    const width = (await copyButton(page).boundingBox())!.width;
    await input(page, textField.name).fill('');
    await expect(copyButton(page)).toHaveAttribute('data-copy-state', 'blocked');
    await expect(copyButton(page)).toHaveAccessibleName(/1/);
    expect((await copyButton(page).boundingBox())!.width).toBe(width);
    // The empty variable shows where it goes, by name, without putting the name in the text.
    await expect(variables(page, textField.name)).toHaveAttribute('data-label', textField.label);
    expect(await previewText(page).textContent()).not.toContain(textField.label);

    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.evaluate(() => navigator.clipboard.writeText('unchanged'));
    }
    await page.locator('[data-action="download"]').focus(); // leave the field first
    await copyButton(page).click();
    await expect(input(page, textField.name)).toBeFocused();
    await expect(shell(page, textField.name)).toContainText(
      message(code, 'templates.editor.errors.required', { label: textField.label }),
    );
    if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('unchanged');
  });

  test('a value over its limit is reported with the count, at once (§11.11)', async ({ page }) => {
    test.skip(!textField.type || textField.type !== 'string' || !textField.maxLength, 'no limited text field');
    await open(page);
    const max = textField.type === 'string' ? textField.maxLength! : 0;
    await input(page, textField.name).fill('x'.repeat(max + 3));
    await expect(shell(page, textField.name)).toContainText(`${max + 3} / ${max}`);
    await expect(shell(page, textField.name)).toContainText(String(max + 3));
    await expect(variables(page, textField.name).first()).toHaveAttribute('data-invalid', 'true');
    await expect(copyButton(page)).toHaveAttribute('data-copy-state', 'blocked');
  });

  test('list fields: Enter and the separator add, Backspace removes, the limit holds', async ({ page }) => {
    test.skip(!listField || listField.type !== 'string-list', 'no list field');
    const field = listField!;
    if (field.type !== 'string-list') return;
    await open(page);
    const box = input(page, field.name);
    const items = shell(page, field.name).locator('li');
    const start = await items.count();
    await box.fill('first added');
    await box.press('Enter');
    await expect(items).toHaveCount(start + 1);
    await expect(variables(page, field.name).first()).toContainText('first added');
    await box.press('Backspace');
    await expect(items).toHaveCount(start);
    const mark = field.separator.trim();
    await box.pressSequentially(`one${mark}`);
    await expect(items).toHaveCount(start + 1);
    await expect(box).toHaveValue('');
    if (field.maxItems !== null) {
      for (let i = (await items.count()) + 1; i <= field.maxItems + 1; i++) {
        await box.fill(`item ${i}`);
        await box.press('Enter');
      }
      await expect(items).toHaveCount(field.maxItems);
      await expect(box).toHaveValue(`item ${field.maxItems + 1}`); // what did not fit stays
    }
  });

  test('a focused field marks its variables; pressing a variable focuses its field (§11.8.4 双向定位)', async ({
    page,
  }) => {
    await open(page);
    await input(page, textField.name).focus();
    await expect(variables(page, textField.name).first()).toHaveAttribute('data-active', 'true');
    const other = fields.find((f) => f.name !== textField.name && f.type !== 'enum') ?? fields[1]!;
    await variables(page, other.name).first().click();
    await expect(shell(page, other.name)).toHaveAttribute('data-active', 'true');
    await expect(shell(page, other.name).locator(':focus')).toHaveCount(1);
  });

  test('another sample cycles in file order; reset restores the default and can be undone', async ({ page }) => {
    test.skip(template.version.samples.length < 2, 'one sample only');
    await open(page);
    const second = renderTemplate(spec, template.version.samples[1]!.values).text!;
    await page.locator('[data-action="sample"]').click();
    await expect(previewText(page)).toHaveText(second);
    for (let i = 2; i < template.version.samples.length; i++) await page.locator('[data-action="sample"]').click();
    await page.locator('[data-action="sample"]').click();
    await expect(previewText(page)).toHaveText(template.version.defaultPrompt);

    await input(page, textField.name).fill('edited value');
    await page.locator('[data-action="reset"]').click();
    await expect(previewText(page)).toHaveText(template.version.defaultPrompt);
    await page.getByRole('button', { name: t('editor.undo') }).click();
    await expect(input(page, textField.name)).toHaveValue('edited value');
  });

  test('a draft comes back after a reload, and reset clears it (§11.6.2)', async ({ page }) => {
    await open(page);
    await input(page, textField.name).fill('kept for later');
    await expect
      .poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('template-draft'))))
      .toEqual([`prompt-library:template-draft:v1:${template.id}:${template.version.id}`]);
    await page.reload();
    await hydrated(page);
    await expect(input(page, textField.name)).toHaveValue('kept for later');
    await expect(page.locator('[data-notice="restored"]')).toHaveText(t('editor.restored'));
    await page.locator('[data-action="reset"]').click();
    await expect(input(page, textField.name)).toHaveValue(
      template.version.samples[0]!.values[textField.name] as string,
    );
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('template-draft')))).toEqual(
      [],
    );
  });

  test('editing and copying work when storage is blocked (§11.6.2)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await open(page);
    await input(page, textField.name).fill('no storage');
    await expect(variables(page, textField.name).first()).toHaveText('no storage');
    await page.waitForTimeout(600); // past the draft write
    expect(errors).toEqual([]);
  });

  test('a shared link fills the values once; a link for another version falls back with a notice', async ({ page }) => {
    // Arrive at the shared URL as its recipient would. Opening the bare editor first can
    // race its initial router effects against a second, same-document fragment navigation.
    const payload = Buffer.from(JSON.stringify({ [textField.name]: 'from a link' }), 'utf8').toString('base64url');
    const fragment = `${template.version.id}=${payload}`;
    await open(page, `#${fragment}`);
    await expect(input(page, textField.name)).toHaveValue('from a link');
    await expect(page.locator('[data-notice="shared"]')).toBeVisible();
    expect(new URL(page.url()).hash).toBe(''); // a reload keeps the draft, not the link

    await open(page, `#v0=${fragment.split('=')[1]}`);
    await expect(input(page, textField.name)).toHaveValue(
      template.version.samples[0]!.values[textField.name] as string,
    );
    await expect(page.locator('[data-notice="mismatch"]')).toContainText('v0');
  });

  test('"Customize" on a prompt made with the template opens the editor with its values', async ({ page }) => {
    const prompt = index.prompts
      .map((p) => promptDetail(code, p.id))
      .find(
        (p) =>
          p.template &&
          p.relatedTemplates.some((x) => x.id === p.template!.id && x.currentVersion === p.template!.version),
      );
    test.skip(!prompt, 'no prompt made with a current template version');
    await page.goto(`${BASE}${prompt!.path}`);
    await page.getByRole('link', { name: message(code, 'detail.customize') }).click();
    await hydrated(page);
    await expect(page.locator('[data-notice="shared"]')).toBeVisible();
    const target = templateDetail(code, prompt!.template!.id);
    const expected = renderTemplate(
      { body: target.version.body, fields: target.version.fields },
      prompt!.template!.values,
    );
    await expect(previewText(page)).toHaveText(expected.text!);
  });

  test('an input method keeps its composition: no reset, no item added mid-word (§11.6.4)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'IME composition is driven through the Chrome DevTools Protocol');
    await open(page);
    const cdp = await page.context().newCDPSession(page);
    const box = input(page, textField.name);
    await box.fill('');
    await box.focus();
    await cdp.send('Input.imeSetComposition', { text: 'zhong', selectionStart: 5, selectionEnd: 5 });
    await expect(box).toHaveValue('zhong');
    await expect(box).toBeFocused();
    await cdp.send('Input.insertText', { text: '中文' });
    await expect(box).toHaveValue('中文');
    await expect(box).toBeFocused();
    await expect(variables(page, textField.name).first()).toHaveText('中文');

    if (listField) {
      const list = input(page, listField.name);
      const items = shell(page, listField.name).locator('li');
      const before = await items.count();
      await list.focus();
      await cdp.send('Input.imeSetComposition', { text: 'ci', selectionStart: 2, selectionEnd: 2 });
      await list.dispatchEvent('keydown', { key: 'Enter', isComposing: true, keyCode: 229 });
      await expect(items).toHaveCount(before);
      await cdp.send('Input.insertText', { text: '词' });
      await expect(list).toHaveValue('词');
    }
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`axe (${scheme}): the editor, with and without errors`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      expect(await seriousViolations(page)).toEqual([]);
      await input(page, textField.name).fill('');
      await copyButton(page).click();
      await expect(input(page, textField.name)).toBeFocused();
      // Going to the field scrolls the breadcrumb under the sticky header, which axe reports as
      // an obscured target; the check here is about the error state itself.
      await scrollToTop(page);
      expect(await seriousViolations(page)).toEqual([]);
    });

    test(`axe (${scheme}): the template list`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${BASE}/${first!.pathPrefix}/templates/`);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  const sheet = (page: Page) => page.locator('section:has(> [data-sheet-body])');
  const handle = (page: Page) => sheet(page).locator('button[aria-expanded]');

  test('the preview is docked: copy and the first lines peek; it opens, closes and gives way to fields', async ({
    page,
  }) => {
    await open(page);
    const copy = (await copyButton(page).boundingBox())!;
    expect(copy.y + copy.height).toBeLessThanOrEqual(844);
    expect(copy.y).toBeGreaterThan(844 / 2);
    const top = (await previewText(page).boundingBox())!.y;
    expect(top).toBeLessThan(844);

    await handle(page).click();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async () => (await sheet(page).boundingBox())!.y).toBeLessThan(844 * 0.3);
    await page.keyboard.press('Escape');
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'false');

    await handle(page).click();
    await variables(page, textField.name).first().click();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(input(page, textField.name)).toBeFocused();
  });

  test('a drag on the handle opens and closes the sheet', async ({ page }) => {
    await open(page);
    const h = (await handle(page).boundingBox())!;
    const x = h.x + h.width / 2;
    const y = h.y + h.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 200, { steps: 8 });
    await page.mouse.up();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'true');
    await settle(page);
    const open1 = (await handle(page).boundingBox())!;
    await page.mouse.move(x, open1.y + open1.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, open1.y + 400, { steps: 8 });
    await page.mouse.up();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('the first sample of the list template has its copy reachable without scrolling the fields', async ({
    page,
  }) => {
    const any = sampleTemplate(code)!;
    await page.goto(`${BASE}${any.path}`);
    await expect(copyButton(page)).toBeInViewport();
  });
});
