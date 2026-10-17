import { isMemberPrayerId } from './prayer-card-kind';
import { isCurrentUserPrayerRequester } from './prayer-card-user-context';

export type PrayerCardPolicy = 'everyone' | 'original-requestor' | 'admin-only';

export interface PrayerCardPermissionContext {
  prayerId: string;
  prayerEmail: string | null | undefined;
  isAdmin: boolean;
  isPersonal: boolean;
  deletionsAllowed: PrayerCardPolicy;
  updatesAllowed: PrayerCardPolicy;
  currentUserEmail: string;
}

export function showPrayerCardDeleteButton(
  ctx: PrayerCardPermissionContext
): boolean {
  if (isMemberPrayerId(ctx.prayerId)) return false;
  if (ctx.isPersonal) return true;
  if (ctx.isAdmin) return true;
  if (ctx.deletionsAllowed === 'admin-only') return false;
  if (ctx.deletionsAllowed === 'original-requestor') {
    return isCurrentUserPrayerRequester(ctx.currentUserEmail, ctx.prayerEmail);
  }
  return true;
}

export function showPrayerCardAddUpdateButton(
  ctx: PrayerCardPermissionContext
): boolean {
  if (ctx.isPersonal) return true;
  if (isMemberPrayerId(ctx.prayerId)) return true;
  if (ctx.isAdmin) return true;
  if (ctx.updatesAllowed === 'admin-only') return false;
  if (ctx.updatesAllowed === 'original-requestor') {
    return isCurrentUserPrayerRequester(ctx.currentUserEmail, ctx.prayerEmail);
  }
  return true;
}

export function showPrayerCardUpdateDeleteButton(
  ctx: PrayerCardPermissionContext
): boolean {
  if (ctx.isAdmin) return true;
  if (ctx.deletionsAllowed === 'admin-only') return false;
  if (ctx.deletionsAllowed === 'original-requestor') {
    return isCurrentUserPrayerRequester(ctx.currentUserEmail, ctx.prayerEmail);
  }
  return true;
}

/** Member-note edit, mark-answered, and delete. Admins can change any note. */
export function canManageMemberPrayerUpdate(input: {
  isAdmin: boolean;
  currentUserEmail: string | null | undefined;
  authorEmail: string | null | undefined;
}): boolean {
  if (input.isAdmin) return true;
  const current = input.currentUserEmail?.trim().toLowerCase() ?? '';
  const author = input.authorEmail?.trim().toLowerCase() ?? '';
  return current.length > 0 && current === author;
}

export type PrayerUpdateDeleteAction = 'confirm' | 'request' | 'none';

/** One answer for the delete button and the dialog that follows it. */
export function prayerUpdateDeleteAction(input: {
  isMember: boolean;
  isAdmin: boolean;
  isPersonal: boolean;
  currentUserEmail: string | null | undefined;
  authorEmail: string | null | undefined;
}): PrayerUpdateDeleteAction {
  if (input.isMember) {
    return canManageMemberPrayerUpdate(input) ? 'confirm' : 'none';
  }
  if (input.isAdmin || input.isPersonal) return 'confirm';
  return 'request';
}
