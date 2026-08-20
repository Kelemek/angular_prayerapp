import type { BadgeService } from '../services/badge.service';

export function markUserSettingsAllItemsAsRead(badgeService: BadgeService): void {
  try {
    badgeService.markAllAsRead('prayers');
    badgeService.markAllAsRead('prompts');
  } catch (err) {
    console.error('Error marking all items as read:', err);
  }
}
