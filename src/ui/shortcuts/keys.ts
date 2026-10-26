// Shared rules for single-key shortcuts (design doc §11.10): they never act while the visitor
// types, during IME composition, or with modifiers, and only while the preference allows them.
// Plain functions, no 'use client', so tests and other islands use them alike.

/** Text fields where a letter is typed, not a shortcut. */
export function isEditable(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target.closest('[role="combobox"], [role="textbox"], [role="slider"], [role="spinbutton"]')) return true;
  return (
    target instanceof HTMLInputElement &&
    !['button', 'checkbox', 'radio', 'range', 'reset', 'submit', 'color', 'file', 'image'].includes(target.type)
  );
}

export type KeyLike = Pick<
  KeyboardEvent,
  'key' | 'keyCode' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'isComposing' | 'repeat' | 'defaultPrevented'
>;

/** The single-key shortcut a key press asks for, or null. `?` needs Shift on most layouts. */
export function singleKeyAction(e: KeyLike): 'copy' | 'save' | 'help' | null {
  // 229: a key that an input method is processing (Safari reports it without isComposing).
  if (e.defaultPrevented || e.isComposing || e.keyCode === 229 || e.repeat) return null;
  if (e.altKey || e.ctrlKey || e.metaKey) return null;
  if (e.key === '?') return 'help';
  if (e.shiftKey) return null;
  const key = e.key.toLowerCase();
  return key === 'c' ? 'copy' : key === 's' ? 'save' : null;
}

/**
 * Where a shortcut acts: inside an open modal (the detail popup, a panel) when there is one,
 * else the page. Elements a modal has hidden (aria-hidden, inert) are skipped, so the page
 * behind a React Aria dialog cannot be acted on either.
 */
export function shortcutTarget(name: 'copy' | 'save', doc: Document = document): HTMLElement | null {
  let scope: ParentNode = doc;
  try {
    const modals = doc.querySelectorAll(':modal');
    if (modals.length) scope = modals[modals.length - 1]!;
  } catch {
    // no :modal support: native dialogs still make the page inert
  }
  for (const el of scope.querySelectorAll<HTMLElement>(`[data-shortcut="${name}"]`)) {
    if (el.closest('[inert], [aria-hidden="true"]')) continue;
    if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') continue;
    if (!el.getClientRects().length) continue;
    return el;
  }
  return null;
}
