import type {
  MemorizationMasterLevel,
  MemorizationPracticeSessionRecord,
  MemorizedItem,
} from '../../types/memorization';

export function countCompletedSessions(item: MemorizedItem): number {
  return item.practiceSessions.filter((s) => s.completed).length;
}

export function masterLevelFromCompletedCount(
  completedCount: number
): MemorizationMasterLevel {
  if (completedCount < 3) return 'learning';
  if (completedCount < 9) return 'practicing';
  return 'mastered';
}

export function getMasterLevel(item: MemorizedItem): MemorizationMasterLevel {
  return masterLevelFromCompletedCount(countCompletedSessions(item));
}

export function masterLevelLabel(level: MemorizationMasterLevel): string {
  switch (level) {
    case 'learning':
      return 'Learning';
    case 'practicing':
      return 'Practicing';
    case 'mastered':
      return 'Mastered';
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function groupItemsByMasterLevel(items: MemorizedItem[]): {
  learning: MemorizedItem[];
  practicing: MemorizedItem[];
  mastered: MemorizedItem[];
} {
  const learning: MemorizedItem[] = [];
  const practicing: MemorizedItem[] = [];
  const mastered: MemorizedItem[] = [];
  for (const item of items) {
    const level = getMasterLevel(item);
    switch (level) {
      case 'learning':
        learning.push(item);
        break;
      case 'practicing':
        practicing.push(item);
        break;
      case 'mastered':
        mastered.push(item);
        break;
      default: {
        const _exhaustive: never = level;
        void _exhaustive;
      }
    }
  }
  return { learning, practicing, mastered };
}

/** Site-wide / list totals for Learning / Practicing / Mastered. */
export function countByMasterLevel(
  items: Array<{ practiceSessions: MemorizationPracticeSessionRecord[] }>
): { learning: number; practicing: number; mastered: number } {
  let learning = 0;
  let practicing = 0;
  let mastered = 0;
  for (const item of items) {
    const completed = item.practiceSessions.filter((s) => s.completed).length;
    const level = masterLevelFromCompletedCount(completed);
    if (level === 'learning') learning += 1;
    else if (level === 'practicing') practicing += 1;
    else mastered += 1;
  }
  return { learning, practicing, mastered };
}
