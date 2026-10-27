/** Scope the new-prayer form is forced to. Header Request passes null and shows the full picker. */
export type PrayerFormLock =
  | { scope: "personal" }
  | { scope: "group"; groupId: string | null }
  | { scope: "church" };
