import express from 'express';
import dotenv from 'dotenv';
import authorityRoutes from './routes/authorities';
import jurisdictionRoutes from './routes/jurisdictions';
import { db } from './db';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8005;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'authority-service' });
});

app.use('/authorities', authorityRoutes);
app.use('/jurisdictions', jurisdictionRoutes);

app.listen(PORT, () => {
  logger.info(`Authority Service running on port ${PORT}`);
});

db.query('SELECT NOW()')
  .then(() => logger.info('Database connected'))
  .catch((err) => logger.error('Database error:', err));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  process.exit(0);
});
