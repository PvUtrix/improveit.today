import express from 'express';
import dotenv from 'dotenv';
import solverRoutes from './routes/solvers';
import bidRoutes from './routes/bids';
import { db } from './db';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8007;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bidding-service' });
});

app.use('/solvers', solverRoutes);
app.use('/bids', bidRoutes);

app.listen(PORT, () => {
  logger.info(`Bidding Service running on port ${PORT}`);
});

db.query('SELECT NOW()')
  .then(() => logger.info('Database connected'))
  .catch((err) => logger.error('Database error:', err));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  process.exit(0);
});
