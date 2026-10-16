// Clipboard helpers (design doc §11.9 "复制内容", §11.7 "复制"). Plain text only, LF line
// breaks, no leading or trailing whitespace and nothing appended: what the user copies is
// exactly the prompt the page shows.

export function normalizeCopyText(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim();
}

/** Writes text to the clipboard; resolves false when the browser refuses. */
export async function writeClipboard(text: string): Promise<boolean> {
  const value = normalizeCopyText(text);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Permission denied or an insecure context: try the legacy path below.
  }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Selects the text of an element, so a failed copy leaves the prompt ready to copy by hand. */
export function selectContents(element: Element | null) {
  if (!element) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
