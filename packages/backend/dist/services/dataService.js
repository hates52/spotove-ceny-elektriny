"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistoricalData = getHistoricalData;
exports.getAvailableDates = getAvailableDates;
exports.getTodayAndTomorrowData = getTodayAndTomorrowData;
const storage_1 = require("../lib/storage");
async function getHistoricalData(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const result = [];
    const current = new Date(start);
    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const data = await (0, storage_1.getFreezePriceData)(dateStr);
        if (data) {
            result.push(data);
        }
        current.setDate(current.getDate() + 1);
    }
    return result;
}
async function getAvailableDates() {
    return (0, storage_1.getFreezePriceDates)();
}
async function getTodayAndTomorrowData() {
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
    const todayData = await (0, storage_1.getFreezePriceData)(todayStr);
    const tomorrowData = await (0, storage_1.getFreezePriceData)(tomorrowStr);
    if (tomorrowData && tomorrowData.data.length > 0) {
        return {
            days: [todayData, tomorrowData].filter(Boolean),
            dateRange: { start: todayStr, end: tomorrowStr },
        };
    }
    const yesterday = new Date(year, now.getMonth(), now.getDate() - 1);
    const yesterdayYear = yesterday.getFullYear();
    const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
    const yesterdayData = await (0, storage_1.getFreezePriceData)(yesterdayStr);
    return {
        days: [yesterdayData, todayData].filter(Boolean),
        dateRange: { start: yesterdayStr, end: todayStr },
    };
}
