import express from 'express';
import cors from 'cors';
import priceRoutes from './routes/price';
import instanceRoutes from './routes/instance';

const app = express();
const PORT = process.env.PORT || 4000;

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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
