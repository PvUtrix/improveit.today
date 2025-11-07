import express from 'express';
import dotenv from 'dotenv';
import voteRoutes from './routes/votes';
import { db } from './db';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voting-service' });
});

app.use('/votes', voteRoutes);

app.listen(PORT, () => {
  logger.info(`Voting Service running on port ${PORT}`);
});

db.query('SELECT NOW()')
  .then(() => logger.info('Database connected'))
  .catch((err) => logger.error('Database error:', err));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  process.exit(0);
});
