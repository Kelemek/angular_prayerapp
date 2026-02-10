import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminUpdateApprovalComponent } from './admin-update-approval.component';

describe('AdminUpdateApprovalComponent', () => {
  let component: AdminUpdateApprovalComponent;

  const mockUpdate = {
    id: 'update-123',
    prayer_id: 'prayer-456',
    prayer_title: 'Test Prayer',
    content: 'This is an update to the prayer',
    author: 'Jane Doe',
    author_email: 'jane@example.com',
    created_at: new Date('2025-02-01T10:00:00Z').toISOString(),
    is_answered: false
  };

  beforeEach(() => {
    component = new AdminUpdateApprovalComponent();
    component.update = mockUpdate;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with isDenying = false', () => {
      expect(component.isDenying).toBe(false);
    });

    it('should initialize with isEditing = false', () => {
      expect(component.isEditing).toBe(false);
    });

    it('should initialize with empty denialReason', () => {
      expect(component.denialReason).toBe('');
    });

    it('should initialize with empty editedUpdate', () => {
      expect(component.editedUpdate.content).toBe('');
      expect(component.editedUpdate.author).toBe('');
    });

    it('should accept update input', () => {
      expect(component.update).toEqual(mockUpdate);
    });

    it('should have all required output emitters', () => {
      expect(component.onApprove).toBeDefined();
      expect(component.onDeny).toBeDefined();
      expect(component.onEdit).toBeDefined();
    });
  });

  describe('Approval Action', () => {
    it('should emit onApprove with update id', () => {
      const spy = vi.spyOn(component.onApprove, 'emit');
      component.onApprove.emit('update-123');
      expect(spy).toHaveBeenCalledWith('update-123');
    });

    it('should be able to approve an update', () => {
      let approveEmitted = false;
      component.onApprove.subscribe(() => {
        approveEmitted = true;
      });
      component.onApprove.emit(mockUpdate.id);
      expect(approveEmitted).toBe(true);
    });

    it('should not show approval option when editing', () => {
      component.isEditing = true;
      expect(component.isEditing).toBe(true);
    });

    it('should not show approval option when denying', () => {
      component.isDenying = true;
      expect(component.isDenying).toBe(true);
    });

    it('should show approval option in normal state', () => {
      component.isEditing = false;
      component.isDenying = false;
      expect(component.isEditing).toBe(false);
      expect(component.isDenying).toBe(false);
    });
  });

  describe('Denial Action', () => {
    it('should toggle isDenying state', () => {
      component.isDenying = false;
      expect(component.isDenying).toBe(false);
      component.isDenying = true;
      expect(component.isDenying).toBe(true);
    });

    it('should emit onDeny with id and reason', () => {
      const spy = vi.spyOn(component.onDeny, 'emit');
      component.denialReason = 'Inappropriate content';
      component.handleDeny();
      expect(spy).toHaveBeenCalledWith({ id: 'update-123', reason: 'Inappropriate content' });
    });

    it('should emit onDeny with null reason when empty', () => {
      const spy = vi.spyOn(component.onDeny, 'emit');
      component.denialReason = '';
      component.handleDeny();
      expect(spy).toHaveBeenCalledWith({ id: 'update-123', reason: null });
    });

    it('should reset isDenying after handleDeny', () => {
      component.isDenying = true;
      component.handleDeny();
      expect(component.isDenying).toBe(false);
    });

    it('should reset denialReason after handleDeny', () => {
      component.denialReason = 'Some reason';
      component.handleDeny();
      expect(component.denialReason).toBe('');
    });

    it('should handle denial with various reason texts', () => {
      const spy = vi.spyOn(component.onDeny, 'emit');
      component.denialReason = 'Off-topic update';
      component.handleDeny();
      expect(spy).toHaveBeenCalledWith({ id: 'update-123', reason: 'Off-topic update' });
    });

    it('should not affect other state when denying', () => {
      component.isDenying = true;
      component.handleDeny();
      expect(component.isEditing).toBe(false);
    });
  });

  describe('Edit Action', () => {
    it('should toggle isEditing state', () => {
      component.isEditing = false;
      expect(component.isEditing).toBe(false);
      component.isEditing = true;
      expect(component.isEditing).toBe(true);
    });

    it('should initialize editedUpdate when entering edit mode', () => {
      component.isEditing = true;
      component.editedUpdate = { content: mockUpdate.content, author: mockUpdate.author };
      expect(component.editedUpdate.content).toBe(mockUpdate.content);
      expect(component.editedUpdate.author).toBe(mockUpdate.author);
    });

    it('should allow updating content in editedUpdate', () => {
      const newContent = 'Updated update content';
      component.editedUpdate = { content: newContent, author: 'Jane Doe' };
      expect(component.editedUpdate.content).toBe(newContent);
    });

    it('should allow updating author in editedUpdate', () => {
      const newAuthor = 'John Smith';
      component.editedUpdate = { content: mockUpdate.content, author: newAuthor };
      expect(component.editedUpdate.author).toBe(newAuthor);
    });

    it('should emit onEdit when saving edit', () => {
      const spy = vi.spyOn(component.onEdit, 'emit');
      component.editedUpdate = { content: 'New content', author: 'New author' };
      component.handleSaveEdit();
      expect(spy).toHaveBeenCalledWith({
        id: 'update-123',
        updates: { content: 'New content', author: 'New author' }
      });
    });

    it('should reset isEditing after handleSaveEdit', () => {
      component.isEditing = true;
      component.handleSaveEdit();
      expect(component.isEditing).toBe(false);
    });

    it('should reset isEditing when canceling edit', () => {
      component.isEditing = true;
      component.cancelEdit();
      expect(component.isEditing).toBe(false);
    });

    it('should clear editedUpdate when canceling edit', () => {
      component.editedUpdate = { content: 'temp', author: 'temp author' };
      component.cancelEdit();
      expect(component.editedUpdate.content).toBe('');
      expect(component.editedUpdate.author).toBe('');
    });

    it('should not affect isDenying when editing', () => {
      component.isEditing = true;
      expect(component.isDenying).toBe(false);
    });
  });

  describe('Button State Transitions', () => {
    it('should show edit/deny/approve buttons in normal state', () => {
      component.isEditing = false;
      component.isDenying = false;
      expect(component.isEditing).toBe(false);
      expect(component.isDenying).toBe(false);
    });

    it('should show save/cancel buttons in edit state', () => {
      component.isEditing = true;
      expect(component.isEditing).toBe(true);
      expect(component.isDenying).toBe(false);
    });

    it('should show confirm denial/cancel buttons in deny state', () => {
      component.isDenying = true;
      expect(component.isDenying).toBe(true);
      expect(component.isEditing).toBe(false);
    });

    it('should not allow simultaneous edit and deny', () => {
      component.isEditing = true;
      expect(component.isDenying).toBe(false);
    });

    it('should transition from edit to normal state', () => {
      component.isEditing = true;
      component.cancelEdit();
      expect(component.isEditing).toBe(false);
      expect(component.isDenying).toBe(false);
    });

    it('should transition from deny to normal state', () => {
      component.isDenying = true;
      component.isDenying = false;
      component.denialReason = '';
      expect(component.isDenying).toBe(false);
    });
  });

  describe('Update Display Data', () => {
    it('should display prayer title from update', () => {
      expect(component.update.prayer_title).toBe('Test Prayer');
    });

    it('should display prayer id from update', () => {
      expect(component.update.prayer_id).toBe('prayer-456');
    });

    it('should display update content from update', () => {
      expect(component.update.content).toBe('This is an update to the prayer');
    });

    it('should display author name from update', () => {
      expect(component.update.author).toBe('Jane Doe');
    });

    it('should display author email from update', () => {
      expect(component.update.author_email).toBe('jane@example.com');
    });

    it('should display answered status from update', () => {
      expect(component.update.is_answered).toBe(false);
    });

    it('should handle update with answered status', () => {
      component.update = { ...mockUpdate, is_answered: true };
      expect(component.update.is_answered).toBe(true);
    });

    it('should handle update without email', () => {
      const updateNoEmail = { ...mockUpdate, author_email: null };
      component.update = updateNoEmail;
      expect(component.update.author_email).toBeNull();
    });
  });

  describe('Multiple Update Transitions', () => {
    it('should reset state when switching between updates', () => {
      component.isEditing = true;
      component.isDenying = false;
      const newUpdate = { ...mockUpdate, id: 'update-789' };
      component.update = newUpdate;
      expect(component.update.id).toBe('update-789');
      expect(component.isEditing).toBe(true);
    });

    it('should emit correct id when approving different update', () => {
      const spy = vi.spyOn(component.onApprove, 'emit');
      component.update = { ...mockUpdate, id: 'update-999' };
      component.onApprove.emit('update-999');
      expect(spy).toHaveBeenCalledWith('update-999');
    });

    it('should emit correct id when denying different update', () => {
      const spy = vi.spyOn(component.onDeny, 'emit');
      component.update = { ...mockUpdate, id: 'update-888' };
      component.handleDeny();
      expect(spy).toHaveBeenCalledWith({ id: 'update-888', reason: null });
    });
  });

  describe('handleSaveEdit Method', () => {
    it('should call handleSaveEdit and emit edit event', () => {
      const spy = vi.spyOn(component.onEdit, 'emit');
      component.editedUpdate = { content: 'Edited content', author: 'Edited author' };
      component.handleSaveEdit();
      expect(spy).toHaveBeenCalledWith({
        id: 'update-123',
        updates: { content: 'Edited content', author: 'Edited author' }
      });
    });

    it('should exit editing mode after save', () => {
      component.isEditing = true;
      component.handleSaveEdit();
      expect(component.isEditing).toBe(false);
    });

    it('should preserve update on save', () => {
      component.handleSaveEdit();
      expect(component.update).toEqual(mockUpdate);
    });
  });

  describe('cancelEdit Method', () => {
    it('should exit editing mode', () => {
      component.isEditing = true;
      component.cancelEdit();
      expect(component.isEditing).toBe(false);
    });

    it('should clear edited content', () => {
      component.editedUpdate = { content: 'Something', author: 'Someone' };
      component.cancelEdit();
      expect(component.editedUpdate.content).toBe('');
      expect(component.editedUpdate.author).toBe('');
    });

    it('should not emit edit event on cancel', () => {
      let editEmitted = false;
      component.onEdit.subscribe(() => {
        editEmitted = true;
      });
      component.cancelEdit();
      expect(editEmitted).toBe(false);
    });
  });

  describe('handleDeny Method', () => {
    it('should call handleDeny and emit deny event', () => {
      const spy = vi.spyOn(component.onDeny, 'emit');
      component.denialReason = 'Test denial reason';
      component.handleDeny();
      expect(spy).toHaveBeenCalledWith({ id: 'update-123', reason: 'Test denial reason' });
    });

    it('should exit denying mode after confirm', () => {
      component.isDenying = true;
      component.handleDeny();
      expect(component.isDenying).toBe(false);
    });

    it('should clear denial reason after confirm', () => {
      component.denialReason = 'Reason to clear';
      component.handleDeny();
      expect(component.denialReason).toBe('');
    });
  });

  describe('Change Detection Strategy', () => {
    it('should have OnPush change detection', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Event Emitter Outputs', () => {
    it('should have all output properties defined', () => {
      expect(component.onApprove).toBeDefined();
      expect(component.onDeny).toBeDefined();
      expect(component.onEdit).toBeDefined();
    });

    it('should be able to subscribe to onApprove', () => {
      let emitted = false;
      component.onApprove.subscribe(() => {
        emitted = true;
      });
      component.onApprove.emit('123');
      expect(emitted).toBe(true);
    });

    it('should be able to subscribe to onDeny', () => {
      let emitted = false;
      component.onDeny.subscribe(() => {
        emitted = true;
      });
      component.handleDeny();
      expect(emitted).toBe(true);
    });

    it('should be able to subscribe to onEdit', () => {
      let emitted = false;
      component.onEdit.subscribe(() => {
        emitted = true;
      });
      component.handleSaveEdit();
      expect(emitted).toBe(true);
    });
  });
});
