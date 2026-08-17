import { describe, it, expect } from 'vitest';
import {
  appendPrayerEditorUpdate,
  isPrayerEditorEditUpdateFormValid,
  isPrayerEditorNewUpdateValid,
  mapPrayerEditorPrayersWithStatus,
  patchPrayerEditorPrayerFromEditForm,
  prayerEditorAuthorFullName,
  prayerEditorBulkStatusLabel,
  prayerEditorUpdateDeletePreview,
  removePrayerEditorPrayerById,
  validatePrayerEditorEditForm,
} from './admin-prayer-editor-commands';
import {
  buildBulkStatusPrayerEditorConfirmation,
  buildDeletePrayerEditorPrayerConfirmation,
} from './admin-prayer-editor-confirmations';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

describe('admin-prayer-editor-commands', () => {
  const prayer = (): PrayerEditorPrayer => ({
    id: 'p1',
    title: 'Title',
    requester: 'John',
    email: 'john@example.com',
    status: 'current',
    created_at: '2024-01-01T00:00:00Z',
    description: 'Desc',
  });

  it('validates edit and update forms', () => {
    expect(
      validatePrayerEditorEditForm({
        title: '',
        description: 'd',
        requester: 'r',
        email: '',
        prayer_for: '',
        status: 'current',
      }),
    ).toBeTruthy();
    expect(
      isPrayerEditorNewUpdateValid({
        content: 'c',
        firstName: 'A',
        lastName: 'B',
        author_email: 'a@b.com',
      }),
    ).toBe(true);
    expect(
      isPrayerEditorEditUpdateFormValid({
        content: 'c',
        author: 'A B',
        author_email: 'a@b.com',
      }),
    ).toBe(true);
  });

  it('maps list patches and labels', () => {
    const base = prayer();
    const patched = patchPrayerEditorPrayerFromEditForm(
      base,
      {
        title: 'New',
        description: 'New desc',
        requester: 'Jane',
        email: '',
        prayer_for: '',
        status: 'answered',
      },
      '2024-02-01T00:00:00Z',
    );
    expect(patched.title).toBe('New');
    expect(patched.status).toBe('answered');

    const withStatus = mapPrayerEditorPrayersWithStatus(
      [base, { ...base, id: 'p2' }],
      new Set(['p1']),
      'archived',
    );
    expect(withStatus[0].status).toBe('archived');
    expect(withStatus[1].status).toBe('current');

    expect(removePrayerEditorPrayerById([base, { ...base, id: 'p2' }], 'p1').length).toBe(1);
    const appended = appendPrayerEditorUpdate([base], 'p1', {
      id: 'u1',
      content: 'update',
      author: 'A',
      created_at: '2024-01-02',
    });
    expect(appended[0].prayer_updates?.length).toBe(1);

    expect(prayerEditorBulkStatusLabel('answered')).toBe('Answered');
    expect(prayerEditorAuthorFullName('Mark', 'Larson')).toBe('Mark Larson');
    expect(prayerEditorUpdateDeletePreview('hello')).toContain('hello');
  });
});

describe('admin-prayer-editor-confirmations', () => {
  it('builds delete and bulk status confirmations', () => {
    const deleteOne = buildDeletePrayerEditorPrayerConfirmation({
      id: '1',
      title: 'Pray',
      requester: 'J',
      email: null,
      status: 'current',
      created_at: '2024-01-01',
    });
    expect(deleteOne.title).toBe('Delete Prayer');
    expect(deleteOne.isDangerous).toBe(true);

    const bulk = buildBulkStatusPrayerEditorConfirmation(3, 'current');
    expect(bulk.message).toContain('3 prayer(s)');
    expect(bulk.message).toContain('Current');
  });
});
