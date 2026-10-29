const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function manilaDateParts(now = new Date()) {
  const local = new Date(now.getTime() + MANILA_OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
  };
}

export function manilaMonthYear(now = new Date()) {
  const { year, month } = manilaDateParts(now);
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function manilaDayRange(now = new Date()) {
  const { year, month, day } = manilaDateParts(now);
  const start = new Date(Date.UTC(year, month, day) - MANILA_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
}

export function oneManilaCalendarMonthAgo(now = new Date()) {
  const local = new Date(now.getTime() + MANILA_OFFSET_MS);
  const originalDay = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() - 1);
  const lastDayOfPreviousMonth = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  local.setUTCDate(Math.min(originalDay, lastDayOfPreviousMonth));
  return new Date(local.getTime() - MANILA_OFFSET_MS);
}
