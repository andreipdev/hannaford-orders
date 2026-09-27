/** Receipt date-only strings are parsed as UTC; retain their calendar month. */
export function getMonthKey(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Select calendar months without the 29th–31st overflowing a shorter month. */
export function getDisplayMonth(offset = 0, now = new Date()): string {
  return getMonthKey(new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1)));
}
