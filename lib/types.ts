export interface PriceData {
  priceCZK: number;
  priceEUR: number;
  level: string;
  levelNum: number;
  timestamp: string;
}

export interface DayData {
  date: string;
  entries: PriceData[];
}
