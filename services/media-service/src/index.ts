import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import mediaRoutes from './routes/media';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8010;

// Increase limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'media-service' });
});

app.use('/media', mediaRoutes);

app.listen(PORT, () => {
  logger.info(`Media Service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  process.exit(0);
});
