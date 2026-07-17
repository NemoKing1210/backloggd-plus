/**
 * Verify production userscript artifacts after `npm run build`.
 *
 * Always:
 * 1. `dist/` outputs exist and match the root copies (copy-dist sanity).
 *
 * When `CI=true` (GitHub Actions) or `--git` is passed:
 * 2. Rebuilding must not change tracked root artifacts vs HEAD
 *    (forces contributors to commit fresh `npm run build` output).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ARTIFACT_FILES } from './lib/artifacts.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const checkGit =
  process.env.CI === 'true' || process.argv.includes('--git');

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function fail(message) {
  console.error(`verify-artifacts: ${message}`);
  process.exit(1);
}

function runGit(args) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
}

for (const name of ARTIFACT_FILES) {
  const distPath = join(distDir, name);
  const rootPath = join(root, name);

  if (!existsSync(distPath)) {
    fail(`missing dist/${name} — run \`npm run build\` first`);
  }
  if (!existsSync(rootPath)) {
    fail(`missing ${name} — run \`npm run build\` first`);
  }

  const distHash = sha256(distPath);
  const rootHash = sha256(rootPath);
  if (distHash !== rootHash) {
    fail(
      `${name} differs from dist/${name} (copy-dist did not sync). Re-run \`npm run build\`.`,
    );
  }
  console.log(`ok  dist ↔ root  ${name}  (${distHash.slice(0, 12)}…)`);
}

if (!checkGit) {
  console.log('ok  skipped git freshness check (set CI=true or pass --git)');
  process.exit(0);
}

const gitCheck = runGit(['rev-parse', '--is-inside-work-tree']);
if (gitCheck.status !== 0) {
  fail('CI git freshness check requested, but this is not a git work tree');
}

const diff = runGit([
  'diff',
  '--exit-code',
  '--stat',
  '--',
  ...ARTIFACT_FILES,
]);
if (diff.status !== 0) {
  if (diff.stdout) process.stdout.write(diff.stdout);
  if (diff.stderr) process.stderr.write(diff.stderr);
  fail(
    [
      'committed root artifacts are stale after rebuild.',
      'Run `npm run build`, then commit the updated:',
      ...ARTIFACT_FILES.map((f) => `  - ${f}`),
    ].join('\n'),
  );
}

const missingTracked = [];
for (const name of ARTIFACT_FILES) {
  const tracked = runGit(['ls-files', '--error-unmatch', '--', name]);
  if (tracked.status !== 0) missingTracked.push(name);
}
if (missingTracked.length) {
  fail(
    `artifact file(s) are not tracked by git. Add and commit:\n${missingTracked
      .map((f) => `  - ${f}`)
      .join('\n')}`,
  );
}

console.log('ok  git working tree matches HEAD for install artifacts');
