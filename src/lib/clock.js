/** Public bar hours in Europe/Rome. Open every day 07:00–02:00. */
export const WEEK = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
  day,
  start: 7 * 60,
  end: 26 * 60,
}));

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function romeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = Number(pick("hour"));
  if (hour === 24) hour = 0;
  const minute = Number(pick("minute"));
  return {
    day: WEEKDAY[pick("weekday")] ?? 0,
    minutes: hour * 60 + minute,
  };
}

function intervals() {
  const week = 7 * 1440;
  const base = WEEK.filter((row) => !row.closed).map((row) => ({
    day: row.day,
    start: row.day * 1440 + row.start,
    end: row.day * 1440 + row.end,
  }));
  return [
    ...base.map((span) => ({ ...span, start: span.start - week, end: span.end - week })),
    ...base,
    ...base.map((span) => ({ ...span, start: span.start + week, end: span.end + week })),
  ];
}

export function formatHM(totalMinutes) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getStatus(date = new Date()) {
  const { day, minutes } = romeParts(date);
  const now = day * 1440 + minutes;
  const spans = intervals();
  const openSpan = spans.find((span) => now >= span.start && now < span.end);
  if (openSpan) {
    return {
      open: true,
      day,
      minutes,
      until: formatHM(openSpan.end),
      nextDay: null,
      nextTime: null,
    };
  }

  const upcoming = spans
    .map((span) => (span.start > now ? span : { ...span, start: span.start + 7 * 1440, end: span.end + 7 * 1440 }))
    .sort((a, b) => a.start - b.start)[0];

  return {
    open: false,
    day,
    minutes,
    until: null,
    nextDay: upcoming.day,
    nextTime: formatHM(upcoming.start),
  };
}

export function rowHours(day) {
  const row = WEEK.find((item) => item.day === day);
  if (!row || row.closed) return null;
  return { open: formatHM(row.start), close: formatHM(row.end) };
}
