import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { within } from '../media-generation/files';
import type { Unit } from './dependencies';
import { fingerprint } from './fingerprint';

export function verifiedRemoval(
  root: string,
  removal: { key: string; reason: string; evidence?: { file: string; key: string; fingerprint: string } },
  units: Unit[],
): boolean {
  const evidence = removal.evidence;
  if (!evidence || evidence.key !== removal.key || !removal.reason.trim()) return false;
  try {
    const file = within(root, evidence.file);
    if (!fs.existsSync(file)) return false;
    const text = fs.readFileSync(file, 'utf8');
    if (fingerprint(text) !== evidence.fingerprint) return false;
    const unit = units.find((unit) => unit.key === removal.key);
    if (unit)
      return (
        unit.locales.size > 0 &&
        [...unit.locales.values()].every((locale) => locale.fm.status === 'archived') &&
        [...unit.locales.values()].some((locale) => path.resolve(locale.file) === file)
      );
    if (!evidence.file.startsWith('production/localization/') || !/\.(json|yaml)$/.test(file)) return false;
    const manifest = YAML.parse(text);
    return (
      manifest?.schemaVersion === 1 &&
      Array.isArray(manifest.removals) &&
      manifest.removals.some(
        (entry: { key?: string; reason?: string }) => entry.key === removal.key && entry.reason === removal.reason,
      )
    );
  } catch {
    return false;
  }
}
