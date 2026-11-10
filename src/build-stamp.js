import { execFileSync } from 'node:child_process';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/**
 * Which commit the server runs, for /health: `{ commit, dirty, buildId }`. SELFHEAL_COMMIT and SELFHEAL_DIRTY name it
 * where there is no git checkout (Akeso's validation builds from an archive); elsewhere git answers. Null when
 * neither can.
 */
export function buildStamp(cwd, env = process.env) {
  try {
    const commit = env.SELFHEAL_COMMIT?.trim() || git(cwd, 'rev-parse', 'HEAD');
    const dirty = env.SELFHEAL_DIRTY !== undefined ? env.SELFHEAL_DIRTY === 'true' : git(cwd, 'status', '--porcelain').length > 0;
    return { commit, dirty, buildId: env.BUILD_ID?.trim() || commit.slice(0, 12) };
  } catch {
    return null;
  }
}
