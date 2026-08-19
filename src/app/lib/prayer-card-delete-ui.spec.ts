import { describe, it, expect } from 'vitest';
import {
  applyPrayerCardDeleteUiPatch,
  prayerCardPrayerDeleteClickPatch,
  prayerCardToggleAddUpdatePatch,
  prayerCardUpdateDeleteClickPatch,
} from './prayer-card-delete-ui';

describe('prayerCardPrayerDeleteClickPatch', () => {
  it('shows confirmation for admin or personal', () => {
    expect(prayerCardPrayerDeleteClickPatch(true, false, false)).toEqual({
      showConfirmationDialog: true,
    });
    expect(prayerCardPrayerDeleteClickPatch(false, true, false)).toEqual({
      showConfirmationDialog: true,
    });
  });

  it('toggles delete request form for community users', () => {
    expect(prayerCardPrayerDeleteClickPatch(false, false, false)).toEqual({
      showDeleteRequestForm: true,
      showAddUpdateForm: false,
      showUpdateDeleteRequestForm: null,
    });
    expect(prayerCardPrayerDeleteClickPatch(false, false, true)).toEqual({
      showDeleteRequestForm: false,
    });
  });
});

describe('prayerCardUpdateDeleteClickPatch', () => {
  it('shows update confirmation for admin or personal', () => {
    const patch = prayerCardUpdateDeleteClickPatch(true, false, 'u1', null);
    expect(patch.showUpdateConfirmationDialog).toBe(true);
    expect(patch.updateConfirmationId).toBe('u1');
  });

  it('toggles update delete request for community users', () => {
    expect(
      prayerCardUpdateDeleteClickPatch(false, false, 'u1', null)
    ).toEqual({
      showUpdateDeleteRequestForm: 'u1',
      showAddUpdateForm: false,
      showDeleteRequestForm: false,
    });
    expect(
      prayerCardUpdateDeleteClickPatch(false, false, 'u1', 'u1')
    ).toEqual({
      showUpdateDeleteRequestForm: null,
    });
  });
});

describe('applyPrayerCardDeleteUiPatch', () => {
  it('applies partial modal state', () => {
    const state = {
      showConfirmationDialog: false,
      showDeleteRequestForm: false,
      showUpdateDeleteRequestForm: null,
      showAddUpdateForm: false,
      showUpdateConfirmationDialog: false,
      updateConfirmationTitle: '',
      updateConfirmationMessage: '',
      updateConfirmationId: null,
    };
    applyPrayerCardDeleteUiPatch(
      state,
      prayerCardToggleAddUpdatePatch(false)
    );
    expect(state.showAddUpdateForm).toBe(true);
    expect(state.showDeleteRequestForm).toBe(false);
  });
});
