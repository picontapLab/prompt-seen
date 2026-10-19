// On the search page, `/` and ⌘K / Ctrl+K move focus to the page's own field instead of opening
// the quick panel over it (§11.8.6). The page registers its field while mounted.

let focusField: (() => void) | null = null;

export function registerPageSearch(focus: () => void): () => void {
  focusField = focus;
  return () => {
    if (focusField === focus) focusField = null;
  };
}

/** Focuses the search page's field when the page is open; false elsewhere. */
export function focusPageSearch(): boolean {
  if (!focusField) return false;
  focusField();
  return true;
}
