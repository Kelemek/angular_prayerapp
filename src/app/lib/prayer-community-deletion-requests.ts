export function buildDeletionRequesterName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export type PrayerDeletionRequestInput = {
  prayer_id: string;
  requester_first_name: string;
  requester_last_name: string;
  requester_email: string;
  reason: string;
};

export type UpdateDeletionRequestInput = {
  update_id: string;
  requester_first_name: string;
  requester_last_name: string;
  requester_email: string;
  reason: string;
};

export function buildPrayerDeletionRequestRow(
  requestData: PrayerDeletionRequestInput
): Record<string, unknown> {
  return {
    prayer_id: requestData.prayer_id,
    requested_by: buildDeletionRequesterName(
      requestData.requester_first_name,
      requestData.requester_last_name
    ),
    requested_email: requestData.requester_email,
    reason: requestData.reason,
  };
}

export function buildUpdateDeletionRequestRow(
  requestData: UpdateDeletionRequestInput
): Record<string, unknown> {
  return {
    update_id: requestData.update_id,
    requested_by: buildDeletionRequesterName(
      requestData.requester_first_name,
      requestData.requester_last_name
    ),
    requested_email: requestData.requester_email,
    reason: requestData.reason,
  };
}

export function prayerTitleFromDeletionNotifyRow(
  prayerRow: { title?: string } | null | undefined
): string {
  return prayerRow?.title || 'Unknown Prayer';
}

export function prayerTitleFromUpdateDeletionNotifyRow(
  updateRow: { prayers?: { title?: string }; author?: string; content?: string } | null | undefined
): { title: string; author?: string; content?: string } {
  return {
    title: updateRow?.prayers?.title || 'Unknown Prayer',
    author: updateRow?.author || undefined,
    content: updateRow?.content || undefined,
  };
}

export function buildPrayerDeletionAdminNotificationPayload(
  title: string,
  reason: string,
  requester: string,
  requestId: string | undefined
): {
  type: 'deletion';
  title: string;
  reason: string;
  requester: string;
  requestId: string | undefined;
} {
  return {
    type: 'deletion',
    title,
    reason,
    requester,
    requestId,
  };
}

export function buildUpdateDeletionAdminNotificationPayload(
  notify: { title: string; author?: string; content?: string },
  reason: string,
  requester: string,
  requestId: string | undefined
): {
  type: 'deletion';
  title: string;
  reason: string;
  requester: string;
  author?: string;
  content?: string;
  requestId: string | undefined;
} {
  return {
    type: 'deletion',
    title: notify.title,
    reason,
    requester,
    author: notify.author,
    content: notify.content,
    requestId,
  };
}

export function prayerDeletionAdminNotificationFromRow(
  prayerRow: { title?: string } | null | undefined,
  reason: string,
  requester: string,
  requestId: string | undefined
): ReturnType<typeof buildPrayerDeletionAdminNotificationPayload> {
  return buildPrayerDeletionAdminNotificationPayload(
    prayerTitleFromDeletionNotifyRow(prayerRow),
    reason,
    requester,
    requestId
  );
}

export function updateDeletionAdminNotificationFromRow(
  updateRow: {
    prayers?: { title?: string };
    author?: string;
    content?: string;
  } | null | undefined,
  reason: string,
  requester: string,
  requestId: string | undefined
): ReturnType<typeof buildUpdateDeletionAdminNotificationPayload> {
  return buildUpdateDeletionAdminNotificationPayload(
    prayerTitleFromUpdateDeletionNotifyRow(updateRow),
    reason,
    requester,
    requestId
  );
}

export function dispatchAdminNotificationSafe(
  send: () => Promise<unknown>,
  errorLog: string
): void {
  Promise.resolve(send()).catch((err) => console.error(errorLog, err));
}

export async function notifyPrayerDeletionRequestSubmitted(
  requestData: PrayerDeletionRequestInput,
  requestId: string | undefined,
  fetchPrayerRow: () => Promise<{ title?: string } | null | undefined>,
  sendAdminNotification: (
    payload: ReturnType<typeof buildPrayerDeletionAdminNotificationPayload>
  ) => Promise<unknown>
): Promise<void> {
  try {
    const prayerRow = await fetchPrayerRow();
    const requester = buildDeletionRequesterName(
      requestData.requester_first_name,
      requestData.requester_last_name
    );
    dispatchAdminNotificationSafe(
      () =>
        sendAdminNotification(
          prayerDeletionAdminNotificationFromRow(
            prayerRow,
            requestData.reason,
            requester,
            requestId
          )
        ),
      'Failed to send admin notification for prayer deletion request:'
    );
  } catch (notifyErr) {
    console.warn('Could not fetch prayer details for notification:', notifyErr);
  }
}

export async function notifyUpdateDeletionRequestSubmitted(
  requestData: UpdateDeletionRequestInput,
  requestId: string | undefined,
  fetchUpdateRow: () => Promise<{
    prayers?: { title?: string };
    author?: string;
    content?: string;
  } | null | undefined>,
  sendAdminNotification: (
    payload: ReturnType<typeof buildUpdateDeletionAdminNotificationPayload>
  ) => Promise<unknown>
): Promise<void> {
  try {
    const updateRow = await fetchUpdateRow();
    const requester = buildDeletionRequesterName(
      requestData.requester_first_name,
      requestData.requester_last_name
    );
    dispatchAdminNotificationSafe(
      () =>
        sendAdminNotification(
          updateDeletionAdminNotificationFromRow(
            updateRow,
            requestData.reason,
            requester,
            requestId
          )
        ),
      'Failed to send admin notification for update deletion request:'
    );
  } catch (notifyErr) {
    console.warn('Could not fetch update/prayer details for notification:', notifyErr);
  }
}
