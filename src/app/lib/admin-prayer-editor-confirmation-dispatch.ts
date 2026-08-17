import type { PrayerEditorConfirmationAction } from './admin-prayer-editor-confirmations';

export interface PrayerEditorConfirmationHandlers {
  bulkStatus: () => Promise<void>;
  deleteMany: () => Promise<void>;
  deleteOne: (prayerId: string) => Promise<void>;
}

export async function dispatchPrayerEditorConfirmation(
  action: PrayerEditorConfirmationAction,
  handlers: PrayerEditorConfirmationHandlers,
): Promise<void> {
  switch (action.kind) {
    case 'bulkStatus':
      await handlers.bulkStatus();
      break;
    case 'deleteMany':
      await handlers.deleteMany();
      break;
    case 'deleteOne':
      if (action.prayerId) {
        await handlers.deleteOne(action.prayerId);
      }
      break;
    default: {
      const neverKind: never = action.kind;
      return neverKind;
    }
  }
}
