/**
 * Month names used by the travel-month dropdown.
 *
 * `travel_month` is still sent to the AI as trip context; it no longer drives
 * any theming.
 */

export type Month =
  | 'january'
  | 'february'
  | 'march'
  | 'april'
  | 'may'
  | 'june'
  | 'july'
  | 'august'
  | 'september'
  | 'october'
  | 'november'
  | 'december';

export const MONTHS: Month[] = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export const MONTH_OPTIONS = MONTHS.map((month) => ({
  value: month,
  label: month.charAt(0).toUpperCase() + month.slice(1),
}));
