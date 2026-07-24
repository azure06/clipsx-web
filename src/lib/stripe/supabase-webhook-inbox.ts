import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  BillingWebhookInboxStore,
  ClaimedStripeWebhookEvent,
} from './projection-worker';

type ClaimResponse = ClaimedStripeWebhookEvent[] | null;

export function createSupabaseBillingWebhookInbox(
  supabase: SupabaseClient,
): BillingWebhookInboxStore {
  return {
    async claim(workerId, maxEvents, leaseSeconds) {
      const { data, error } = await supabase.schema('private').rpc('claim_billing_webhook_events', {
        p_worker_id: workerId,
        p_max_events: maxEvents,
        p_lease_seconds: leaseSeconds,
      });

      if (error) throw new Error(`Unable to claim Stripe webhook events: ${error.message}`);
      return (data as ClaimResponse) ?? [];
    },

    async complete(event, workerId) {
      const { data, error } = await supabase.schema('private').rpc('complete_billing_webhook_event', {
        p_livemode: event.livemode,
        p_stripe_event_id: event.stripe_event_id,
        p_worker_id: workerId,
      });

      if (error) throw new Error(`Unable to complete Stripe webhook event: ${error.message}`);
      return data === true;
    },

    async fail(event, workerId, retryAfterSeconds, failure) {
      const { data, error } = await supabase.schema('private').rpc('fail_billing_webhook_event', {
        p_livemode: event.livemode,
        p_stripe_event_id: event.stripe_event_id,
        p_worker_id: workerId,
        p_retry_after_seconds: retryAfterSeconds,
        p_error: failure,
      });

      if (error) throw new Error(`Unable to defer Stripe webhook event: ${error.message}`);
      return data === true;
    },
  };
}
