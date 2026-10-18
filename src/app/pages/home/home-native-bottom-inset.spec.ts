import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const homeHtml = readFileSync(join(here, 'home.component.html'), 'utf8');
const styles = readFileSync(join(here, '../../../styles.css'), 'utf8');

function ruleBody(source: string, selector: string): string {
  const start = source.indexOf(selector);
  expect(start, selector).toBeGreaterThan(-1);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  return source.slice(open + 1, close);
}

describe('native home bottom inset', () => {
  it('does not paint a bottom safe bar', () => {
    expect(homeHtml).not.toContain('bottom-safe-bar');
    expect(homeHtml).not.toContain('<footer');
    expect(styles).not.toContain('bottom-safe-bar');
    expect(styles).not.toContain('--native-bottom-safe-min');
  });

  it('pads the native scroller by the real bottom inset and leaves the header inset', () => {
    const viewport = ruleBody(styles, '.native-app .safe-area-viewport {');
    expect(viewport).toContain('padding-bottom: env(safe-area-inset-bottom, 0px)');
    expect(viewport).not.toContain('34px');

    const header = ruleBody(
      styles,
      '.native-app .home-sticky-header-shell > app-home-header header {'
    );
    expect(header).toContain('padding-top: env(safe-area-inset-top)');
  });

  it('keeps web content at the bottom edge and lifts scroll-to-top by the real inset', () => {
    const webBody = ruleBody(styles, 'html:not(.native-app) body {');
    expect(webBody).toContain('padding-bottom: 0');

    expect(styles).toContain(
      'bottom: max(1rem, env(safe-area-inset-bottom, 0px))'
    );
    expect(styles).not.toContain('.native-app .app-scroll-to-top-button');
  });
});
