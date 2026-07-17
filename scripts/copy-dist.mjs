import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const files = ['backloggd-plus.user.js', 'backloggd-plus.meta.js'];

for (const name of files) {
  const from = join(dist, name);
  if (!existsSync(from)) {
    console.error(`Missing build output: dist/${name}`);
    process.exit(1);
  }
  copyFileSync(from, join(root, name));
  console.log(`Copied dist/${name} → ${name}`);
}
