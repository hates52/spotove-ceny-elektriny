import express from 'express';
import cors from 'cors';
import priceRoutes from './routes/price';
import instanceRoutes from './routes/instance';
import authRoutes from './routes/auth';
import { requireAuth } from './middleware/auth';
import path from 'path';
import dotenv from 'dotenv';
import { getFreezePriceData } from './lib/storage';
import { fetchAndStoreHourlyPrices } from './services/priceService';

const rootDir = path.resolve(__dirname, '..', '..', '..');
console.log('rootDir', rootDir, 'exists', require('fs').existsSync(path.join(rootDir,'.env')));
dotenv.config();
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

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

app.use(cors());
app.use(express.json());
app.use('/api', (req, res, next) => {
  if (req.path === '/instance') return next();
  return requireAuth(req as any, res, next);
});
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const u = (req as any).user || {};
    const user = u.preferred_username || u.email || u.unique_name || u.name || u.sub || 'anonymous';
    console.log(`[audit] ${new Date().toISOString()} user=${user} ${req.method} ${req.originalUrl} status=${res.statusCode} duration=${Date.now()-start}ms`);
  });
  next();
});

app.use('/api/price', priceRoutes);
app.use('/api/instance', instanceRoutes);
app.use('/api/auth', authRoutes);
app.get('/api/current-price', async (_req, res) => {
  try {
    const { fetchCurrentPrice } = await import('./services/priceService');
    const data = await fetchCurrentPrice();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});
app.get('/api/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true });
  } catch (error) {
    res.status(401).json({ authenticated: false });
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
