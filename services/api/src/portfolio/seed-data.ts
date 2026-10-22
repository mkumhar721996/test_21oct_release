// Demo investor seed. Amounts are integers in minor units (paise).
export interface Holding {
  symbol: string;
  quantity: number;
  investedAmount: number;
}

export interface Sip {
  id: string;
  symbol: string;
  amount: number;
  dayOfMonth: number;
}

export const DEMO_HOLDINGS: readonly Holding[] = [
  { symbol: 'RELIANCE', quantity: 10, investedAmount: 2600000 },
  { symbol: 'TCS', quantity: 5, investedAmount: 1900000 },
  { symbol: 'INFY', quantity: 12, investedAmount: 2100000 },
  { symbol: 'HDFCBANK', quantity: 8, investedAmount: 1300000 },
  { symbol: 'ITC', quantity: 30, investedAmount: 1200000 },
];

export const DEMO_SIPS: readonly Sip[] = [
  { id: 'sip-1', symbol: 'INFY', amount: 500000, dayOfMonth: 5 },
  { id: 'sip-2', symbol: 'ITC', amount: 300000, dayOfMonth: 15 },
  { id: 'sip-3', symbol: 'HDFCBANK', amount: 400000, dayOfMonth: 25 },
];
