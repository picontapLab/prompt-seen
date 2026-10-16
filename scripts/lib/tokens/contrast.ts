// WCAG 2.2 contrast (success criteria 1.4.3 and 1.4.11): relative luminance of sRGB colours and
// the (L1 + 0.05) / (L2 + 0.05) ratio. https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio

export type Rgba = { r: number; g: number; b: number; a: number };

/** Parses #rgb, #rrggbb and rgb(r g b) / rgb(r g b / a), the forms the token files use. */
export function parseColor(value: string): Rgba {
  const v = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join('') : hex[1]!;
    const n = parseInt(h, 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/.exec(v);
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: alpha };
  }
  throw new Error(`unsupported colour value "${value}" (use #rrggbb or rgb(r g b / a))`);
}

/** Source-over compositing of a translucent colour on an opaque backdrop. */
export function composite(top: Rgba, backdrop: Rgba): Rgba {
  const mix = (t: number, b: number) => t * top.a + b * (1 - top.a);
  return { r: mix(top.r, backdrop.r), g: mix(top.g, backdrop.g), b: mix(top.b, backdrop.b), a: 1 };
}

export function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between a foreground and an opaque background; translucent foregrounds are composited first. */
export function contrastRatio(foreground: Rgba, background: Rgba): number {
  if (background.a !== 1) throw new Error('the background of a contrast pair must be opaque');
  const fg = foreground.a === 1 ? foreground : composite(foreground, background);
  const [hi, lo] = [relativeLuminance(fg), relativeLuminance(background)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
