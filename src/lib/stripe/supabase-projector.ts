import 'server-only';

import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

import { BILLING_ACCOUNT_METADATA_KEY } from './billing-customer';
import type { StripeWebhookInboxRecord } from './webhook-event';

type StripeApi = Pick<Stripe, 'customers' | 'products' | 'prices' | 'subscriptions' | 'invoices' | 'checkout'>;

export type StripeProjectionPayload = {
  products: Array<Record<string, unknown>>;
  prices: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  subscriptions: Array<Record<string, unknown>>;
  subscription_items: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
};

const emptyPayload = (): StripeProjectionPayload => ({
  products: [], prices: [], customers: [], subscriptions: [], subscription_items: [], invoices: [],
});

const toIso = (seconds: number | null | undefined) => seconds ? new Date(seconds * 1000).toISOString() : null;
const accountId = (metadata: Stripe.Metadata | null | undefined) => metadata?.[BILLING_ACCOUNT_METADATA_KEY] ?? null;

function addProduct(payload: StripeProjectionPayload, product: Stripe.Product | Stripe.DeletedProduct) {
  payload.products.push({
    id: product.id,
    name: 'name' in product ? product.name : '',
    description: 'description' in product ? product.description : null,
    active: 'active' in product ? product.active : false,
    deleted: product.deleted,
    plan_code: 'metadata' in product ? product.metadata.clipsx_plan_code ?? null : null,
    created_at: 'created' in product ? toIso(product.created) : null,
  });
}

function addPrice(payload: StripeProjectionPayload, price: Stripe.Price, product: Stripe.Product) {
  addProduct(payload, product);
  payload.prices.push({
    id: price.id, product_id: product.id, lookup_key: price.lookup_key, active: price.active,
    currency: price.currency, unit_amount: price.unit_amount, billing_scheme: price.billing_scheme,
    recurring_interval: price.recurring?.interval ?? null,
    recurring_interval_count: price.recurring?.interval_count ?? null,
    usage_type: price.recurring?.usage_type ?? null, tax_behavior: price.tax_behavior,
    created_at: toIso(price.created),
  });
}

function addCustomer(payload: StripeProjectionPayload, customer: Stripe.Customer | Stripe.DeletedCustomer) {
  payload.customers.push({
    id: customer.id,
    billing_account_id: 'metadata' in customer ? accountId(customer.metadata) : null,
    deleted: customer.deleted,
    created_at: 'created' in customer ? toIso(customer.created) : null,
  });
}

function addSubscription(payload: StripeProjectionPayload, subscription: Stripe.Subscription, customer: Stripe.Customer) {
  if (subscription.items.has_more) throw new Error('Incomplete Stripe subscription item snapshot');
  addCustomer(payload, customer);
  payload.subscriptions.push({
    id: subscription.id, customer_id: customer.id,
    billing_account_id: accountId(subscription.metadata) ?? accountId(customer.metadata),
    status: subscription.status, collection_method: subscription.collection_method,
    cancel_at_period_end: subscription.cancel_at_period_end, cancel_at: toIso(subscription.cancel_at),
    canceled_at: toIso(subscription.canceled_at), ended_at: toIso(subscription.ended_at),
    trial_start: toIso(subscription.trial_start), trial_end: toIso(subscription.trial_end),
    billing_cycle_anchor: toIso(subscription.billing_cycle_anchor),
    latest_invoice_id: typeof subscription.latest_invoice === 'string' ? subscription.latest_invoice : subscription.latest_invoice?.id ?? null,
    created_at: toIso(subscription.created),
  });
  for (const item of subscription.items.data) {
    if (typeof item.price.product === 'string') throw new Error('Subscription Price Product was not expanded');
    addPrice(payload, item.price, item.price.product as Stripe.Product);
    payload.subscription_items.push({
      id: item.id, subscription_id: subscription.id, price_id: item.price.id, quantity: item.quantity ?? 1,
      period_start: toIso(item.current_period_start), period_end: toIso(item.current_period_end), created_at: toIso(item.created),
    });
  }
}

export async function buildStripeProjectionPayload(event: Stripe.Event, stripe: StripeApi): Promise<StripeProjectionPayload> {
  const payload = emptyPayload();
  switch (event.data.object.object) {
    case 'product': {
      const product = await stripe.products.retrieve(event.data.object.id);
      addProduct(payload, product);
      break;
    }
    case 'price': {
      const price = await stripe.prices.retrieve(event.data.object.id, { expand: ['product'] });
      if (typeof price.product === 'string' || ('deleted' in price.product && price.product.deleted)) throw new Error('Stripe Price Product was unavailable');
      addPrice(payload, price, price.product as Stripe.Product);
      break;
    }
    case 'customer': {
      addCustomer(payload, await stripe.customers.retrieve(event.data.object.id));
      break;
    }
    case 'subscription': {
      const subscription = await stripe.subscriptions.retrieve(event.data.object.id, { expand: ['customer', 'items.data.price.product'] });
      if (typeof subscription.customer === 'string' || ('deleted' in subscription.customer && subscription.customer.deleted)) throw new Error('Stripe Subscription Customer was unavailable');
      addSubscription(payload, subscription, subscription.customer);
      break;
    }
    case 'invoice': {
      const invoice = await stripe.invoices.retrieve(event.data.object.id);
      const customer = typeof invoice.customer === 'string' ? await stripe.customers.retrieve(invoice.customer) : invoice.customer;
      if (customer && !('deleted' in customer && customer.deleted)) addCustomer(payload, customer as Stripe.Customer);
      const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof invoiceSubscription === 'string' ? invoiceSubscription : invoiceSubscription?.id;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['customer', 'items.data.price.product'] });
        if (typeof subscription.customer === 'string' || ('deleted' in subscription.customer && subscription.customer.deleted)) throw new Error('Stripe Subscription Customer was unavailable');
        addSubscription(payload, subscription, subscription.customer);
      }
      if (customer && !('deleted' in customer && customer.deleted)) {
        payload.invoices.push({
          id: invoice.id, customer_id: customer.id, billing_account_id: accountId(customer.metadata), subscription_id: subscriptionId ?? null,
          status: invoice.status ?? 'unknown', currency: invoice.currency, amount_due: invoice.amount_due, amount_paid: invoice.amount_paid,
          paid_at: toIso(invoice.status_transitions.paid_at), next_payment_attempt: toIso(invoice.next_payment_attempt), created_at: toIso(invoice.created),
        });
      }
      break;
    }
    case 'checkout.session': {
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
      if (typeof session.subscription === 'string') {
        const subscription = await stripe.subscriptions.retrieve(session.subscription, { expand: ['customer', 'items.data.price.product'] });
        if (typeof subscription.customer === 'string' || ('deleted' in subscription.customer && subscription.customer.deleted)) throw new Error('Stripe Subscription Customer was unavailable');
        addSubscription(payload, subscription, subscription.customer);
      }
      break;
    }
  }
  return payload;
}

export async function applyStripeWebhookProjection({
  supabase, stripe, event, record, requestId,
}: {
  supabase: SupabaseClient;
  stripe: StripeApi;
  event: Stripe.Event;
  record: StripeWebhookInboxRecord;
  requestId: string;
}) {
  const payload = await buildStripeProjectionPayload(event, stripe);
  const { data, error } = await supabase.schema('private').rpc('apply_stripe_webhook_projection', {
    p_livemode: record.livemode,
    p_stripe_event_id: record.stripe_event_id,
    p_request_id: requestId,
    p_event_created_at: record.stripe_event_created_at,
    p_payload: payload,
  });
  if (error) throw new Error(`Unable to apply Stripe projection: ${error.message}`);
  if (data !== true) throw new Error('Stripe webhook lease was lost before projection committed');
}
