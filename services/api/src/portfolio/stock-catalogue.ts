export interface Stock {
  symbol: string;
  name: string;
  price: number; // minor units (paise)
  previousClose: number; // minor units (paise)
  dayChange: number; // price - previousClose
  dayChangePercent: number; // dayChange / previousClose * 100
}

export interface CatalogueEntry {
  symbol: string;
  name: string;
  basePrice: number;
  previousClose: number;
}

export const CATALOGUE: readonly CatalogueEntry[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', basePrice: 285000, previousClose: 283500 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', basePrice: 410000, previousClose: 412000 },
  { symbol: 'INFY', name: 'Infosys', basePrice: 168000, previousClose: 167200 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', basePrice: 172000, previousClose: 173000 },
  { symbol: 'ITC', name: 'ITC', basePrice: 46000, previousClose: 45700 },
  { symbol: 'WIPRO', name: 'Wipro', basePrice: 26000, previousClose: 26150 },
  { symbol: 'SBIN', name: 'State Bank of India', basePrice: 82000, previousClose: 81500 },
];

export function toStock(e: CatalogueEntry, price: number): Stock {
  const dayChange = price - e.previousClose;
  return {
    symbol: e.symbol,
    name: e.name,
    price,
    previousClose: e.previousClose,
    dayChange,
    dayChangePercent: (dayChange / e.previousClose) * 100,
  };
}

export const STOCKS: readonly Stock[] = CATALOGUE.map((e) => toStock(e, e.basePrice));
