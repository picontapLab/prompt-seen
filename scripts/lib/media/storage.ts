import fs from 'node:fs';
import path from 'node:path';

// Media storage drivers (design doc §10.1). The local driver keeps files under public/, so a
// fresh clone runs the full site without cloud credentials (§15.5.3); step 5 adds an S3
// compatible driver for production. Objects are never overwritten with different bytes: keys
// contain a content hash, and replacing an image creates new keys (§10.4).

export interface MediaStorage {
  readonly name: string;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  has(key: string): Promise<boolean>;
}

export function localStorage(root: string): MediaStorage {
  const fileOf = (key: string) => {
    const file = path.resolve(root, key);
    if (!file.startsWith(path.resolve(root) + path.sep)) throw new Error(`media key escapes the storage root: ${key}`);
    return file;
  };
  return {
    name: `local (${path.relative(process.cwd(), root) || '.'}/)`,
    async put(key, bytes) {
      const file = fileOf(key);
      if (fs.existsSync(file)) {
        if (Buffer.compare(fs.readFileSync(file), Buffer.from(bytes)) === 0) return;
        throw new Error(`${key} already exists with different content; keys are never reused (§10.4)`);
      }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, bytes);
    },
    async get(key) {
      return fs.readFileSync(fileOf(key));
    },
    async has(key) {
      return fs.existsSync(fileOf(key));
    },
  };
}
