import type { MemorizationMasterLevel, MemorizedItem } from '../../types/memorization';

export function countCompletedSessions(item: MemorizedItem): number {
  return item.practiceSessions.filter((s) => s.completed).length;
}

export const LEARNING_COMPLETED_BELOW = 3;

export const PRACTICING_COMPLETED_BELOW = 9;

export function masterLevelFromCompletedCount(
  completedCount: number
): MemorizationMasterLevel {
  if (completedCount < LEARNING_COMPLETED_BELOW) return 'learning';
  if (completedCount < PRACTICING_COMPLETED_BELOW) return 'practicing';
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
