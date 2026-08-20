/**
 * Regression tests for TipTap markdown rendering in Edge reminder emails.
 * Edge functions inline the same logic — source of truth: src/lib/edge-email-markdown.ts
 * (regenerate with `node scripts/inline-edge-email-helpers.mjs` after edits).
 */
import { describe, it, expect } from 'vitest';
import {
  buildSpotlightEmailTemplateVars,
  markdownToPlainText,
  markdownToSafeHtml,
} from '../../lib/edge-email-markdown';

describe('Edge email-markdown (reminder Edge Functions)', () => {
  it('renders bold, italic, blockquote, and lists to HTML', () => {
    const md = '***bold italic***\n\n> afsfas\n\n- fasffa\n- fasffa';
    const html = markdownToSafeHtml(md);
    expect(html).toContain('<strong>');
    expect(html).toContain('<em>');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
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

  it('renders multi-paragraph TipTap markdown without literal backslash hard breaks', () => {
    const md = 'Please pray for their church.\\\n\nThis afternoon there was an accident.';
    const html = markdownToSafeHtml(md);
    expect(html).toContain('<p');
    expect(html.match(/<p/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain('\\');
    expect(markdownToPlainText(md)).toBe(
      'Please pray for their church.\n\nThis afternoon there was an accident.'
    );
  });

  it('strips ***bold italic*** in plain text', () => {
    expect(markdownToPlainText('***both***')).toBe('both');
  });

  it('includes plain spotlightPrayerDescription in variablesHtml for legacy templates', () => {
    const { variablesHtml } = buildSpotlightEmailTemplateVars(
      'https://app.example/prayer',
      {
        kindLabel: 'Community',
        title: 'Health',
        prayerFor: 'Jane',
        requester: 'Bob',
        description: '**Please pray**',
      },
      ''
    );
    expect(variablesHtml.spotlightPrayerDescription).toBe('Please pray');
    expect(variablesHtml.spotlightPrayerDescriptionHtml).toContain('<strong>');
  });

  it('truncates spotlight description after plain-text conversion, not raw markdown', () => {
    const padding = 'x'.repeat(590);
    const description = `${padding}**bold tail**`;
    const expectedPlain = `${padding}bold tail`;
    const { variablesText } = buildSpotlightEmailTemplateVars(
      'https://app.example/prayer',
      {
        kindLabel: 'Community',
        title: 'T',
        prayerFor: 'Jane',
        requester: 'Bob',
        description,
      },
      ''
    );
    expect(variablesText.spotlightPrayerDescription).toBe(expectedPlain);
    expect(variablesText.spotlightPrayerDescription).not.toContain('**');
  });
});
