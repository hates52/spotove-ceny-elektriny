import fs from 'fs/promises';
import path from 'path';
import { HourlyPriceData } from './hourlyTypes';

export const FREEZE_PRICE_DIR = path.join(process.cwd(), 'data', 'freeze_price');

export async function ensureFreezePriceDir(): Promise<void> {
  try {
    await fs.access(FREEZE_PRICE_DIR);
  } catch {
    await fs.mkdir(FREEZE_PRICE_DIR, { recursive: true });
  }
}

export async function saveFreezePriceData(data: { date: string; data: any[] }): Promise<void> {
  await ensureFreezePriceDir();
  const filepath = path.join(FREEZE_PRICE_DIR, `${data.date}.json`);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

export async function getFreezePriceData(date: string): Promise<{ date: string; data: any[] } | null> {
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
