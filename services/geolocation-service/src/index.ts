import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8004;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'geolocation-service' });
});

// Add your routes here

app.listen(PORT, () => {
  console.log(`geolocation-service running on port ${PORT}`);
});
