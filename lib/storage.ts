import fs from 'fs/promises';
import path from 'path';
import { PriceData, DayData } from './types';
import { HourlyPriceData } from './hourlyTypes';

const DATA_DIR = path.join(process.cwd(), 'data');
const ACTUAL_PRICE_DIR = path.join(DATA_DIR, 'actual_price');
export const FREEZE_PRICE_DIR = path.join(DATA_DIR, 'freeze_price');

function getDayFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}.json`;
}

export async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function appendPriceData(data: PriceData): Promise<void> {
  await ensureActualPriceDir();
  const filename = getDayFilename(new Date(data.timestamp));
  const filepath = path.join(ACTUAL_PRICE_DIR, filename);

  let dayData: DayData;
  try {
    const existing = await fs.readFile(filepath, 'utf-8');
    dayData = JSON.parse(existing);
  } catch {
    const dateStr = new Date(data.timestamp).toISOString().split('T')[0];
    dayData = { date: dateStr, entries: [] };
  }

  dayData.entries.push(data);
  await fs.writeFile(filepath, JSON.stringify(dayData, null, 2));
}

export async function getDayData(date: Date): Promise<DayData | null> {
  await ensureActualPriceDir();
  const filename = getDayFilename(date);
  const filepath = path.join(ACTUAL_PRICE_DIR, filename);

  console.log('[storage] getDayData', filename, 'exists?', await fs.access(filepath).then(() => true).catch(() => false));

  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getRangeData(startDate: Date, endDate: Date): Promise<DayData[]> {
  await ensureActualPriceDir();
  const result: DayData[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayData = await getDayData(current);
    console.log('[storage] getRangeData', current.toISOString(), 'got', dayData ? 'data' : 'null');
    if (dayData) {
      result.push(dayData);
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export async function listAvailableDates(): Promise<string[]> {
  await ensureActualPriceDir();
  try {
    const files = await fs.readdir(ACTUAL_PRICE_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort();
  } catch {
    return [];
  }
}

export async function ensureActualPriceDir(): Promise<void> {
  try {
    await fs.access(ACTUAL_PRICE_DIR);
  } catch {
    await fs.mkdir(ACTUAL_PRICE_DIR, { recursive: true });
  }
}

export async function ensureFreezePriceDir(): Promise<void> {
  try {
    await fs.access(FREEZE_PRICE_DIR);
  } catch {
    await fs.mkdir(FREEZE_PRICE_DIR, { recursive: true });
  }
}

export async function saveFreezePriceData(data: HourlyPriceData): Promise<void> {
  await ensureFreezePriceDir();
  const filename = `${data.date}.json`;
  const filepath = path.join(FREEZE_PRICE_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

export async function getFreezePriceData(date: string): Promise<HourlyPriceData | null> {
  await ensureFreezePriceDir();
  const filepath = path.join(FREEZE_PRICE_DIR, `${date}.json`);

  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getFreezePriceDates(): Promise<string[]> {
  await ensureFreezePriceDir();
  try {
    const files = await fs.readdir(FREEZE_PRICE_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort();
  } catch {
    return [];
  }
}
