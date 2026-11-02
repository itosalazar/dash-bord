import type { CalendarEvent, CalendarQuery } from "@/lib/types";

/** Shared by every calendar provider so mock and production behave the same. */
export function applyCalendarFilters(events: CalendarEvent[], query: CalendarQuery, now = new Date()): CalendarEvent[] {
  const windowEnd = now.getTime() + query.hours * 3_600_000;
  return events
    .filter((event) => {
      const start = Date.parse(event.start);
      const end = Date.parse(event.end);
      if (Number.isNaN(start) || Number.isNaN(end)) return false;
      if (end <= now.getTime() || start >= windowEnd) return false;
      if (query.hideDeclined && event.status === "declined") return false;
      if (query.hideAllDay && event.allDay) return false;
      if (query.hidePrivate && event.isPrivate) return false;
      return true;
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
