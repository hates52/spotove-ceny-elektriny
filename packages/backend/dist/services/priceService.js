"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCurrentPrice = fetchCurrentPrice;
exports.fetchAndStoreHourlyPrices = fetchAndStoreHourlyPrices;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const storage_1 = require("../lib/storage");
async function fetchCurrentPrice() {
    const response = await fetch('https://spotovaelektrina.cz/api/v1/price/get-actual-price-json', {});
    if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.status}`);
    }
    return response.json();
}
async function fetchAndStoreHourlyPrices() {
    const startedAt = new Date().toISOString();
    console.log(`[fetchAndStoreHourlyPrices] start ${startedAt}`);
    const response = await fetch('https://spotovaelektrina.cz/api/v1/price/get-prices-json-qh', {});
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
    const todayFileForStorage = {
        date: todayStr,
        data: data.hoursToday || [],
    };
    const tomorrowFileForStorage = {
        date: tomorrowStr,
        data: data.hoursTomorrow || [],
    };
    await (0, storage_1.ensureFreezePriceDir)();
    const todayFilepath = path_1.default.join(storage_1.FREEZE_PRICE_DIR, `${todayStr}.json`);
    let existingToday = null;
    try {
        const existingContent = await promises_1.default.readFile(todayFilepath, 'utf-8');
        existingToday = JSON.parse(existingContent);
    }
    catch {
        // ignore missing file
    }
    const newTodayJson = JSON.stringify(todayFileForStorage);
    await promises_1.default.writeFile(todayFilepath, newTodayJson, 'utf-8');
    const tomorrowFilepath = path_1.default.join(storage_1.FREEZE_PRICE_DIR, `${tomorrowStr}.json`);
    let existingTomorrow = null;
    try {
        const existingContent = await promises_1.default.readFile(tomorrowFilepath, 'utf-8');
        existingTomorrow = JSON.parse(existingContent);
    }
    catch {
        // ignore missing file
    }
    const newTomorrowJson = JSON.stringify(tomorrowFileForStorage);
    await promises_1.default.writeFile(tomorrowFilepath, newTomorrowJson, 'utf-8');
    console.log(`[fetchAndStoreHourlyPrices] success today=${todayStr} tomorrow=${tomorrowStr}`);
    return todayFileForStorage;
}
