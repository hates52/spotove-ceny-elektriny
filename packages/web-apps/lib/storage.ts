import fs from 'fs/promises';
import path from 'path';
import { HourlyPriceData } from './hourlyTypes';

export const SPOT_PRICES_DIR = path.join(process.cwd(), 'data', 'spot_prices');

export async function ensureFreezePriceDir(): Promise<void> {
  try {
    await fs.access(SPOT_PRICES_DIR);
  } catch {
    await fs.mkdir(SPOT_PRICES_DIR, { recursive: true });
  }
}

export async function saveFreezePriceData(data: { date: string; data: any[] }): Promise<void> {
  await ensureFreezePriceDir();
  const filepath = path.join(SPOT_PRICES_DIR, `${data.date}.json`);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

export async function getFreezePriceData(date: string): Promise<{ date: string; data: any[] } | null> {
  await ensureFreezePriceDir();
  const filepath = path.join(SPOT_PRICES_DIR, `${date}.json`);
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
    const files = await fs.readdir(SPOT_PRICES_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort();
  } catch {
    return [];
  }
}
