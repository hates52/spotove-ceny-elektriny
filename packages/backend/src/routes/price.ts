import { Router, Request, Response } from 'express';
import { fetchCurrentPrice, fetchAndStoreHourlyPrices, getDataSourceInfo } from '../services/priceService';

const router = Router();

router.get('/data-source', async (_req: Request, res: Response) => {
  try {
    res.json(getDataSourceInfo());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data source info' });
  }
});

router.get('/current', async (_req: Request, res: Response) => {
  try {
    const data = await fetchCurrentPrice();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

router.get('/hourly', async (_req: Request, res: Response) => {
  try {
    const data = await fetchAndStoreHourlyPrices();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hourly prices' });
  }
});

router.get('/today-tomorrow', async (_req: Request, res: Response) => {
  try {
    const { getTodayAndTomorrowData } = await import('../services/dataService');
    const data = await getTodayAndTomorrowData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

router.get('/historical', async (req: Request, res: Response) => {
  try {
    const { getHistoricalData } = await import('../services/dataService');
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const data = await getHistoricalData(startDate, endDate);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

router.get('/dates', async (_req: Request, res: Response) => {
  try {
    const { getAvailableDates } = await import('../services/dataService');
    const data = await getAvailableDates();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dates' });
  }
});

export default router;
