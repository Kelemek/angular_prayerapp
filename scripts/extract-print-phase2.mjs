/**
 * One-shot extractor for print.service phase 2 HTML generators.
 * Run: node scripts/extract-print-phase2.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const servicePath = join(root, 'src/app/services/print.service.ts');
const lines = readFileSync(servicePath, 'utf8').split('\n');

/** 1-based inclusive line ranges to extract (method bodies de-indented). */
const EXTRACT = [
  {
    file: 'src/app/lib/print-render-markdown.ts',
    start: 2748,
    end: 2750,
    header: `import { markdownToSafeHtml } from '../../utils/markdown';

/** Render markdown to sanitized HTML for printable pages. */
export function renderPrintMarkdown(text: string | null | undefined): string {
`,
    footer: '}\n',
    stripMethodSignature: true,
    signatureStart: 2744,
    signatureEnd: 2747,
    replacements: [
      [/private renderMarkdown/g, 'export function renderPrintMarkdown'],
      [/return markdownToSafeHtml\(text \|\| ''\);/, 'return markdownToSafeHtml(text || \'\');'],
    ],
  },
];

function sliceBody(start, end) {
  const chunk = lines.slice(start - 1, end);
  return chunk
    .map((line) => (line.startsWith('    ') ? line.slice(4) : line.startsWith('  ') ? line.slice(2) : line))
    .join('\n');
}

// Manual file creation — script validates line markers only
const markers = {
  buildBookletPromptBatchHtml: lines[312]?.includes('buildBookletPromptBatchHtml'),
  generatePrintableHTML: lines[495]?.includes('generatePrintableHTML'),
  generateSaddleStitchBookletHTML: lines[939]?.includes('generateSaddleStitchBookletHTML'),
  generatePrayerHTML: lines[1826]?.includes('generatePrayerHTML'),
  generatePersonalPrayersPrintableHTML: lines[2152]?.includes('generatePersonalPrayersPrintableHTML'),
  generatePromptsPrintableHTML: lines[2565]?.includes('generatePromptsPrintableHTML'),
};

const failed = Object.entries(markers).filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Line markers shifted — update script:', failed.map(([k]) => k));
  process.exit(1);
}
console.log('Line markers OK for phase-2 extraction');
