import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const componentDir = dirname(fileURLToPath(import.meta.url));

describe('AdminEmailTemplatesEditorComponent', () => {
  it('HTML preview allows inline link colors (no forced text-inherit on descendants)', () => {
    const html = readFileSync(
      join(componentDir, 'admin-email-templates-editor.component.html'),
      'utf-8',
    );
    expect(html).toContain('HTML Preview:');
    expect(html).toContain('color-scheme: light');
    expect(html).not.toContain('[&_*]:!text-inherit');
  });
});