import { describe, it, expect } from 'vitest';
import {
  stripNonTypableScriptureMarks,
  stripScriptureForMemorization,
} from './strip-scripture-for-memorization';

describe('stripNonTypableScriptureMarks', () => {
  it('strips pilcrow and following spaces without collapsing newlines', () => {
    expect(
      stripNonTypableScriptureMarks('¶ For God so loved\n¶ the world')
    ).toBe('For God so loved\nthe world');
  });

  it('strips pilcrow attached to a word', () => {
    expect(stripNonTypableScriptureMarks('¶For God')).toBe('For God');
  });
});

describe('stripScriptureForMemorization', () => {
  it('strips HTML and ESV verse markers', () => {
    expect(stripScriptureForMemorization('<p>[16] For God so loved</p>')).toBe(
      'For God so loved'
    );
  });

  it('strips KJV paragraph/pilcrow marks that users cannot type', () => {
    expect(
      stripScriptureForMemorization(
        '¶ For God so loved the world, that he gave his only begotten Son'
      )
    ).toBe(
      'For God so loved the world, that he gave his only begotten Son'
    );
  });

  it('strips pilcrow attached to a word', () => {
    expect(stripScriptureForMemorization('¶For God so loved')).toBe(
      'For God so loved'
    );
  });

  it('collapses leftover whitespace after stripping marks', () => {
    expect(stripScriptureForMemorization('¶  ¶ For  God')).toBe('For God');
  });
});