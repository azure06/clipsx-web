import 'server-only';

import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

import { BILLING_ACCOUNT_METADATA_KEY } from './billing-customer';
import type { ClaimedStripeWebhookEvent, StripeWebhookProjector } from './projection-worker';

type StripeApi = Pick<Stripe, 'customers' | 'products' | 'prices' | 'subscriptions' | 'invoices' | 'checkout'>;
function toIso(unixSeconds: number | null | undefined) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

function metadataAccountId(metadata: Stripe.Metadata | null | undefined) {
  return metadata?.[BILLING_ACCOUNT_METADATA_KEY] || null;
}

export class SupabaseStripeProjector implements StripeWebhookProjector {
  constructor(private readonly supabase: SupabaseClient, private readonly stripe: StripeApi) {}

  private async billingAccountForCustomer(customerId: string, livemode: boolean, metadata?: Stripe.Metadata | null) {
    const { data, error } = await this.supabase
      .schema('private')
      .from('billing_customers')
      .select('billing_account_id')
      .eq('stripe_customer_id', customerId)
      .eq('livemode', livemode)
      .is('stripe_deleted_at', null)
      .maybeSingle();
    if (error) throw new Error(`Unable to resolve billing customer: ${error.message}`);
    if (data) return (data as { billing_account_id: string }).billing_account_id;

    const billingAccountId = metadataAccountId(metadata);
    if (!billingAccountId) return null;
    const { data: account, error: accountError } = await this.supabase
      .schema('private')
      .from('billing_accounts')
      .select('id')
      .eq('id', billingAccountId)
      .eq('status', 'active')
      .maybeSingle();
    if (accountError) throw new Error(`Unable to validate billing account: ${accountError.message}`);
    return account ? billingAccountId : null;
  }

  private async upsertCustomer(customer: Stripe.Customer) {
    const billingAccountId = await this.billingAccountForCustomer(customer.id, customer.livemode, customer.metadata);
    if (!billingAccountId) return null;
    const { error } = await this.supabase.schema('private').from('billing_customers').upsert({
      billing_account_id: billingAccountId,
      stripe_customer_id: customer.id,
      livemode: customer.livemode,
      stripe_created_at: toIso(customer.created),
      stripe_deleted_at: customer.deleted ? new Date().toISOString() : null,
    }, { onConflict: 'billing_account_id,livemode' });
    if (error) throw new Error(`Unable to project Stripe customer: ${error.message}`);
    return billingAccountId;
  }

  private async markCustomerDeleted(customerId: string, livemode: boolean) {
    const { error } = await this.supabase.schema('private').from('billing_customers')
      .update({ stripe_deleted_at: new Date().toISOString() })
      .eq('stripe_customer_id', customerId)
      .eq('livemode', livemode);
    if (error) throw new Error(`Unable to mark Stripe customer deleted: ${error.message}`);
  }

  private async upsertProduct(product: Stripe.Product) {
    const planCode = product.metadata.clipsx_plan_code;
    let planId: string | null = null;
    if (planCode) {
      const { data, error } = await this.supabase.schema('private').from('plans').select('id').eq('code', planCode).maybeSingle();
      if (error) throw new Error(`Unable to resolve plan for Stripe Product: ${error.message}`);
      planId = data ? (data as { id: string }).id : null;
    }
    const { data, error } = await this.supabase.schema('private').from('billing_products').upsert({
      stripe_product_id: product.id,
      livemode: product.livemode,
      plan_id: planId,
      name: product.name,
      description: product.description,
      active: product.active,
      stripe_created_at: toIso(product.created),
      stripe_deleted_at: product.deleted ? new Date().toISOString() : null,
    }, { onConflict: 'livemode,stripe_product_id' }).select('id').single();
    if (error || !data) throw new Error(`Unable to project Stripe Product: ${error?.message ?? 'missing row'}`);
    return (data as { id: string }).id;
  }

  private async markProductDeleted(productId: string, livemode: boolean) {
    const { error } = await this.supabase.schema('private').from('billing_products')
      .update({ active: false, stripe_deleted_at: new Date().toISOString() })
      .eq('stripe_product_id', productId)
      .eq('livemode', livemode);
    if (error) throw new Error(`Unable to mark Stripe Product deleted: ${error.message}`);
  }

  private async upsertPrice(price: Stripe.Price) {
    const product = typeof price.product === 'string'
      ? await this.stripe.products.retrieve(price.product)
      : price.product;
    if ('deleted' in product && product.deleted) throw new Error('A Stripe Price references a deleted Product');
    const productId = await this.upsertProduct(product as Stripe.Product);
    const { data, error } = await this.supabase.schema('private').from('billing_prices').upsert({
      stripe_price_id: price.id,
      livemode: price.livemode,
      product_id: productId,
      lookup_key: price.lookup_key,
      active: price.active,
      currency: price.currency,
      unit_amount: price.unit_amount,
      billing_scheme: price.billing_scheme,
      recurring_interval: price.recurring?.interval ?? null,
      recurring_interval_count: price.recurring?.interval_count ?? null,
      usage_type: price.recurring?.usage_type ?? null,
      tax_behavior: price.tax_behavior,
      stripe_created_at: toIso(price.created),
    }, { onConflict: 'livemode,stripe_price_id' }).select('id').single();
    if (error || !data) throw new Error(`Unable to project Stripe Price: ${error?.message ?? 'missing row'}`);
    return (data as { id: string }).id;
  }

  private async projectSubscription(subscription: Stripe.Subscription) {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const billingAccountId = await this.billingAccountForCustomer(customerId, subscription.livemode, subscription.metadata);
    if (!billingAccountId) return;
    const customer = typeof subscription.customer === 'string'
      ? await this.stripe.customers.retrieve(subscription.customer)
      : subscription.customer;
    if (!('deleted' in customer && customer.deleted)) await this.upsertCustomer(customer as Stripe.Customer);

    const { data: customerRow, error: customerError } = await this.supabase.schema('private').from('billing_customers')
      .select('id').eq('billing_account_id', billingAccountId).eq('livemode', subscription.livemode).maybeSingle();
    if (customerError || !customerRow) throw new Error(`Unable to load projected billing customer: ${customerError?.message ?? 'not found'}`);
    const { data: subscriptionRow, error: subscriptionError } = await this.supabase.schema('private').from('billing_subscriptions').upsert({
      billing_account_id: billingAccountId,
      customer_id: (customerRow as { id: string }).id,
      stripe_subscription_id: subscription.id,
      livemode: subscription.livemode,
      status: subscription.status,
      collection_method: subscription.collection_method,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: toIso(subscription.cancel_at),
      canceled_at: toIso(subscription.canceled_at),
      ended_at: toIso(subscription.ended_at),
      trial_start: toIso(subscription.trial_start),
      trial_end: toIso(subscription.trial_end),
      billing_cycle_anchor: toIso(subscription.billing_cycle_anchor),
      pause_collection_behavior: subscription.pause_collection?.behavior ?? null,
      pause_collection_resumes_at: toIso(subscription.pause_collection?.resumes_at),
      latest_stripe_invoice_id: typeof subscription.latest_invoice === 'string' ? subscription.latest_invoice : subscription.latest_invoice?.id ?? null,
      stripe_created_at: toIso(subscription.created),
      stripe_event_created_at: new Date().toISOString(),
    }, { onConflict: 'livemode,stripe_subscription_id' }).select('id').single();
    if (subscriptionError || !subscriptionRow) throw new Error(`Unable to project Stripe subscription: ${subscriptionError?.message ?? 'missing row'}`);

    for (const item of subscription.items.data) {
      const priceId = await this.upsertPrice(item.price);
      const { error } = await this.supabase.schema('private').from('billing_subscription_items').upsert({
        subscription_id: (subscriptionRow as { id: string }).id,
        price_id: priceId,
        stripe_subscription_item_id: item.id,
        livemode: subscription.livemode,
        quantity: item.quantity ?? 1,
        current_period_start: toIso(item.current_period_start),
        current_period_end: toIso(item.current_period_end),
        stripe_created_at: toIso(item.created),
        stripe_event_created_at: new Date().toISOString(),
      }, { onConflict: 'livemode,stripe_subscription_item_id' });
      if (error) throw new Error(`Unable to project Stripe subscription item: ${error.message}`);
    }

    const { error: entitlementError } = await this.supabase.schema('private').rpc('recompute_account_entitlement', {
      p_billing_account_id: billingAccountId,
    });
    if (entitlementError) throw new Error(`Unable to recompute entitlement: ${entitlementError.message}`);
  }

  private async projectInvoice(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    const billingAccountId = await this.billingAccountForCustomer(customerId, invoice.livemode);
    if (!billingAccountId) return;
    let subscriptionId: string | null = null;
    const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
    const stripeSubscriptionId = typeof invoiceSubscription === 'string'
      ? invoiceSubscription
      : invoiceSubscription?.id;
    if (stripeSubscriptionId) {
      const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId, { expand: ['items.data.price.product'] });
      await this.projectSubscription(subscription);
      const { data } = await this.supabase.schema('private').from('billing_subscriptions').select('id')
        .eq('livemode', invoice.livemode).eq('stripe_subscription_id', stripeSubscriptionId).maybeSingle();
      subscriptionId = data ? (data as { id: string }).id : null;
    }
    const { error } = await this.supabase.schema('private').from('billing_invoices').upsert({
      billing_account_id: billingAccountId,
      subscription_id: subscriptionId,
      stripe_invoice_id: invoice.id,
      livemode: invoice.livemode,
      status: invoice.status ?? 'unknown',
      currency: invoice.currency,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      paid_at: toIso(invoice.status_transitions.paid_at),
      next_payment_attempt: toIso(invoice.next_payment_attempt),
      stripe_created_at: toIso(invoice.created),
      stripe_event_created_at: new Date().toISOString(),
    }, { onConflict: 'livemode,stripe_invoice_id' });
    if (error) throw new Error(`Unable to project Stripe invoice: ${error.message}`);
  }

  async project(event: ClaimedStripeWebhookEvent): Promise<void> {
    switch (event.object_type) {
      case 'product': {
        const product = await this.stripe.products.retrieve(event.object_id);
        if ('deleted' in product && product.deleted) await this.markProductDeleted(product.id, product.livemode);
        else await this.upsertProduct(product as Stripe.Product);
        return;
      }
      case 'price': {
        const price = await this.stripe.prices.retrieve(event.object_id, { expand: ['product'] });
        await this.upsertPrice(price);
        return;
      }
      case 'customer': {
        const customer = await this.stripe.customers.retrieve(event.object_id);
        if ('deleted' in customer && customer.deleted) await this.markCustomerDeleted(customer.id, event.livemode);
        else await this.upsertCustomer(customer as Stripe.Customer);
        return;
      }
      case 'subscription': {
        const subscription = await this.stripe.subscriptions.retrieve(event.object_id, { expand: ['items.data.price.product', 'customer'] });
        await this.projectSubscription(subscription);
        return;
      }
      case 'invoice': {
        const invoice = await this.stripe.invoices.retrieve(event.object_id);
        await this.projectInvoice(invoice);
        return;
      }
      case 'checkout.session': {
        const session = await this.stripe.checkout.sessions.retrieve(event.object_id);
        if (typeof session.subscription === 'string') {
          const subscription = await this.stripe.subscriptions.retrieve(session.subscription, { expand: ['items.data.price.product', 'customer'] });
          await this.projectSubscription(subscription);
        }
      }
    }
  }

  async reconcileMappedCustomers(livemode: boolean) {
    const { data: customers, error } = await this.supabase.schema('private').from('billing_customers')
      .select('stripe_customer_id').eq('livemode', livemode).is('stripe_deleted_at', null);
    if (error) throw new Error(`Unable to load mapped Stripe customers: ${error.message}`);

    let reconciled = 0;
    for (const customer of (customers ?? []) as Array<{ stripe_customer_id: string }>) {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customer.stripe_customer_id,
        status: 'all',
        limit: 100,
        expand: ['data.items.data.price.product', 'data.customer'],
      });
      for (const subscription of subscriptions.data) {
        await this.projectSubscription(subscription);
        reconciled += 1;
      }
    }
    return reconciled;
  }
}

export function createSupabaseStripeProjector(supabase: SupabaseClient, stripe: StripeApi) {
  return new SupabaseStripeProjector(supabase, stripe);
}
