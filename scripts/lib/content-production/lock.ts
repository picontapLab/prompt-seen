import fs from 'node:fs';
import path from 'node:path';

/** Shared with content:new so concurrent writers cannot allocate the same ID. */
export function acquireContentLock(root: string) {
  const dir = path.join(root, '.artifacts/content-production');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, '.content.lock');
  const descriptor = fs.openSync(file, 'wx');
  fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    fs.closeSync(descriptor);
    fs.unlinkSync(file);
  };
}
