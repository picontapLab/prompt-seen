// Breakpoints of design doc §11.1.3 (min-width, px), for code such as image `sizes`.
// CSS writes the same numbers in its media queries; tokens.test.ts allows no others.
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1600,
} as const;

export type Breakpoint = keyof typeof breakpoints;
