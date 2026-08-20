import { describe, expect, it } from 'vitest';
import { markdownToPlainText as angularPlainText } from '../utils/markdown';
import { markdownToPlainText as edgePlainText } from './edge-email-markdown';
import * as markdownCore from './markdown-core';

const FIXTURES = [
  '',
  'plain',
  '**bold** *italic* ~~strike~~ ++under++',
  '***bold italic***',
  'Please pray.\\\n\nAccident today.',
  'Line one  \nLine two',
  '```\n++literal++\n```',
  '# Heading\n\n- one\n- two\n\n> quote',
];

describe('markdown-core parity (Angular vs Edge reminder emails)', () => {
  it('Angular markdownToPlainText matches edge-email-markdown', () => {
    for (const input of FIXTURES) {
      expect(edgePlainText(input)).toBe(angularPlainText(input));
    }
  });

  it('stripMarkdownSyntaxToPlainText matches edge markdownToPlainText', () => {
    for (const input of FIXTURES) {
      expect(edgePlainText(input)).toBe(markdownCore.stripMarkdownSyntaxToPlainText(input));
    }
  });
});
