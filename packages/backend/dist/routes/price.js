"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const priceService_1 = require("../services/priceService");
const router = (0, express_1.Router)();
router.get('/current', async (_req, res) => {
    try {
        const data = await (0, priceService_1.fetchCurrentPrice)();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch price' });
    }
});
router.get('/hourly', async (_req, res) => {
    try {
        const data = await (0, priceService_1.fetchAndStoreHourlyPrices)();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hourly prices' });
    }
});
router.get('/today-tomorrow', async (_req, res) => {
    try {
        const { getTodayAndTomorrowData } = await Promise.resolve().then(() => __importStar(require('../services/dataService')));
        const data = await getTodayAndTomorrowData();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});
router.get('/historical', async (req, res) => {
    try {
        const { getHistoricalData } = await Promise.resolve().then(() => __importStar(require('../services/dataService')));
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const data = await getHistoricalData(startDate, endDate);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch historical data' });
    }
});
router.get('/dates', async (_req, res) => {
    try {
        const { getAvailableDates } = await Promise.resolve().then(() => __importStar(require('../services/dataService')));
        const data = await getAvailableDates();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dates' });
    }
});
exports.default = router;
