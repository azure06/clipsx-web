export interface PricingPlan {
  id: 'free' | 'pro' | 'team';
  nameKey: string;
  descKey: string;
  priceMonthlyKey: string;
  priceYearlyKey: string;
  periodMonthlyKey: string;
  periodYearlyKey: string;
  features: string[];
  highlighted: boolean;
  ctaKey: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    nameKey: 'free_name',
    descKey: 'free_desc',
    priceMonthlyKey: 'free_price',
    priceYearlyKey: 'free_price',
    periodMonthlyKey: 'free_period',
    periodYearlyKey: 'free_period',
    features: [
      'feature_history',
      'feature_fts',
      'feature_tags',
    ],
    highlighted: false,
    ctaKey: 'cta_free',
  },
  {
    id: 'pro',
    nameKey: 'pro_name',
    descKey: 'pro_desc',
    priceMonthlyKey: 'pro_price_monthly',
    priceYearlyKey: 'pro_price_yearly',
    periodMonthlyKey: 'pro_period_monthly',
    periodYearlyKey: 'pro_period_yearly',
    features: [
      'feature_history',
      'feature_fts',
      'feature_tags',
      'feature_semantic',
      'feature_ocr',
      'feature_detect',
      'feature_updates',
      'feature_devices',
    ],
    highlighted: true,
    ctaKey: 'cta_pro',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY,
  },
  {
    id: 'team',
    nameKey: 'team_name',
    descKey: 'team_desc',
    priceMonthlyKey: 'team_price_monthly',
    priceYearlyKey: 'team_price_yearly',
    periodMonthlyKey: 'team_period_monthly',
    periodYearlyKey: 'team_period_yearly',
    features: [
      'feature_history',
      'feature_fts',
      'feature_tags',
      'feature_semantic',
      'feature_ocr',
      'feature_detect',
      'feature_updates',
      'feature_devices',
      'feature_team_mgmt',
      'feature_sso',
    ],
    highlighted: false,
    ctaKey: 'cta_team',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ID_TEAM_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_ID_TEAM_YEARLY,
  },
];
