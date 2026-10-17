import YAML, { LineCounter, isNode, type Document } from 'yaml';
import type { z } from 'zod';
import type { Findings } from './findings';

// YAML with positions: schema errors point at the line of the offending key (§14.4).

export type ParsedYaml = {
  file: string;
  data: unknown;
  /** 1-based line of the value at a path, or of the closest parent that exists. */
  lineOf: (path: readonly (string | number)[]) => number | undefined;
};

export function parseYaml(file: string, source: string, findings: Findings): ParsedYaml | null {
  const lineCounter = new LineCounter();
  const doc: Document = YAML.parseDocument(source, { lineCounter, prettyErrors: false, uniqueKeys: true });
  if (doc.errors.length) {
    for (const e of doc.errors) {
      const line = e.linePos?.[0]?.line;
      findings.error(file, `invalid YAML: ${e.message.split('\n')[0]}`, {
        line,
        fix: 'check indentation, quotes and colons around this line',
      });
    }
    return null;
  }
  const lineOf = (p: readonly (string | number)[]) => {
    for (let n = p.length; n >= 0; n -= 1) {
      const node = doc.getIn(p.slice(0, n), true);
      if (isNode(node) && node.range) return lineCounter.linePos(node.range[0]).line;
    }
    return undefined;
  };
  return { file, data: doc.toJS(), lineOf };
}

/** Validates parsed YAML (or frontmatter) against a schema and reports each issue at its line. */
export function check<T>(
  schema: z.ZodType<T>,
  parsed: Pick<ParsedYaml, 'file' | 'data' | 'lineOf'>,
  findings: Findings,
  { lineOffset = 0, hint }: { lineOffset?: number; hint?: string } = {},
): T | null {
  const result = schema.safeParse(parsed.data);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const p = issue.path.filter((k): k is string | number => typeof k !== 'symbol');
    const line = parsed.lineOf(p);
    findings.error(parsed.file, issue.message, {
      line: line === undefined ? undefined : line + lineOffset,
      field: p.join('.') || undefined,
      fix: hint,
    });
  }
  return null;
}
