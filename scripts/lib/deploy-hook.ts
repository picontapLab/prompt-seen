import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Apply private instance customization to a finished production artifact, before upload. */
export function runProductionDeployHook({
  root,
  artifactDir,
  buildMode,
  env = process.env,
}: {
  root: string;
  artifactDir: string;
  buildMode: 'production' | 'preview';
  env?: NodeJS.ProcessEnv;
}): boolean {
  if (buildMode !== 'production') return false;

  const localHook = path.join(root, '.artifacts/deploy/prepare.mjs');
  const source =
    env.PRODUCTION_DEPLOY_HOOK?.trim() || (fs.existsSync(localHook) ? fs.readFileSync(localHook, 'utf8').trim() : '');
  if (!source) return false;

  const childEnv: NodeJS.ProcessEnv = { ...env, BUILD_MODE: buildMode, DEPLOY_ARTIFACT_DIR: artifactDir };
  delete childEnv.PRODUCTION_DEPLOY_HOOK;
  // Pass trusted maintainer code through stdin, never through a shell or public logs.
  // Capture output too: errors can contain source lines from a private hook.
  const result = spawnSync(process.execPath, ['--input-type=module'], {
    cwd: root,
    env: childEnv,
    input: source,
    encoding: 'utf8',
    timeout: 120_000,
  });
  if (result.error || result.status !== 0) {
    throw new Error('Private production deployment hook failed; verify it locally before uploading the artifact.');
  }
  return true;
}
