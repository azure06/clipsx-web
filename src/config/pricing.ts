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
    nameKey: 'PricingPage.free_name',
    descKey: 'PricingPage.free_desc',
    priceMonthlyKey: 'PricingPage.free_price',
    priceYearlyKey: 'PricingPage.free_price',
    periodMonthlyKey: 'PricingPage.free_period',
    periodYearlyKey: 'PricingPage.free_period',
    features: [
      'PricingPage.feature_history',
      'PricingPage.feature_fts',
      'PricingPage.feature_tags',
    ],
    highlighted: false,
    ctaKey: 'PricingPage.cta_free',
  },
  {
    id: 'pro',
    nameKey: 'PricingPage.pro_name',
    descKey: 'PricingPage.pro_desc',
    priceMonthlyKey: 'PricingPage.pro_price_monthly',
    priceYearlyKey: 'PricingPage.pro_price_yearly',
    periodMonthlyKey: 'PricingPage.pro_period_monthly',
    periodYearlyKey: 'PricingPage.pro_period_yearly',
    features: [
      'PricingPage.feature_history',
      'PricingPage.feature_fts',
      'PricingPage.feature_tags',
      'PricingPage.feature_semantic',
      'PricingPage.feature_ocr',
      'PricingPage.feature_detect',
      'PricingPage.feature_updates',
      'PricingPage.feature_devices',
    ],
    highlighted: true,
    ctaKey: 'PricingPage.cta_pro',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY,
  },
  {
    id: 'team',
    nameKey: 'PricingPage.team_name',
    descKey: 'PricingPage.team_desc',
    priceMonthlyKey: 'PricingPage.team_price_monthly',
    priceYearlyKey: 'PricingPage.team_price_yearly',
    periodMonthlyKey: 'PricingPage.team_period_monthly',
    periodYearlyKey: 'PricingPage.team_period_yearly',
    features: [
      'PricingPage.feature_history',
      'PricingPage.feature_fts',
      'PricingPage.feature_tags',
      'PricingPage.feature_semantic',
      'PricingPage.feature_ocr',
      'PricingPage.feature_detect',
      'PricingPage.feature_updates',
      'PricingPage.feature_devices',
      'PricingPage.feature_team_mgmt',
      'PricingPage.feature_sso',
    ],
    highlighted: false,
    ctaKey: 'PricingPage.cta_team',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ID_TEAM_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_ID_TEAM_YEARLY,
  },
];
