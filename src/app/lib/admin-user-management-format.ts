import type { AdminUser } from './admin-user-management';

export function formatAdminUserDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function adminUsersReceivingEmailsCount(admins: AdminUser[]): number {
  return admins.filter((a) => a.receive_admin_emails).length;
}

export function adminUsersReceivingPushCount(admins: AdminUser[]): number {
  return admins.filter((a) => a.receive_admin_push).length;
}
