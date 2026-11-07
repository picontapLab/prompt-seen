# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: editor.browser.spec.ts >> desktop >> a shared link fills the values once; a link for another version falls back with a notice
- Location: tests/e2e/editor.browser.spec.ts:226:3

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  locator('[data-field-shell="brand"]').locator('input:not([type=radio]), textarea').first()
Expected: "from a link"
Received: "青山茶事"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" locator('[data-field-shell="brand"]').locator('input:not([type=radio]), textarea').first() with timeout 5000ms
  - waiting for locator('[data-field-shell="brand"]').locator('input:not([type=radio]), textarea').first()
    14 × locator resolved to <input dir="ltr" type="text" data-rac="" tabindex="0" value="青山茶事" lang="zh-Hans" aria-required="true" class="aAs3jq_input" id="react-aria-_R_3bepbsnpfeiumivb_" aria-labelledby="react-aria-_R_3bepbsnpfeiumivbH1_" aria-describedby="react-aria-_R_3bepbsnpfeiumivbH3_"/>
       - unexpected value "青山茶事"

```

```yaml
- textbox "Brand": 青山茶事
```

# Test source

```ts
  140 |     const items = shell(page, field.name).locator('li');
  141 |     const start = await items.count();
  142 |     await box.fill('first added');
  143 |     await box.press('Enter');
  144 |     await expect(items).toHaveCount(start + 1);
  145 |     await expect(variables(page, field.name).first()).toContainText('first added');
  146 |     await box.press('Backspace');
  147 |     await expect(items).toHaveCount(start);
  148 |     const mark = field.separator.trim();
  149 |     await box.pressSequentially(`one${mark}`);
  150 |     await expect(items).toHaveCount(start + 1);
  151 |     await expect(box).toHaveValue('');
  152 |     if (field.maxItems !== null) {
  153 |       for (let i = (await items.count()) + 1; i <= field.maxItems + 1; i++) {
  154 |         await box.fill(`item ${i}`);
  155 |         await box.press('Enter');
  156 |       }
  157 |       await expect(items).toHaveCount(field.maxItems);
  158 |       await expect(box).toHaveValue(`item ${field.maxItems + 1}`); // what did not fit stays
  159 |     }
  160 |   });
  161 | 
  162 |   test('a focused field marks its variables; pressing a variable focuses its field (§11.8.4 双向定位)', async ({
  163 |     page,
  164 |   }) => {
  165 |     await open(page);
  166 |     await input(page, textField.name).focus();
  167 |     await expect(variables(page, textField.name).first()).toHaveAttribute('data-active', 'true');
  168 |     const other = fields.find((f) => f.name !== textField.name && f.type !== 'enum') ?? fields[1]!;
  169 |     await variables(page, other.name).first().click();
  170 |     await expect(shell(page, other.name)).toHaveAttribute('data-active', 'true');
  171 |     await expect(shell(page, other.name).locator(':focus')).toHaveCount(1);
  172 |   });
  173 | 
  174 |   test('another sample cycles in file order; reset restores the default and can be undone', async ({ page }) => {
  175 |     test.skip(template.version.samples.length < 2, 'one sample only');
  176 |     await open(page);
  177 |     const second = renderTemplate(spec, template.version.samples[1]!.values).text!;
  178 |     await page.locator('[data-action="sample"]').click();
  179 |     await expect(previewText(page)).toHaveText(second);
  180 |     for (let i = 2; i < template.version.samples.length; i++) await page.locator('[data-action="sample"]').click();
  181 |     await page.locator('[data-action="sample"]').click();
  182 |     await expect(previewText(page)).toHaveText(template.version.defaultPrompt);
  183 | 
  184 |     await input(page, textField.name).fill('edited value');
  185 |     await page.locator('[data-action="reset"]').click();
  186 |     await expect(previewText(page)).toHaveText(template.version.defaultPrompt);
  187 |     await page.getByRole('button', { name: t('editor.undo') }).click();
  188 |     await expect(input(page, textField.name)).toHaveValue('edited value');
  189 |   });
  190 | 
  191 |   test('a draft comes back after a reload, and reset clears it (§11.6.2)', async ({ page }) => {
  192 |     await open(page);
  193 |     await input(page, textField.name).fill('kept for later');
  194 |     await expect
  195 |       .poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('template-draft'))))
  196 |       .toEqual([`prompt-library:template-draft:v1:${template.id}:${template.version.id}`]);
  197 |     await page.reload();
  198 |     await hydrated(page);
  199 |     await expect(input(page, textField.name)).toHaveValue('kept for later');
  200 |     await expect(page.locator('[data-notice="restored"]')).toHaveText(t('editor.restored'));
  201 |     await page.locator('[data-action="reset"]').click();
  202 |     await expect(input(page, textField.name)).toHaveValue(
  203 |       template.version.samples[0]!.values[textField.name] as string,
  204 |     );
  205 |     expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('template-draft')))).toEqual(
  206 |       [],
  207 |     );
  208 |   });
  209 | 
  210 |   test('editing and copying work when storage is blocked (§11.6.2)', async ({ page }) => {
  211 |     const errors = watchErrors(page);
  212 |     await page.addInitScript(() => {
  213 |       Object.defineProperty(window, 'localStorage', {
  214 |         get() {
  215 |           throw new DOMException('blocked', 'SecurityError');
  216 |         },
  217 |       });
  218 |     });
  219 |     await open(page);
  220 |     await input(page, textField.name).fill('no storage');
  221 |     await expect(variables(page, textField.name).first()).toHaveText('no storage');
  222 |     await page.waitForTimeout(600); // past the draft write
  223 |     expect(errors).toEqual([]);
  224 |   });
  225 | 
  226 |   test('a shared link fills the values once; a link for another version falls back with a notice', async ({ page }) => {
  227 |     await open(page);
  228 |     // The fragment as the editor's encodeShare writes it: base64url UTF-8 JSON after the version.
  229 |     const fragment = await page.evaluate(
  230 |       ([version, name]) => {
  231 |         const json = JSON.stringify({ [name!]: 'from a link' });
  232 |         const bytes = new TextEncoder().encode(json);
  233 |         let binary = '';
  234 |         for (const b of bytes) binary += String.fromCharCode(b);
  235 |         return `${version}=${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  236 |       },
  237 |       [template.version.id, textField.name],
  238 |     );
  239 |     await open(page, `#${fragment}`);
> 240 |     await expect(input(page, textField.name)).toHaveValue('from a link');
      |                                               ^ Error: expect(locator).toHaveValue(expected) failed
  241 |     await expect(page.locator('[data-notice="shared"]')).toBeVisible();
  242 |     expect(new URL(page.url()).hash).toBe(''); // a reload keeps the draft, not the link
  243 | 
  244 |     await open(page, `#v0=${fragment.split('=')[1]}`);
  245 |     await expect(input(page, textField.name)).toHaveValue(
  246 |       template.version.samples[0]!.values[textField.name] as string,
  247 |     );
  248 |     await expect(page.locator('[data-notice="mismatch"]')).toContainText('v0');
  249 |   });
  250 | 
  251 |   test('"Customize" on a prompt made with the template opens the editor with its values', async ({ page }) => {
  252 |     const prompt = index.prompts
  253 |       .map((p) => promptDetail(code, p.id))
  254 |       .find(
  255 |         (p) =>
  256 |           p.template &&
  257 |           p.relatedTemplates.some((x) => x.id === p.template!.id && x.currentVersion === p.template!.version),
  258 |       );
  259 |     test.skip(!prompt, 'no prompt made with a current template version');
  260 |     await page.goto(`${BASE}${prompt!.path}`);
  261 |     await page.getByRole('link', { name: message(code, 'detail.customize') }).click();
  262 |     await hydrated(page);
  263 |     await expect(page.locator('[data-notice="shared"]')).toBeVisible();
  264 |     const target = templateDetail(code, prompt!.template!.id);
  265 |     const expected = renderTemplate(
  266 |       { body: target.version.body, fields: target.version.fields },
  267 |       prompt!.template!.values,
  268 |     );
  269 |     await expect(previewText(page)).toHaveText(expected.text!);
  270 |   });
  271 | 
  272 |   test('an input method keeps its composition: no reset, no item added mid-word (§11.6.4)', async ({
  273 |     page,
  274 |     browserName,
  275 |   }) => {
  276 |     test.skip(browserName !== 'chromium', 'IME composition is driven through the Chrome DevTools Protocol');
  277 |     await open(page);
  278 |     const cdp = await page.context().newCDPSession(page);
  279 |     const box = input(page, textField.name);
  280 |     await box.fill('');
  281 |     await box.focus();
  282 |     await cdp.send('Input.imeSetComposition', { text: 'zhong', selectionStart: 5, selectionEnd: 5 });
  283 |     await expect(box).toHaveValue('zhong');
  284 |     await expect(box).toBeFocused();
  285 |     await cdp.send('Input.insertText', { text: '中文' });
  286 |     await expect(box).toHaveValue('中文');
  287 |     await expect(box).toBeFocused();
  288 |     await expect(variables(page, textField.name).first()).toHaveText('中文');
  289 | 
  290 |     if (listField) {
  291 |       const list = input(page, listField.name);
  292 |       const items = shell(page, listField.name).locator('li');
  293 |       const before = await items.count();
  294 |       await list.focus();
  295 |       await cdp.send('Input.imeSetComposition', { text: 'ci', selectionStart: 2, selectionEnd: 2 });
  296 |       await list.dispatchEvent('keydown', { key: 'Enter', isComposing: true, keyCode: 229 });
  297 |       await expect(items).toHaveCount(before);
  298 |       await cdp.send('Input.insertText', { text: '词' });
  299 |       await expect(list).toHaveValue('词');
  300 |     }
  301 |   });
  302 | 
  303 |   for (const scheme of ['light', 'dark'] as const) {
  304 |     test(`axe (${scheme}): the editor, with and without errors`, async ({ page }) => {
  305 |       await page.emulateMedia({ colorScheme: scheme });
  306 |       await open(page);
  307 |       expect(await seriousViolations(page)).toEqual([]);
  308 |       await input(page, textField.name).fill('');
  309 |       await copyButton(page).click();
  310 |       await expect(input(page, textField.name)).toBeFocused();
  311 |       // Going to the field scrolls the breadcrumb under the sticky header, which axe reports as
  312 |       // an obscured target; the check here is about the error state itself.
  313 |       await scrollToTop(page);
  314 |       expect(await seriousViolations(page)).toEqual([]);
  315 |     });
  316 | 
  317 |     test(`axe (${scheme}): the template list`, async ({ page }) => {
  318 |       await page.emulateMedia({ colorScheme: scheme });
  319 |       await page.goto(`${BASE}/${first!.pathPrefix}/templates/`);
  320 |       expect(await seriousViolations(page)).toEqual([]);
  321 |     });
  322 |   }
  323 | });
  324 | 
  325 | test.describe('phone', () => {
  326 |   test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  327 | 
  328 |   const sheet = (page: Page) => page.locator('section:has(> [data-sheet-body])');
  329 |   const handle = (page: Page) => sheet(page).locator('button[aria-expanded]');
  330 | 
  331 |   test('the preview is docked: copy and the first lines peek; it opens, closes and gives way to fields', async ({
  332 |     page,
  333 |   }) => {
  334 |     await open(page);
  335 |     const copy = (await copyButton(page).boundingBox())!;
  336 |     expect(copy.y + copy.height).toBeLessThanOrEqual(844);
  337 |     expect(copy.y).toBeGreaterThan(844 / 2);
  338 |     const top = (await previewText(page).boundingBox())!.y;
  339 |     expect(top).toBeLessThan(844);
  340 | 
```