import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8012;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'moderation-service' });
});

// Add your routes here

app.listen(PORT, () => {
  console.log(`moderation-service running on port ${PORT}`);
});
