import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8011;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics-service' });
});

// Add your routes here

app.listen(PORT, () => {
  console.log(`analytics-service running on port ${PORT}`);
});
