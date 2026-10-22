export interface Stock {
  symbol: string;
  name: string;
  price: number; // minor units (paise)
}

export const STOCKS: readonly Stock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 285000 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 410000 },
  { symbol: 'INFY', name: 'Infosys', price: 168000 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 172000 },
  { symbol: 'ITC', name: 'ITC', price: 46000 },
  { symbol: 'WIPRO', name: 'Wipro', price: 26000 },
  { symbol: 'SBIN', name: 'State Bank of India', price: 82000 },
];
