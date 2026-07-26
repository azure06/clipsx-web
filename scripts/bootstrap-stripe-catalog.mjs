import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) throw new Error('STRIPE_SECRET_KEY is required');
const currency = process.env.STRIPE_PRO_CURRENCY;
const monthlyAmount = Number.parseInt(process.env.STRIPE_PRO_MONTHLY_AMOUNT_CENTS ?? '', 10);
const yearlyAmount = Number.parseInt(process.env.STRIPE_PRO_YEARLY_AMOUNT_CENTS ?? '', 10);
if (!currency || !Number.isSafeInteger(monthlyAmount) || monthlyAmount < 0 || !Number.isSafeInteger(yearlyAmount) || yearlyAmount < 0) {
  throw new Error('STRIPE_PRO_CURRENCY, STRIPE_PRO_MONTHLY_AMOUNT_CENTS, and STRIPE_PRO_YEARLY_AMOUNT_CENTS are required');
}

const stripe = new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' });
const planCode = 'pro';
const productDescription = 'Fast, private clipboard history with encrypted cloud sync, semantic search, and secure sharing.';
const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clipsx.app'}/pricing`;

const products = await stripe.products.list({ active: true, limit: 100 });
let product = products.data.find((candidate) => candidate.metadata.clipsx_plan_code === planCode);
if (!product) {
  product = await stripe.products.create({
    name: 'ClipsX Pro',
    description: productDescription,
    url: productUrl,
    metadata: { clipsx_plan_code: planCode },
  });
} else {
  product = await stripe.products.update(product.id, {
    name: 'ClipsX Pro',
    description: productDescription,
    url: productUrl,
    metadata: { ...product.metadata, clipsx_plan_code: planCode },
  });
}

async function getOrCreatePrice(lookupKey, interval, amount) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) {
    const price = existing.data[0];
    const priceProductId = typeof price.product === 'string' ? price.product : price.product.id;
    if (
      priceProductId !== product.id
      || price.currency !== currency
      || price.unit_amount !== amount
      || price.recurring?.interval !== interval
      || price.recurring?.interval_count !== 1
    ) {
      throw new Error(`Existing ${lookupKey} does not match this catalog configuration. Create a new lookup-key version instead of changing a Price.`);
    }
    return price;
  }
  return stripe.prices.create({
    product: product.id,
    currency,
    unit_amount: amount,
    recurring: { interval },
    lookup_key: lookupKey,
    metadata: { clipsx_plan_code: planCode },
  });
}

const monthly = await getOrCreatePrice('clipsx_pro_monthly_v1', 'month', monthlyAmount);
const yearly = await getOrCreatePrice('clipsx_pro_yearly_v1', 'year', yearlyAmount);

if (product.default_price !== monthly.id) {
  await stripe.products.update(product.id, { default_price: monthly.id });
}

console.log('Stripe catalog is ready. Add these values to .env.local:');
console.log(`STRIPE_PRICE_ID_PRO_MONTHLY=${monthly.id}`);
console.log(`STRIPE_PRICE_ID_PRO_YEARLY=${yearly.id}`);
