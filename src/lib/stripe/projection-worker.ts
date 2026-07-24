import Stripe from 'stripe';

export type ClaimedStripeWebhookEvent = {
  livemode: boolean;
  stripe_event_id: string;
  event_type: string;
  object_type: string;
  object_id: string;
  stripe_event_created_at: string;
  attempts: number;
};

export type BillingWebhookInboxStore = {
  claim(workerId: string, maxEvents: number, leaseSeconds: number): Promise<ClaimedStripeWebhookEvent[]>;
  complete(event: ClaimedStripeWebhookEvent, workerId: string): Promise<boolean>;
  fail(event: ClaimedStripeWebhookEvent, workerId: string, retryAfterSeconds: number, error: string): Promise<boolean>;
};

export type StripeWebhookProjector = {
  project(event: ClaimedStripeWebhookEvent, stripeEvent: Stripe.Event): Promise<void>;
};

export type StripeWebhookWorkerOptions = {
  workerId: string;
  maxEvents?: number;
  leaseSeconds?: number;
  retryAfterSeconds?: (attempts: number) => number;
};

export type StripeWebhookWorkerResult = {
  claimed: number;
  processed: number;
  failed: number;
  leaseLost: number;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 1000);
  return 'Unknown worker failure';
}

function defaultRetryAfterSeconds(attempts: number) {
  return Math.min(60 * 60, 30 * 2 ** Math.max(0, attempts - 1));
}

export async function processStripeWebhookInbox(
  store: BillingWebhookInboxStore,
  stripe: Pick<Stripe, 'events'>,
  projector: StripeWebhookProjector,
  options: StripeWebhookWorkerOptions,
): Promise<StripeWebhookWorkerResult> {
  const maxEvents = options.maxEvents ?? 20;
  const leaseSeconds = options.leaseSeconds ?? 120;
  const retryAfterSeconds = options.retryAfterSeconds ?? defaultRetryAfterSeconds;
  const claimedEvents = await store.claim(options.workerId, maxEvents, leaseSeconds);
  const result: StripeWebhookWorkerResult = {
    claimed: claimedEvents.length,
    processed: 0,
    failed: 0,
    leaseLost: 0,
  };

  for (const event of claimedEvents) {
    try {
      const stripeEvent = await stripe.events.retrieve(event.stripe_event_id);

      if (stripeEvent.id !== event.stripe_event_id || stripeEvent.livemode !== event.livemode) {
        throw new Error('Retrieved Stripe event does not match the leased inbox event');
      }

      await projector.project(event, stripeEvent);
      if (await store.complete(event, options.workerId)) {
        result.processed += 1;
      } else {
        result.leaseLost += 1;
      }
    } catch (error) {
      const retried = await store.fail(
        event,
        options.workerId,
        retryAfterSeconds(event.attempts),
        errorMessage(error),
      );

      if (retried) {
        result.failed += 1;
      } else {
        result.leaseLost += 1;
      }
    }
  }

  return result;
}
