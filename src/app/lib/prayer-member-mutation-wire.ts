export const MEMBER_PRAYER_UPDATE_TOAST = {
  addSuccess: 'Update added successfully',
  addFail: 'Failed to add update',
  updateSuccess: 'Update saved successfully',
  updateFail: 'Failed to save update',
  deleteSuccess: 'Update deleted successfully',
  deleteFail: 'Failed to delete update',
} as const;

export async function runMemberPrayerCacheMutation(
  mutation: () => Promise<void>,
  invalidateCaches: () => void,
  reportSuccess: (message: string) => void,
  reportError: (message: string) => void,
  messages: { success: string; fail: string },
  logLabel: string
): Promise<boolean> {
  try {
    await mutation();
    invalidateCaches();
    reportSuccess(messages.success);
    return true;
  } catch (error) {
    console.error(logLabel, error);
    reportError(messages.fail);
    return false;
  }
}
