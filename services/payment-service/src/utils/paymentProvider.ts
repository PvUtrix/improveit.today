import { logger } from './logger';

export interface PaymentIntent {
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;
  currency: string;
  clientSecret?: string;
}

export interface PaymentProvider {
  name: string;
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any>
  ): Promise<PaymentIntent>;
  refund(paymentIntentId: string): Promise<{ id: string; status: string }>;
}

/**
 * Mock provider for development and testing.
 * Payment intents succeed immediately so the full crowdfunding flow
 * (contribute → campaign progress → funded threshold) works end-to-end
 * without external credentials.
 */
class MockPaymentProvider implements PaymentProvider {
  name = 'mock';

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any>
  ): Promise<PaymentIntent> {
    const id = `mock_pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`[mock] Payment intent created: ${id} (${amount} ${currency})`, metadata);
    return { id, status: 'succeeded', amount, currency };
  }

  async refund(paymentIntentId: string) {
    logger.info(`[mock] Refund issued for ${paymentIntentId}`);
    return { id: `mock_re_${Date.now()}`, status: 'succeeded' };
  }
}

/**
 * Stripe provider placeholder. Wire up with the `stripe` package when
 * STRIPE_SECRET_KEY is configured:
 *
 *   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
 *   const intent = await stripe.paymentIntents.create({ amount, currency, metadata });
 *
 * Intents start as 'pending' and are completed via the /payments/webhooks
 * endpoint on the payment_intent.succeeded event.
 */
class StripePaymentProvider implements PaymentProvider {
  name = 'stripe';

  async createPaymentIntent(): Promise<PaymentIntent> {
    throw new Error(
      'Stripe provider not configured. Install the stripe package and set STRIPE_SECRET_KEY, or use PAYMENT_PROVIDER=mock.'
    );
  }

  async refund(): Promise<{ id: string; status: string }> {
    throw new Error('Stripe provider not configured.');
  }
}

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';
  if (provider === 'stripe') {
    return new StripePaymentProvider();
  }
  return new MockPaymentProvider();
}
