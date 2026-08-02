import { describe, it, expect } from 'vitest';
import {
  getMasterLevel,
  countCompletedSessions,
  groupItemsByMasterLevel,
  countByMasterLevel,
  masterLevelFromCompletedCount,
  masterLevelLabel,
} from './memorization-mastery';
import type { MemorizedItem } from '../../types/memorization';

const base: MemorizedItem = {
  id: '1',
  reference: 'John 3:16',
  text: 'For God so loved the world',
  translation: 'esv',
  dateAdded: Date.now(),
  lastPracticedAt: null,
  practiceSessions: [],
};

function completedSessions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    date: i,
    wrongAttempts: 0,
    correctKeystrokes: 1,
    completed: true,
  }));
}

describe('countCompletedSessions', () => {
  it('counts only completed sessions', () => {
    expect(
      countCompletedSessions({
        ...base,
        practiceSessions: [
          { date: 1, wrongAttempts: 0, correctKeystrokes: 0, completed: false },
          { date: 2, wrongAttempts: 0, correctKeystrokes: 1, completed: true },
        ],
      })
    ).toBe(1);
  });

  it('returns 0 when no sessions', () => {
    expect(countCompletedSessions(base)).toBe(0);
  });
});

describe('getMasterLevel', () => {
  it('returns learning below 3 completed sessions', () => {
    expect(getMasterLevel(base)).toBe('learning');
    expect(getMasterLevel({ ...base, practiceSessions: completedSessions(2) })).toBe(
      'learning'
    );
  });

  it('returns practicing at 3-8 sessions', () => {
    expect(getMasterLevel({ ...base, practiceSessions: completedSessions(3) })).toBe(
      'practicing'
    );
    expect(getMasterLevel({ ...base, practiceSessions: completedSessions(8) })).toBe(
      'practicing'
    );
  });

  it('returns mastered at 9+ sessions', () => {
    expect(getMasterLevel({ ...base, practiceSessions: completedSessions(9) })).toBe(
      'mastered'
    );
    expect(getMasterLevel({ ...base, practiceSessions: completedSessions(20) })).toBe(
      'mastered'
    );
  });
});

describe('groupItemsByMasterLevel', () => {
  it('groups items by master level', () => {
    const learning = { ...base, id: 'l', practiceSessions: completedSessions(1) };
    const practicing = { ...base, id: 'p', practiceSessions: completedSessions(5) };
    const mastered = { ...base, id: 'm', practiceSessions: completedSessions(10) };

    const groups = groupItemsByMasterLevel([learning, practicing, mastered]);
    expect(groups.learning).toHaveLength(1);
    expect(groups.learning[0]!.id).toBe('l');
    expect(groups.practicing).toHaveLength(1);
    expect(groups.practicing[0]!.id).toBe('p');
    expect(groups.mastered).toHaveLength(1);
    expect(groups.mastered[0]!.id).toBe('m');
  });

  it('returns empty arrays when no items', () => {
    const groups = groupItemsByMasterLevel([]);
    expect(groups.learning).toEqual([]);
    expect(groups.practicing).toEqual([]);
    expect(groups.mastered).toEqual([]);
  });
});

describe('masterLevelFromCompletedCount', () => {
  it('maps thresholds to levels', () => {
    expect(masterLevelFromCompletedCount(0)).toBe('learning');
    expect(masterLevelFromCompletedCount(2)).toBe('learning');
    expect(masterLevelFromCompletedCount(3)).toBe('practicing');
    expect(masterLevelFromCompletedCount(8)).toBe('practicing');
    expect(masterLevelFromCompletedCount(9)).toBe('mastered');
  });
});

describe('masterLevelLabel', () => {
  it('labels each mastery level', () => {
    expect(masterLevelLabel('learning')).toBe('Learning');
    expect(masterLevelLabel('practicing')).toBe('Practicing');
    expect(masterLevelLabel('mastered')).toBe('Mastered');
  });
});

describe('countByMasterLevel', () => {
  it('returns numeric totals per level', () => {
    const counts = countByMasterLevel([
      { practiceSessions: completedSessions(1) },
      { practiceSessions: completedSessions(2) },
      { practiceSessions: completedSessions(5) },
      { practiceSessions: completedSessions(10) },
      { practiceSessions: completedSessions(12) },
    ]);
    expect(counts).toEqual({ learning: 2, practicing: 1, mastered: 2 });
  });

  it('returns zeros for an empty list', () => {
    expect(countByMasterLevel([])).toEqual({
      learning: 0,
      practicing: 0,
      mastered: 0,
    });
  });
});
