import type { CalendarEvent } from "@/lib/types";
import type { CalendarProvider } from "../types";
import { applyCalendarFilters } from "./filter";

const MIN = 60_000;

/** Seeded events placed relative to "now" so the demo always looks alive. */
export function mockEvents(now = new Date()): CalendarEvent[] {
  const halfHour = 30 * MIN;
  const nextSlot = Math.ceil(now.getTime() / halfHour) * halfHour;
  const at = (offsetMin: number) => new Date(nextSlot + offsetMin * MIN).toISOString();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  return [
    { id: "mock-review", title: "Design review", start: at(30), end: at(90), allDay: false, status: "confirmed", isPrivate: false, location: "Studio" },
    { id: "mock-deep", title: "Deep work", start: at(180), end: at(300), allDay: false, status: "confirmed", isPrivate: false },
    { id: "mock-declined", title: "Vendor sync", start: at(120), end: at(150), allDay: false, status: "declined", isPrivate: false },
    { id: "mock-private", title: "Dentist", start: at(420), end: at(480), allDay: false, status: "confirmed", isPrivate: true },
    {
      id: "mock-allday",
      title: "Studio day",
      start: startOfDay.toISOString(),
      end: new Date(startOfDay.getTime() + 24 * 60 * MIN).toISOString(),
      allDay: true,
      status: "confirmed",
      isPrivate: false,
    },
  ];
}

export const mockCalendarProvider: CalendarProvider = {
  id: "mock",
  async getUpcoming(query) {
    const now = new Date();
    return {
      ok: true,
      source: "mock",
      fetchedAt: now.toISOString(),
      data: { accountLabel: "Demo calendar", events: applyCalendarFilters(mockEvents(now), query, now) },
    };
  },
};
