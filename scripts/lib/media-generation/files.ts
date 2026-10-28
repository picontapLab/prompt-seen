import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const digest = (bytes: string | Uint8Array) => crypto.createHash('sha256').update(bytes).digest('hex');
export const hashFile = (file: string) => digest(fs.readFileSync(file));
export function within(root: string, relative: string): string {
  const file = path.resolve(root, relative);
  if (!file.startsWith(path.resolve(root) + path.sep)) throw new Error(`Path escapes workspace: ${relative}`);
  let current = file;
  while (current !== path.resolve(root)) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
      throw new Error(`Symlink in managed path: ${current}`);
    current = path.dirname(current);
  }
  return file;
}
export function paths(root: string, id = 'gpt-image-v1') {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('Invalid migration ID');
  return { root, id, dir: within(root, `migrations/${id}`), artifacts: within(root, `.artifacts/${id}`) };
}
export type MigrationPaths = ReturnType<typeof paths>;
export function atomicWrite(file: string, data: string | Uint8Array) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, data);
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}
export const writeJson = (file: string, data: unknown) => atomicWrite(file, `${JSON.stringify(data, null, 2)}\n`);
export const readJson = (file: string): unknown => JSON.parse(fs.readFileSync(file, 'utf8'));
export function filesUnder(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = within(root, entry.name);
      return entry.isDirectory() ? filesUnder(file) : [file];
    });
}
export async function locked<T>(p: MigrationPaths, action: () => Promise<T> | T): Promise<T> {
  fs.mkdirSync(p.artifacts, { recursive: true });
  const file = path.join(p.artifacts, 'lock.json');
  const token = crypto.randomUUID();
  try {
    fs.writeFileSync(file, JSON.stringify({ pid: process.pid, token }), { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const recovery = `${file}.recovery`;
    // Only one process may reclaim a stale lock. A competing normal acquisition still uses wx.
    fs.mkdirSync(recovery);
    try {
      if (fs.existsSync(file)) {
        const owner = JSON.parse(fs.readFileSync(file, 'utf8')) as { pid: number; token: string };
        if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0 || !owner.token)
          throw new Error('Invalid migration lock; inspect it before recovery');
        try {
          process.kill(owner.pid, 0);
          throw new Error(`Migration locked by PID ${owner.pid}`);
        } catch (probe) {
          if ((probe as NodeJS.ErrnoException).code !== 'ESRCH') throw probe;
        }
        fs.unlinkSync(file);
      }
      fs.writeFileSync(file, JSON.stringify({ pid: process.pid, token }), { flag: 'wx' });
    } finally {
      fs.rmdirSync(recovery);
    }
  }
  try {
    return await action();
  } finally {
    if (fs.existsSync(file) && (readJson(file) as { token: string }).token === token) fs.unlinkSync(file);
  }
}
