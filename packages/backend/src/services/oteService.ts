import { HourlyPriceData, HourlyPriceEntry } from '../types/hourlyTypes';

const OTE_WSDL_URL = 'https://www.ote-cr.cz/pw-data/services/PublicDataService?wsdl';
const OTE_SERVICE_URL = 'https://www.ote-cr.cz/pw-data/services/PublicDataService';

let soapClient: unknown = null;

async function getSoapClient() {
  if (!soapClient) {
    const soap = await import('soap');
    soapClient = await soap.createClientAsync(OTE_WSDL_URL, {
      endpoint: OTE_SERVICE_URL,
    });
  }
  return soapClient;
}

function formatDateForOTE(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateLevels(entries: HourlyPriceEntry[]): HourlyPriceEntry[] {
  if (entries.length === 0) return entries;

  const prices = entries.map(e => e.priceEur).sort((a, b) => a - b);
  const lowThreshold = prices[Math.floor(prices.length * 0.33)];
  const highThreshold = prices[Math.floor(prices.length * 0.66)];

  return entries.map((entry, index) => {
    let level = 'medium';
    let levelNum = 1;
    let levelNum96 = index + 1;

    if (entry.priceEur <= lowThreshold) {
      level = 'low';
      levelNum = 1;
    } else if (entry.priceEur >= highThreshold) {
      level = 'high';
      levelNum = 3;
    } else {
      level = 'medium';
      levelNum = 2;
    }

    return {
      ...entry,
      level,
      levelNum,
      levelNum96,
    };
  });
}

function parseOTEPriceData(rawData: Record<string, unknown>[]): HourlyPriceEntry[] {
  const parsed = rawData.map((item: Record<string, unknown>) => {
    const priceEur = item.Price ?? item.price ?? 0;
    const priceCZK = Math.round(priceEur * 24.5);
    
    let hour = 0;
    let minute = 0;
    
    if (item.PeriodIndex !== undefined) {
      const periodIndex = parseInt(item.PeriodIndex, 10);
      hour = Math.floor((periodIndex - 1) / 4);
      minute = ((periodIndex - 1) % 4) * 15;
    } else if (item.Hour !== undefined) {
      hour = parseInt(item.Hour, 10);
      minute = 0;
    }
    
    return {
      hour,
      minute,
      priceEur,
      priceCZK,
      level: '',
      levelNum: 0,
      levelNum96: 0,
    };
  });

  return calculateLevels(parsed);
}

export async function fetchOTEPricesForDate(date: Date): Promise<HourlyPriceEntry[]> {
  const client = await getSoapClient();
  const dateStr = formatDateForOTE(date);

  try {
    const [result] = await client.GetDamPricePeriodEAsync({
      StartDate: dateStr,
      EndDate: dateStr,
      PeriodResolution: 'PT15M',
    });

    if (!result || !result.Result || !result.Result.Item) {
      return [];
    }

    return parseOTEPriceData(result.Result.Item);
  } catch (error) {
    console.error(`[OTE] Failed to fetch prices for ${dateStr}:`, error);
    throw error;
  }
}

export async function fetchOTETodayAndTomorrow(): Promise<{ today: HourlyPriceData; tomorrow: HourlyPriceData }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [todayData, tomorrowData] = await Promise.all([
    fetchOTEPricesForDate(today),
    fetchOTEPricesForDate(tomorrow),
  ]);

  const todayStr = formatDateForOTE(today);
  const tomorrowStr = formatDateForOTE(tomorrow);

  return {
    today: { date: todayStr, data: todayData },
    tomorrow: { date: tomorrowStr, data: tomorrowData },
  };
}