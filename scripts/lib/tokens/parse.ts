// Reads custom properties out of the token stylesheets in src/styles/tokens/ (design doc §4.1).
// The files are hand-written CSS, so a small block parser is enough: it tracks nested at-rules
// and selectors and collects the `--name: value` declarations of each block.

export type CssBlock = {
  /** Enclosing at-rules and the selector, outermost first, whitespace-normalised. */
  path: string[];
  declarations: Map<string, string>;
};

const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();

export function parseCssBlocks(css: string): CssBlock[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: CssBlock[] = [];
  const stack: CssBlock[] = [];
  let buffer = '';
  for (const ch of source) {
    if (ch === '{') {
      const block: CssBlock = { path: [...(stack.at(-1)?.path ?? []), normalise(buffer)], declarations: new Map() };
      stack.push(block);
      blocks.push(block);
      buffer = '';
    } else if (ch === '}') {
      addDeclaration(stack.at(-1), buffer);
      stack.pop();
      buffer = '';
    } else if (ch === ';') {
      if (stack.length) addDeclaration(stack.at(-1), buffer);
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  if (stack.length) throw new Error('unbalanced braces in token stylesheet');
  return blocks.filter((b) => b.declarations.size > 0);
}

function addDeclaration(block: CssBlock | undefined, text: string) {
  const match = /^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(text);
  if (block && match) block.declarations.set(match[1]!, normalise(match[2]!));
}

export type ThemeTokens = { light: Map<string, string>; darkSystem: Map<string, string>; dark: Map<string, string> };

/**
 * The three theme blocks of color.css: light (default), dark following the system, and dark
 * chosen explicitly. Fails loudly when the file no longer has that shape, so a refactor cannot
 * silently skip the contrast check.
 */
export function themeTokens(css: string): ThemeTokens {
  const blocks = parseCssBlocks(css);
  const find = (label: string, test: (b: CssBlock) => boolean) => {
    const found = blocks.filter(test);
    if (found.length !== 1) throw new Error(`color.css: expected one ${label} block, found ${found.length}`);
    return found[0]!.declarations;
  };
  const inMedia = (b: CssBlock, media: string) => b.path.some((p) => p.startsWith('@media') && p.includes(media));
  const selector = (b: CssBlock) => b.path.at(-1) ?? '';
  return {
    light: find(
      'light theme',
      (b) => selector(b).includes("[data-theme='light']") && !b.path.some((p) => p.startsWith('@media')),
    ),
    darkSystem: find('system dark theme', (b) => inMedia(b, 'prefers-color-scheme: dark')),
    dark: find('explicit dark theme', (b) => selector(b) === ":where([data-theme='dark'])"),
  };
}
