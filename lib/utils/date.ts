const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** `"14:30"` -> `"2:30 PM"`. */
export function formatTime(time24: string): string {
  const [rawHours, rawMinutes] = time24.split(":");
  const hours = Number(rawHours);
  if (!Number.isFinite(hours)) return time24;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${rawMinutes ?? "00"} ${suffix}`;
}

/** `"2026-09-04"` -> `"Fri, 4 Sep"`. */
export function formatShortDate(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * `"2025-09-15"` -> `"15 Sep 2025"`. Always carries the year: historical
 * records span years, and a bare day-month reads as the current one.
 */
export function formatHistoricalDate(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** `"2026-09-04"` -> `"Friday, 4 September 2026"`. */
export function formatLongDate(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Human day label relative to today: "Today", "Tomorrow", or a short date. */
export function formatRelativeDay(isoDate: string, now: Date = new Date()): string {
  const target = parseIsoDate(isoDate).getTime();
  const today = parseIsoDate(todayIsoDate(now)).getTime();
  const dayDelta = Math.round((target - today) / DAY_MS);

  if (dayDelta === 0) return "Today";
  if (dayDelta === 1) return "Tomorrow";
  if (dayDelta === -1) return "Yesterday";
  return formatShortDate(isoDate);
}

/** `"2026-09-04"` + `"14:30"` -> `"Today · 2:30 PM"`. */
export function formatDayAndTime(isoDate: string, time24: string): string {
  return `${formatRelativeDay(isoDate)} · ${formatTime(time24)}`;
}

export function greetingForHour(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** `"2026-09-02T11:42:00Z"` -> `"2 Sep 2026 · 11:42"`. Used by the audit trail. */
export function formatTimestamp(isoTimestamp: string): string {
  const value = new Date(isoTimestamp);
  if (Number.isNaN(value.getTime())) return isoTimestamp;
  return `${value.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${value.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}
