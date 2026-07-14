/**
 * Single source of truth for all date/period logic in the app.
 * Change fiscal year rules here only — nowhere else.
 */

const _now = new Date()

export const CURRENT_YEAR  = _now.getFullYear()
export const CURRENT_MONTH = _now.getMonth() + 1   // 1-indexed (Jan = 1)
export const NEXT_YEAR     = CURRENT_YEAR + 1
export const PREV_YEAR     = CURRENT_YEAR - 1

/** How many months of `year` have elapsed. Past years = 12. */
export function monthsElapsed(year: number): number {
  return year === CURRENT_YEAR ? CURRENT_MONTH : 12
}

/** Whether a year is in the future relative to today. */
export function isFutureYear(year: number): boolean {
  return year > CURRENT_YEAR
}

/** Whether a date string (YYYY-MM-DD) falls within the current year. */
export function isThisYear(dateStr: string): boolean {
  return new Date(dateStr).getFullYear() === CURRENT_YEAR
}

/** Label for a year selector option. */
export function yearLabel(year: number): string {
  if (year === CURRENT_YEAR)     return `${year} (Current)`
  if (year === NEXT_YEAR)        return `${year} (Next Year)`
  if (year === NEXT_YEAR + 1)    return `${year} (2 Years Ahead)`
  return String(year)
}
