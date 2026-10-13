import express from 'express';
import cors from 'cors';
import priceRoutes from './routes/price';
import instanceRoutes from './routes/instance';
import path from 'path';
import dotenv from 'dotenv';
import { getFreezePriceData } from './lib/storage';
import { fetchAndStoreHourlyPrices } from './services/priceService';

const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function ensureTodaysData(): Promise<void> {
  const today = getTodayDateString();
  const existing = await getFreezePriceData(today);
  if (!existing) {
    console.log(`[startup] No data for ${today}, fetching...`);
    await fetchAndStoreHourlyPrices();
    console.log(`[startup] Data for ${today} fetched and stored`);
  } else {
    console.log(`[startup] Data for ${today} already exists`);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${req.get('origin') || 'no-origin'}`);
  next();
});

app.use(cors());
app.use(express.json());

app.use('/api/price', priceRoutes);
app.use('/api/instance', instanceRoutes);
app.get('/api/current-price', async (_req, res) => {
  try {
    const { fetchCurrentPrice } = await import('./services/priceService');
    const data = await fetchCurrentPrice();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

ensureTodaysData().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('[startup] Failed to ensure today\'s data:', err);
  process.exit(1);
});
