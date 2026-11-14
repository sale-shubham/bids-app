// Writes public/version.json at build/dev start. The PWA update prompt polls
// this file; when `version` differs from the copy the running client loaded at
// startup, it shows the "update available" prompt. buildId changes every build
// so each deploy is detectable even if the semver `version` is unchanged.
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const buildId = Math.random().toString(36).slice(2, 14);
const payload = {
  version: pkg.version,
  buildId,
  buildTime: new Date().toISOString(),
};

writeFileSync(join(root, 'public', 'version.json'), JSON.stringify(payload, null, 2) + '\n');
console.log(`version.json written: ${pkg.version} (${buildId})`);
