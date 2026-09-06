import { buildConfiguration } from './build-config.mjs';
// Validate before creating build output. Artifacts are written only into dist.
buildConfiguration();
process.stdout.write('Public build configuration validated.\n');
