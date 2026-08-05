import { describe, expect, it, afterEach, vi } from 'vitest';
import { htmlToPlainText, markdownToPlainText, markdownToSafeHtml, sanitizeEmailHtml } from './markdown';

describe('markdownToPlainText', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(markdownToPlainText(null)).toBe('');
    expect(markdownToPlainText(undefined)).toBe('');
    expect(markdownToPlainText('')).toBe('');
  });

  it('strips bold, italic, strikethrough, and TipTap ++underline++ markers', () => {
    expect(markdownToPlainText('**bold** and *italic* and ~~strike~~')).toBe(
      'bold and italic and strike'
    );
    expect(markdownToPlainText('++under++')).toBe('under');
  });

  it('strips list markers and headings', () => {
    const input = `# Heading\n\n- item one\n- item two\n\n1. first\n2. second`;
    const output = markdownToPlainText(input);
    expect(output).toContain('Heading');
    expect(output).toContain('item one');
    expect(output).toContain('first');
    expect(output).not.toContain('#');
    expect(output).not.toContain('- ');
    expect(output).not.toMatch(/^\d+\.\s/m);
  });

  it('strips link syntax but keeps visible text', () => {
    expect(markdownToPlainText('Visit [Google](https://google.com) now.')).toBe(
      'Visit Google now.'
    );
  });

  it('strips inline code and code fences', () => {
    const input = 'Run `npm install` or\n```\nnpm ci\n```';
    const output = markdownToPlainText(input);
    expect(output).toContain('npm install');
    expect(output).toContain('npm ci');
    expect(output).not.toContain('`');
  });

  it('strips blockquote markers', () => {
    expect(markdownToPlainText('> quoted line')).toBe('quoted line');
  });
});

describe('markdownToSafeHtml', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(markdownToSafeHtml(null)).toBe('');
    expect(markdownToSafeHtml(undefined)).toBe('');
    expect(markdownToSafeHtml('')).toBe('');
  });

  it('converts basic markdown to HTML', () => {
    const html = markdownToSafeHtml('**bold** *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('converts GFM strikethrough to <s>', () => {
    const html = markdownToSafeHtml('~~struck~~');
    expect(html).toContain('<s>');
    expect(html).toContain('struck');
  });

  it('renders TipTap ++underline++ as underline', () => {
    const html = markdownToSafeHtml('++underscored++');
    expect(html).toContain('<u');
    expect(html).toContain('underscored');
    expect(html).toContain('text-decoration: underline');
  });

  it('renders lists', () => {
    const html = markdownToSafeHtml('- one\n- two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
  });

  it('strips disallowed tags like script', () => {
    const html = markdownToSafeHtml('<script>alert(1)</script>Hello');
    expect(html).not.toContain('<script');
    expect(html).toContain('Hello');
  });

  it('rewrites links to open in a new tab with safe rel', () => {
    const html = markdownToSafeHtml('[link](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('strips javascript: hrefs', () => {
    const html = markdownToSafeHtml('[bad](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('strips blockquote styling so email clients render the left border', () => {
    const html = markdownToSafeHtml('> quoted line');
    expect(html).toContain('<blockquote');
    expect(html).toContain('border-left');
    expect(html).toContain('rgba(57, 112, 77, 0.5)');
  });

  it('strips unsafe data: and vbscript: hrefs', () => {
    const dataHtml = markdownToSafeHtml('[img](data:image/png;base64,abc)');
    expect(dataHtml).not.toContain('data:image');

    const vbHtml = markdownToSafeHtml('[run](vbscript:msgbox(1))');
    expect(vbHtml).not.toContain('vbscript:');
  });

  it('preserves ++underline++ markers inside fenced code blocks', () => {
    const html = markdownToSafeHtml('```\n++literal++\n```');
    expect(html).toContain('++literal++');
    expect(html).not.toMatch(/<u[^>]*>literal<\/u>/);
  });

  it('strips disallowed wrapper tags via allowlist fallback', () => {
    const html = markdownToSafeHtml('<span onclick="x()">Hello</span>');
    expect(html).not.toContain('<span');
    expect(html).toContain('Hello');
  });

  it('strips disallowed attributes but keeps safe link attrs', () => {
    const html = markdownToSafeHtml(
      '<a href="https://example.com" class="evil" id="x">safe</a>'
    );
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain('class=');
    expect(html).not.toContain('id=');
  });

  it('unwraps nested disallowed elements while keeping allowed children', () => {
    const html = markdownToSafeHtml('<div><p><strong>keep</strong></p></div>');
    expect(html).toContain('<strong>keep</strong>');
    expect(html).not.toContain('<div');
  });

  it('renders https and root-relative images for email broadcasts', () => {
    const httpsHtml = markdownToSafeHtml(
      '![Find Memorize](https://cpprayer.cp-church.org/marketing/memorize/01-find-memorize.png)'
    );
    expect(httpsHtml).toContain('<img');
    expect(httpsHtml).toContain(
      'src="https://cpprayer.cp-church.org/marketing/memorize/01-find-memorize.png"'
    );
    expect(httpsHtml).toContain('alt="Find Memorize"');
    expect(httpsHtml).toContain('max-width:100%');

    const relativeHtml = markdownToSafeHtml('![Action bar](/marketing/memorize/02-action-bar.png)');
    expect(relativeHtml).toContain('src="/marketing/memorize/02-action-bar.png"');
    expect(relativeHtml).toContain('alt="Action bar"');
  });

  it('strips unsafe image sources', () => {
    const dataImg = markdownToSafeHtml('![x](data:image/png;base64,abc)');
    expect(dataImg).not.toContain('<img');
    expect(dataImg).not.toContain('data:image');

    const httpImg = markdownToSafeHtml('![x](http://evil.example/a.png)');
    expect(httpImg).not.toContain('http://evil.example');

    const protoRelative = markdownToSafeHtml('![x](//evil.example/a.png)');
    expect(protoRelative).not.toContain('//evil.example');
  });
});

describe('sanitizeEmailHtml', () => {
  it('returns empty for nullish input', () => {
    expect(sanitizeEmailHtml(null)).toBe('');
    expect(sanitizeEmailHtml(undefined)).toBe('');
    expect(sanitizeEmailHtml('')).toBe('');
  });

  it('keeps safe marketing HTML and strips scripts', () => {
    const html = sanitizeEmailHtml(
      '<p>Friends</p><script>alert(1)</script><img src="https://cpprayer.cp-church.org/marketing/memorize/01-find-memorize.png" alt="Memorize" width="560" />'
    );
    expect(html).toContain('<p>Friends</p>');
    expect(html).toContain('<img');
    expect(html).toContain('01-find-memorize.png');
    expect(html).not.toContain('<script');
  });
});

describe('htmlToPlainText', () => {
  it('strips tags and keeps readable text', () => {
    expect(htmlToPlainText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('returns empty for nullish input', () => {
    expect(htmlToPlainText(null)).toBe('');
    expect(htmlToPlainText(undefined)).toBe('');
  });
});

describe('markdownToSafeHtml allowlist fallback', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('dompurify');
  });

  async function loadMarkdownWithPassthroughPurify() {
    vi.doMock('dompurify', () => ({
      default: Object.assign(
        () => ({
          sanitize: (dirty: string) => String(dirty),
          isSupported: true,
        }),
        { isSupported: true }
      ),
    }));
    return import('./markdown');
  }

  it('strips unsafe content when DOMPurify passthrough keeps scripts', async () => {
    const { markdownToSafeHtml: safeHtml } = await loadMarkdownWithPassthroughPurify();
    const html = safeHtml(
      '<div><script>alert(1)</script><p><strong>ok</strong></p><a href="javascript:alert(1)">bad</a><a href="data:image/png;base64,x">img</a><a href="vbscript:x">vbs</a></div>'
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<div');
    expect(html).toContain('<strong>ok</strong>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:image');
    expect(html).not.toContain('vbscript:');
  });

  it('uses allowlist fallback when structural list tags are lost in sanitization', async () => {
    vi.doMock('dompurify', () => ({
      default: Object.assign(
        () => ({
          sanitize: (dirty: string) => String(dirty).replace(/<\/?ul>/gi, ''),
          isSupported: true,
        }),
        { isSupported: true }
      ),
    }));
    const { markdownToSafeHtml: safeHtml } = await import('./markdown');
    const html = safeHtml('- one\n- two');
    expect(html).toContain('<li>');
    expect(html).toContain('one');
  });

  it('unwraps disallowed wrappers and keeps text nodes', async () => {
    const { markdownToSafeHtml: safeHtml } = await loadMarkdownWithPassthroughPurify();
    const html = safeHtml('<span>plain <em>emphasis</em></span>');
    expect(html).toContain('plain');
    expect(html).toContain('<em>emphasis</em>');
    expect(html).not.toContain('<span');
  });

  it('skips re-applying underline style when already present', async () => {
    const { markdownToSafeHtml: safeHtml } = await loadMarkdownWithPassthroughPurify();
    const html = safeHtml('<u style="text-decoration: underline;">styled</u>');
    expect(html).toContain('styled');
    expect(html.match(/text-decoration: underline/g)?.length).toBe(1);
  });
});
