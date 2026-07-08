import { Kafka } from 'kafkajs';
import { logger } from '../utils/logger';
import { sendEmail } from '../utils/email';
import { db } from '../db';

const kafka = new Kafka({
  clientId: 'improveit-notification',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

export async function startKafkaConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'improveit-events', fromBeginning: false });

    logger.info('Kafka consumer started');

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');

          logger.info(`Processing event: ${event.type}`);

          switch (event.type) {
            case 'problem.threshold_reached':
              await handleThresholdReached(event.data);
              break;

            case 'problem.created':
              await handleProblemCreated(event.data);
              break;

            case 'bid.accepted':
              await handleBidAccepted(event.data);
              break;

            case 'problem.resolved':
              await handleProblemResolved(event.data);
              break;

            default:
              logger.info(`Unhandled event type: ${event.type}`);
          }
        } catch (error) {
          logger.error('Error processing event:', error);
        }
      },
    });
  } catch (error) {
    logger.error('Kafka consumer error:', error);
    throw error;
  }
}

async function handleThresholdReached(data: any) {
  try {
    // Notify authority
    if (data.authorityEmail) {
      await sendEmail({
        to: data.authorityEmail,
        subject: `Problem requires attention (${data.upvotes} votes)`,
        text: `A problem in your jurisdiction has reached ${data.upvotes} votes and requires attention.

Problem ID: ${data.problemId}
Votes: ${data.upvotes}
Threshold: ${data.threshold}

Please review this issue at your earliest convenience.`,
      });

      logger.info(`Authority notification sent for problem ${data.problemId}`);
    }

    // Notify problem reporter
    const problemResult = await db.query(
      `SELECT user_id FROM problems WHERE id = $1`,
      [data.problemId]
    );

    if (problemResult.rows.length > 0) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, content)
         VALUES ($1, 'threshold_reached', 'Your problem reached the vote threshold!',
         'Your reported problem has received enough votes and authorities have been notified.')`,
        [problemResult.rows[0].user_id]
      );
    }
  } catch (error) {
    logger.error('Error handling threshold reached:', error);
  }
}

async function handleProblemCreated(data: any) {
  // Notify nearby users about new problem (optional)
  logger.info(`New problem created: ${data.problemId}`);
}

async function handleBidAccepted(data: any) {
  // Notify solver that their bid was accepted
  logger.info(`Bid accepted: ${data.bidId}`);
}

async function handleProblemResolved(data: any) {
  // Notify voters and reporter that problem was resolved
  logger.info(`Problem resolved: ${data.problemId}`);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await consumer.disconnect();
  logger.info('Kafka consumer disconnected');
});
