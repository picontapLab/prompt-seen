import type { Locator } from '@playwright/test';

// Firefox's fill() commits a native composition. Emit an unfinished input explicitly
// so every browser receives the same in-progress transaction.
export async function composingText(input: Locator, value: string) {
  await input.evaluate((element: HTMLInputElement, text) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(element, text);
    element.dispatchEvent(
      new InputEvent('input', { bubbles: true, data: text, inputType: 'insertCompositionText', isComposing: true }),
    );
  }, value);
}
