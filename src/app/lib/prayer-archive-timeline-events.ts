import type { PrayerRequest } from '../services/prayer.service';
import {
  formatPrayerArchiveTimelineDayLabel,
  prayerArchiveTimelineLocalDateAtMidnight,
  prayerArchiveTimelineLocalDateString,
  prayerArchiveTimelineNextDailyRunAfterUtc,
} from './prayer-archive-timeline-calendar';
import type {
  PrayerArchiveTimelineConfig,
  PrayerArchiveTimelineDay,
  PrayerArchiveTimelineEvent,
  PrayerArchiveTimelineEventType,
} from './prayer-archive-timeline-types';

const EVENT_TYPE_SORT_ORDER: Record<PrayerArchiveTimelineEventType, number> = {
  'reminder-upcoming': 1,
  'reminder-sent': 2,
  'reminder-missed': 3,
  'archive-upcoming': 4,
  'archive-missed': 5,
  answered: 6,
  archived: 7,
};

export function buildPrayerArchiveTimelineEvents(
  prayers: PrayerRequest[],
  config: PrayerArchiveTimelineConfig
): PrayerArchiveTimelineEvent[] {
  const allEvents: PrayerArchiveTimelineEvent[] = [];
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  const { userTimezone } = config;

  const today = new Date();
  const todayLocalStr = prayerArchiveTimelineLocalDateString(today, userTimezone);
  const [todayYear, todayMonth, todayDay] = todayLocalStr.split('-').map(Number);
  const todayLocal = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay, 12, 0, 0));

  for (const prayer of prayers) {
    if (prayer.status === 'answered' && prayer.updated_at) {
      const answeredDate = prayerArchiveTimelineLocalDateAtMidnight(
        new Date(prayer.updated_at),
        userTimezone
      );

      allEvents.push({
        date: answeredDate,
        prayer: { id: prayer.id, title: prayer.title },
        eventType: 'answered',
        daysUntil: 0,
      });
      continue;
    }

    if (prayer.status === 'archived' && prayer.updated_at) {
      const archivedDate = prayerArchiveTimelineLocalDateAtMidnight(
        new Date(prayer.updated_at),
        userTimezone
      );

      allEvents.push({
        date: archivedDate,
        prayer: { id: prayer.id, title: prayer.title },
        eventType: 'archived',
        daysUntil: 0,
      });
      continue;
    }

    if (prayer.status !== 'current') {
      continue;
    }

    const lastActivityDate: Date | null =
      prayer.updates?.length > 0 ? new Date(prayer.updates[0].created_at) : null;

    const lastReminderSent = prayer.last_reminder_sent;
    const lastActivityExactDate = lastActivityDate
      ? new Date(lastActivityDate)
      : new Date(prayer.created_at);

    if (lastReminderSent) {
      const lastReminderDate = prayerArchiveTimelineLocalDateAtMidnight(
        new Date(lastReminderSent),
        userTimezone
      );

      const reminderDaysInPast = Math.ceil(
        (todayLocal.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (reminderDaysInPast < 0) {
        continue;
      }

      let hasUpdateAfterReminder = false;
      if (lastActivityDate) {
        const lastActivityLocalDate = prayerArchiveTimelineLocalDateAtMidnight(
          lastActivityDate,
          userTimezone
        );
        if (lastActivityLocalDate > lastReminderDate) {
          hasUpdateAfterReminder = true;
        }
      }

      if (!hasUpdateAfterReminder) {
        const archiveDate = new Date(lastReminderDate);
        archiveDate.setDate(archiveDate.getDate() + config.daysBeforeArchive);

        const archiveDaysUntil = Math.ceil(
          (archiveDate.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24)
        );
        const archiveRunAt = prayerArchiveTimelineNextDailyRunAfterUtc(
          new Date(
            new Date(lastReminderSent).getTime() +
              config.daysBeforeArchive * millisecondsInDay
          ),
          config.reminderJobHourUtc,
          config.reminderJobMinuteUtc
        );
        if (archiveDaysUntil <= -2) {
          allEvents.push({
            date: archiveRunAt,
            prayer: { id: prayer.id, title: prayer.title },
            eventType: 'archive-missed',
            daysUntil: 0,
          });
        } else if (archiveDaysUntil > 0) {
          allEvents.push({
            date: archiveRunAt,
            prayer: { id: prayer.id, title: prayer.title },
            eventType: 'archive-upcoming',
            daysUntil: archiveDaysUntil,
          });
        }
      }

      allEvents.push({
        date: lastReminderDate,
        prayer: { id: prayer.id, title: prayer.title },
        eventType: 'reminder-sent',
        daysUntil: 0,
      });
    } else {
      let baseDate: Date;
      if (lastActivityDate) {
        baseDate = prayerArchiveTimelineLocalDateAtMidnight(lastActivityDate, userTimezone);
      } else {
        baseDate = prayerArchiveTimelineLocalDateAtMidnight(
          new Date(prayer.created_at),
          userTimezone
        );
      }

      const nextReminderDate = new Date(baseDate);
      nextReminderDate.setDate(nextReminderDate.getDate() + config.reminderIntervalDays);
      const nextReminderDueExact = new Date(
        lastActivityExactDate.getTime() +
          config.reminderIntervalDays * millisecondsInDay
      );
      const nextReminderRunAt = prayerArchiveTimelineNextDailyRunAfterUtc(
        nextReminderDueExact,
        config.reminderJobHourUtc,
        config.reminderJobMinuteUtc
      );

      const reminderDaysUntil = Math.ceil(
        (nextReminderDate.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (reminderDaysUntil <= -2) {
        allEvents.push({
          date: nextReminderRunAt,
          prayer: { id: prayer.id, title: prayer.title },
          eventType: 'reminder-missed',
          daysUntil: 0,
        });

        const archiveDate = new Date(nextReminderDate);
        archiveDate.setDate(archiveDate.getDate() + config.daysBeforeArchive);
        const archiveRunAt = prayerArchiveTimelineNextDailyRunAfterUtc(
          new Date(
            nextReminderDueExact.getTime() + config.daysBeforeArchive * millisecondsInDay
          ),
          config.reminderJobHourUtc,
          config.reminderJobMinuteUtc
        );
        const archiveDaysUntil = Math.ceil(
          (archiveDate.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (archiveDaysUntil <= -2) {
          allEvents.push({
            date: archiveRunAt,
            prayer: { id: prayer.id, title: prayer.title },
            eventType: 'archive-missed',
            daysUntil: 0,
          });
        } else if (archiveDaysUntil > 0) {
          allEvents.push({
            date: archiveRunAt,
            prayer: { id: prayer.id, title: prayer.title },
            eventType: 'archive-upcoming',
            daysUntil: archiveDaysUntil,
          });
        }
      } else {
        allEvents.push({
          date: nextReminderRunAt,
          prayer: { id: prayer.id, title: prayer.title },
          eventType: 'reminder-upcoming',
          daysUntil: reminderDaysUntil,
        });
      }
    }
  }

  return allEvents;
}

export function computePrayerArchiveTimelineMonthBounds(
  events: PrayerArchiveTimelineEvent[],
  userTimezone: string
): { minMonth: Date | null; maxMonth: Date | null } {
  if (events.length === 0) {
    return { minMonth: null, maxMonth: null };
  }

  const months = events.map((e) => {
    const [year, month] = prayerArchiveTimelineLocalDateString(e.date, userTimezone)
      .split('-')
      .map(Number);
    return new Date(year, month - 1, 1);
  });

  return {
    minMonth: new Date(Math.min(...months.map((d) => d.getTime()))),
    maxMonth: new Date(Math.max(...months.map((d) => d.getTime()))),
  };
}

export function filterPrayerArchiveTimelineEventsForMonth(
  events: PrayerArchiveTimelineEvent[],
  currentMonth: Date,
  userTimezone: string
): PrayerArchiveTimelineEvent[] {
  const targetYear = currentMonth.getFullYear();
  const targetMonth = String(currentMonth.getMonth() + 1).padStart(2, '0');
  const targetYearMonth = `${targetYear}-${targetMonth}`;

  return events.filter((event) => {
    const eventYearMonth = prayerArchiveTimelineLocalDateString(event.date, userTimezone).substring(
      0,
      7
    );
    return eventYearMonth === targetYearMonth;
  });
}

export function groupPrayerArchiveTimelineEventsByDay(
  events: PrayerArchiveTimelineEvent[],
  userTimezone: string
): PrayerArchiveTimelineDay[] {
  const groupedByDate = new Map<string, PrayerArchiveTimelineEvent[]>();

  events.forEach((event) => {
    const dateKey = prayerArchiveTimelineLocalDateString(event.date, userTimezone);
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, []);
    }
    groupedByDate.get(dateKey)!.push(event);
  });

  return Array.from(groupedByDate.entries())
    .map(([dateStr, dayEvents]) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      return {
        date,
        dateStr: formatPrayerArchiveTimelineDayLabel(date, userTimezone),
        events: dayEvents.sort(
          (a, b) =>
            EVENT_TYPE_SORT_ORDER[a.eventType] - EVENT_TYPE_SORT_ORDER[b.eventType]
        ),
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
