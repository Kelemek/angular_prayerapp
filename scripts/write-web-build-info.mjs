import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../src/lib/web-build-info.ts');

function shortSha(fullSha) {
  if (!fullSha || typeof fullSha !== 'string') {
    return null;
  }
  const trimmed = fullSha.trim();
  return trimmed.length >= 7 ? trimmed.slice(0, 7) : trimmed;
}

function resolveRevision() {
  const fromVercel = shortSha(process.env.VERCEL_GIT_COMMIT_SHA);
  if (fromVercel) {
    return fromVercel;
  }

  const fromGithub = shortSha(process.env.GITHUB_SHA);
  if (fromGithub) {
    return fromGithub;
  }

  try {
    const gitSha = execSync('git rev-parse --short=7 HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (gitSha) {
      return gitSha;
    }
  } catch {
    // not a git repo or git unavailable
  }

  return 'local';
}

const revision = resolveRevision();

const contents = `import { APP_BUNDLE_VERSION } from './app-analytics-context';

/** Git short SHA (or \`local\`) baked in at build/serve time — see \`scripts/write-web-build-info.mjs\`. */
export const WEB_BUILD_REVISION = '${revision}';

export function formatWebBuildLabel(
  bundleVersion: string,
  revision: string
): string {
  return \`\${bundleVersion}.\${revision}\`;
}

export function getWebBuildLabel(): string {
  return formatWebBuildLabel(APP_BUNDLE_VERSION, WEB_BUILD_REVISION);
}
`;

writeFileSync(outPath, contents, 'utf8');
console.log(`[write-web-build-info] WEB_BUILD_REVISION=${revision}`);
