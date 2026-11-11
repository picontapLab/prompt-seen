import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runProductionDeployHook } from './deploy-hook';

const roots: string[] = [];
const env = { ...process.env, PRODUCTION_DEPLOY_HOOK: undefined };
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(source?: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-hook-'));
  roots.push(root);
  const artifactDir = path.join(root, '.deploy/cloudflare');
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, 'index.html'), '<html><head></head><body>Site</body></html>');
  if (source !== undefined) {
    fs.mkdirSync(path.join(root, '.artifacts/deploy'), { recursive: true });
    fs.writeFileSync(path.join(root, '.artifacts/deploy/prepare.mjs'), source);
  }
  return { root, artifactDir };
}

const customize = `
import fs from 'node:fs';
import path from 'node:path';
const file = path.join(process.env.DEPLOY_ARTIFACT_DIR, 'index.html');
fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('</head>', '<meta name="private-customization"/></head>'));
fs.writeFileSync(path.join(process.env.DEPLOY_ARTIFACT_DIR, 'context.json'), JSON.stringify({
  cwd: process.cwd(), mode: process.env.BUILD_MODE, sourceInEnv: 'PRODUCTION_DEPLOY_HOOK' in process.env
}));
`;

describe('private production deployment step', () => {
  it('keeps an unconfigured clone working without changing its artifact', () => {
    const paths = fixture();
    expect(runProductionDeployHook({ ...paths, buildMode: 'production', env })).toBe(false);
    expect(fs.readdirSync(paths.artifactDir)).toEqual(['index.html']);
  });

  it('never runs local or environment code for a preview', () => {
    const paths = fixture('throw new Error("local hook must not run")');
    expect(
      runProductionDeployHook({
        ...paths,
        buildMode: 'preview',
        env: { ...env, PRODUCTION_DEPLOY_HOOK: 'throw new Error("secret hook must not run")' },
      }),
    ).toBe(false);
    expect(fs.readdirSync(paths.artifactDir)).toEqual(['index.html']);
  });

  it('runs the local module with the production artifact path and repository cwd', () => {
    const paths = fixture(customize);
    expect(runProductionDeployHook({ ...paths, buildMode: 'production', env })).toBe(true);
    expect(fs.readFileSync(path.join(paths.artifactDir, 'index.html'), 'utf8')).toContain('private-customization');
    expect(JSON.parse(fs.readFileSync(path.join(paths.artifactDir, 'context.json'), 'utf8'))).toEqual({
      cwd: fs.realpathSync(paths.root),
      mode: 'production',
      sourceInEnv: false,
    });
  });

  it('uses the production secret instead of the local file', () => {
    const paths = fixture('throw new Error("local hook must not run")');
    expect(
      runProductionDeployHook({
        ...paths,
        buildMode: 'production',
        env: { ...env, PRODUCTION_DEPLOY_HOOK: customize },
      }),
    ).toBe(true);
    expect(fs.readFileSync(path.join(paths.artifactDir, 'index.html'), 'utf8')).toContain('private-customization');
  });

  it('falls back to the local module when Actions passes an empty secret', () => {
    const paths = fixture(customize);
    expect(
      runProductionDeployHook({ ...paths, buildMode: 'production', env: { ...env, PRODUCTION_DEPLOY_HOOK: '' } }),
    ).toBe(true);
  });

  it('stops preparation on failure without including private code or output in the error', () => {
    const paths = fixture();
    expect(() =>
      runProductionDeployHook({
        ...paths,
        buildMode: 'production',
        env: { ...env, PRODUCTION_DEPLOY_HOOK: 'console.error("private-value"); throw new Error("private-value")' },
      }),
    ).toThrow('Private production deployment hook failed; verify it locally before uploading the artifact.');
  });
});
