const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface DataSourceInfo {
  id: 'spotovaelektrina' | 'ote';
  name: string;
  url: string;
  description: string;
}

export interface TodayTomorrowData {
  days: Array<{ 
    date: string; 
    data: Array<{ hour: number; minute: number; priceEur: number; priceCZK: number; level: string; levelNum: number; levelNum96: number }>; 
    data_source?: string;
  }>;
  dateRange: { start: string; end: string };
  dataSource: DataSourceInfo;
}

export async function fetchCurrentPrice(): Promise<{ priceCZK: number; priceEUR: number; level: string; levelNum: number; dataSource?: DataSourceInfo }> {
  const response = await fetch(`${API_BASE_URL}/api/current-price`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch price: ${response.status}`);
  }
  return response.json();
}

export async function fetchTodayAndTomorrowData(): Promise<TodayTomorrowData> {
  const response = await fetch(`${API_BASE_URL}/api/price/today-tomorrow`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }
  return response.json();
}

export async function fetchDataSourceInfo(): Promise<DataSourceInfo> {
  const response = await fetch(`${API_BASE_URL}/api/price/data-source`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data source: ${response.status}`);
  }
  return response.json();
}

export async function fetchAvailableDates(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/price/dates`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch dates: ${response.status}`);
  }
  const result = await response.json();
  return result.dates || [];
}

export interface HistoricalDataResponse {
  data: Array<{ 
    date: string; 
    data: Array<{ hour: number; minute: number; priceEur: number; priceCZK: number; level: string; levelNum: number; levelNum96: number }>; 
    data_source?: string;
  }>;
  dataSource: DataSourceInfo;
}

export async function fetchHistoricalData(startDate: string, endDate: string): Promise<HistoricalDataResponse> {
  const response = await fetch(`${API_BASE_URL}/api/price/historical?startDate=${startDate}&endDate=${endDate}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch historical data: ${response.status}`);
  }
  return response.json();
}

export async function fetchAndStoreHourlyPrices() {
  const response = await fetch(`${API_BASE_URL}/api/price/hourly`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch hourly prices: ${response.status}`);
  }
  return response.json();
}
