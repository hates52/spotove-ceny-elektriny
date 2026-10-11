export interface HourlyPriceEntry {
  hour: number;
  minute: number;
  priceEur: number;
  priceCZK: number;
  level: string;
  levelNum: number;
  levelNum96: number;
}

export interface HourlyPriceData {
  date: string;
  data: HourlyPriceEntry[];
}
