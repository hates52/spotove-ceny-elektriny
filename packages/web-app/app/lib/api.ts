const API_BASE_URL = '/api/backend';

function authHeaders(token?: string | null): HeadersInit | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

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

export async function fetchCurrentPrice(token?: string | null): Promise<{ priceCZK: number; priceEUR: number; level: string; levelNum: number; dataSource?: DataSourceInfo }> {
  const response = await fetch(`${API_BASE_URL}/current-price`, {
    cache: 'no-store',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch price: ${response.status}`);
  }
  return response.json();
}

export async function fetchTodayAndTomorrowData(token?: string | null): Promise<TodayTomorrowData> {
  const response = await fetch(`${API_BASE_URL}/price/today-tomorrow`, {
    cache: 'no-store',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }
  return response.json();
}

export async function fetchDataSourceInfo(token?: string | null): Promise<DataSourceInfo> {
  const response = await fetch(`${API_BASE_URL}/price/data-source`, {
    cache: 'no-store',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data source: ${response.status}`);
  }
  return response.json();
}

export async function fetchAvailableDates(token?: string | null): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/price/dates`, {
    cache: 'no-store',
    headers: authHeaders(token),
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

export async function fetchHistoricalData(startDate: string, endDate: string, token?: string | null): Promise<HistoricalDataResponse> {
  const query = new URLSearchParams({ startDate, endDate });
  const response = await fetch(`${API_BASE_URL}/price/historical?${query}`, {
    cache: 'no-store',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch historical data: ${response.status}`);
  }
  return response.json();
}

export async function fetchAndStoreHourlyPrices(token?: string | null) {
  const response = await fetch(`${API_BASE_URL}/price/hourly`, {
    cache: 'no-store',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch hourly prices: ${response.status}`);
  }
  return response.json();
}
