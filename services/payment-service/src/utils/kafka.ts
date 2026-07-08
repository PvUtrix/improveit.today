import { Kafka } from 'kafkajs';
import { logger } from './logger';

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'improveit-payment',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const producer = kafka.producer();

let isConnected = false;

async function connectProducer() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    logger.info('Kafka producer connected');
  }
}

export async function publishEvent(event: { type: string; data: any }) {
  try {
    await connectProducer();

    await producer.send({
      topic: 'improveit-events',
      messages: [
        {
          key: event.type,
          value: JSON.stringify({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: event.type,
            timestamp: new Date().toISOString(),
            data: event.data,
          }),
        },
      ],
    });

    logger.info(`Event published: ${event.type}`);
  } catch (error) {
    logger.error('Failed to publish event:', error);
    // Don't throw - we don't want to fail the request if event publishing fails
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (isConnected) {
    await producer.disconnect();
    logger.info('Kafka producer disconnected');
  }
});
