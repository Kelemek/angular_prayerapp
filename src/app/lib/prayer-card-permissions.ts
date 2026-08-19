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
