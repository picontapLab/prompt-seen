import path from 'node:path';

// Validation results (design doc §14.3). Every finding names the file, the field when there is
// one, what is wrong and how to fix it (§14.4).
//
// - error: the content cannot be built (duplicate ID, missing reference, undefined field…).
// - publish: a locale version marked `published` does not meet the publishing rules (§8.4).
//   It blocks the deployment; drafts never produce publish errors.
// - warning: needs attention but does not block (missing translation, outdated translation…).
// - info: maintenance hints (unused assets, large images).

export type FindingLevel = 'error' | 'publish' | 'warning' | 'info';

export type Finding = {
  level: FindingLevel;
  /** Relative to the repository root. */
  file: string;
  line?: number;
  /** Dotted path inside the file, e.g. "annotations.1.phrase". */
  field?: string;
  message: string;
  fix?: string;
};

export type Report = (finding: Omit<Finding, 'file'> & { file: string }) => void;

export class Findings {
  readonly list: Finding[] = [];
  constructor(private readonly root: string) {}

  add(finding: Finding): void {
    const file = path.isAbsolute(finding.file) ? path.relative(this.root, finding.file) : finding.file;
    this.list.push({ ...finding, file });
  }

  error(file: string, message: string, extra: Partial<Finding> = {}) {
    this.add({ level: 'error', file, message, ...extra });
  }
  publish(file: string, message: string, extra: Partial<Finding> = {}) {
    this.add({ level: 'publish', file, message, ...extra });
  }
  warning(file: string, message: string, extra: Partial<Finding> = {}) {
    this.add({ level: 'warning', file, message, ...extra });
  }
  info(file: string, message: string, extra: Partial<Finding> = {}) {
    this.add({ level: 'info', file, message, ...extra });
  }

  count(level: FindingLevel): number {
    return this.list.filter((f) => f.level === level).length;
  }

  /** Errors and publish errors both stop content:build and fail content:validate. */
  get blocking(): number {
    return this.count('error') + this.count('publish');
  }
}

const LABEL: Record<FindingLevel, string> = {
  error: 'ERROR',
  publish: 'PUBLISH ERROR',
  warning: 'WARNING',
  info: 'INFO',
};
const ORDER: FindingLevel[] = ['error', 'publish', 'warning', 'info'];

export function formatFinding(f: Finding): string {
  const where = `${f.file}${f.line ? `:${f.line}` : ''}`;
  const field = f.field ? ` ${f.field}:` : '';
  return `${LABEL[f.level]} ${where}${field} ${f.message}${f.fix ? `\n    Fix: ${f.fix}` : ''}`;
}

/** Prints findings, most severe first, then a one-line summary. */
export function printFindings(findings: readonly Finding[], label: string, { quietInfo = false } = {}): void {
  const sorted = [...findings].sort(
    (a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level) || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0),
  );
  for (const f of sorted) {
    if (quietInfo && f.level === 'info') continue;
    const line = formatFinding(f);
    if (f.level === 'error' || f.level === 'publish') console.error(line);
    else console.warn(line);
  }
  const n = (level: FindingLevel) => findings.filter((f) => f.level === level).length;
  console.log(
    `${label}: ${n('error')} error(s), ${n('publish')} publish error(s), ${n('warning')} warning(s), ${n('info')} info`,
  );
}
