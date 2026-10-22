export interface ApiHolding {
  symbol: string;
  quantity: number;
  investedAmount: number;
  currentValue: number;
  returns: number;
  dayChange: number;
  dayChangePercent: number;
}
export interface ApiSip {
  id: string;
  symbol: string;
  amount: number;
  dayOfMonth: number;
}
export interface ApiStock {
  symbol: string;
  name: string;
  price: number;
}
export interface ApiTotals {
  invested: number;
  currentValue: number;
  returns: number;
}

export type Direction = "up" | "down" | "flat";

export interface UpcomingSip {
  id: string;
  name: string;
  amount: string;
  nextDebit: string;
}
export interface HoldingRow {
  symbol: string;
  name: string;
  units: string;
  value: string;
  gain: string;
  direction: Direction;
}

const MINUS = "−";
const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Integer paise to whole rupees with Indian digit grouping, e.g. 10000000 -> "₹1,00,000". */
export function formatInr(paise: number): string {
  const whole = Math.round(Math.abs(paise) / 100);
  return `${paise < 0 && whole > 0 ? MINUS : ""}₹${rupees.format(whole)}`;
}

export function formatSignedInr(paise: number): string {
  const text = formatInr(Math.abs(paise));
  if (paise > 0) return `+${text}`;
  return paise < 0 ? `${MINUS}${text}` : text;
}

function directionOf(amount: number): Direction {
  return amount > 0 ? "up" : amount < 0 ? "down" : "flat";
}

export function todaysChange(holdings: ApiHolding[], totalValue: number) {
  const amount = holdings.reduce((sum, h) => sum + h.dayChange, 0);
  const base = totalValue - amount;
  const percent = base === 0 ? 0 : (amount / base) * 100;
  return { amount, percent, direction: directionOf(amount) };
}

function clampedUtc(year: number, month: number, day: number): Date {
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, length)));
}

/** Next debit on `dayOfMonth` (UTC): today counts, a passed day moves to next month; clamped to month length. */
export function nextDebitDate(dayOfMonth: number, now: Date): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const thisMonth = clampedUtc(year, month, dayOfMonth);
  const today = Date.UTC(year, month, now.getUTCDate());
  return thisMonth.getTime() >= today ? thisMonth : clampedUtc(year, month + 1, dayOfMonth);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDebitDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function nameOf(symbol: string, stocks: ApiStock[]): string {
  return stocks.find((s) => s.symbol === symbol)?.name ?? symbol;
}

export function toUpcomingSips(sips: ApiSip[], stocks: ApiStock[], now: Date): UpcomingSip[] {
  return sips
    .map((s) => ({ s, date: nextDebitDate(s.dayOfMonth, now) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ s, date }) => ({
      id: s.id,
      name: nameOf(s.symbol, stocks),
      amount: formatInr(s.amount),
      nextDebit: formatDebitDate(date),
    }));
}

export function toHoldingRows(holdings: ApiHolding[], stocks: ApiStock[]): HoldingRow[] {
  return holdings.map((h) => ({
    symbol: h.symbol,
    name: nameOf(h.symbol, stocks),
    units: String(h.quantity),
    value: formatInr(h.currentValue),
    gain: formatSignedInr(h.returns),
    direction: directionOf(h.returns),
  }));
}
