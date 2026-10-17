import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const homeHtml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'home.component.html'),
  'utf8'
);

describe('home modal host placement', () => {
  it('renders Help and Settings outside the virtual-scroll viewport', () => {
    const hostAt = homeHtml.indexOf('<app-home-modals-host');
    const scrollButtonAt = homeHtml.indexOf('<app-scroll-to-top-button');
    const viewportCloseAt = homeHtml.lastIndexOf('</div>', scrollButtonAt);

    expect(hostAt).toBeGreaterThan(-1);
    expect(scrollButtonAt).toBeGreaterThan(-1);
    expect(hostAt).toBeGreaterThan(viewportCloseAt);
  });
});
