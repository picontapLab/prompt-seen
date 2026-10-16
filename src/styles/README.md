# styles

`tokens/` is the single source of visual and motion tokens (design doc §4.1, §11.1, §12.4):
`color.css` (functional and brand layers, light / system dark / chosen dark, more contrast),
`type.css` (sizes, weights, per-script stacks and leading), `layout.css` (space, breakpoint
values, widths, shape, layers, focus, targets), `motion.css` (durations, easings, distances,
reduced motion). `npm run tokens:check` verifies their contrast pairs. The TypeScript files mirror
the few values code needs; `tokens.test.ts` keeps them equal.

`fonts/` declares the self-hosted subsets (`next/font/local`, SIL OFL 1.1). `base/` holds the
reset, element defaults and utility classes; `global.css` imports everything in layer order.
