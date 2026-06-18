import type { CalendarEventItem } from "../pages/AssociationEventsView";
import { PORTAL_KV } from "../config/portalKeys";
import { pushPortalKv } from "./portalSync";

/** Общий календарь РАДОР/АДО — виден подрядчикам в «Ближайшие мероприятия». */
export const SHARED_CALENDAR_EVENTS_KEY = "trassa-association-calendar-events-v1";

export const SHARED_CALENDAR_UPDATED_EVENT = "trassa-shared-calendar-updated";

export function loadSharedCalendarEvents(): CalendarEventItem[] {
  try {
    const raw = localStorage.getItem(SHARED_CALENDAR_EVENTS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data as CalendarEventItem[];
  } catch {
    return [];
  }
}

export function saveSharedCalendarEvents(events: CalendarEventItem[]): void {
  try {
    pushPortalKv(PORTAL_KV.CALENDAR_EVENTS, events);
  } catch {
    /* ignore */
  }
}
