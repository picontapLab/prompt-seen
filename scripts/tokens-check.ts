// npm run tokens:check: verifies the colour contrast pairs of design doc §11.1.9 (44 required,
// plus the supplementary pairs in scripts/lib/tokens/check.ts) against src/styles/tokens/color.css,
// the single source of colour values. Exits 1 when a pair fails or the token file is inconsistent.
import fs from 'node:fs';
import path from 'node:path';
import { checkTokens, type Result } from './lib/tokens/check';
import { ROOT } from './lib/paths';

const file = path.join(ROOT, 'src/styles/tokens/color.css');
const report = checkTokens(fs.readFileSync(file, 'utf8'));

const row = (r: Result) =>
  `${r.pass ? 'pass' : 'FAIL'}  ${r.theme.padEnd(5)}  ${r.ratio.toFixed(2).padStart(5)}:1 ≥ ${String(r.min).padEnd(3)}  ` +
  `${r.fg} on ${r.bg}${r.over ? ` over ${r.over}` : ''}  (${r.use})`;

console.log(`Required pairs (§11.1.9): ${report.required.filter((r) => r.pass).length}/${report.required.length} pass`);
for (const r of report.required) console.log(`  ${row(r)}`);
console.log(
  `Supplementary pairs: ${report.supplementary.filter((r) => r.pass).length}/${report.supplementary.length} pass`,
);
for (const r of report.supplementary) console.log(`  ${row(r)}`);
for (const problem of report.problems) console.error(`color.css: ${problem}`);

if (!report.ok) {
  console.error(
    `tokens-check failed: ${path.relative(ROOT, file)} has pairs below WCAG 2.2 AA or inconsistent themes.`,
  );
  process.exit(1);
}
