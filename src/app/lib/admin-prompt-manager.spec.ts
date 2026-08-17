import { describe, it, expect } from 'vitest';
import {
  countInvalidPromptCsvRows,
  countValidPromptCsvRows,
  formatPromptDate,
  formatPromptTypeNames,
  parsePromptCsvText,
} from './admin-prompt-manager';

describe('admin-prompt-manager', () => {
  it('formatPromptDate returns locale date string', () => {
    const result = formatPromptDate('2024-06-15T12:00:00.000Z');
    expect(result).toBeTruthy();
  });

  it('formatPromptTypeNames joins names', () => {
    expect(formatPromptTypeNames([{ name: 'A' }, { name: 'B' }])).toBe('A, B');
  });

  it('parsePromptCsvText validates headers and rows', () => {
    const csv = 'title,type,description\nPray,Healing,Desc here';
    const { rows, error } = parsePromptCsvText(csv, ['Healing']);
    expect(error).toBeUndefined();
    expect(rows).toHaveLength(1);
    expect(rows[0].valid).toBe(true);
  });

  it('parsePromptCsvText flags invalid type', () => {
    const csv = 'title,type,description\nPray,Unknown,Desc';
    const { rows } = parsePromptCsvText(csv, ['Healing']);
    expect(rows[0].valid).toBe(false);
    expect(rows[0].error).toContain('Invalid type');
  });

  it('countValidPromptCsvRows and countInvalidPromptCsvRows', () => {
    const rows = [
      { title: 'a', type: 't', description: 'd', valid: true },
      { title: 'b', type: 't', description: 'd', valid: false },
    ];
    expect(countValidPromptCsvRows(rows)).toBe(1);
    expect(countInvalidPromptCsvRows(rows)).toBe(1);
  });
});
