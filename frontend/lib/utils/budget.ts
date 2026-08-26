export interface CostBreakdownData {
  hotel_cost?: number;
  food_cost?: number;
  transport_cost?: number;
  miscellaneous_cost?: number;
}

export function calculateCostBreakdownTotal(costs: CostBreakdownData): number {
  return (
    (costs.hotel_cost || 0) +
    (costs.food_cost || 0) +
    (costs.transport_cost || 0) +
    (costs.miscellaneous_cost || 0)
  );
}

export function calculateDailyBudget(budget: number, days: number): number {
  if (days <= 0) return 0;
  return budget / days;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah'},
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
];

export const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} - ${c.label}`,
}));

export function getCurrencySymbol(currency: string): string {
  return SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || currency;
}

/**
 * Compact budget for cards and summaries: `USD 2,000`.
 *
 * Distinct from `formatCurrency`, which renders `$2,000.00` (symbol, forced
 * 2dp) and is used inside the itinerary where exact figures matter. Here the
 * code disambiguates currencies that share a symbol (JPY and CNY are both ¥),
 * and whole budgets read better without trailing zeros.
 */
export function formatBudget(amount: number | null | undefined, currency: string): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
  return `${currency || ''} ${formatted}`.trim();
}

export function formatCurrency(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}
