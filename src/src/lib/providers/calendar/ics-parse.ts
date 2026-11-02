import ICAL from "ical.js";
import type { CalendarEvent } from "@/lib/types";

/**
 * Pure iCalendar → CalendarEvent conversion (no I/O, no server-only imports,
 * so it can be tested directly). Expands recurring events and their
 * exceptions inside [rangeStart, rangeEnd).
 */

type IcalEvent = InstanceType<typeof ICAL.Event>;
type IcalTime = InstanceType<typeof ICAL.Time>;

const MAX_ITERATIONS = 50_000;

function iso(time: IcalTime): string {
  // All-day dates have no zone; anchor them to local midnight like the Google provider.
  return time.isDate ? `${time.toString()}T00:00:00` : time.toJSDate().toISOString();
}

function toEvent(item: IcalEvent, start: IcalTime, end: IcalTime, id: string, owner: string | null): CalendarEvent | null {
  const component = item.component;
  if (String(component.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") return null;

  const klass = String(component.getFirstPropertyValue("class") ?? "").toUpperCase();
  const isPrivate = klass === "PRIVATE" || klass === "CONFIDENTIAL";

  let status: CalendarEvent["status"] =
    String(component.getFirstPropertyValue("status") ?? "").toUpperCase() === "TENTATIVE" ? "tentative" : "confirmed";
  if (owner) {
    const me = item.attendees.find((a) => String(a.getFirstValue() ?? "").toLowerCase() === owner);
    const partstat = String(me?.getParameter("partstat") ?? "").toUpperCase();
    if (partstat === "DECLINED") status = "declined";
    else if (partstat === "TENTATIVE") status = "tentative";
  }

  return {
    id,
    title: item.summary?.trim() || (isPrivate ? "Private event" : "Untitled"),
    start: iso(start),
    end: iso(end),
    allDay: start.isDate,
    status,
    isPrivate,
    location: item.location || undefined,
  };
}

export function eventsFromIcs(text: string, rangeStart: Date, rangeEnd: Date): { label?: string; events: CalendarEvent[] } {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);

  // Google names the primary calendar after the account email; use it to find "my" RSVP.
  const label = String(root.getFirstPropertyValue("x-wr-calname") ?? "") || undefined;
  const owner = label?.includes("@") ? `mailto:${label.toLowerCase()}` : null;

  const from = ICAL.Time.fromJSDate(rangeStart, true);
  const to = ICAL.Time.fromJSDate(rangeEnd, true);

  const masters = new Map<string, IcalEvent>();
  const singles: IcalEvent[] = [];
  const exceptions: IcalEvent[] = [];
  for (const vevent of root.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(vevent);
    if (event.isRecurrenceException()) exceptions.push(event);
    else if (event.isRecurring()) masters.set(event.uid, event);
    else singles.push(event);
  }
  for (const exception of exceptions) {
    const master = masters.get(exception.uid);
    if (master) master.relateException(exception);
    else singles.push(exception);
  }

  const events: CalendarEvent[] = [];
  const add = (item: IcalEvent, start: IcalTime, end: IcalTime, id: string) => {
    if (end.compare(from) <= 0 || start.compare(to) >= 0) return;
    const event = toEvent(item, start, end, id, owner);
    if (event) events.push(event);
  };

  for (const event of singles) add(event, event.startDate, event.endDate ?? event.startDate, event.uid);

  for (const master of masters.values()) {
    const iterator = master.iterator();
    for (let i = 0, next = iterator.next(); next && i < MAX_ITERATIONS; i++, next = iterator.next()) {
      if (next.compare(to) >= 0) break;
      const details = master.getOccurrenceDetails(next);
      add(details.item, details.startDate, details.endDate, `${master.uid}:${next.toString()}`);
    }
  }

  return { label, events };
}
