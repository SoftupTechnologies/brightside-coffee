// `npm run build`: the shop has no build step, so this checks that every source file parses (node --check) and that
// the JSON files read.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function filesIn(dir) {
  if (!existsSync(path.join(ROOT, dir))) return [];
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    return entry.isDirectory() ? filesIn(rel) : [rel];
  });
}

const sources = ['src', 'scripts', 'public', 'test'].flatMap(filesIn).filter((file) => file.endsWith('.js'));
let failed = 0;
for (const file of sources) {
  const result = spawnSync(process.execPath, ['--check', path.join(ROOT, file)], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed++;
    process.stderr.write(`${file}\n${result.stderr}\n`);
  }
}
for (const file of ['package.json', 'selfheal.config.json']) {
  try {
    JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));
  } catch (error) {
    failed++;
    process.stderr.write(`${file}: ${error.message}\n`);
  }
}

if (failed > 0) {
  process.stderr.write(`${failed} file(s) failed the check.\n`);
  process.exit(1);
}
console.log(`Checked ${sources.length} source files and 2 JSON files.`);
