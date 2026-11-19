import { HourlyPriceData } from '../types/hourlyTypes';

export async function fetchCurrentPrice() {
  const response = await fetch('https://spotovaelektrina.cz/api/v1/price/get-actual-price-json');

  if (!response.ok) {
    throw new Error(`Failed to fetch price: ${response.status}`);
  }

  return response.json();
}

export async function fetchHourlyPrices(): Promise<{ today: HourlyPriceData; tomorrow: HourlyPriceData }> {
  const response = await fetch('https://spotovaelektrina.cz/api/v1/price/get-prices-json-qh');

  if (!response.ok) {
    throw new Error(`Failed to fetch hourly prices: ${response.status}`);
  }

  const data: Record<string, unknown> = await response.json();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const tomorrow = new Date(year, now.getMonth(), now.getDate() + 1);
  const tomorrowYear = tomorrow.getFullYear();
  const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;

  const todayFileForStorage = {
    date: todayStr,
    data: data.hoursToday || [],
  };

  const tomorrowFileForStorage = {
    date: tomorrowStr,
    data: data.hoursTomorrow || [],
  };

  return { today: todayFileForStorage, tomorrow: tomorrowFileForStorage };
}