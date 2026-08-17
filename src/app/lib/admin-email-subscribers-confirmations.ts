export interface EmailSubscriberConfirmationDialogState {
  title: string;
  message: string;
  details: string | null;
  confirmText: string;
  isDangerous: boolean;
}

export type EmailSubscriberConfirmationKind =
  | 'toggleActive'
  | 'toggleReceivePush'
  | 'toggleBlocked'
  | 'delete';

export interface EmailSubscriberConfirmationAction {
  kind: EmailSubscriberConfirmationKind;
  id: string;
  email?: string;
  currentActive?: boolean;
  currentReceivePush?: boolean;
  currentBlocked?: boolean;
  isAdmin?: boolean;
}

export function buildEmailSubscriberActiveToggleConfirmation(
  email: string,
  currentActive: boolean,
): EmailSubscriberConfirmationDialogState {
  return {
    title: currentActive ? 'Deactivate Subscriber' : 'Activate Subscriber',
    message: currentActive
      ? `Are you sure you want to stop sending email notifications to ${email}?`
      : `Are you sure you want to start sending email notifications to ${email}?`,
    details: currentActive
      ? 'This user will no longer receive prayer request emails.'
      : 'This user will begin receiving prayer request emails again.',
    confirmText: currentActive ? 'Deactivate' : 'Activate',
    isDangerous: false,
  };
}

export function buildEmailSubscriberPushToggleConfirmation(
  email: string,
  currentReceivePush: boolean,
): EmailSubscriberConfirmationDialogState {
  return {
    title: currentReceivePush
      ? 'Disable push notifications'
      : 'Enable push notifications',
    message: currentReceivePush
      ? `Stop sending push notifications to ${email}?`
      : `Start sending push notifications to ${email}?`,
    details: currentReceivePush
      ? 'This user will no longer receive push notifications on their devices.'
      : 'This user will receive push notifications on their devices.',
    confirmText: currentReceivePush ? 'Disable' : 'Enable',
    isDangerous: false,
  };
}

export function buildEmailSubscriberBlockedToggleConfirmation(
  email: string,
  currentBlocked: boolean,
): EmailSubscriberConfirmationDialogState {
  if (currentBlocked) {
    return {
      title: 'Unblock User',
      message: `Unblock ${email}?`,
      details: 'This user will be able to log in to the site again.',
      confirmText: 'Unblock',
      isDangerous: false,
    };
  }
  return {
    title: 'Block User',
    message: `Block ${email}?`,
    details: 'This user will not be able to log in to the site.',
    confirmText: 'Block',
    isDangerous: true,
  };
}

export function buildEmailSubscriberDeleteConfirmation(
  email: string,
  isAdmin: boolean,
): EmailSubscriberConfirmationDialogState {
  const message = `Are you sure you want to remove ${email} from the subscriber list?`;
  return {
    title: 'Remove Subscriber',
    message,
    details: isAdmin
      ? 'This admin will be unsubscribed from emails but will retain admin access to the portal.'
      : 'This action will permanently delete the subscriber record.',
    confirmText: 'Delete',
    isDangerous: true,
  };
}
