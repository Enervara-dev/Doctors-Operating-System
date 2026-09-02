const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses `YYYY-MM-DD` into a UTC-midnight timestamp, avoiding DST drift. */
function toUtcTimestamp(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function fromUtcTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/** The server's local calendar date as `YYYY-MM-DD`. */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  return fromUtcTimestamp(toUtcTimestamp(isoDate) + days * MS_PER_DAY);
}

export function differenceInDays(fromIsoDate: string, toIsoDate: string): number {
  return Math.round((toUtcTimestamp(toIsoDate) - toUtcTimestamp(fromIsoDate)) / MS_PER_DAY);
}

export function compareIsoDates(a: string, b: string): number {
  return toUtcTimestamp(a) - toUtcTimestamp(b);
}

export function minutesFromNow(minutes: number, now: Date = new Date()): string {
  return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
}
