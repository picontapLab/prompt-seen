import { FIELD_NAME_PATTERN, type BodyProblem, type BodySegment } from './types';

// Splits a template body into literal text and `{{fieldName}}` placeholders (design doc §6.3).
// Only the exact form `{{name}}` is a placeholder; any other `{{` or `}}` is reported, so a
// typo such as `{{ product }}` or `{{product}` fails the build instead of reaching users.

const PLACEHOLDER = /\{\{([^{}\n]*)\}\}/y;

export function parseTemplateBody(body: string): { segments: BodySegment[]; problems: BodyProblem[] } {
  const segments: BodySegment[] = [];
  const problems: BodyProblem[] = [];
  let text = '';
  let line = 1;
  let column = 1;

  const flush = () => {
    if (text) segments.push({ kind: 'text', text });
    text = '';
  };
  const advance = (chunk: string) => {
    for (const ch of chunk) {
      if (ch === '\n') {
        line += 1;
        column = 1;
      } else column += 1;
    }
  };

  let i = 0;
  while (i < body.length) {
    if (body.startsWith('{{', i)) {
      PLACEHOLDER.lastIndex = i;
      const match = PLACEHOLDER.exec(body);
      if (match && FIELD_NAME_PATTERN.test(match[1]!)) {
        flush();
        segments.push({ kind: 'field', name: match[1]!, line, column });
        advance(match[0]);
        i += match[0].length;
        continue;
      }
      if (match) {
        problems.push({
          line,
          column,
          message: `"${match[0]}" is not a valid placeholder: write {{fieldName}} with a lowercase first letter, then letters or digits, and no spaces`,
        });
        // Keep it as literal text and skip its closing braces, so they are not reported again.
        text += match[0];
        advance(match[0]);
        i += match[0].length;
        continue;
      }
      problems.push({ line, column, message: 'unclosed "{{": write placeholders as {{fieldName}}' });
    } else if (body.startsWith('}}', i)) {
      problems.push({ line, column, message: '"}}" without a matching "{{"' });
    }
    text += body[i];
    advance(body[i]!);
    i += 1;
  }
  flush();
  return { segments, problems };
}

/** Field names used by a body, in order of first use. */
export function placeholderNames(segments: BodySegment[]): string[] {
  const names: string[] = [];
  for (const s of segments) if (s.kind === 'field' && !names.includes(s.name)) names.push(s.name);
  return names;
}
