import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase } from '@playwright/test/reporter';

/** Stable identities let maintainers match recurring flakes across runs and path/browser jobs. */
export function testIdentity(project: string, file: string, title: string): string {
  return createHash('sha256').update(`${project}\n${file}\n${title}`).digest('hex').slice(0, 16);
}

export default class ReliabilityReporter implements Reporter {
  private suite?: Suite;
  private workers = 0;

  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite;
    this.workers = config.workers;
  }

  onEnd(result: FullResult) {
    const tests = this.suite?.allTests() ?? [];
    const record = (test: TestCase) => {
      const file = path.relative(process.cwd(), test.location.file);
      const project = test.parent.project()?.name ?? '';
      const title = test.titlePath().slice(3).join(' › ');
      return {
        id: testIdentity(project, file, title),
        project,
        file,
        line: test.location.line,
        title,
        outcome: test.outcome(),
        attempts: test.results.map((attempt) => ({
          retry: attempt.retry,
          status: attempt.status,
          durationMs: attempt.duration,
        })),
      };
    };
    const report = {
      status: result.status,
      workers: this.workers,
      durationMs: result.duration,
      run: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT,
      tests: tests.map(record),
    };
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync('test-results/reliability.json', `${JSON.stringify(report, null, 2)}\n`);
    const flaky = report.tests.filter((test) => test.outcome === 'flaky');
    const failed = report.tests.filter((test) => test.outcome === 'unexpected');
    const escaped = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('`', "'");
    const rows = [...failed, ...flaky].map(
      (test) =>
        `| ${test.outcome} | ${test.id} | ${escaped(test.project)} | ${escaped(`${test.file}:${test.line} ${test.title}`)} | ${test.attempts.map((attempt) => attempt.status).join(' → ')} |`,
    );
    const summary = [
      `### Browser reliability (${process.env.PW_BROWSERS ?? 'local'})`,
      '',
      `${tests.length} tests; ${failed.length} failed; ${flaky.length} flaky. ${this.workers} workers, ${(result.duration / 60_000).toFixed(1)} minutes.`,
      '',
      '| Outcome | Tracking ID | Browser | Test | Attempts |',
      '| --- | --- | --- | --- | --- |',
      ...rows,
      '',
      'Reports and retry evidence: the matching `playwright-*` artifact. Triage procedure: `docs/ci-reliability.md`.',
      '',
    ].join('\n');
    fs.writeFileSync('test-results/reliability.md', summary);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}
