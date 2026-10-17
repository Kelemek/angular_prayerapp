import { describe, expect, it } from 'vitest';
import { PrayerCardUpdatesSectionComponent } from './prayer-card-updates-section.component';
import type { PrayerUpdateRecord } from '../../lib/prayer-update-header';

function note(authorEmail: string | null): PrayerUpdateRecord {
  return {
    id: 'u1',
    content: 'Note',
    created_at: '2026-01-01T00:00:00Z',
    author_email: authorEmail,
  };
}

describe('PrayerCardUpdatesSectionComponent member actions', () => {
  it('shows edit and delete only for the author or an admin', () => {
    const section = new PrayerCardUpdatesSectionComponent();
    section.updateActionsMode = 'member';
    section.isAdmin = false;
    section.currentUserEmail = 'author@example.com';
    section.showUpdateDelete = true;

    expect(section.actionsModeFor(note('author@example.com'))).toBe('member');
    expect(section.showDeleteFor(note('author@example.com'))).toBe(true);
    expect(section.actionsModeFor(note('other@example.com'))).toBe('readonly');
    expect(section.showDeleteFor(note('other@example.com'))).toBe(false);

    section.isAdmin = true;
    expect(section.actionsModeFor(note('other@example.com'))).toBe('member');
    expect(section.showDeleteFor(note(null))).toBe(true);
  });

  it('keeps the community delete setting for non-member cards', () => {
    const section = new PrayerCardUpdatesSectionComponent();
    section.updateActionsMode = 'readonly';
    section.isAdmin = false;
    section.currentUserEmail = 'reader@example.com';
    section.showUpdateDelete = true;

    expect(section.actionsModeFor(note('other@example.com'))).toBe('readonly');
    expect(section.showDeleteFor(note('other@example.com'))).toBe(true);

    section.showUpdateDelete = false;
    expect(section.showDeleteFor(note('reader@example.com'))).toBe(false);
  });
});
