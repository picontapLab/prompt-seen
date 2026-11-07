# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: editor.browser.spec.ts >> desktop >> axe (light): the editor, with and without errors
- Location: tests/e2e/editor.browser.spec.ts:304:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: frame.evaluate: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2]:
    - /url: "#main"
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "Prompt Seen home" [ref=e5]:
        - /url: /
        - generic [ref=e8]: PROMPT SEEN
      - navigation "Main" [ref=e9]:
        - list [ref=e10]:
          - listitem [ref=e11]:
            - link "Prompts" [ref=e12]:
              - /url: /en/prompts/
          - listitem [ref=e13]:
            - link "Templates" [ref=e14]:
              - /url: /en/templates/
          - listitem [ref=e15]:
            - link "Collections" [ref=e16]:
              - /url: /en/collections/
      - generic [ref=e17]:
        - link "Search" [ref=e18] [cursor=pointer]:
          - /url: /en/search/
          - generic [ref=e19]:
            - generic [ref=e23]: Search
            - generic [aria-hidden] [ref=e24]: /
        - link "Saved" [ref=e25] [cursor=pointer]:
          - /url: /en/favorites/
          - generic [aria-hidden] [ref=e29]: Saved
        - 'button "Language: English" [ref=e32] [cursor=pointer]':
          - generic [ref=e33]:
            - generic [ref=e34]: "Language:"
            - text: English
        - link "Prompt Seen on GitHub" [ref=e38]:
          - /url: https://github.com/picontapLab/prompt-seen
        - button "Switch to dark theme" [ref=e41] [cursor=pointer]
  - main [ref=e47]:
    - article [ref=e49]:
      - generic [ref=e50]:
        - navigation "Breadcrumb" [ref=e51]:
          - list [ref=e52]:
            - listitem [ref=e53]:
              - link "Home" [ref=e54]:
                - /url: /
            - listitem [ref=e55]:
              - text: /
              - link "Templates" [ref=e56]:
                - /url: /en/templates/
        - generic [ref=e57]:
          - heading "Chinese citrus tea launch poster" [level=1] [ref=e58]
          - paragraph [ref=e59]: Brand, flavor, 18-yuan price, half-price offer, June 1–7 dates and CTA are all visible and legible. The campaign is fictional.
          - button "Save" [ref=e62] [cursor=pointer]
        - generic [ref=e68]:
          - generic [ref=e69]:
            - paragraph [ref=e70]: Version v1 · 5 fields
            - status
            - button "Reset" [ref=e71] [cursor=pointer]
          - generic [ref=e76]:
            - form "Fields" [ref=e77]:
              - group "Subject" [ref=e78]:
                - generic [ref=e81]:
                  - generic [ref=e82]: Brand
                  - textbox "Brand" [ref=e84]: 青山茶事
                  - generic [ref=e85]: Changing this value creates an untested variant. Keep related content consistent.
                - generic [ref=e87]:
                  - generic [ref=e88]: Price
                  - textbox "Price" [ref=e90]: 18元
                  - generic [ref=e91]: Changing this value creates an untested variant. Keep related content consistent.
                - generic [ref=e93]:
                  - generic [ref=e94]: Offer
                  - textbox "Offer" [ref=e96]: 第二杯半价
                  - generic [ref=e97]: Changing this value creates an untested variant. Keep related content consistent.
                - generic [ref=e99]:
                  - generic [ref=e100]: Dates
                  - textbox "Dates" [ref=e102]: 6月1日—6月7日
                  - generic [ref=e103]: Changing this value creates an untested variant. Keep related content consistent.
                - generic [ref=e105]:
                  - generic [ref=e106]: CTA
                  - textbox "CTA" [ref=e108]: 到店尝鲜
                  - generic [ref=e109]: Changing this value creates an untested variant. Keep related content consistent.
            - region "Prompt preview" [ref=e111]:
              - generic [ref=e113]:
                - region "Prompt · Simplified Chinese" [ref=e114]:
                  - generic [ref=e115]:
                    - generic [ref=e116]:
                      - generic [ref=e117]: Prompt · Simplified Chinese
                      - button "Prompts keep their original language. A translated prompt may give different results." [ref=e118] [cursor=pointer]
                    - generic [ref=e123]:
                      - button "Copy prompt" [ref=e124] [cursor=pointer]
                      - status [ref=e131]
                  - generic [ref=e132]: 3:4竖版新中式茶饮上市海报，深绿、米白和金色，宣纸纹理和山水留白，中央透明杯中的柑橘冰茶，茶叶、橘片、冰块和少量金箔。准确呈现以下六组简体中文：顶部品牌“青山茶事”；主标题“柑橘冷萃”；价格“新品价 18元”；活动“第二杯半价”；风味“清爽柑香”；时间“6月1日—6月7日”；底部CTA“到店尝鲜”。有清晰阅读层级，无额外文字。虚构品牌和促销示例。
                  - generic [ref=e133]: 175 characters
                - generic [ref=e135]:
                  - button "Download .txt" [ref=e136] [cursor=pointer]
                  - generic [ref=e141]:
                    - button "Share these values" [ref=e142] [cursor=pointer]
                    - status [ref=e149]
                - figure "Recorded result for these exact values." [ref=e150]:
                  - img "Brand, flavor, 18-yuan price, half-price offer, June 1–7 dates and CTA are all visible and legible. The campaign is fictional." [ref=e152]
          - status [ref=e154]
      - generic [ref=e155]:
        - generic [ref=e156]:
          - heading "How to use" [level=2] [ref=e157]
          - paragraph [ref=e158]: Default values reproduce the exact prompt used for this image. Edit the fields to create a new variant. Changing the subject creates a new, untested variant. This example uses no reference image.
          - heading "Observed result" [level=2] [ref=e159]
          - paragraph [ref=e160]: Brand, flavor, 18-yuan price, half-price offer, June 1–7 dates and CTA are all visible and legible. The campaign is fictional.
          - heading "Source" [level=2] [ref=e161]
          - paragraph [ref=e162]:
            - text: Independently adapted from the supplied design prompt collection, case 31.
            - link "Source" [ref=e163]:
              - /url: https://github.com/ZeroLu/awesome-gpt-image/blob/main/README.md#chinese-tea-drink-product-launch-poster
            - text: . GPT Image returned no precise version identifier.
        - region [ref=e167]:
          - heading "Test prints" [level=2] [ref=e168]
          - article [ref=e169]:
            - heading "T062-A" [level=3] [ref=e170]
            - generic [ref=e171]:
              - generic [ref=e172]:
                - term [ref=e173]: Model
                - definition [ref=e174]: GPT Image 2.5
              - generic [ref=e175]:
                - term [ref=e176]: Recorded
                - definition [ref=e177]: Oct 30, 2026
              - generic [ref=e178]:
                - term [ref=e179]: Provider
                - definition [ref=e180]: OpenAI
              - generic [ref=e181]:
                - term [ref=e182]: Template v1
                - definition [ref=e183]:
                  - link "Chinese citrus tea launch poster" [ref=e184]:
                    - /url: /en/templates/design-top60-31-template/
            - paragraph [ref=e185]:
              - generic [ref=e186]: "What we saw:"
              - text: Brand, flavor, 18-yuan price, half-price offer, June 1–7 dates and CTA are all visible and legible. The campaign is fictional.
            - figure "Output" [ref=e188]:
              - list [ref=e190]:
                - listitem [ref=e191]:
                  - img "Brand, flavor, 18-yuan price, half-price offer, June 1–7 dates and CTA are all visible and legible. The campaign is fictional." [ref=e192]
      - region [ref=e194]:
        - heading "Made with this template" [level=2] [ref=e195]
        - list [ref=e197]:
          - listitem [ref=e198]:
            - link "Chinese citrus tea launch poster 0179" [ref=e199]:
              - /url: /en/prompts/design-top60-31/
              - generic [ref=e201]: Chinese citrus tea launch poster
              - generic [ref=e202]: "0179"
  - contentinfo [ref=e203]:
    - generic [ref=e204]:
      - generic [ref=e205]:
        - generic [ref=e208]: PROMPT SEEN
        - paragraph [ref=e209]: Tested image prompts and templates. See what each phrase does.
        - link "Prompt Seen on GitHub" [ref=e210]:
          - /url: https://github.com/picontapLab/prompt-seen
      - navigation [ref=e213]:
        - heading "LANGUAGES" [level=2] [ref=e214]
        - list [ref=e215]:
          - listitem [ref=e216]:
            - link "English" [ref=e217]:
              - /url: /
          - listitem [ref=e218]:
            - link "简体中文" [ref=e219]:
              - /url: /zh-hans/
      - generic [ref=e220]:
        - heading [level=2] [aria-hidden] [ref=e221]: THEME
        - generic [ref=e222]:
          - generic [ref=e223]: Theme
          - radiogroup "Theme" [ref=e224]:
            - radio "System" [checked] [ref=e225] [cursor=pointer]
            - radio "Light" [ref=e228] [cursor=pointer]
            - radio "Dark" [ref=e230] [cursor=pointer]
        - link "Saved" [ref=e232]:
          - /url: /en/favorites/
        - button "Keyboard shortcuts" [ref=e235] [cursor=pointer]
      - navigation "Prompt Seen" [ref=e239]:
        - list [ref=e240]:
          - listitem [ref=e241]:
            - link "About Prompt Seen" [ref=e242]:
              - /url: /en/about/
          - listitem [ref=e243]:
            - link "License" [ref=e244]:
              - /url: /en/license/
      - paragraph [ref=e245]: "Code: MIT. Prompt text and notes: CC BY 4.0. Images: licence noted per work."
  - alert [ref=e246]
```

# Test source

```ts
  1  | import AxeBuilder from '@axe-core/playwright';
  2  | import { expect, type Page } from '@playwright/test';
  3  | 
  4  | /**
  5  |  * Waits for running CSS animations and transitions to finish (looping ones excepted). axe
  6  |  * measures colour contrast with the opacity of the moment, so a dialog or sheet still fading in
  7  |  * reads as low contrast; slower runners (WebKit on Linux CI) hit that window reliably.
  8  |  */
  9  | export async function settle(page: Page): Promise<void> {
  10 |   await page.evaluate(() =>
  11 |     Promise.all(
  12 |       document
  13 |         .getAnimations()
  14 |         .filter((a) => a.effect?.getTiming().iterations !== Infinity)
  15 |         .map((a) => a.finished.catch(() => undefined)),
  16 |     ),
  17 |   );
  18 | }
  19 | 
  20 | /**
  21 |  * Scrolls to the top once the page has stopped scrolling. An instant scroll during a smooth one
  22 |  * (the editor going to a field) does not stop it: Chromium ends a few pixels short of the top,
  23 |  * and axe then reports links under the sticky header as obscured targets.
  24 |  */
  25 | export async function scrollToTop(page: Page): Promise<void> {
  26 |   await page.evaluate(
  27 |     () =>
  28 |       new Promise<void>((resolve) => {
  29 |         let last = scrollY;
  30 |         let still = 0;
  31 |         const tick = () => {
  32 |           still = scrollY === last ? still + 1 : 0;
  33 |           last = scrollY;
  34 |           if (still >= 5) resolve();
  35 |           else requestAnimationFrame(tick);
  36 |         };
  37 |         requestAnimationFrame(tick);
  38 |       }),
  39 |   );
  40 |   await page.evaluate(() => window.scrollTo(0, 0));
  41 |   expect(await page.evaluate(() => scrollY)).toBe(0);
  42 | }
  43 | 
  44 | /** Serious and critical WCAG 2.2 AA violations (§16.3), checked once the page has settled. */
  45 | export async function seriousViolations(page: Page, include?: string): Promise<string[]> {
  46 |   await settle(page);
  47 |   const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
> 48 |   const { violations } = await (include ? builder.include(include) : builder).analyze();
     |                          ^ Error: frame.evaluate: Test timeout of 30000ms exceeded.
  49 |   return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
  50 | }
  51 | 
```