import type { AdminNotificationPayload } from "./email-notification-types";

export function adminNotificationPushBody(
  payload: AdminNotificationPayload
): string {
  switch (payload.type) {
    case "prayer":
      return `New prayer request${
        payload.requester ? ` from ${payload.requester}` : ""
      }.`;
    case "update":
      return `New update${payload.author ? ` from ${payload.author}` : ""}.`;
    case "deletion":
      return `Deletion request for ${payload.title}.`;
    default: {
      const neverType: never = payload.type;
      void neverType;
      return "Action required in admin.";
    }
  }
}
