"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FREEZE_PRICE_DIR = void 0;
exports.ensureFreezePriceDir = ensureFreezePriceDir;
exports.saveFreezePriceData = saveFreezePriceData;
exports.getFreezePriceData = getFreezePriceData;
exports.getFreezePriceDates = getFreezePriceDates;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
exports.FREEZE_PRICE_DIR = path_1.default.join(process.cwd(), 'data', 'freeze_price');
async function ensureFreezePriceDir() {
    try {
        await promises_1.default.access(exports.FREEZE_PRICE_DIR);
    }
    catch {
        await promises_1.default.mkdir(exports.FREEZE_PRICE_DIR, { recursive: true });
    }
}
async function saveFreezePriceData(data) {
    await ensureFreezePriceDir();
    const filepath = path_1.default.join(exports.FREEZE_PRICE_DIR, `${data.date}.json`);
    await promises_1.default.writeFile(filepath, JSON.stringify(data, null, 2));
}
async function getFreezePriceData(date) {
    await ensureFreezePriceDir();
    const filepath = path_1.default.join(exports.FREEZE_PRICE_DIR, `${date}.json`);
    try {
        const content = await promises_1.default.readFile(filepath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
async function getFreezePriceDates() {
    await ensureFreezePriceDir();
    try {
        const files = await promises_1.default.readdir(exports.FREEZE_PRICE_DIR);
        return files
            .filter((f) => f.endsWith('.json'))
            .map((f) => f.replace('.json', ''))
            .sort();
    }
    catch {
        return [];
    }
}
