import { describe, it, expect } from 'vitest';
import {
  alignRecitation,
  buildReciteDisplaySegments,
  formatReciteSkippedLabels,
  normalizeReciteWord,
  reciteScorePercent,
  tokenizeReciteTranscript,
  type ReciteAlignmentResult,
} from './memorizationReciteAlignment';
import {
  buildMemorizationTokens,
  getTypableTokenIndices,
} from './memorizationPracticeUtils';
import { isSingleVerseScriptureReference } from './parse-scripture-reference';

describe('parse-scripture-reference single verse', () => {
  it('isSingleVerseScriptureReference', () => {
    expect(isSingleVerseScriptureReference('John 3:16')).toBe(true);
    expect(isSingleVerseScriptureReference('John 3:16-18')).toBe(false);
    expect(isSingleVerseScriptureReference('Psalm 23')).toBe(false);
    expect(isSingleVerseScriptureReference('Genesis 1:1')).toBe(true);
    expect(isSingleVerseScriptureReference('Genesis 1:1-3')).toBe(false);
  });
});

describe('memorizationReciteAlignment', () => {
  const tokens = buildMemorizationTokens(
    'For God so loved the world',
    'John 3:16'
  );
  const typable = getTypableTokenIndices(tokens);

  it('normalizeReciteWord handles punctuation and number words', () => {
    expect(normalizeReciteWord("don't")).toBe('dont');
    expect(normalizeReciteWord('Three')).toBe('3');
    expect(tokenizeReciteTranscript('John three sixteen')).toEqual(['john', '3', '16']);
    expect(tokenizeReciteTranscript('John 3:16')).toEqual(['john', '3', '16']);
    expect(tokenizeReciteTranscript('Romans 8:28')).toEqual(['romans', '8', '28']);
    expect(tokenizeReciteTranscript('Romans 8 twenty eight')).toEqual(['romans', '8', '28']);
    expect(tokenizeReciteTranscript('Romans 8 twenty-eight')).toEqual(['romans', '8', '28']);
    expect(tokenizeReciteTranscript('Romans 8 to eight')).toEqual(['romans', '8', '28']);
  });

  it('buildReciteDisplaySegments groups verse digits but not chapter:verse', () => {
    const romansTokens = buildMemorizationTokens(
      'And we know that all things work together for good, for those who are called according to his purpose.',
      'Romans 8:28'
    );
    const segments = buildReciteDisplaySegments(romansTokens);
    expect(segments.some((s) => s.kind === 'digits' && s.text === '28')).toBe(true);
    expect(segments.filter((s) => s.kind === 'digits' && s.text === '2').length).toBe(0);

    const johnTokens = buildMemorizationTokens('For God so loved the world', 'John 3:16');
    const johnSegments = buildReciteDisplaySegments(johnTokens);
    expect(johnSegments.some((s) => s.kind === 'digits' && s.text === '16')).toBe(true);
    expect(johnSegments.some((s) => s.kind === 'digits' && s.text === '3')).toBe(true);
  });

  it('aligns transcript when STT combines verse digits', () => {
    for (const transcript of [
      'For God so loved the world John 3 16',
      'For God so loved the world John 3 sixteen',
      'For God so loved the world John three sixteen',
      'For God so loved the world John 3:16',
    ]) {
      const summary = alignRecitation(tokens, typable, transcript, 'John 3:16');
      expect(summary.correctCount, transcript).toBe(summary.totalTypable);
      expect(summary.missingCount, transcript).toBe(0);
      expect(summary.wrongCount, transcript).toBe(0);
    }
  });

  it('aligns exact transcript including reference digits', () => {
    const summary = alignRecitation(
      tokens,
      typable,
      'For God so loved the world John 3 1 6',
      'John 3:16'
    );
    expect(summary.correctCount).toBe(summary.totalTypable);
    expect(summary.missingCount).toBe(0);
    expect(summary.wrongCount).toBe(0);
    expect(reciteScorePercent(summary)).toBe(100);
  });

  it('marks missing words', () => {
    const summary = alignRecitation(tokens, typable, 'For God loved', 'John 3:16');
    expect(summary.missingCount).toBeGreaterThan(0);
    expect(summary.correctCount).toBeGreaterThan(0);
  });

  it('handles empty transcript', () => {
    const summary = alignRecitation(tokens, typable, '', 'John 3:16');
    expect(summary.missingCount).toBe(summary.totalTypable);
    expect(summary.correctCount).toBe(0);
  });

  describe('reference digit strictness', () => {
    const romansTokens = buildMemorizationTokens(
      'And we know that all things work together for good',
      'Romans 8:28'
    );
    const romansTypable = getTypableTokenIndices(romansTokens);

    function referenceDigitStatuses(
      summary: ReturnType<typeof alignRecitation>
    ): ReciteAlignmentResult[] {
      const refStart = romansTypable.length - 4;
      return summary.results.filter((r) => {
        const pos = romansTypable.indexOf(r.tokenIndex);
        return pos >= refStart;
      });
    }

    it('marks wrong verse numbers as incorrect (Romans 8:28)', () => {
      for (const transcript of [
        'And we know that all things work together for good Romans 8:29',
        'And we know that all things work together for good Romans 8:26',
      ]) {
        const summary = alignRecitation(romansTokens, romansTypable, transcript, 'Romans 8:28');
        const refDigits = referenceDigitStatuses(summary);
        const verseTens = refDigits.find((r) => romansTokens[r.tokenIndex]?.text === '2');
        const verseOnes = refDigits.find((r) => {
          const idx = romansTypable.indexOf(r.tokenIndex);
          return romansTokens[r.tokenIndex]?.text === '8' && idx === romansTypable.length - 1;
        });
        expect(verseTens?.status, transcript).toBe('correct');
        expect(verseOnes?.status, transcript).toBe('wrong');
        expect(summary.wrongCount, transcript).toBeGreaterThan(0);
        expect(summary.correctCount, transcript).toBeLessThan(romansTypable.length);
      }
    });

    it('accepts correct Romans 8:28 reference digits', () => {
      const summary = alignRecitation(
        romansTokens,
        romansTypable,
        'And we know that all things work together for good Romans 8:28',
        'Romans 8:28'
      );
      expect(summary.correctCount).toBe(summary.totalTypable);
      expect(summary.wrongCount).toBe(0);
    });

    it('aligns Romans 8:28 when STT speaks twenty eight', () => {
      for (const transcript of [
        'And we know that all things work together for good Romans 8 twenty eight',
        'And we know that all things work together for good Romans 8 twenty-eight',
        'And we know that all things work together for good Romans chapter 8 verse twenty eight',
        'Romans 8 verse twenty eight and we know that all things work together for good',
      ]) {
        const summary = alignRecitation(romansTokens, romansTypable, transcript, 'Romans 8:28');
        expect(summary.correctCount, transcript).toBe(summary.totalTypable);
        expect(summary.wrongCount, transcript).toBe(0);
        expect(summary.missingCount, transcript).toBe(0);
      }
    });

    it('aligns reference spoken before the verse', () => {
      const summary = alignRecitation(
        romansTokens,
        romansTypable,
        'Romans chapter 8 verse 28 and we know that all things work together for good',
        'Romans 8:28'
      );
      expect(summary.correctCount).toBe(summary.totalTypable);
      expect(summary.missingCount).toBe(0);
      expect(summary.wrongCount).toBe(0);
    });

    it('aligns reference spoken first for John 3:16', () => {
      const summary = alignRecitation(
        tokens,
        typable,
        'John 3 16 for God so loved the world',
        'John 3:16'
      );
      expect(summary.correctCount).toBe(summary.totalTypable);
      expect(summary.missingCount).toBe(0);
    });

    it('aligns numbered book prefixes spoken as ordinals (2 Timothy)', () => {
      const timothyTokens = buildMemorizationTokens(
        'God gave us a spirit not of fear but of power and love.',
        '2 Timothy 1:7'
      );
      const timothyTypable = getTypableTokenIndices(timothyTokens);
      for (const transcript of [
        'God gave us a spirit not of fear but of power and love second Timothy chapter 1 verse 7',
        'second Timothy 1 7 God gave us a spirit not of fear but of power and love',
        'God gave us a spirit not of fear but of power and love 2 Timothy 1 7',
      ]) {
        const summary = alignRecitation(
          timothyTokens,
          timothyTypable,
          transcript,
          '2 Timothy 1:7'
        );
        expect(summary.correctCount, transcript).toBe(timothyTypable.length);
        expect(summary.wrongCount, transcript).toBe(0);
        expect(summary.missingCount, transcript).toBe(0);
      }

      const bookDigit = alignRecitation(
        timothyTokens,
        timothyTypable,
        'God gave us a spirit not of fear but of power and love first Timothy 1 7',
        '2 Timothy 1:7'
      ).results.find((r) => timothyTokens[r.tokenIndex]?.text === '2');
      expect(bookDigit?.status).toBe('wrong');
    });

    it('does not treat verse word first as book digit one', () => {
      const tokensWithFirst = buildMemorizationTokens(
        'First of all you must understand this',
        '2 Peter 1:20'
      );
      const typableWithFirst = getTypableTokenIndices(tokensWithFirst);
      const summary = alignRecitation(
        tokensWithFirst,
        typableWithFirst,
        'First of all you must understand this second Peter 1 20',
        '2 Peter 1:20'
      );
      const firstWord = summary.results.find(
        (r) => tokensWithFirst[r.tokenIndex]?.text === 'First'
      );
      const bookDigit = summary.results.find(
        (r) => tokensWithFirst[r.tokenIndex]?.text === '2'
      );
      expect(firstWord?.status).toBe('correct');
      expect(bookDigit?.status).toBe('correct');
      expect(bookDigit?.spokenText).toBe('2');
    });

    it('aligns verse number words like twelve (James 1:1) without marking them skipped', () => {
      const jamesTokens = buildMemorizationTokens(
        'James, a servant of God and of the Lord Jesus Christ, To the twelve tribes in the Dispersion: Greetings.',
        'James 1:1'
      );
      const jamesTypable = getTypableTokenIndices(jamesTokens);
      const verse =
        'james a servant of god and of the lord jesus christ to the twelve tribes in the dispersion greetings';
      for (const transcript of [`${verse} james 1 1`, `${verse} james 1:1`]) {
        const summary = alignRecitation(jamesTokens, jamesTypable, transcript, 'James 1:1');
        const twelve = summary.results.find(
          (r) => jamesTokens[r.tokenIndex]?.text === 'twelve'
        );
        expect(twelve?.status, transcript).toBe('correct');
        expect(twelve?.spokenText, transcript).toBe('twelve');
        expect(formatReciteSkippedLabels(jamesTokens, summary.results), transcript).not.toContain(
          'twelve'
        );
        expect(summary.missingCount, transcript).toBe(0);
      }
    });

    it('aligns verse-range references when STT inserts connectives between verse numbers', () => {
      const rangeTokens = buildMemorizationTokens(
        'For God so loved the world',
        'John 3:16-18'
      );
      const rangeTypable = getTypableTokenIndices(rangeTokens);
      const verse = 'For God so loved the world';
      for (const transcript of [
        `${verse} John 3 16 and 18`,
        `${verse} John 3 16 through 18`,
        `${verse} John 3 16 to 18`,
        `${verse} John 3 sixteen through eighteen`,
        `${verse} John 3 16-18`,
        `${verse} John 3 16 dash 18`,
        `${verse} John 3 16 hyphen 18`,
        'John 3 16 through 18 For God so loved the world',
      ]) {
        const summary = alignRecitation(
          rangeTokens,
          rangeTypable,
          transcript,
          'John 3:16-18'
        );
        expect(summary.correctCount, transcript).toBe(summary.totalTypable);
        expect(summary.wrongCount, transcript).toBe(0);
        expect(summary.missingCount, transcript).toBe(0);
      }

      const twoVerseTokens = buildMemorizationTokens(
        'For God so loved the world',
        'John 3:16-17'
      );
      const twoVerseTypable = getTypableTokenIndices(twoVerseTokens);
      for (const transcript of [
        `${verse} John 3 16 and 17`,
        `${verse} John 3 16 through 17`,
        `${verse} John 3 sixteen and seventeen`,
      ]) {
        const summary = alignRecitation(
          twoVerseTokens,
          twoVerseTypable,
          transcript,
          'John 3:16-17'
        );
        expect(summary.correctCount, transcript).toBe(summary.totalTypable);
        expect(summary.wrongCount, transcript).toBe(0);
        expect(summary.missingCount, transcript).toBe(0);
      }
    });

    it('shows expected spelling and casing for correct matches in aligned columns', () => {
      const jamesTokens = buildMemorizationTokens(
        'James, a servant of God and of the Lord Jesus Christ,',
        'James 1:1'
      );
      const jamesTypable = getTypableTokenIndices(jamesTokens);
      const summary = alignRecitation(
        jamesTokens,
        jamesTypable,
        'james a servant of god and of the lord jesus christ james 1 1',
        'James 1:1'
      );
      const godCol = summary.alignedColumns.find((c) => c.expected?.text === 'God');
      const jamesCol = summary.alignedColumns.find((c) => c.expected?.text === 'James');
      expect(godCol?.spoken?.text).toBe('God');
      expect(jamesCol?.spoken?.text).toBe('James');
    });

    it('does not mark all following words wrong after one missed word', () => {
      const summary = alignRecitation(
        tokens,
        typable,
        'For so loved the world',
        'John 3:16'
      );
      const god = summary.results.find((r) => tokens[r.tokenIndex]?.text === 'God');
      const world = summary.results.find((r) => tokens[r.tokenIndex]?.text === 'world');
      expect(god?.status).toBe('missing');
      expect(world?.status).toBe('correct');
      expect(summary.correctCount).toBeGreaterThan(4);
    });

    it('does not cascade failures after a wrong spoken word', () => {
      const summary = alignRecitation(
        romansTokens,
        romansTypable,
        'Romans 8:28 and we know that all things work together for good',
        'Romans 8:28'
      );
      const know = summary.results.find((r) => romansTokens[r.tokenIndex]?.text === 'know');
      const good = summary.results.find((r) => romansTokens[r.tokenIndex]?.text === 'good');
      expect(know?.status).toBe('correct');
      expect(good?.status).toBe('correct');
    });

    it('builds aligned columns with expected words below spoken matches', () => {
      const summary = alignRecitation(
        tokens,
        typable,
        'For so loved the world',
        'John 3:16'
      );
      const godCol = summary.alignedColumns.find((c) => c.expected?.text === 'God');
      expect(godCol?.spokenChars).toEqual([{ char: '—', status: 'missing' }]);
      expect(godCol?.expected?.status).toBe('missing');

      const forCol = summary.alignedColumns.find((c) => c.expected?.text === 'For');
      expect(forCol?.spoken?.text).toBe('For');
      expect(forCol?.spoken?.status).toBe('correct');
      expect(forCol?.expected?.status).toBe('correct');
    });

    it('shows multi-digit reference numbers as one unit in aligned columns', () => {
      const romansTokens = buildMemorizationTokens(
        'And we know that all things work together for good',
        'Romans 8:28'
      );
      const romansTypable = getTypableTokenIndices(romansTokens);
      const summary = alignRecitation(
        romansTokens,
        romansTypable,
        'And we know that all things work together for good Romans 8 28',
        'Romans 8:28'
      );
      expect(summary.alignedColumns.some((c) => c.expected?.text === '28')).toBe(true);
      expect(
        summary.alignedColumns.filter((c) => c.expected?.text === '2' || c.expected?.text === '8')
          .length
      ).toBe(1);
    });

    it('counts a fully omitted verse number as one skip (2 Timothy 3:16)', () => {
      const timothyTokens = buildMemorizationTokens(
        'All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness,',
        '2 Timothy 3:16'
      );
      const timothyTypable = getTypableTokenIndices(timothyTokens);
      const summary = alignRecitation(
        timothyTokens,
        timothyTypable,
        'all scripture is breathed out by god and profitable for teaching for reproof for correction and for training in righteousness 2 timothy 3',
        '2 Timothy 3:16'
      );
      expect(formatReciteSkippedLabels(timothyTokens, summary.results)).toEqual(['16']);
      expect(summary.missingCount).toBe(1);
      const verse16 = summary.alignedColumns.find((c) => c.expected?.text === '16');
      expect(verse16?.spokenChars).toEqual([{ char: '—', status: 'missing' }]);
    });

    it('accepts 2 Timothy 3:16 when STT hears three sixteen', () => {
      const timothyTokens = buildMemorizationTokens(
        'All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness,',
        '2 Timothy 3:16'
      );
      const timothyTypable = getTypableTokenIndices(timothyTokens);
      const summary = alignRecitation(
        timothyTokens,
        timothyTypable,
        'all scripture is breathed out by god and profitable for teaching for reproof for correction and for training in righteousness 2 timothy 3 sixteen',
        '2 Timothy 3:16'
      );
      expect(summary.missingCount).toBe(0);
      const verse16 = summary.alignedColumns.find((c) => c.expected?.text === '16');
      expect(verse16?.spokenChars?.[0]?.status).toBe('correct');
    });

    it('shows per-digit skipped markers when only part of a verse number is wrong', () => {
      const summary = alignRecitation(
        romansTokens,
        romansTypable,
        'And we know that all things work together for good Romans 8 8',
        'Romans 8:28'
      );
      const verse28 = summary.alignedColumns.find((c) => c.expected?.text === '28');
      expect(verse28?.spokenChars).toEqual([
        { char: '8', status: 'wrong' },
        { char: '—', status: 'missing' },
      ]);
      expect(summary.wrongCount).toBe(1);
      expect(summary.missingCount).toBe(1);
      expect(formatReciteSkippedLabels(romansTokens, summary.results)).toEqual([]);
    });

    it('lists every spoken word in transcript order for results display', () => {
      const summary = alignRecitation(
        tokens,
        typable,
        'For so loved the world',
        'John 3:16'
      );
      expect(summary.spokenWords.map((w) => w.text)).toEqual(['For', 'so', 'loved', 'the', 'world']);
      expect(summary.missingCount).toBeGreaterThan(0);
    });

    it('builds spoken transcript display from what was said', () => {
      const summary = alignRecitation(
        tokens,
        typable,
        'For God so loved the world John 3 1 9',
        'John 3:16'
      );
      expect(summary.spokenWords.some((w) => w.text === '9' && w.status === 'wrong')).toBe(true);
      expect(summary.spokenWords.some((w) => w.text === 'God' && w.status === 'correct')).toBe(true);
      expect(summary.spokenWords.some((w) => w.text === 'god')).toBe(false);
    });

    it('marks only the first word wrong when verse starts with a duplicate later word', () => {
      const romansFullTokens = buildMemorizationTokens(
        'And we know that for those who love God all things work together for good, for those who are called according to his purpose.',
        'Romans 8:28'
      );
      const romansFullTypable = getTypableTokenIndices(romansFullTokens);
      const summary = alignRecitation(
        romansFullTokens,
        romansFullTypable,
        'for we know that for those who love god all things work together for good for those who are called according to his purpose romans 8 28',
        'Romans 8:28'
      );
      const and = summary.results.find((r) => romansFullTokens[r.tokenIndex]?.text === 'And');
      const we = summary.results.find((r) => romansFullTokens[r.tokenIndex]?.text === 'we');
      const know = summary.results.find((r) => romansFullTokens[r.tokenIndex]?.text === 'know');
      const that = summary.results.find((r) => romansFullTokens[r.tokenIndex]?.text === 'that');
      const secondFor = summary.results.filter(
        (r) => romansFullTokens[r.tokenIndex]?.text === 'for'
      );
      expect(and?.status).toBe('wrong');
      expect(and?.spokenText).toBe('for');
      expect(we?.status).toBe('correct');
      expect(know?.status).toBe('correct');
      expect(that?.status).toBe('correct');
      expect(secondFor.some((r) => r.status === 'correct')).toBe(true);
      expect(summary.missingCount).toBe(0);
      expect(summary.wrongCount).toBe(1);
    });

    it('marks only the first word wrong on the short Romans sample verse', () => {
      const summary = alignRecitation(
        romansTokens,
        romansTypable,
        'for we know that all things work together for good Romans 8 28',
        'Romans 8:28'
      );
      const and = summary.results.find((r) => romansTokens[r.tokenIndex]?.text === 'And');
      const we = summary.results.find((r) => romansTokens[r.tokenIndex]?.text === 'we');
      expect(and?.status).toBe('wrong');
      expect(and?.spokenText).toBe('for');
      expect(we?.status).toBe('correct');
      expect(summary.missingCount).toBe(0);
    });

    it('aligns John 15:5 when STT inserts colon or and between chapter and verse', () => {
      const john15Tokens = buildMemorizationTokens(
        'I am the vine; you are the branches.',
        'John 15:5'
      );
      const john15Typable = getTypableTokenIndices(john15Tokens);
      const verse = 'i am the vine you are the branches';
      for (const refSpoken of ['john 15 colon 5', 'john 15 and 5', 'john 15:5']) {
        const summary = alignRecitation(
          john15Tokens,
          john15Typable,
          `${verse} ${refSpoken}`,
          'John 15:5'
        );
        expect(summary.correctCount, refSpoken).toBe(summary.totalTypable);
        expect(summary.wrongCount, refSpoken).toBe(0);
        expect(summary.missingCount, refSpoken).toBe(0);
      }
    });

    it('does not cascade errors when the opening phrase is wrong (John 15:5)', () => {
      const john15Tokens = buildMemorizationTokens(
        'I am the vine; you are the branches. Whoever abides in me and I in him, he it is that bears much fruit, for apart from me you can do nothing.',
        'John 15:5'
      );
      const john15Typable = getTypableTokenIndices(john15Tokens);
      const summary = alignRecitation(
        john15Tokens,
        john15Typable,
        'you are the vine i am the branches whoever abides in me and i in him he it is that bears much fruit for apart from me you can do nothing john 15 5',
        'John 15:5'
      );
      const i = summary.results.find((r) => john15Tokens[r.tokenIndex]?.text === 'I');
      const am = summary.results.find((r) => john15Tokens[r.tokenIndex]?.text === 'am');
      const vine = summary.results.find((r) =>
        normalizeReciteWord(john15Tokens[r.tokenIndex]?.text ?? '').startsWith('vine')
      );
      const you = summary.results.find(
        (r) =>
          john15Tokens[r.tokenIndex]?.text === 'you' &&
          john15Typable.indexOf(r.tokenIndex) === 4
      );
      const are = summary.results.find((r) => john15Tokens[r.tokenIndex]?.text === 'are');
      const branches = summary.results.find((r) =>
        normalizeReciteWord(john15Tokens[r.tokenIndex]?.text ?? '').startsWith('branches')
      );
      const whoever = summary.results.find(
        (r) => john15Tokens[r.tokenIndex]?.text === 'Whoever'
      );
      expect(i?.status).toBe('wrong');
      expect(i?.spokenText).toBe('you');
      expect(am?.status).toBe('wrong');
      expect(am?.spokenText).toBe('are');
      expect(vine?.status).toBe('correct');
      expect(you?.status).toBe('wrong');
      expect(are?.status).toBe('wrong');
      expect(branches?.status).toBe('correct');
      expect(whoever?.status).toBe('correct');
      expect(summary.correctCount).toBeGreaterThan(20);
      expect(summary.wrongCount).toBeLessThan(8);
      expect(summary.missingCount).toBe(0);
    });

    it('aligns purpose wrong and Romans correct when timing is said once before Romans', () => {
      const romansFullTokens = buildMemorizationTokens(
        'And we know that for those who love God all things work together for good, for those who are called according to his purpose.',
        'Romans 8:28'
      );
      const romansFullTypable = getTypableTokenIndices(romansFullTokens);
      const summary = alignRecitation(
        romansFullTokens,
        romansFullTypable,
        'for we know that for those who love god all things work for good for those who are called according to his timing romans 8 28',
        'Romans 8:28'
      );
      const purpose = summary.results.find((r) =>
        normalizeReciteWord(romansFullTokens[r.tokenIndex]?.text ?? '').includes('purpose')
      );
      const romans = summary.results.find(
        (r) => romansFullTokens[r.tokenIndex]?.text === 'Romans'
      );
      const together = summary.results.find(
        (r) => romansFullTokens[r.tokenIndex]?.text === 'together'
      );
      expect(purpose?.status).toBe('wrong');
      expect(purpose?.spokenText).toBe('timing');
      expect(romans?.status).toBe('correct');
      expect(romans?.spokenText).toBe('Romans');
      expect(together?.status).toBe('missing');
      expect(
        summary.results.filter((r) => r.spokenText === 'timing' && r.status === 'wrong')
      ).toHaveLength(1);
    });

    it('does not show a spoken word for omitted short words (Ephesians 4:29 as good)', () => {
      const ephTokens = buildMemorizationTokens(
        'Let no corrupting talk come out of your mouths, but only such as is good for building up, as fits the occasion, that it may give grace to those who hear.',
        'Ephesians 4:29'
      );
      const ephTypable = getTypableTokenIndices(ephTokens);
      const transcript =
        'let no corrupting talk come out of your mouths but only such as good for building up as fits the occasion that it may give grace to those who hear ephesians 4 29';
      const summary = alignRecitation(ephTokens, ephTypable, transcript, 'Ephesians 4:29');

      const isResult = summary.results.find((r) => ephTokens[r.tokenIndex]?.text === 'is');
      const isCol = summary.alignedColumns.find((c) => c.expected?.text === 'is');
      expect(isResult?.status).toBe('missing');
      expect(isCol?.spokenChars).toEqual([{ char: '—', status: 'missing' }]);
      expect(summary.spokenWords.some((w) => w.text === 'is')).toBe(false);
    });

    it('shows is when STT transcript includes it even if user meant to skip (Ephesians 4:29)', () => {
      const ephTokens = buildMemorizationTokens(
        'Let no corrupting talk come out of your mouths, but only such as is good for building up, as fits the occasion, that it may give grace to those who hear.',
        'Ephesians 4:29'
      );
      const ephTypable = getTypableTokenIndices(ephTokens);
      const transcript =
        'let no corrupting talk come out of your mouths but only such as is good for building up as fits the occasion that it may give grace to those who hear ephesians 4 29';
      const summary = alignRecitation(ephTokens, ephTypable, transcript, 'Ephesians 4:29');

      const isResult = summary.results.find((r) => ephTokens[r.tokenIndex]?.text === 'is');
      const isCol = summary.alignedColumns.find((c) => c.expected?.text === 'is');
      expect(isResult?.status).toBe('correct');
      expect(isResult?.spokenText).toBe('is');
      expect(isCol?.spokenChars).toEqual([{ char: 'is', status: 'correct' }]);
    });

    it('marks singular mouth wrong when verse expects mouths (Ephesians 4:29)', () => {
      const ephTokens = buildMemorizationTokens(
        'Let no corrupting talk come out of your mouths, but only such as is good for building up, as fits the occasion, that it may give grace to those who hear.',
        'Ephesians 4:29'
      );
      const ephTypable = getTypableTokenIndices(ephTokens);
      const transcript =
        'let no corrupting talk come out of your mouth but only such as is good for building up as fits the occasion that it may give grace to those who hear ephesians 4 29';
      const summary = alignRecitation(ephTokens, ephTypable, transcript, 'Ephesians 4:29');

      const mouths = summary.results.find(
        (r) => normalizeReciteWord(ephTokens[r.tokenIndex]?.text ?? '') === 'mouths'
      );
      const mouthsCol = summary.alignedColumns.find((c) => c.expected?.text === 'mouths,');
      expect(mouths?.status).toBe('wrong');
      expect(mouths?.spokenText).toBe('mouth');
      expect(mouthsCol?.spokenChars).toEqual([{ char: 'mouth', status: 'wrong' }]);
    });

    it('fuzzy-matches STT truncation before final s (witness/witnes)', () => {
      const tokens = buildMemorizationTokens('The witness spoke truth', 'John 1:1');
      const typable = getTypableTokenIndices(tokens);
      const summary = alignRecitation(
        tokens,
        typable,
        'the witnes spoke truth john 1 1',
        'John 1:1'
      );
      const witness = summary.results.find(
        (r) => normalizeReciteWord(tokens[r.tokenIndex]?.text ?? '') === 'witness'
      );
      expect(witness?.status).toBe('correct');
    });

    it('fuzzy-matches STT truncation of always (always/alway)', () => {
      const tokens = buildMemorizationTokens('I will always remember', 'Psalm 119:1');
      const typable = getTypableTokenIndices(tokens);
      const summary = alignRecitation(
        tokens,
        typable,
        'i will alway remember psalm 119 1',
        'Psalm 119:1'
      );
      const always = summary.results.find(
        (r) => normalizeReciteWord(tokens[r.tokenIndex]?.text ?? '') === 'always'
      );
      expect(always?.status).toBe('correct');
    });

    it('fuzzy-matches STT truncation of jesus (jesus/jesu)', () => {
      const tokens = buildMemorizationTokens('We have peace with God through our Lord Jesus Christ', 'Romans 5:1');
      const typable = getTypableTokenIndices(tokens);
      const summary = alignRecitation(
        tokens,
        typable,
        'we have peace with god through our lord jesu christ romans 5 1',
        'Romans 5:1'
      );
      const jesus = summary.results.find(
        (r) => normalizeReciteWord(tokens[r.tokenIndex]?.text ?? '') === 'jesus'
      );
      expect(jesus?.status).toBe('correct');
    });

    it('fuzzy-matches Numbers book when STT says number', () => {
      const tokens = buildMemorizationTokens('The Lord spoke', 'Numbers 12:3');
      const typable = getTypableTokenIndices(tokens);
      const summary = alignRecitation(
        tokens,
        typable,
        'the lord spoke number 12 3',
        'Numbers 12:3'
      );
      const numbers = summary.results.find(
        (r) => normalizeReciteWord(tokens[r.tokenIndex]?.text ?? '') === 'numbers'
      );
      expect(numbers?.status).toBe('correct');
    });

    it('accepts psalm when reference stores Psalms (canon book name)', () => {
      const tokens = buildMemorizationTokens('The Lord is my shepherd', 'Psalms 23:1');
      const typable = getTypableTokenIndices(tokens);
      const summary = alignRecitation(
        tokens,
        typable,
        'the lord is my shepherd psalm 23 1',
        'Psalms 23:1'
      );
      const book = summary.results.find(
        (r) => normalizeReciteWord(tokens[r.tokenIndex]?.text ?? '') === 'psalms'
      );
      expect(book?.status).toBe('correct');
      expect(book?.spokenText).toBe('Psalms');
    });

    it('accepts psalms when reference stores Psalm', () => {
      const tokens = buildMemorizationTokens('I will always remember', 'Psalm 119:1');
      const typable = getTypableTokenIndices(tokens);
      const summary = alignRecitation(
        tokens,
        typable,
        'i will always remember psalms 119 1',
        'Psalm 119:1'
      );
      const book = summary.results.find(
        (r) => normalizeReciteWord(tokens[r.tokenIndex]?.text ?? '') === 'psalm'
      );
      expect(book?.status).toBe('correct');
      expect(book?.spokenText).toBe('Psalm');
    });
  });
});
