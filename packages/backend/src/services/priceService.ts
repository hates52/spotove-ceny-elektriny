import { HourlyPriceData, HourlyPriceEntry } from '../types/hourlyTypes';
import { ensureFreezePriceDir, saveFreezePriceData, getFreezePriceData } from '../lib/storage';
import { fetchCurrentPrice as fetchSpotovaElektrinaCurrentPrice, fetchHourlyPrices as fetchSpotovaElektrinaHourlyPrices } from './spotovaelektrinaService';
import { fetchOTETodayAndTomorrow } from './oteService';

type DataSource = 'spotovaelektrina' | 'ote';

interface DataSourceInfo {
  id: DataSource;
  name: string;
  url: string;
  description: string;
}

const DATA_SOURCES: Record<DataSource, DataSourceInfo> = {
  spotovaelektrina: {
    id: 'spotovaelektrina',
    name: 'Spotová elektrína',
    url: 'https://spotovaelektrina.cz',
    description: 'Aggregátor spotových cen elektřiny z OTE',
  },
  ote: {
    id: 'ote',
    name: 'OTE - Operátor trhu s elektřinou',
    url: 'https://www.ote-cr.cz',
    description: 'Oficiální data z veřejného rozhraní OTE (SOAP API)',
  },
};

function getDataSource(): DataSource {
  const source = process.env.DATA_SOURCE?.toLowerCase();
  if (source === 'ote') return 'ote';
  return 'spotovaelektrina';
}

export function getDataSourceInfo(): DataSourceInfo {
  return DATA_SOURCES[getDataSource()];
}

function getCurrentPriceFromHourly(data: HourlyPriceEntry[]): HourlyPriceEntry | null {
  if (!data || data.length === 0) return null;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  let closestEntry: HourlyPriceEntry | null = null;
  let minDiff = Infinity;
  
  for (const entry of data) {
    const entryMinutes = entry.hour * 60 + entry.minute;
    const currentMinutes = currentHour * 60 + currentMinute;
    const diff = Math.abs(entryMinutes - currentMinutes);
    
    if (diff < minDiff) {
      minDiff = diff;
      closestEntry = entry;
    }
  }
  
  return closestEntry;
}

export async function fetchCurrentPrice() {
  const sourceInfo = getDataSourceInfo();
  
  if (sourceInfo.id === 'ote') {
    const { today, tomorrow } = await fetchOTETodayAndTomorrow();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const relevantData = today.date === todayStr ? today.data : tomorrow.data;
    const currentPrice = getCurrentPriceFromHourly(relevantData);
    
    if (!currentPrice) {
      throw new Error('No price data available');
    }
    
    return {
      priceEUR: currentPrice.priceEur,
      priceCZK: currentPrice.priceCZK,
      level: currentPrice.level || 'medium',
      levelNum: currentPrice.levelNum || 0,
      dataSource: sourceInfo,
    };
  }

  const priceData = await fetchSpotovaElektrinaCurrentPrice() as Record<string, any>;
  return {
    ...priceData,
    dataSource: sourceInfo,
  };
}

export async function fetchAndStoreHourlyPrices(): Promise<{ today: HourlyPriceData; tomorrow: HourlyPriceData; dataSource: DataSourceInfo }> {
  const startedAt = new Date().toISOString();
  const source = getDataSource();
  const sourceInfo = getDataSourceInfo();
  console.log(`[fetchAndStoreHourlyPrices] start ${startedAt} source=${source}`);

  let result: { today: HourlyPriceData; tomorrow: HourlyPriceData };

  if (source === 'ote') {
    result = await fetchOTETodayAndTomorrow();
  } else {
    result = await fetchSpotovaElektrinaHourlyPrices();
  }

  const { today, tomorrow } = result;

  // Add data_source field before saving
  const todayWithSource = { ...today, data_source: sourceInfo.id };
  const tomorrowWithSource = { ...tomorrow, data_source: sourceInfo.id };

  await ensureFreezePriceDir();

  await saveFreezePriceData(todayWithSource);

  let existingTomorrow: HourlyPriceData | null = null;
  try {
    existingTomorrow = await getFreezePriceData(tomorrow.date);
  } catch {
  }

  const tomorrowToStore =
    tomorrow.data.length > 0 || !existingTomorrow
      ? tomorrowWithSource
      : existingTomorrow;

  await saveFreezePriceData(tomorrowToStore);
  console.log(`[fetchAndStoreHourlyPrices] success today=${today.date} tomorrow=${tomorrowToStore.date} tomorrowCount=${tomorrowToStore.data.length}`);

  return { today: todayWithSource, tomorrow: tomorrowToStore, dataSource: sourceInfo };
}