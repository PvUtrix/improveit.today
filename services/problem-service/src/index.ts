import express from 'express';
import dotenv from 'dotenv';
import problemRoutes from './routes/problems';
import { db } from './db';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'problem-service' });
});

app.use('/problems', problemRoutes);

app.listen(PORT, () => {
  logger.info(`Problem Service running on port ${PORT}`);
});

db.query('SELECT NOW()')
  .then(() => logger.info('Database connected'))
  .catch((err) => logger.error('Database error:', err));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  process.exit(0);
});
