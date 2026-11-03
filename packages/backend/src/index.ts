import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import priceRoutes from './routes/price';
import instanceRoutes from './routes/instance';
import authRoutes from './routes/auth';
import { requireAuth } from './middleware/auth';
import path from 'path';
import dotenv from 'dotenv';
import { getFreezePriceData } from './lib/storage';
import { fetchAndStoreHourlyPrices } from './services/priceService';
import { generate } from 'selfsigned';

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

function getTlsCredentials(): { key: string; cert: string } {
  const certPath = process.env.TLS_CERT_PATH;
  const keyPath = process.env.TLS_KEY_PATH;

  if (Boolean(certPath) !== Boolean(keyPath)) {
    throw new Error('TLS_CERT_PATH and TLS_KEY_PATH must either both be set or both be empty');
  }

  if (certPath && keyPath) {
    return {
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8'),
    };
  }

  console.warn('[startup] TLS_CERT_PATH/TLS_KEY_PATH not set; generating an in-memory self-signed certificate');
  const certificate = generate(
    [{ name: 'commonName', value: 'localhost' }],
    {
      algorithm: 'sha256',
      days: 365,
      keySize: 2048,
      extensions: [{
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '::1' },
        ],
      }],
    },
  );
  return { key: certificate.private, cert: certificate.cert };
}

app.use(cors());
app.use(express.json());
app.use('/api', (req, res, next) => {
  if (req.path === '/instance') return next();
  return requireAuth(req as any, res, next);
});
function getClientIdentifier(req: express.Request): string {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (ua.includes('edg')) return 'edge';
  if (ua.includes('chrome')) return 'chrome';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari')) return 'safari';
  if (ua.includes('mozilla')) return 'mozilla';
  if (ua.includes('okhttp')) return 'okhttp';
  if (ua.includes('axios')) return 'axios';
  if (ua.includes('node-fetch') || ua.includes('nodejs')) return 'nodejs';
  if (ua.includes('python') || ua.includes('requests') || ua.includes('urllib')) return 'python';
  if (ua.includes('curl')) return 'curl';
  if (ua.includes('wget')) return 'wget';
  if (ua.length > 0) return ua.slice(0, 30).replace(/\s+/g, '-');
  return 'unknown';
}

function accessLog(req: express.Request, res: express.Response, start: number): void {
  const u = (req as any).user || {};
  const user = u.preferred_username || u.email || u.unique_name || u.name || u.sub || '-';
  const client = getClientIdentifier(req);
  const ip = req.ip || req.socket.remoteAddress || '-';
  const referer = req.headers.referer || '-';
  const ua = req.headers['user-agent'] || '-';
  console.log(
    `${ip} - ${user} [${new Date().toISOString()}] ` +
    `"${req.method} ${req.originalUrl} HTTP/${req.httpVersion}" ${res.statusCode} ` +
    `duration=${Date.now() - start}ms client=${client} ` +
    `referer="${referer}" ua="${ua}"`
  );
}

app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => accessLog(req, res, start));
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
  const credentials = getTlsCredentials();
  https.createServer(credentials, app).listen(PORT, () => {
    console.log(`Backend HTTPS server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('[startup] Failed to ensure today\'s data:', err);
  process.exit(1);
});
