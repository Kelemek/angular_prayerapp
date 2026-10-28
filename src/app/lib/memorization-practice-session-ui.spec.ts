import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MEMORIZE_PRACTICE_HEADER_TOOLBAR_LOCK_CLASS } from './memorization-practice-session-ui';

describe('MEMORIZE_PRACTICE_HEADER_TOOLBAR_LOCK_CLASS', () => {
  it('is applied on the practice session header host', () => {
    const headerPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../components/memorization-practice-session/memorization-practice-session-header.component.ts'
    );
    const source = readFileSync(headerPath, 'utf8');
    expect(source).toContain('host: { class: MEMORIZE_PRACTICE_HEADER_TOOLBAR_LOCK_CLASS }');
    expect(MEMORIZE_PRACTICE_HEADER_TOOLBAR_LOCK_CLASS).toBe(
      'memorize-practice-header-toolbar-lock'
    );
  });
});
