import express from 'express';
import dotenv from 'dotenv';
import notificationRoutes from './routes/notifications';
import { logger } from './utils/logger';
import { startKafkaConsumer } from './consumers/eventConsumer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8008;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.use('/notifications', notificationRoutes);

// Start Kafka consumer for automatic notifications
startKafkaConsumer().catch((err) => {
  logger.error('Failed to start Kafka consumer:', err);
});

app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  process.exit(0);
});
