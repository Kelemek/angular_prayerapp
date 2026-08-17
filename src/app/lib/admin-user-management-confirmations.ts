export interface AdminUserConfirmationDialogState {
  title: string;
  message: string;
  details: string | null;
  confirmText: string;
  isDangerous: boolean;
}

export type AdminUserConfirmationKind =
  | 'toggleReceiveEmails'
  | 'toggleReceivePush'
  | 'removeAdmin';

export interface AdminUserConfirmationAction {
  kind: AdminUserConfirmationKind;
  email: string;
  name: string;
  currentReceiveEmails?: boolean;
  currentReceivePush?: boolean;
}

export function buildAdminUserDisableEmailsConfirmation(
  name: string,
): AdminUserConfirmationDialogState {
  return {
    title: 'Disable email notifications?',
    message: `Stop sending admin email notifications to ${name}?`,
    details:
      'They will no longer receive admin alerts and updates by email. You can turn this back on anytime.',
    confirmText: 'Disable',
    isDangerous: false,
  };
}

export function buildAdminUserDisablePushConfirmation(
  name: string,
): AdminUserConfirmationDialogState {
  return {
    title: 'Disable push notifications?',
    message: `Stop sending admin push notifications to ${name}?`,
    details:
      'They will no longer receive admin alerts on their device. You can turn this back on anytime.',
    confirmText: 'Disable',
    isDangerous: false,
  };
}

export function buildAdminUserRemoveConfirmation(
  name: string,
): AdminUserConfirmationDialogState {
  return {
    title: 'Remove admin access?',
    message: `Remove admin access for ${name}?`,
    details:
      'They will lose all administrative privileges and will no longer be able to sign in to the admin portal. They can be added as an admin again later.',
    confirmText: 'Remove access',
    isDangerous: true,
  };
}
