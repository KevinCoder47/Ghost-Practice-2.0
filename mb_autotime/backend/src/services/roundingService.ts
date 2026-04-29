/**
 * roundingService.ts
 *
 * Legal billing uses 6-minute increments (= 0.1 hour).
 * We always round UP to the nearest unit — never shortchange the attorney.
 *
 * Examples:
 *   1 min  → 0.1 h (1 unit)
 *   6 min  → 0.1 h (1 unit)
 *   7 min  → 0.2 h (2 units)
 *  12 min  → 0.2 h (2 units)
 *  13 min  → 0.3 h (3 units)
 *  45 min  → 0.8 h (8 units)
 *  60 min  → 1.0 h (10 units)
 */

const MINUTES_PER_UNIT = 6;

/**
 * Round raw minutes up to the nearest 6-minute billing unit.
 * Returns the number of units (each = 0.1 h).
 */
export function minutesToUnits(rawMinutes: number): number {
  if (rawMinutes <= 0) return 0;
  return Math.ceil(rawMinutes / MINUTES_PER_UNIT);
}

/**
 * Convert billing units back to decimal hours (for display / GP posting).
 * e.g. 8 units → 0.8 h
 */
export function unitsToHours(units: number): number {
  return Math.round(units * 0.1 * 10) / 10; // avoid floating-point drift
}

/**
 * Convert raw minutes directly to rounded decimal hours.
 * Convenience wrapper used by controllers.
 */
export function minutesToHours(rawMinutes: number): number {
  return unitsToHours(minutesToUnits(rawMinutes));
}

/**
 * Format units as a human-readable string, e.g. "0.8 h (8 units, ~48 min)"
 */
export function formatUnits(units: number): string {
  const hours = unitsToHours(units);
  const approxMinutes = units * MINUTES_PER_UNIT;
  return `${hours} h (${units} unit${units !== 1 ? 's' : ''}, ~${approxMinutes} min)`;
}