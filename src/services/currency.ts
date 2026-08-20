// Approximate static FX rates, expressed as units of currency per 1 USD.
// Rates are indicative (rounded) and should be refreshed occasionally.
const FX_RATES: Record<string, number> = {
  USD: 1,
  SGD: 1.31,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.52,
  NZD: 1.64,
  CAD: 1.36,
  CHF: 0.86,
  JPY: 148,
  KRW: 1360,
  CNY: 7.15,
  TWD: 31.5,
  HKD: 7.8,
  INR: 83.5,
  MYR: 4.25,
  THB: 33.5,
  PHP: 56,
  IDR: 16000,
  VND: 25200,
  KHR: 4100,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  BRL: 5.1,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: 'US$',
  SGD: 'S$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  NZD: 'NZ$',
  CAD: 'C$',
  CHF: 'CHF',
  JPY: '¥',
  KRW: '₩',
  CNY: '¥',
  TWD: 'NT$',
  HKD: 'HK$',
  INR: '₹',
  MYR: 'RM',
  THB: '฿',
  PHP: '₱',
  IDR: 'Rp',
  VND: '₫',
  KHR: '៛',
  AED: 'AED',
  SAR: 'SAR',
  QAR: 'QAR',
  BRL: 'R$',
};

// English country name (lowercased, may be partial) -> currency code.
const COUNTRY_CURRENCY: Record<string, string> = {
  singapore: 'SGD',
  'united states': 'USD',
  usa: 'USD',
  america: 'USD',
  'united kingdom': 'GBP',
  britain: 'GBP',
  england: 'GBP',
  uk: 'GBP',
  europe: 'EUR',
  'united arab emirates': 'AED',
  uae: 'AED',
  australia: 'AUD',
  'new zealand': 'NZD',
  canada: 'CAD',
  switzerland: 'CHF',
  china: 'CNY',
  'hong kong': 'HKD',
  taiwan: 'TWD',
  japan: 'JPY',
  'south korea': 'KRW',
  india: 'INR',
  indonesia: 'IDR',
  vietnam: 'VND',
  cambodia: 'KHR',
  malaysia: 'MYR',
  thailand: 'THB',
  philippines: 'PHP',
  france: 'EUR',
  germany: 'EUR',
  italy: 'EUR',
  spain: 'EUR',
  portugal: 'EUR',
  netherlands: 'EUR',
  belgium: 'EUR',
  austria: 'EUR',
  ireland: 'EUR',
  greece: 'EUR',
  finland: 'EUR',
  slovakia: 'EUR',
  slovenia: 'EUR',
  croatia: 'EUR',
  luxembourg: 'EUR',
  malta: 'EUR',
  cyprus: 'EUR',
  estonia: 'EUR',
  latvia: 'EUR',
  lithuania: 'EUR',
  'saudi arabia': 'SAR',
  qatar: 'QAR',
  brazil: 'BRL',
};

export type Currency = {
  code: string;
  symbol: string;
  rate: number;
};

export function currencyForCode(code: string): Currency {
  const c = (code || 'USD').toUpperCase();
  return {
    code: FX_RATES[c] ? c : 'USD',
    symbol: CURRENCY_SYMBOLS[c] || CURRENCY_SYMBOLS.USD,
    rate: FX_RATES[c] || FX_RATES.USD,
  };
}

export function detectUserCurrency(userLocation: {
  label?: string;
  country?: string;
} | null): Currency {
  if (!userLocation) return currencyForCode('USD');
  const label = (userLocation.label || '').toLowerCase();
  const country = (userLocation.country || '').toLowerCase();
  for (const [key, code] of Object.entries(COUNTRY_CURRENCY)) {
    if ((country && country.includes(key)) || (label && label.includes(key))) {
      return currencyForCode(code);
    }
  }
  return currencyForCode('USD');
}

// Convert an amount between currencies using the static USD-based rates.
export function convertAmount(amount: number, fromCode: string, toCode: string): number {
  if (!isFinite(amount)) return amount;
  const from = FX_RATES[fromCode] ? fromCode : 'USD';
  const to = FX_RATES[toCode] ? toCode : 'USD';
  const valueUsd = amount / FX_RATES[from];
  return valueUsd * FX_RATES[to];
}

const NO_DECIMALS = new Set(['IDR', 'VND', 'KHR', 'JPY', 'KRW', 'CLP', 'ISK']);

function formatNumber(n: number, code: string): string {
  if (!isFinite(n)) return '';
  const decimals = NO_DECIMALS.has(code) ? 0 : n >= 10 ? 0 : 1;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatRange(low: number, high: number, code: string): string {
  const a = formatNumber(low, code);
  const b = formatNumber(high, code);
  return low === high || b === a ? a : `${a}–${b}`;
}

export function countryCurrencyCode(country: string | undefined | null): string {
  const c = (country || '').toLowerCase();
  for (const [key, code] of Object.entries(COUNTRY_CURRENCY)) {
    if (c && c.includes(key)) return code;
  }
  return '';
}

function parseCostPerDay(costPerDay: string | undefined | null): {
  currency: string;
  low: number;
  high: number;
} | null {
  const text = (costPerDay || '').trim();
  if (!text) return null;
  const nums = (text.match(/\d[\d.,]*/g) || []).map((s) =>
    Number(s.replace(/,/g, ''))
  );
  if (!nums.length) return null;
  const low = Math.min(nums[0], nums.length > 1 ? nums[1] : nums[0]);
  const high = Math.max(nums[0], nums.length > 1 ? nums[1] : nums[0]);
  let currency = 'USD';
  if (/rp\s*\d|idr/i.test(text)) currency = 'IDR';
  else if (/vnd|₫/i.test(text)) currency = 'VND';
  else if (/khr|៛/i.test(text)) currency = 'KHR';
  return { currency, low, high };
}

/**
 * Renders the cost per day as: <user's currency amount> (<destination country currency amount>).
 * Example: a user in Singapore viewing a Bali place -> "S$98 (Rp1,500,000)".
 */
export function formatCostPerDay(
  costPerDay: string | undefined | null,
  destinationCountry: string | undefined | null,
  user: Currency
): string | null {
  const parsed = parseCostPerDay(costPerDay);
  if (!parsed) return null;

  const destCode = countryCurrencyCode(destinationCountry) || parsed.currency;

  const userLow = convertAmount(parsed.low, parsed.currency, user.code);
  const userHigh = convertAmount(parsed.high, parsed.currency, user.code);

  const main = formatRange(userLow, userHigh, user.code);
  const mainLabel = `${user.symbol}${main}`;

  if (user.code === destCode) {
    return mainLabel;
  }

  const local = currencyForCode(destCode);
  const localLow = convertAmount(parsed.low, parsed.currency, destCode);
  const localHigh = convertAmount(parsed.high, parsed.currency, destCode);

  return `${mainLabel} (${local.symbol}${formatRange(localLow, localHigh, destCode)})`;
}
