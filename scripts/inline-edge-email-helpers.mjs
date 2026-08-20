#!/usr/bin/env node
/**
 * Inlines Edge reminder email markdown helpers into each function's index.ts
 * (Supabase deploy does not bundle ../_shared imports reliably).
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function stripModuleHeader(source) {
  return source.replace(/^\/\*\*[\s\S]*?\*\/\s*/m, '').trim();
}

function denoifyMarkdownCore() {
  const src = fs.readFileSync(path.join(root, 'src/lib/markdown-core.ts'), 'utf8');
  return stripModuleHeader(src)
    .replace(/^export function /gm, 'function ')
    .replace(/^export /gm, '');
}

function denoifyEdgeHelpers() {
  const src = fs.readFileSync(path.join(root, 'src/lib/edge-email-markdown.ts'), 'utf8');
  const withoutImports = src
    .replace(/^import[\s\S]*?from 'marked';\n/m, '')
    .replace(/^import[\s\S]*?from '\.\/markdown-core';\n/m, '');
  return stripModuleHeader(withoutImports)
    .replace(/^export function /gm, 'function ')
    .replace(/^export interface /gm, 'interface ')
    .replace(/^export /gm, '');
}

function buildInlineBlock(includeSpotlight) {
  let helpers = denoifyEdgeHelpers();
  if (!includeSpotlight) {
    helpers = helpers.replace(/\ninterface SpotlightEmailCandidate[\s\S]*$/m, '');
  }
  return [
    '// ----- TipTap markdown → safe HTML (inline; keep aligned with src/lib/edge-email-markdown.ts) -----',
    denoifyMarkdownCore(),
    '',
    helpers,
    '// ----- END inline edge-email-markdown -----',
    '',
  ].join('\n');
}

function stripExistingInlineBlock(content, jobMarker) {
  let rest = content
    .replace(/^import \{ Marked \} from 'https:\/\/esm\.sh\/marked@15\.0\.12';\n\n/gm, '')
    .replace(
      /\/\/ ----- TipTap markdown → safe HTML \(inline; keep aligned with src\/lib\/edge-email-markdown\.ts\) -----\n[\s\S]*?\/\/ ----- END inline edge-email-markdown -----\n\n/gm,
      ''
    );

  const jobIdx = rest.indexOf(jobMarker);
  if (jobIdx === -1) {
    throw new Error(`Could not find job marker in index.ts: ${jobMarker.slice(0, 40)}…`);
  }

  return rest.slice(jobIdx);
}

function injectIntoIndex(functionDir, includeSpotlight) {
  const jobMarkers = {
    'send-user-hourly-prayer-reminders': '/**\n * Hourly job: send self prayer reminders.',
    'send-user-prayer-item-reminders':
      '/**\n * Every-15-minutes job: send per-prayer item reminders',
  };
  const jobMarker = jobMarkers[functionDir];
  if (!jobMarker) {
    throw new Error(`No job marker configured for ${functionDir}`);
  }

  const indexPath = path.join(root, 'supabase/functions', functionDir, 'index.ts');
  let index = fs.readFileSync(indexPath, 'utf8');

  index = index.replace(/import \{[^}]+\} from '\.\.\/_shared\/[^']+';\n/g, '');

  const createClientMatch = index.match(/^import \{ createClient[^;]+;/m);
  if (!createClientMatch) {
    throw new Error(`Could not find createClient import in ${functionDir}/index.ts`);
  }
  const createClientImport = createClientMatch[0];

  let rest = index.replace(/^import \{ createClient[^;]+;\n/m, '');
  rest = stripExistingInlineBlock(rest, jobMarker);
  const inlineBlock = buildInlineBlock(includeSpotlight);

  const output = `${createClientImport}\nimport { Marked } from 'https://esm.sh/marked@15.0.12';\n\n${inlineBlock}${rest}`;
  fs.writeFileSync(indexPath, output);
  console.log(`Updated ${functionDir}/index.ts`);
}

injectIntoIndex('send-user-prayer-item-reminders', false);
injectIntoIndex('send-user-hourly-prayer-reminders', true);

const sharedDir = path.join(root, 'supabase/functions/_shared');
if (fs.existsSync(sharedDir)) {
  for (const file of fs.readdirSync(sharedDir)) {
    fs.unlinkSync(path.join(sharedDir, file));
  }
  fs.rmdirSync(sharedDir);
  console.log('Removed supabase/functions/_shared');
}
