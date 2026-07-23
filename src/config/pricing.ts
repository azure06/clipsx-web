export type BillingInterval = 'monthly' | 'yearly';
export type PlanId = 'free' | 'pro';
export type FeatureAvailability = 'included' | 'limited' | 'notIncluded';

export interface PricingPlan {
  id: PlanId;
  nameKey: string;
  descKey: string;
  priceMonthlyKey: string;
  priceYearlyKey: string;
  periodMonthlyKey: string;
  periodYearlyKey: string;
  highlighted: boolean;
  ctaKey: string;
}

export interface PricingFeatureGroup {
  titleKey: string;
  features: Array<{
    labelKey: string;
    free: FeatureAvailability;
    pro: FeatureAvailability;
  }>;
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
    highlighted: true,
    ctaKey: 'cta_pro',
  },
];

export const pricingFeatureGroups: PricingFeatureGroup[] = [
  {
    titleKey: 'comparison_local_title',
    features: [
      { labelKey: 'feature_history', free: 'included', pro: 'included' },
      { labelKey: 'feature_clip_types', free: 'included', pro: 'included' },
      { labelKey: 'feature_search', free: 'included', pro: 'included' },
      { labelKey: 'feature_ocr', free: 'included', pro: 'included' },
      { labelKey: 'feature_semantic_image', free: 'included', pro: 'included' },
      { labelKey: 'feature_previews', free: 'included', pro: 'included' },
      { labelKey: 'feature_organization', free: 'included', pro: 'included' },
      { labelKey: 'feature_models', free: 'included', pro: 'included' },
      { labelKey: 'feature_converters', free: 'included', pro: 'included' },
    ],
  },
  {
    titleKey: 'comparison_preserve_title',
    features: [
      { labelKey: 'feature_office_preservation', free: 'limited', pro: 'included' },
      { labelKey: 'feature_office_restore', free: 'limited', pro: 'included' },
      { labelKey: 'feature_ai_actions', free: 'notIncluded', pro: 'included' },
      { labelKey: 'feature_ai_transformations', free: 'notIncluded', pro: 'included' },
    ],
  },
  {
    titleKey: 'comparison_private_title',
    features: [
      { labelKey: 'feature_private_snippets', free: 'included', pro: 'included' },
      { labelKey: 'feature_personal_sync', free: 'notIncluded', pro: 'included' },
      { labelKey: 'feature_backup', free: 'notIncluded', pro: 'included' },
      { labelKey: 'feature_secure_share', free: 'notIncluded', pro: 'included' },
      { labelKey: 'feature_join_collections', free: 'included', pro: 'included' },
      { labelKey: 'feature_shared_collections', free: 'notIncluded', pro: 'included' },
      { labelKey: 'feature_collection_invites', free: 'notIncluded', pro: 'included' },
    ],
  },
];
