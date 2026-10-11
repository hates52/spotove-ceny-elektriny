const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchCurrentPrice() {
  const response = await fetch(`${API_BASE_URL}/api/current-price`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch price: ${response.status}`);
  }
  return response.json();
}

export async function fetchTodayAndTomorrowData() {
  const response = await fetch(`${API_BASE_URL}/api/price/today-tomorrow`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }
  return response.json();
}

export async function fetchHistoricalData(startDate: string, endDate: string) {
  const response = await fetch(`${API_BASE_URL}/api/price/historical?startDate=${startDate}&endDate=${endDate}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch historical data: ${response.status}`);
  }
  return response.json();
}

export async function fetchAvailableDates() {
  const response = await fetch(`${API_BASE_URL}/api/price/dates`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch dates: ${response.status}`);
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
