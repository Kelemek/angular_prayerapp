import {
  BADGE_READ_PRAYERS_DATA_KEY,
  BADGE_READ_PROMPTS_DATA_KEY,
} from './badge-cache';
import type { BadgeReadPrayersData, BadgeReadPromptsData } from './badge-types';

export function getBadgeReadPrayersData(): BadgeReadPrayersData {
  try {
    const stored = localStorage.getItem(BADGE_READ_PRAYERS_DATA_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        prayers: Array.isArray(parsed?.prayers) ? parsed.prayers : [],
        updates: Array.isArray(parsed?.updates) ? parsed.updates : [],
      };
    }

    const oldPrayersKey = localStorage.getItem('read_prayers');
    const oldUpdatesKey = localStorage.getItem('read_prayer_updates');

    if (!oldPrayersKey && !oldUpdatesKey) {
      return { prayers: [], updates: [] };
    }

    const prayers = oldPrayersKey ? JSON.parse(oldPrayersKey) : [];
    const updates = oldUpdatesKey ? JSON.parse(oldUpdatesKey) : [];

    const migratedData: BadgeReadPrayersData = {
      prayers: Array.isArray(prayers) ? prayers : [],
      updates: Array.isArray(updates) ? updates : [],
    };

    setBadgeReadPrayersData(migratedData);
    localStorage.removeItem('read_prayers');
    localStorage.removeItem('read_prayer_updates');

    return migratedData;
  } catch (error) {
    console.warn('Failed to parse read prayers data:', error);
    return { prayers: [], updates: [] };
  }
}

export function setBadgeReadPrayersData(data: BadgeReadPrayersData): void {
  try {
    localStorage.setItem(BADGE_READ_PRAYERS_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to set read prayers data:', error);
  }
}

export function getBadgeReadPromptsData(): BadgeReadPromptsData {
  try {
    const stored = localStorage.getItem(BADGE_READ_PROMPTS_DATA_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        prompts: Array.isArray(parsed?.prompts) ? parsed.prompts : [],
        updates: Array.isArray(parsed?.updates) ? parsed.updates : [],
      };
    }

    const oldPromptsKey = localStorage.getItem('read_prompts');
    const oldUpdatesKey = localStorage.getItem('read_prompt_updates');

    if (!oldPromptsKey && !oldUpdatesKey) {
      return { prompts: [], updates: [] };
    }

    const prompts = oldPromptsKey ? JSON.parse(oldPromptsKey) : [];
    const updates = oldUpdatesKey ? JSON.parse(oldUpdatesKey) : [];

    const migratedData: BadgeReadPromptsData = {
      prompts: Array.isArray(prompts) ? prompts : [],
      updates: Array.isArray(updates) ? updates : [],
    };

    setBadgeReadPromptsData(migratedData);
    localStorage.removeItem('read_prompts');
    localStorage.removeItem('read_prompt_updates');

    return migratedData;
  } catch (error) {
    console.warn('Failed to parse read prompts data:', error);
    return { prompts: [], updates: [] };
  }
}

export function setBadgeReadPromptsData(data: BadgeReadPromptsData): void {
  try {
    localStorage.setItem(BADGE_READ_PROMPTS_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to set read prompts data:', error);
  }
}
