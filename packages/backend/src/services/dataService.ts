import { getFreezePriceData, getFreezePriceDates } from '../lib/storage';
import { getDataSourceInfo } from './priceService';

export async function getHistoricalData(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const result = [];
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const data = await getFreezePriceData(dateStr);
    if (data) {
      result.push(data);
    }
    current.setDate(current.getDate() + 1);
  }
  return { data: result, dataSource: getDataSourceInfo() };
}

export async function getAvailableDates() {
  const allDates = await getFreezePriceDates();
  const datesWithData = [];
  
  for (const dateStr of allDates) {
    const data = await getFreezePriceData(dateStr);
    if (data && data.data && data.data.length > 0) {
      datesWithData.push(dateStr);
    }
  }
  
  return { dates: datesWithData, dataSource: getDataSourceInfo() };
}

export async function getTodayAndTomorrowData() {
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

  const todayData = await getFreezePriceData(todayStr);
  const tomorrowData = await getFreezePriceData(tomorrowStr);

  if (tomorrowData && tomorrowData.data.length > 0) {
    return {
      days: [todayData, tomorrowData].filter(Boolean),
      dateRange: { start: todayStr, end: tomorrowStr },
      dataSource: getDataSourceInfo(),
    };
  }

  const yesterday = new Date(year, now.getMonth(), now.getDate() - 1);
  const yesterdayYear = yesterday.getFullYear();
  const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
  const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;

  const yesterdayData = await getFreezePriceData(yesterdayStr);

  return {
    days: [yesterdayData, todayData].filter(Boolean),
    dateRange: { start: yesterdayStr, end: todayStr },
    dataSource: getDataSourceInfo(),
  };
}
