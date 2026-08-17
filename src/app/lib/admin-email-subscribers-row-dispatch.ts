import type {
  EmailSubscriberRow,
  EmailSubscriberRowAction,
} from './admin-email-subscribers';

export interface EmailSubscriberRowHandlers {
  toggleActive: (id: string, currentActive: boolean) => void;
  toggleReceivePush: (id: string, currentReceivePush: boolean) => void;
  toggleBlocked: (id: string, currentBlocked: boolean) => void;
  edit: (subscriber: EmailSubscriberRow) => void;
  delete: (id: string, email: string) => void;
}

export function dispatchEmailSubscriberRowAction(
  subscriber: EmailSubscriberRow,
  action: EmailSubscriberRowAction,
  handlers: EmailSubscriberRowHandlers,
): void {
  switch (action.type) {
    case 'toggleActive':
      handlers.toggleActive(subscriber.id, subscriber.is_active);
      break;
    case 'toggleReceivePush':
      handlers.toggleReceivePush(
        subscriber.id,
        subscriber.receive_push ?? false,
      );
      break;
    case 'toggleBlocked':
      handlers.toggleBlocked(subscriber.id, subscriber.is_blocked);
      break;
    case 'edit':
      handlers.edit(subscriber);
      break;
    case 'delete':
      handlers.delete(subscriber.id, subscriber.email);
      break;
    default: {
      const neverAction: never = action;
      return neverAction;
    }
  }
}
