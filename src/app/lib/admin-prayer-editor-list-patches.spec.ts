import { describe, it, expect } from 'vitest';
import {
  prayerEditorListsAfterBulkDelete,
  prayerEditorListsAfterBulkStatus,
  prayerEditorListsAfterEditUpdateSave,
  prayerEditorListsAfterNewUpdate,
  prayerEditorListsAfterPrayerSave,
  prayerEditorListsAfterSingleDelete,
  prayerEditorListsAfterUpdateDelete,
} from './admin-prayer-editor-list-patches';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

describe('admin-prayer-editor-list-patches', () => {
  const prayer = (id: string, status = 'current'): PrayerEditorPrayer => ({
    id,
    title: `Title ${id}`,
    requester: 'John',
    email: 'john@example.com',
    status,
    created_at: '2024-01-01T00:00:00Z',
    description: 'Desc',
  });

  it('patches lists after bulk status update', () => {
    const p1 = prayer('p1', 'current');
    const p2 = prayer('p2', 'current');
    const selected = new Set(['p1', 'p2']);
    const result = prayerEditorListsAfterBulkStatus(
      [p1, p2],
      [p1, p2],
      selected,
      'answered',
    );
    expect(result.searchResults.every((p) => p.status === 'answered')).toBe(
      true,
    );
    expect(result.selectedPrayers.size).toBe(0);
    expect(result.bulkStatus).toBe('');
  });

  it('patches lists after bulk delete', () => {
    const selected = new Set(['p1']);
    const result = prayerEditorListsAfterBulkDelete(
      [prayer('p1'), prayer('p2')],
      [prayer('p1'), prayer('p2')],
      selected,
    );
    expect(result.allPrayers.map((p) => p.id)).toEqual(['p2']);
    expect(result.totalItems).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.selectedPrayers.size).toBe(0);
  });

  it('patches lists after single delete', () => {
    const selected = new Set(['p1', 'p2']);
    const result = prayerEditorListsAfterSingleDelete(
      [prayer('p1'), prayer('p2')],
      [prayer('p1'), prayer('p2')],
      'p1',
      selected,
    );
    expect(result.allPrayers.map((p) => p.id)).toEqual(['p2']);
    expect(result.selectedPrayers).toEqual(new Set(['p2']));
  });

  it('patches lists after prayer save', () => {
    const p1 = prayer('p1');
    const result = prayerEditorListsAfterPrayerSave(
      [p1],
      [p1],
      'p1',
      {
        title: 'New title',
        description: 'New desc',
        requester: 'Jane',
        email: 'jane@example.com',
        prayer_for: '',
        status: 'answered',
      },
      '2024-06-01T00:00:00Z',
    );
    expect(result.allPrayers[0].title).toBe('New title');
    expect(result.allPrayers[0].status).toBe('answered');
    expect(result.allPrayers[0].approved_at).toBe('2024-06-01T00:00:00Z');
  });

  it('patches lists after new update', () => {
    const p1 = prayer('p1');
    const inserted = {
      id: 'u1',
      content: 'Update body',
      author: 'Jane Doe',
      author_email: 'jane@example.com',
      created_at: '2024-01-02T00:00:00Z',
    };
    const result = prayerEditorListsAfterNewUpdate([p1], 'p1', inserted);
    expect(result.allPrayers[0].prayer_updates?.length).toBe(1);
    expect(result.prayerTitle).toBe('Title p1');
  });

  it('patches lists after update delete', () => {
    const p1: PrayerEditorPrayer = {
      ...prayer('p1'),
      prayer_updates: [
        {
          id: 'u1',
          content: 'A',
          author: 'A',
          author_email: 'a@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    };
    const result = prayerEditorListsAfterUpdateDelete([p1], 'p1', 'u1');
    expect(result[0].prayer_updates?.length).toBe(0);
  });

  it('patches lists after edit update save', () => {
    const p1: PrayerEditorPrayer = {
      ...prayer('p1'),
      prayer_updates: [
        {
          id: 'u1',
          content: 'Old',
          author: 'Old',
          author_email: 'old@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    };
    const result = prayerEditorListsAfterEditUpdateSave(
      [p1],
      'p1',
      'u1',
      {
        content: 'New content',
        author: 'New Author',
        author_email: 'new@example.com',
      },
      '2024-06-01T00:00:00Z',
    );
    expect(result.allPrayers[0].prayer_updates?.[0].content).toBe('New content');
    expect(result.allPrayers[0].prayer_updates?.[0].approved_at).toBe(
      '2024-06-01T00:00:00Z',
    );
    expect(result.prayerTitle).toBe('Title p1');
  });
});
