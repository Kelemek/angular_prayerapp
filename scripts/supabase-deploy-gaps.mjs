#!/usr/bin/env node
/**
 * Lists changes in a push that the Supabase GitHub Integration will not deploy on its own
 * (missing config.toml entries, deleted functions, new secrets, edited migrations, ...).
 *
 * Usage: node scripts/supabase-deploy-gaps.mjs [base] [head]
 * Defaults: base = merge-base of HEAD with its upstream (or origin/main), head = HEAD.
 * Always exits 0; it informs, it does not block.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ZERO_SHA = /^0+$/;

/** Secrets the Edge runtime provides on every project. */
const PLATFORM_ENV = new Set([
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
  'SUPABASE_PUBLISHABLE_KEYS',
  'SUPABASE_SECRET_KEYS',
  'SB_REGION',
  'SB_EXECUTION_ID',
  'DENO_DEPLOYMENT_ID',
]);

export function configFunctionNames(configToml) {
  return new Set([...configToml.matchAll(/^\[functions\.([^\]\s]+)\]/gm)].map((m) => m[1]));
}

export function configWithoutFunctionBlocks(configToml) {
  return configToml
    .split(/^(?=\[)/m)
    .filter((block) => !/^\[functions\./.test(block))
    .join('')
    .replace(/^\s*#.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function functionDirs(paths) {
  const dirs = new Set();
  for (const p of paths) {
    const m = /^supabase\/functions\/([^/]+)\/index\.ts$/.exec(p);
    if (m && m[1] !== 'shared' && !m[1].startsWith('_')) dirs.add(m[1]);
  }
  return dirs;
}

export function envNames(source) {
  return new Set([...source.matchAll(/Deno\.env\.get\(\s*['"]([A-Z0-9_]+)['"]/g)].map((m) => m[1]));
}

function migrationVersion(path) {
  const m = /^supabase\/migrations\/(\d+)_/.exec(path);
  return m ? m[1] : null;
}

/** `git diff --name-status -M` output -> [{ status, path, oldPath? }] */
export function parseNameStatus(text) {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, a, b] = line.split('\t');
      const code = status[0];
      return code === 'R' || code === 'C' ? { status: code, oldPath: a, path: b } : { status: code, path: a };
    });
}

/**
 * @param {{
 *   changes: { status: string, path: string, oldPath?: string }[],
 *   baseFiles: string[], headFiles: string[],
 *   baseConfig: string, headConfig: string,
 *   baseEnvSource: string, headEnvSource: string,
 * }} input
 * @returns {{ kind: string, message: string }[]}
 */
export function findDeployGaps(input) {
  const gaps = [];
  const baseFns = functionDirs(input.baseFiles);
  const headFns = functionDirs(input.headFiles);
  const declared = configFunctionNames(input.headConfig);

  for (const fn of [...headFns].filter((f) => !declared.has(f)).sort()) {
    gaps.push({
      kind: 'function-not-in-config',
      message: `supabase/functions/${fn} has no [functions.${fn}] block in supabase/config.toml, so the Integration will not deploy it. Add the block with the right verify_jwt.`,
    });
  }
  for (const fn of [...declared].filter((f) => !headFns.has(f)).sort()) {
    gaps.push({
      kind: 'config-without-function',
      message: `supabase/config.toml declares [functions.${fn}] but supabase/functions/${fn}/index.ts does not exist. Remove the block or the deploy may fail.`,
    });
  }
  for (const fn of [...baseFns].filter((f) => !headFns.has(f)).sort()) {
    gaps.push({
      kind: 'function-deleted',
      message: `Edge Function ${fn} was removed from the repo. The Integration does not delete deployed functions: run \`supabase functions delete ${fn} --project-ref <ref>\` on TEST and production.`,
    });
  }

  const baseEnv = envNames(input.baseEnvSource);
  for (const name of [...envNames(input.headEnvSource)].filter((n) => !baseEnv.has(n) && !PLATFORM_ENV.has(n)).sort()) {
    gaps.push({
      kind: 'new-secret',
      message: `Edge Functions now read Deno.env ${name}. Secrets are not in git: run \`supabase secrets set ${name}=... --project-ref <ref>\` on TEST and production.`,
    });
  }

  const baseMigrations = input.baseFiles.map(migrationVersion).filter(Boolean).sort();
  const latestBase = baseMigrations.at(-1);
  for (const change of input.changes) {
    const touched = [change.path, change.oldPath].filter(Boolean);
    if (!touched.some((p) => p.startsWith('supabase/migrations/'))) continue;
    if (change.status === 'A') {
      const version = migrationVersion(change.path);
      if (version && latestBase && version <= latestBase) {
        gaps.push({
          kind: 'migration-out-of-order',
          message: `${change.path} is not newer than the latest existing migration (${latestBase}). Remote history may reject or skip it; give it a newer timestamp.`,
        });
      }
    } else {
      gaps.push({
        kind: 'migration-edited',
        message: `${change.oldPath ?? change.path} already existed and was ${{ M: 'edited', D: 'deleted', R: 'renamed' }[change.status] ?? 'changed'}. Applied migrations are never re-run, so the change will not reach TEST or production; put it in a new migration (or repair history deliberately).`,
      });
    }
  }

  if (configWithoutFunctionBlocks(input.baseConfig) !== configWithoutFunctionBlocks(input.headConfig)) {
    gaps.push({
      kind: 'config-settings-changed',
      message: 'supabase/config.toml changed outside [functions.*] (auth, api, storage, ...). Confirm the setting in the TEST and production dashboards; do not assume the Integration applied it.',
    });
  }

  return gaps;
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return fallback;
  }
}

function resolveBase(head, requested) {
  if (requested && !ZERO_SHA.test(requested) && git(['cat-file', '-t', requested]).trim() === 'commit') {
    return requested;
  }
  for (const ref of ['@{u}', 'origin/main']) {
    const base = git(['merge-base', head, ref]).trim();
    if (base) return base;
  }
  return null;
}

function snapshot(rev) {
  return {
    files: git(['ls-tree', '-r', '--name-only', rev, '--', 'supabase']).split('\n').filter(Boolean),
    config: git(['show', `${rev}:supabase/config.toml`]),
    envSource: git(['grep', '-h', '-E', 'Deno\\.env\\.get', rev, '--', 'supabase/functions']),
  };
}

function main() {
  const head = process.argv[3] || 'HEAD';
  const base = resolveBase(head, process.argv[2]);
  if (!base) {
    console.log('supabase-deploy-gaps: no base commit to compare against; skipped.');
    return;
  }
  const before = snapshot(base);
  const after = snapshot(head);
  const gaps = findDeployGaps({
    changes: parseNameStatus(git(['diff', '--name-status', '-M', base, head, '--', 'supabase'])),
    baseFiles: before.files,
    headFiles: after.files,
    baseConfig: before.config,
    headConfig: after.config,
    baseEnvSource: before.envSource,
    headEnvSource: after.envSource,
  });
  if (gaps.length === 0) {
    console.log('supabase-deploy-gaps: nothing outside what the Supabase GitHub Integration deploys.');
    return;
  }
  console.log(`\n⚠️  Supabase GitHub Integration will NOT handle ${gaps.length} item(s) in this push:`);
  for (const gap of gaps) console.log(`  • [${gap.kind}] ${gap.message}`);
  console.log('');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
