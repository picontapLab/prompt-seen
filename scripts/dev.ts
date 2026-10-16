// npm run dev: build the content once, then keep rebuilding it while `next dev` runs, so edits
// under content/ show up on reload (design doc §17.3 step 1b). Configuration changes in
// site.yaml or locales.yaml still need a restart.
import { spawn, type ChildProcess } from 'node:child_process';
import { ROOT } from './lib/paths';

const children: ChildProcess[] = [];
const run = (command: string, args: string[]) => {
  const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  children.push(child);
  return child;
};

const stop = (code: number) => {
  for (const c of children) if (c.exitCode === null) c.kill('SIGTERM');
  process.exit(code);
};
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

const first = run('npx', ['tsx', 'scripts/content-build.ts']);
first.on('exit', (code) => {
  if (code)
    console.error(
      'content:build failed; the dev server starts anyway and the content watcher rebuilds after each fix.',
    );
  run('npx', ['tsx', 'scripts/content-build.ts', '--watch', '--no-initial']);
  run('npx', ['next', 'dev', ...process.argv.slice(2)]).on('exit', (c) => stop(c ?? 0));
});
