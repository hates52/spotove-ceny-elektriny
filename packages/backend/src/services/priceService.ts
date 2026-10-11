import fs from 'fs/promises';
import path from 'path';
import { HourlyPriceData } from '../types/hourlyTypes';
import { ensureFreezePriceDir, FREEZE_PRICE_DIR } from '../lib/storage';

export async function fetchCurrentPrice() {
  const response = await fetch('https://spotovaelektrina.cz/api/v1/price/get-actual-price-json', {

  } as any);

  if (!response.ok) {
    throw new Error(`Failed to fetch price: ${response.status}`);
  }

  return response.json();
}

export async function fetchAndStoreHourlyPrices(): Promise<HourlyPriceData> {
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

  const todayFilepath = path.join(FREEZE_PRICE_DIR, `${todayStr}.json`);
  let existingToday: { date: string; data: any[] } | null = null;
  try {
    const existingContent = await fs.readFile(todayFilepath, 'utf-8');
    existingToday = JSON.parse(existingContent);
  } catch {
    // ignore missing file
  }

  const newTodayJson = JSON.stringify(todayFileForStorage);
  await fs.writeFile(todayFilepath, newTodayJson, 'utf-8');

  const tomorrowFilepath = path.join(FREEZE_PRICE_DIR, `${tomorrowStr}.json`);
  let existingTomorrow: { date: string; data: any[] } | null = null;
  try {
    const existingContent = await fs.readFile(tomorrowFilepath, 'utf-8');
    existingTomorrow = JSON.parse(existingContent);
  } catch {
    // ignore missing file
  }

  const newTomorrowJson = JSON.stringify(tomorrowFileForStorage);
  await fs.writeFile(tomorrowFilepath, newTomorrowJson, 'utf-8');
  console.log(`[fetchAndStoreHourlyPrices] success today=${todayStr} tomorrow=${tomorrowStr}`);

  return todayFileForStorage as HourlyPriceData;
}
