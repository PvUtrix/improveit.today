import express from 'express';
import dotenv from 'dotenv';
import crowdfundingRoutes from './routes/crowdfunding';
import paymentRoutes from './routes/payments';
import { db } from './db';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8006;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

app.use('/crowdfunding', crowdfundingRoutes);
app.use('/payments', paymentRoutes);

app.listen(PORT, () => {
  logger.info(`Payment Service running on port ${PORT}`);
});

db.query('SELECT NOW()')
  .then(() => logger.info('Database connected'))
  .catch((err) => logger.error('Database error:', err));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  process.exit(0);
});
