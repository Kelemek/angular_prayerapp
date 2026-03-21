/** One saved hourly self-reminder slot (local wall clock in an IANA timezone). */
export interface UserPrayerHourReminderSlot {
  id: string;
  iana_timezone: string;
  local_hour: number;
}
