import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import { logger } from './utils/logger';
import { db } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);

// Start server
app.listen(PORT, () => {
  logger.info(`User Service running on port ${PORT}`);
});

// Test database connection
db.query('SELECT NOW()')
  .then(() => logger.info('Database connected'))
  .catch((err) => logger.error('Database connection error:', err));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  process.exit(0);
});
