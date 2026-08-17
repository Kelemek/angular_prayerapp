import type {
  PrayerEditorCardAction,
  PrayerEditorPrayer,
  PrayerEditorUpdate,
} from './admin-prayer-editor-types';

export interface PrayerEditorCardHandlers {
  toggleSelect: (prayerId: string) => void;
  toggleExpand: (prayerId: string) => void;
  startEdit: (prayer: PrayerEditorPrayer) => void;
  cancelEdit: () => void;
  saveEdit: (prayerId: string) => Promise<void>;
  delete: (prayer: PrayerEditorPrayer) => Promise<void>;
  startAddUpdate: (prayerId: string) => void;
  cancelAddUpdate: () => void;
  saveNewUpdate: (prayerId: string) => Promise<void>;
  deleteUpdate: (
    prayerId: string,
    updateId: string,
    content: string,
  ) => Promise<void>;
  startEditUpdate: (prayerId: string, update: PrayerEditorUpdate) => void;
  cancelEditUpdate: () => void;
  saveEditUpdate: (prayerId: string, updateId: string) => Promise<void>;
  flushEditDescription: (prayerId: string) => void;
}

export async function dispatchPrayerEditorCardAction(
  prayer: PrayerEditorPrayer,
  action: PrayerEditorCardAction,
  handlers: PrayerEditorCardHandlers,
): Promise<void> {
  switch (action.type) {
    case 'toggleSelect':
      handlers.toggleSelect(prayer.id);
      break;
    case 'toggleExpand':
      handlers.toggleExpand(prayer.id);
      break;
    case 'startEdit':
      handlers.startEdit(prayer);
      break;
    case 'cancelEdit':
      handlers.cancelEdit();
      break;
    case 'saveEdit':
      handlers.flushEditDescription(prayer.id);
      await handlers.saveEdit(prayer.id);
      break;
    case 'delete':
      await handlers.delete(prayer);
      break;
    case 'startAddUpdate':
      handlers.startAddUpdate(prayer.id);
      break;
    case 'cancelAddUpdate':
      handlers.cancelAddUpdate();
      break;
    case 'saveNewUpdate':
      await handlers.saveNewUpdate(prayer.id);
      break;
    case 'deleteUpdate':
      await handlers.deleteUpdate(prayer.id, action.updateId, action.content);
      break;
    case 'startEditUpdate':
      handlers.startEditUpdate(prayer.id, action.update);
      break;
    case 'cancelEditUpdate':
      handlers.cancelEditUpdate();
      break;
    case 'saveEditUpdate':
      await handlers.saveEditUpdate(prayer.id, action.updateId);
      break;
    case 'addUpdateSubscriberSelected':
      break;
    default: {
      const neverAction: never = action;
      return neverAction;
    }
  }
}
