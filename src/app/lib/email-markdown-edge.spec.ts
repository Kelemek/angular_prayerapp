/**
 * Regression tests for TipTap markdown rendering used by per-prayer reminder emails.
 * Logic is duplicated inline in supabase/functions/send-user-prayer-item-reminders/index.ts (marked + string allowlist).
 * keep behavior aligned with src/utils/markdown.ts.
 */
import { describe, it, expect } from 'vitest';
import { markdownToPlainText, markdownToSafeHtml } from '../../utils/markdown';

describe('per-prayer reminder email markdown', () => {
  it('renders bold, italic, blockquote, and lists to HTML', () => {
    const md = '***bold italic***\n\n> afsfas\n\n- fasffa\n- fasffa';
    const html = markdownToSafeHtml(md);
    expect(html).toContain('<strong>');
    expect(html).toContain('<em>');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
    expect(html).not.toContain('***');
  });

  it('renders strikethrough', () => {
    const html = markdownToSafeHtml('~~struck~~');
    expect(html).toContain('<s>');
    expect(html).toContain('struck');
  });

  it('renders TipTap ++underline++', () => {
    const html = markdownToSafeHtml('++underlined++');
    expect(html).toContain('<u');
    expect(html).toContain('underlined');
  });

  it('plain text strips markdown for text_body', () => {
    const plain = markdownToPlainText('**bold** and ~~strike~~');
    expect(plain).toBe('bold and strike');
  });
});
