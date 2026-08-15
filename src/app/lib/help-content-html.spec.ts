import { describe, expect, it } from 'vitest';
import { formatHelpContentHtml } from './help-content-html';

describe('formatHelpContentHtml', () => {
  it('converts markdown bold to strong after escaping HTML', () => {
    expect(
      formatHelpContentHtml('Tap **Public** for community prayers.')
    ).toBe('Tap <strong>Public</strong> for community prayers.');
  });

  it('escapes raw HTML in help copy', () => {
    expect(formatHelpContentHtml('<script>alert(1)</script> **Safe**')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt; <strong>Safe</strong>'
    );
  });
});
