import express from 'express';
import dotenv from 'dotenv';
import geoRoutes from './routes/geo';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8004;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'geolocation-service' });
});

app.use('/geo', geoRoutes);

app.listen(PORT, () => {
  logger.info(`Geolocation Service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  process.exit(0);
});
