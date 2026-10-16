// npm run gen: writes src/config/generated/config.ts (see src/config/generate.ts).
import { writeGeneratedConfig } from '../src/config/generate';
import { ConfigError } from '../src/config/load';
import { ROOT } from './lib/paths';

try {
  const config = writeGeneratedConfig(ROOT);
  console.log(
    `config: ${config.buildMode} build ${config.buildId}, basePath "${config.basePath}", locales ${config.builtLocales.map((l) => l.code).join(', ')}`,
  );
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`Invalid configuration in ${error.message}`);
    process.exit(1);
  }
  throw error;
}
