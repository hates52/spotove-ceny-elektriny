import fs from 'fs/promises';
import path from 'path';
import { HourlyPriceData } from '../types/hourlyTypes';

// Data directory is configurable via DATA_DIR env var, defaulting to the
// workspace root `data/spot_prices` directory so the frontend and any other
// tooling can share the same storage location.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), '..', '..', 'data', 'spot_prices');

export async function ensureFreezePriceDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function saveFreezePriceData(data: { date: string; data: any[] }): Promise<void> {
  await ensureFreezePriceDir();
  const filepath = path.join(DATA_DIR, `${data.date}.json`);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

export async function getFreezePriceData(date: string): Promise<{ date: string; data: any[] } | null> {
  await ensureFreezePriceDir();
  const filepath = path.join(DATA_DIR, `${date}.json`);
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
    const files = await fs.readdir(DATA_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort();
  } catch {
    return [];
  }
}
