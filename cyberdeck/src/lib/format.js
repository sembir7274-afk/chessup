/** Seconds -> `MM:SS`, clamped at zero. */
export function formatDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Minutes -> compact human label, e.g. 95 -> `1h 35m`. */
export function formatMinutes(minutes) {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe}m`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Zero-padded two-digit number for clock read-outs. */
export function pad2(value) {
  return String(value).padStart(2, '0');
}

/** `2077.11.04 // MON` style stardate strip. */
export function formatStardate(date, utc = false) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const y = utc ? date.getUTCFullYear() : date.getFullYear();
  const m = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
  const d = utc ? date.getUTCDate() : date.getDate();
  const wd = days[utc ? date.getUTCDay() : date.getDay()];
  return `${y}.${pad2(m)}.${pad2(d)} // ${wd}`;
}

/** Relative "3m ago" style timestamps for the event log. */
export function formatRelative(timestamp, now = Date.now()) {
  const delta = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (delta < 5) return 'now';
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}
