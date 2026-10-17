// subset-font 2.x ships no type declarations; this covers the call scripts/lib/fonts uses.
declare module 'subset-font' {
  type Options = {
    targetFormat?: 'sfnt' | 'woff' | 'woff2' | 'truetype';
    preserveNameIds?: number[];
    variationAxes?: Record<string, number | { min: number; max: number; default?: number }>;
    noLayoutClosure?: boolean;
  };
  export default function subsetFont(font: Buffer, text: string, options?: Options): Promise<Buffer>;
}
