'use server';

import fs from 'fs/promises';
import path from 'path';
import { HourlyPriceData } from '../lib/hourlyTypes';
import { ensureFreezePriceDir, FREEZE_PRICE_DIR } from '../lib/storage';

export async function fetchCurrentPrice() {
  const response = await fetch('https://spotovaelektrina.cz/api/v1/price/get-actual-price-json', {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch price: ${response.status}`);
  }

  return response.json();
}

export async function fetchAndStoreHourlyPrices(): Promise<HourlyPriceData> {
  const startedAt = new Date().toISOString();
  console.log(`[fetchAndStoreHourlyPrices] start ${startedAt}`);

  const response = await fetch('https://spotovaelektrina.cz/api/v1/price/get-prices-json-qh', {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    console.log(`[fetchAndStoreHourlyPrices] failed status=${response.status} at=${new Date().toISOString()}`);
    throw new Error(`Failed to fetch hourly prices: ${response.status}`);
  }

  const data = await response.json();
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

  const todayFile: HourlyPriceData = {
    date: todayStr,
    data: data.hoursToday || [],
  };

  const tomorrowFile: HourlyPriceData = {
    date: tomorrowStr,
    data: data.hoursTomorrow || [],
  };

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
  const existingTodayJson = existingToday ? JSON.stringify(existingToday) : null;

  if (existingTodayJson && existingTodayJson !== newTodayJson) {
    console.log(`[fetchAndStoreHourlyPrices] DIFF detected for ${todayStr}`);
    console.log('[fetchAndStoreHourlyPrices] existing', existingTodayJson);
    console.log('[fetchAndStoreHourlyPrices] new', newTodayJson);
  } else if (!existingTodayJson) {
    console.log(`[fetchAndStoreHourlyPrices] no existing file for ${todayStr}, writing new`);
  } else {
    console.log(`[fetchAndStoreHourlyPrices] no diff for ${todayStr}`);
  }

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
  const existingTomorrowJson = existingTomorrow ? JSON.stringify(existingTomorrow) : null;

  if (existingTomorrowJson && existingTomorrowJson !== newTomorrowJson) {
    console.log(`[fetchAndStoreHourlyPrices] DIFF detected for ${tomorrowStr}`);
    console.log('[fetchAndStoreHourlyPrices] existing', existingTomorrowJson);
    console.log('[fetchAndStoreHourlyPrices] new', newTomorrowJson);
  } else if (!existingTomorrowJson) {
    console.log(`[fetchAndStoreHourlyPrices] no existing file for ${tomorrowStr}, writing new`);
  } else {
    console.log(`[fetchAndStoreHourlyPrices] no diff for ${tomorrowStr}`);
  }

  await fs.writeFile(tomorrowFilepath, newTomorrowJson, 'utf-8');
  console.log(`[fetchAndStoreHourlyPrices] success today=${todayStr} tomorrow=${tomorrowStr} todayData=${todayFileForStorage.data.length} tomorrowData=${tomorrowFileForStorage.data.length} at=${new Date().toISOString()}`);

  return todayFile;
}
