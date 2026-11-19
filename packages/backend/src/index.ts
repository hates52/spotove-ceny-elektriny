import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import priceRoutes from './routes/price';
import instanceRoutes from './routes/instance';
import authRoutes from './routes/auth';
import { requireAuth, AuthRequest } from './middleware/auth';
import path from 'path';
import dotenv from 'dotenv';
import { getFreezePriceData } from './lib/storage';
import { fetchAndStoreHourlyPrices } from './services/priceService';
import { generate } from 'selfsigned';
import cron, { ScheduledTask } from 'node-cron';
import { startupLogger, cronLogger, apiLogger } from './lib/logger';

const rootDir = path.resolve(__dirname, '..', '..', '..');
startupLogger.info('startup', `rootDir=${rootDir} envExists=${require('fs').existsSync(path.join(rootDir, '.env'))}`);
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
    startupLogger.info('startup', `No data for ${today}, fetching...`);
    await fetchAndStoreHourlyPrices();
    startupLogger.info('startup', `Data for ${today} fetched and stored`);
  } else {
    startupLogger.info('startup', `Data for ${today} already exists`);
  }
}

function setupCronJob(): ScheduledTask[] {
  const task = cron.schedule(CRON_SCHEDULE, async () => {
    cronLogger.info('cron', `Running scheduled fetchAndStoreHourlyPrices... schedule=${CRON_SCHEDULE}`);
    try {
      await fetchAndStoreHourlyPrices();
      cronLogger.info('cron', 'Scheduled fetch completed successfully');
    } catch (error) {
      cronLogger.error('cron', `Scheduled fetch failed: ${String(error)}`);
    }
  });
  cronLogger.info('cron', `Scheduled job started schedule=${CRON_SCHEDULE}`);
  return [task];
}

const app = express();
const PORT = process.env.PORT || 4000;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/15 * * * *';

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

  startupLogger.warn('startup', 'TLS_CERT_PATH/TLS_KEY_PATH not set; generating an in-memory self-signed certificate');
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
  return requireAuth(req as AuthRequest, res, next);
});
function accessLog(req: express.Request, res: express.Response, start: number): void {
  const u = (req as Express.Request & { user?: Record<string, unknown> }).user || {};
  const user = u.preferred_username || u.email || u.unique_name || u.name || u.sub || '-';
  const ip = req.ip || req.socket.remoteAddress || '-';
  const referer = req.headers.referer || '-';
  const ua = req.headers['user-agent'] || '-';
  const durationMs = Date.now() - start;
  const message = `${ip} - ${user} [${new Date().toISOString()}] "${req.method} ${req.originalUrl} HTTP/${req.httpVersion}" ${res.statusCode} duration=${durationMs}ms referer="${referer}" ua="${ua}"`;
  apiLogger.info('api', message);
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
  } catch (_error) {
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
  } catch (_error) {
    res.status(401).json({ authenticated: false });
  }
});

ensureTodaysData().then(() => {
  const cronTasks = setupCronJob();
  const credentials = getTlsCredentials();
  const server = https.createServer(credentials, app).listen(PORT, () => {
    startupLogger.info('startup', `Backend HTTPS server running on port ${PORT}`);
  });

  // Track in-flight requests for graceful shutdown
  let activeRequests = 0;
  const requestTracker = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    activeRequests++;
    res.on('finish', () => { activeRequests--; });
    res.on('close', () => { activeRequests--; });
    next();
  };
  app.use(requestTracker);

  const shutdown = (signal: string) => {
    startupLogger.info('startup', `Received ${signal}, shutting down gracefully...`);
    
    // Stop cron tasks
    cronTasks.forEach(task => task.stop());
    cronLogger.info('cron', 'All scheduled tasks stopped');
    
    // Stop accepting new connections
    server.close(() => {
      startupLogger.info('startup', 'HTTP server closed (no new connections accepted)');
    });

    // Wait for in-flight requests to complete
    const waitForRequests = () => {
      if (activeRequests === 0) {
        startupLogger.info('startup', 'All in-flight requests completed');
        process.exit(0);
      } else {
        startupLogger.info('startup', `Waiting for ${activeRequests} in-flight request(s) to complete...`);
        setTimeout(waitForRequests, 100);
      }
    };
    waitForRequests();

    // Force shutdown after 30s
    setTimeout(() => {
      startupLogger.error('startup', `Forced shutdown after timeout (${activeRequests} requests still active)`);
      process.exit(1);
    }, 30000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}).catch((err) => {
  startupLogger.error('startup', `Failed to ensure today's data: ${String(err)}`);
  process.exit(1);
});
