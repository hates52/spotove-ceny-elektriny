import { HourlyPriceData } from '../types/hourlyTypes';
import { ensureFreezePriceDir, saveFreezePriceData, getFreezePriceData } from '../lib/storage';

export async function fetchCurrentPrice() {
  const response = await fetch('https://spotovaelektrina.cz/api/v1/price/get-actual-price-json', {

  } as any);

  if (!response.ok) {
    throw new Error(`Failed to fetch price: ${response.status}`);
  }

  return response.json();
}

export async function fetchAndStoreHourlyPrices(): Promise<{ today: HourlyPriceData; tomorrow: HourlyPriceData }> {
  const startedAt = new Date().toISOString();
  console.log(`[fetchAndStoreHourlyPrices] start ${startedAt}`);

  const response = await fetch('https://spotovaelektrina.cz/api/v1/price/get-prices-json-qh', {

  } as any);

  if (!response.ok) {
    console.log(`[fetchAndStoreHourlyPrices] failed status=${response.status} at=${new Date().toISOString()}`);
    throw new Error(`Failed to fetch hourly prices: ${response.status}`);
  }

  const data: any = await response.json();
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

  await ensureFreezePriceDir();

  await saveFreezePriceData(todayFileForStorage);

  let existingTomorrow: { date: string; data: any[] } | null = null;
  try {
    existingTomorrow = await getFreezePriceData(tomorrowStr);
  } catch {
    // ignore missing file
  }

  // If the API returned no tomorrow data but a previous file exists, keep the old data
  // instead of overwriting it with an empty array.
  const tomorrowToStore =
    tomorrowFileForStorage.data.length > 0 || !existingTomorrow
      ? tomorrowFileForStorage
      : existingTomorrow;

  await saveFreezePriceData(tomorrowToStore);
  console.log(`[fetchAndStoreHourlyPrices] success today=${todayStr} tomorrow=${tomorrowStr} tomorrowCount=${tomorrowToStore.data.length}`);

  return { today: todayFileForStorage, tomorrow: tomorrowToStore };
}
