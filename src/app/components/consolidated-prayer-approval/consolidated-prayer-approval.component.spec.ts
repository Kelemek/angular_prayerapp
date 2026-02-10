import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsolidatedPrayerApprovalComponent } from './consolidated-prayer-approval.component';
import type { PrayerRequest } from '../../services/prayer.service';

describe('ConsolidatedPrayerApprovalComponent', () => {
  let component: ConsolidatedPrayerApprovalComponent;

  const makePrayer = (overrides: Partial<PrayerRequest> = {}): PrayerRequest => ({
    id: 'prayer-1',
    title: 'Test Prayer',
    description: 'Test Description',
    status: 'current',
    requester: 'John Doe',
    prayer_for: 'Health',
    date_requested: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updates: [],
    ...overrides
  });

  beforeEach(() => {
    component = new ConsolidatedPrayerApprovalComponent();
    component.prayer = makePrayer();
    component.pendingUpdates = [];
    component.hasAnyPendingUpdates = false;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty denial reason', () => {
      expect(component.prayerDenialReason).toBe('');
    });

    it('should initialize isDenyingPrayer as false', () => {
      expect(component.isDenyingPrayer).toBe(false);
    });
  });

  describe('Prayer Approval/Denial', () => {
    it('handleApprovePrayer should emit onApprovePrayer event', () => {
      const spy = vi.spyOn(component.onApprovePrayer, 'emit');
      component.handleApprovePrayer();
      expect(spy).toHaveBeenCalledWith('prayer-1');
    });

    it('handleDenyPrayer should emit onDenyPrayer event with reason', () => {
      const spy = vi.spyOn(component.onDenyPrayer, 'emit');
      component.prayerDenialReason = 'Inappropriate content';
      component.handleDenyPrayer();
      expect(spy).toHaveBeenCalledWith({ id: 'prayer-1', reason: 'Inappropriate content' });
      expect(component.isDenyingPrayer).toBe(false);
      expect(component.prayerDenialReason).toBe('');
    });

    it('handleDenyPrayer should emit with null reason if empty', () => {
      const spy = vi.spyOn(component.onDenyPrayer, 'emit');
      component.prayerDenialReason = '';
      component.handleDenyPrayer();
      expect(spy).toHaveBeenCalledWith({ id: 'prayer-1', reason: null });
    });
  });

  describe('Update Approval/Denial', () => {
    beforeEach(() => {
      component.pendingUpdates = [
        {
          id: 'update-1',
          content: 'Update content',
          author: 'Jane Doe',
          author_email: 'jane@example.com',
          created_at: new Date().toISOString(),
          is_anonymous: false,
          in_planning_center: null,
          mark_as_answered: false
        }
      ];
    });

    it('handleApproveUpdate should emit onApproveUpdate event', () => {
      const spy = vi.spyOn(component.onApproveUpdate, 'emit');
      component.handleApproveUpdate('update-1');
      expect(spy).toHaveBeenCalledWith('update-1');
    });

    it('startDenyingUpdate should set denyingUpdateId', () => {
      component.startDenyingUpdate('update-1');
      expect(component.denyingUpdateId).toBe('update-1');
      expect(component.updateDenialReasons.has('update-1')).toBe(true);
    });

    it('handleDenyUpdate should emit onDenyUpdate event', () => {
      const spy = vi.spyOn(component.onDenyUpdate, 'emit');
      component.updateDenialReasons.set('update-1', 'Spam');
      component.denyingUpdateId = 'update-1';
      component.handleDenyUpdate('update-1');
      expect(spy).toHaveBeenCalledWith({ id: 'update-1', reason: 'Spam' });
      expect(component.denyingUpdateId).toBeNull();
    });

    it('cancelDenyingUpdate should clear state', () => {
      component.denyingUpdateId = 'update-1';
      component.updateDenialReasons.set('update-1', 'Spam');
      component.cancelDenyingUpdate();
      expect(component.denyingUpdateId).toBeNull();
      expect(component.updateDenialReasons.has('update-1')).toBe(false);
    });
  });

  describe('Edit Modal Events', () => {
    it('onPrayerSaved should emit onPrayerEdited and close modal', () => {
      const spy = vi.spyOn(component.onPrayerEdited, 'emit');
      component.showEditPrayer = true;
      component.onPrayerSaved();
      expect(spy).toHaveBeenCalledWith({ id: 'prayer-1', updates: {} });
      expect(component.showEditPrayer).toBe(false);
    });

    it('onUpdateSaved should emit onUpdateEdited and close modal', () => {
      const mockUpdate = { id: 'update-1', content: 'Test' };
      component.editUpdate = mockUpdate;
      const spy = vi.spyOn(component.onUpdateEdited, 'emit');
      component.showEditUpdate = true;
      component.onUpdateSaved();
      expect(spy).toHaveBeenCalledWith({ id: 'update-1', updates: {} });
      expect(component.showEditUpdate).toBe(false);
      expect(component.editUpdate).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    it('formatDate should format date correctly', () => {
      const date = '2024-01-15T10:30:00Z';
      const result = component.formatDate(date);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });

    it('formatDate should handle invalid dates', () => {
      const result = component.formatDate('invalid');
      // Invalid dates may return empty string or "Invalid Date" depending on browser
      expect(result === '' || result === 'Invalid Date').toBe(true);
    });

    it('formatDate should handle undefined dates', () => {
      const result = component.formatDate(undefined);
      expect(result).toBe('');
    });

    it('trackByUpdateId should return update id', () => {
      const update = { id: 'update-1', content: 'Test' };
      const result = component.trackByUpdateId(0, update);
      expect(result).toBe('update-1');
    });

    it('trackByUpdateId should return index for missing id', () => {
      const result = component.trackByUpdateId(5, {});
      expect(result).toBe('5');
    });
  });

  describe('Multiple Updates Handling', () => {
    beforeEach(() => {
      component.pendingUpdates = [
        {
          id: 'update-1',
          content: 'First update',
          author: 'Jane Doe',
          author_email: 'jane@example.com',
          created_at: new Date().toISOString(),
          is_anonymous: false
        },
        {
          id: 'update-2',
          content: 'Second update',
          author: 'Bob Smith',
          author_email: 'bob@example.com',
          created_at: new Date().toISOString(),
          is_anonymous: false
        }
      ];
    });

    it('should handle multiple updates with separate denial reasons', () => {
      component.updateDenialReasons.set('update-1', 'Reason 1');
      component.updateDenialReasons.set('update-2', 'Reason 2');
      
      const spy = vi.spyOn(component.onDenyUpdate, 'emit');
      
      component.denyingUpdateId = 'update-1';
      component.handleDenyUpdate('update-1');
      
      expect(spy).toHaveBeenCalledWith({ id: 'update-1', reason: 'Reason 1' });
      expect(component.updateDenialReasons.has('update-2')).toBe(true);
    });
  });

  describe('Anonymous Prayer Handling', () => {
    beforeEach(() => {
      component.prayer = makePrayer({
        is_anonymous: true,
        requester: 'Anonymous'
      });
    });

    it('should display anonymous badge for anonymous prayers', () => {
      expect(component.prayer.is_anonymous).toBe(true);
    });
  });

  describe('Planning Center Status Display', () => {
    it('should display planning center status when available', () => {
      component.prayer = makePrayer({
        in_planning_center: true
      });
      expect(component.prayer.in_planning_center).toBe(true);
    });

    it('should handle null planning center status', () => {
      component.prayer = makePrayer({
        in_planning_center: null
      });
      expect(component.prayer.in_planning_center).toBeNull();
    });
  });

  describe('Answered Update Handling', () => {
    beforeEach(() => {
      component.pendingUpdates = [
        {
          id: 'update-1',
          content: 'Prayer answered',
          author: 'Jane Doe',
          author_email: 'jane@example.com',
          created_at: new Date().toISOString(),
          is_anonymous: false,
          mark_as_answered: true
        }
      ];
    });

    it('should display answered indicator for marked updates', () => {
      expect(component.pendingUpdates[0].mark_as_answered).toBe(true);
    });
  });

  describe('getRequester', () => {
    it('should return requester when available', () => {
      component.prayer = makePrayer({ requester: 'John Smith' });
      expect(component.getRequester()).toBe('John Smith');
    });

    it('should return Planning Center when id starts with pc-member-', () => {
      component.prayer = makePrayer({ 
        id: 'pc-member-12345',
        requester: undefined
      });
      expect(component.getRequester()).toBe('Planning Center');
    });

    it('should return Anonymous as fallback', () => {
      component.prayer = makePrayer({ 
        id: 'prayer-regular',
        requester: undefined
      });
      expect(component.getRequester()).toBe('Anonymous');
    });

    it('should return Anonymous when requester is empty string', () => {
      component.prayer = makePrayer({ 
        requester: ''
      });
      expect(component.getRequester()).toBe('Anonymous');
    });
  });

  describe('formatUpdateDate', () => {
    it('formatUpdateDate should format date correctly', () => {
      const date = '2024-01-15T10:30:00Z';
      const result = component.formatUpdateDate(date);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });

    it('formatUpdateDate should handle undefined dates', () => {
      const result = component.formatUpdateDate(undefined);
      expect(result).toBe('');
    });

    it('formatUpdateDate should handle null dates', () => {
      const result = component.formatUpdateDate(null as any);
      expect(result).toBe('');
    });

    it('formatUpdateDate should handle Date objects', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = component.formatUpdateDate(date);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });

    it('formatUpdateDate should handle invalid dates gracefully', () => {
      const result = component.formatUpdateDate('invalid-date-string');
      expect(result === '' || result === 'Invalid Date').toBe(true);
    });

    it('formatDate should handle Date objects', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = component.formatDate(date);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });

    it('formatDate should return empty string for null', () => {
      const result = component.formatDate(null as any);
      expect(result).toBe('');
    });
  });

  describe('Denial Reason Management', () => {
    it('handleDenyUpdate should handle missing reason gracefully', () => {
      const spy = vi.spyOn(component.onDenyUpdate, 'emit');
      component.denyingUpdateId = 'update-1';
      component.handleDenyUpdate('update-1');
      expect(spy).toHaveBeenCalledWith({ id: 'update-1', reason: null });
    });

    it('cancelDenyingUpdate should handle null denyingUpdateId', () => {
      component.denyingUpdateId = null;
      component.cancelDenyingUpdate();
      expect(component.denyingUpdateId).toBeNull();
    });

    it('startDenyingUpdate should preserve existing reason', () => {
      component.updateDenialReasons.set('update-1', 'Existing reason');
      component.startDenyingUpdate('update-1');
      expect(component.updateDenialReasons.get('update-1')).toBe('Existing reason');
    });
  });

  describe('Edit State Management', () => {
    it('onUpdateSaved should handle null editUpdate', () => {
      const spy = vi.spyOn(component.onUpdateEdited, 'emit');
      component.editUpdate = null;
      component.showEditUpdate = true;
      component.onUpdateSaved();
      expect(spy).not.toHaveBeenCalled();
      expect(component.showEditUpdate).toBe(false);
    });
  });
});
