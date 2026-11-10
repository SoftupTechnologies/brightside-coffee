// `npm run demo:reset -- --yes`: DESTRUCTIVE, for the demo repository only. Puts the buggy code back by force-pushing
// the commit tagged `demo-start` to origin's main, so every fix merged since is gone. Without --yes it only says what
// it would do. The GitHub Actions workflow "Reset the demo" (.github/workflows/reset-demo.yml) does the same from
// the browser.
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = 'demo-start';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Only where the shop is the whole repository: inside another repository (such as the one it was written in) a reset
// would rewind that repository's main.
const APP_DIR = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
let top;
try {
  top = realpathSync(git('rev-parse', '--show-toplevel'));
} catch {
  fail('This is not a git checkout.');
}
if (top !== APP_DIR) fail(`The shop is not the root of this repository (${top}); demo:reset only runs in the demo repository.`);

let remote;
try {
  remote = git('remote', 'get-url', 'origin');
} catch {
  fail('This checkout has no origin remote.');
}

try {
  git('fetch', '--quiet', '--force', '--tags', 'origin');
} catch (error) {
  fail(`Could not fetch from ${remote}: ${error.stderr || error.message}`);
}

let target;
try {
  target = git('rev-parse', `${TAG}^{commit}`);
} catch {
  fail(`There is no tag ${TAG}. Tag the buggy commit once: git tag ${TAG} <commit> && git push origin ${TAG}`);
}

const current = (() => {
  try { return git('rev-parse', 'origin/main'); } catch { return null; }
})();

if (current === target) {
  console.log(`origin/main is already at ${TAG} (${target.slice(0, 7)}). Nothing to do.`);
  process.exit(0);
}

console.log(`This force-pushes ${TAG} (${target.slice(0, 7)}) to main on ${remote}.`);
if (current) console.log(`main is now at ${current.slice(0, 7)}; every commit after ${TAG} leaves main for good.`);
if (!process.argv.includes('--yes')) {
  console.log('Nothing was changed. Run npm run demo:reset -- --yes to do it.');
  process.exit(1);
}

const lease = current ? [`--force-with-lease=refs/heads/main:${current}`] : ['--force'];
try {
  git('push', ...lease, 'origin', `${target}:refs/heads/main`);
} catch (error) {
  fail(`The push was refused: ${error.stderr || error.message}`);
}
console.log(`main on ${remote} is back at ${TAG}.`);

let branch = '';
try { branch = git('rev-parse', '--abbrev-ref', 'HEAD'); } catch { /* detached or no commits */ }
const clean = git('status', '--porcelain') === '';
if (branch === 'main' && clean) {
  git('reset', '--hard', target);
  console.log('Your local main is reset too.');
} else {
  console.log(`Your local checkout is unchanged; to follow: git checkout main && git reset --hard ${TAG}`);
}
